import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb, hasAssignment } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { renderLessonBlocks, type LessonBlock } from "@/lib/lessonRenderer";
import { injectWatermarkIntoHtml } from "@/lib/watermark";

const BUCKET = "lesson-assets";
const SIGNED_URL_EXPIRES_SEC = 300;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: lessonId } = await params;
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json(
        { error: "Unauthorized or user not found in directory" },
        { status: 401 }
      );
    }

    const allowed = await hasAssignment(teacher.employeeNumber, lessonId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You do not have access to this lesson" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .select("id, title, description, estimated_duration, curriculum_id")
      .eq("id", lessonId)
      .single();

    if (lessonError || !lesson) {
      if (lessonError?.code === "PGRST116") {
        return NextResponse.json(
          { error: "Lesson not found" },
          { status: 404 }
        );
      }
      throw new Error(lessonError?.message || "Failed to fetch lesson");
    }

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

    if (blocksError) throw new Error(blocksError.message);

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

    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;
    await supabase.from("lesson_access_log").insert({
      user_id: teacher.employeeNumber,
      lesson_id: lessonId,
      action: "view",
      ip_address: ip,
      user_agent: userAgent,
      watermark_hash: watermarkHash,
    });

    const lessonMeta = {
      title: (lesson as { title: string }).title,
      description: (lesson as { description: string | null }).description ?? null,
      curriculumTitle: (curriculum as { title: string } | null)?.title ?? null,
      duration: (lesson as { estimated_duration: number | null }).estimated_duration ?? null,
    };

    return NextResponse.json({ renderedHtml, lessonMeta });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load lesson" },
      { status: 500 }
    );
  }
}
