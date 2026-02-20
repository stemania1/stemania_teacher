import Link from "next/link";
import { redirect } from "next/navigation";
import LessonViewer from "@/components/LessonViewer";
import PresentationViewer from "@/components/PresentationViewer";
import {
  getCurrentTeacherFromDb,
  hasAssignment,
} from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { renderLessonBlocks, type LessonBlock } from "@/lib/lessonRenderer";
import { injectWatermarkIntoHtml } from "@/lib/watermark";

const BUCKET = "lesson-assets";
const SIGNED_URL_EXPIRES_SEC = 300;

type ContentSegment =
  | { type: "html"; html: string }
  | {
      type: "presentation";
      slides: { slideNumber: number; url: string; expiresIn: number }[];
      totalSlides: number;
    };

async function getLessonContent(lessonId: string) {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) redirect("/login");

  const allowed = await hasAssignment(teacher.employeeNumber, lessonId);
  if (!allowed) redirect("/lessons?error=forbidden");

  const supabase = getSupabaseAdmin();

  const { data: lesson, error: lessonError } = await supabase
    .from("lessons")
    .select("id, title, description, estimated_duration, curriculum_id")
    .eq("id", lessonId)
    .single();

  if (lessonError || !lesson) redirect("/lessons");

  const { data: curriculum } = await supabase
    .from("curricula")
    .select("title")
    .eq("id", (lesson as { curriculum_id: string }).curriculum_id)
    .single();

  const { data: blocks, error: blocksError } = await supabase
    .from("lesson_blocks")
    .select("*")
    .eq("lesson_id", lessonId)
    .order("sort_order", { ascending: true });

  if (blocksError) redirect("/lessons");

  const blockList = (blocks || []) as LessonBlock[];
  const teacherName =
    `${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher";

  // Signed URLs for non-presentation media (images, videos)
  const mediaKeys = new Set<string>();
  for (const b of blockList) {
    if (b.block_type === "presentation") continue;
    const c = b.content;
    if (
      (b.block_type === "image" || b.block_type === "video") &&
      c &&
      typeof c === "object" &&
      typeof (c as { storage_key?: string }).storage_key === "string"
    ) {
      mediaKeys.add((c as { storage_key: string }).storage_key);
    }
  }
  const signedUrlMap = new Map<string, string>();
  for (const key of mediaKeys) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, SIGNED_URL_EXPIRES_SEC);
    if (signed?.signedUrl) signedUrlMap.set(key, signed.signedUrl);
  }

  // Build ordered content segments
  const segments: ContentSegment[] = [];
  let currentHtmlBlocks: LessonBlock[] = [];
  let hasPresentation = false;

  for (const block of blockList) {
    if (block.block_type === "presentation") {
      // Flush accumulated HTML blocks
      if (currentHtmlBlocks.length > 0) {
        const html = renderLessonBlocks(currentHtmlBlocks, signedUrlMap);
        const { html: watermarked } = injectWatermarkIntoHtml(
          html,
          teacherName,
          teacher.employeeNumber
        );
        segments.push({ type: "html", html: watermarked });
        currentHtmlBlocks = [];
      }

      // Generate signed slide URLs
      let content: Record<string, unknown> = {};
      try {
        content =
          typeof block.content === "string"
            ? JSON.parse(block.content)
            : (block.content as Record<string, unknown>) ?? {};
      } catch {}

      const slideKeys: string[] = Array.isArray(content?.slides)
        ? (content.slides as string[])
        : [];

      const slideData: {
        slideNumber: number;
        url: string;
        expiresIn: number;
      }[] = [];
      for (let i = 0; i < slideKeys.length; i++) {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(slideKeys[i], SIGNED_URL_EXPIRES_SEC);
        if (data?.signedUrl) {
          slideData.push({
            slideNumber: i + 1,
            url: data.signedUrl,
            expiresIn: SIGNED_URL_EXPIRES_SEC,
          });
        }
      }

      segments.push({
        type: "presentation",
        slides: slideData,
        totalSlides: slideData.length,
      });
      hasPresentation = true;
    } else {
      currentHtmlBlocks.push(block);
    }
  }

  // Flush remaining HTML blocks
  if (currentHtmlBlocks.length > 0) {
    const html = renderLessonBlocks(currentHtmlBlocks, signedUrlMap);
    const { html: watermarked } = injectWatermarkIntoHtml(
      html,
      teacherName,
      teacher.employeeNumber
    );
    segments.push({ type: "html", html: watermarked });
  }

  // Log access
  const watermarkHash = `wm_${teacher.employeeNumber}_${Date.now()}`;
  await supabase.from("lesson_access_log").insert({
    user_id: teacher.employeeNumber,
    lesson_id: lessonId,
    action: "view",
    ip_address: null,
    user_agent: null,
    watermark_hash: watermarkHash,
  });

  return {
    lessonMeta: {
      title: (lesson as { title: string }).title,
      description:
        (lesson as { description: string | null }).description ?? null,
      curriculumTitle:
        (curriculum as { title: string } | null)?.title ?? null,
      duration:
        (lesson as { estimated_duration: number | null })
          .estimated_duration ?? null,
    },
    segments,
    hasPresentation,
    watermark: {
      teacherName,
      employeeNumber: teacher.employeeNumber,
      hash: watermarkHash,
    },
  };
}

export default async function LessonViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: lessonId } = await params;
  const { lessonMeta, segments, hasPresentation, watermark } =
    await getLessonContent(lessonId);

  return (
    <>
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href="/lessons"
          className="text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
        >
          My Lessons
        </Link>
        {lessonMeta.curriculumTitle && (
          <>
            <span className="mx-2">/</span>
            <span>{lessonMeta.curriculumTitle}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white">
          {lessonMeta.title}
        </span>
      </nav>

      {/* Simple text-only lesson → use original LessonViewer */}
      {!hasPresentation && segments.length > 0 && (
        <LessonViewer
          lessonId={lessonId}
          renderedHtml={
            segments
              .filter((s): s is ContentSegment & { type: "html" } => s.type === "html")
              .map((s) => s.html)
              .join("\n") || ""
          }
          lessonMeta={lessonMeta}
        />
      )}

      {/* Mixed content → interleave HTML and PresentationViewer */}
      {hasPresentation && (
        <div className="space-y-6">
          {segments.map((segment, i) => {
            if (segment.type === "html") {
              return (
                <LessonViewer
                  key={`html-${i}`}
                  lessonId={lessonId}
                  renderedHtml={segment.html}
                  lessonMeta={lessonMeta}
                />
              );
            }
            if (segment.type === "presentation" && segment.slides.length > 0) {
              return (
                <PresentationViewer
                  key={`pres-${i}`}
                  lessonId={lessonId}
                  lessonTitle={lessonMeta.title}
                  curriculumTitle={lessonMeta.curriculumTitle ?? null}
                  initialSlides={segment.slides}
                  watermark={watermark}
                  totalSlides={segment.totalSlides}
                />
              );
            }
            return null;
          })}
        </div>
      )}
    </>
  );
}
