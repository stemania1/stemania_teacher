import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb, hasAssignment } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const allowed = await hasAssignment(teacher.employeeNumber, lessonId);
    if (!allowed) {
      return NextResponse.json(
        { error: "You do not have access to this lesson" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, curriculum_id")
      .eq("id", lessonId)
      .single();
    if (!lesson) {
      return NextResponse.json(
        { error: "Lesson not found" },
        { status: 404 }
      );
    }

    const { data: curriculum } = await supabase
      .from("curricula")
      .select("title")
      .eq("id", (lesson as { curriculum_id: string }).curriculum_id)
      .single();

    const { data: block } = await supabase
      .from("lesson_blocks")
      .select("content")
      .eq("lesson_id", lessonId)
      .eq("block_type", "presentation")
      .limit(1)
      .single();

    if (!block) {
      return NextResponse.json(
        { error: "No presentation found for this lesson" },
        { status: 404 }
      );
    }

    const content =
      typeof block.content === "string"
        ? JSON.parse(block.content)
        : block.content;
    const slideKeys: string[] = Array.isArray(content?.slides)
      ? content.slides
      : [];

    const slides: { slideNumber: number; url: string; expiresIn: number }[] =
      [];
    for (let i = 0; i < slideKeys.length; i++) {
      const { data } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(slideKeys[i], SIGNED_URL_EXPIRES_SEC);
      if (data?.signedUrl) {
        slides.push({
          slideNumber: i + 1,
          url: data.signedUrl,
          expiresIn: SIGNED_URL_EXPIRES_SEC,
        });
      }
    }

    const teacherName =
      `${teacher.firstName} ${teacher.lastName}`.trim() || "Teacher";
    const watermarkHash = `wm_${teacher.employeeNumber}_${Date.now()}`;

    const forwarded = request.headers.get("x-forwarded-for");
    const ip =
      forwarded?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      null;
    const userAgent = request.headers.get("user-agent") || null;

    await supabase.from("lesson_access_log").insert({
      user_id: teacher.employeeNumber,
      lesson_id: lessonId,
      action: "view",
      ip_address: ip,
      user_agent: userAgent,
      watermark_hash: watermarkHash,
    });

    return NextResponse.json({
      lessonTitle: (lesson as { title: string }).title,
      curriculumTitle:
        (curriculum as { title: string } | null)?.title ?? null,
      slideCount: slides.length,
      slides,
      watermark: {
        teacherName,
        employeeNumber: teacher.employeeNumber,
        hash: watermarkHash,
      },
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to load slides",
      },
      { status: 500 }
    );
  }
}
