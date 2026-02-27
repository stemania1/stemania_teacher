import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb, hasAssignment } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

const BUCKET = "lesson-assets";
const SIGNED_URL_EXPIRES_SEC = 300;

// POST — Generate fresh signed URLs for slides (called when old ones are about to expire)
export async function POST(
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
        { error: "Assignment expired or revoked" },
        { status: 403 }
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: block } = await supabase
      .from("lesson_blocks")
      .select("content")
      .eq("lesson_id", lessonId)
      .eq("block_type", "presentation")
      .limit(1)
      .single();

    if (!block) {
      return NextResponse.json(
        { error: "No presentation found" },
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

    return NextResponse.json({ slides, watermarkHash });
  } catch (error) {
    return handleApiError(error, "Failed to refresh slides");
  }
}
