import Link from "next/link";
import { redirect } from "next/navigation";
import LessonViewer from "@/components/LessonViewer";
import { getCurrentTeacherFromDb, hasAssignment } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { renderLessonBlocks, type LessonBlock } from "@/lib/lessonRenderer";
import { injectWatermarkIntoHtml } from "@/lib/watermark";

const BUCKET = "lesson-assets";
const SIGNED_URL_EXPIRES_SEC = 300;

async function getRenderedLesson(lessonId: string) {
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
  const storageKeys = new Set<string>();
  for (const b of blockList) {
    const c = b.content;
    if (b.block_type === "image" || b.block_type === "video") {
      if (c && typeof c === "object" && c !== null && typeof (c as { storage_key?: string }).storage_key === "string") {
        storageKeys.add((c as { storage_key: string }).storage_key);
      }
    }
  }

  const signedUrlMap = new Map<string, string>();
  for (const key of storageKeys) {
    const { data: signed } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(key, SIGNED_URL_EXPIRES_SEC);
    if (signed?.signedUrl) signedUrlMap.set(key, signed.signedUrl);
  }

  const rawHtml = renderLessonBlocks(blockList, signedUrlMap);
  const teacherName = `${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher";
  const { html: renderedHtml, watermarkHash } = injectWatermarkIntoHtml(
    rawHtml,
    teacherName,
    teacher.employeeNumber
  );

  await supabase.from("lesson_access_log").insert({
    user_id: teacher.employeeNumber,
    lesson_id: lessonId,
    action: "view",
    ip_address: null,
    user_agent: null,
    watermark_hash: watermarkHash,
  });

  const lessonMeta = {
    title: (lesson as { title: string }).title,
    description: (lesson as { description: string | null }).description ?? null,
    curriculumTitle: (curriculum as { title: string } | null)?.title ?? null,
    duration: (lesson as { estimated_duration: number | null }).estimated_duration ?? null,
  };

  return { renderedHtml, lessonMeta };
}

export default async function LessonViewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: lessonId } = await params;
  const { renderedHtml, lessonMeta } = await getRenderedLesson(lessonId);

  return (
    <>
      <nav className="mb-4 text-sm text-gray-500 dark:text-gray-400">
        <Link href="/lessons" className="text-teal-600 hover:underline dark:text-teal-400">
          My Lessons
        </Link>
        {lessonMeta.curriculumTitle && (
          <>
            <span className="mx-2">/</span>
            <span>{lessonMeta.curriculumTitle}</span>
          </>
        )}
        <span className="mx-2">/</span>
        <span className="text-gray-900 dark:text-white">{lessonMeta.title}</span>
      </nav>
      <LessonViewer
        lessonId={lessonId}
        renderedHtml={renderedHtml}
        lessonMeta={lessonMeta}
      />
    </>
  );
}
