import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";
import { parseBody, logActionSchema } from "@/lib/validations";

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

    const parsed = await parseBody(request, logActionSchema);
    if ("error" in parsed) return parsed.error;

    const supabase = getSupabaseAdmin();
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || null;
    const userAgent = request.headers.get("user-agent") || null;

    await supabase.from("lesson_access_log").insert({
      user_id: teacher.employeeNumber,
      lesson_id: lessonId,
      action: parsed.data.action,
      ip_address: ip,
      user_agent: userAgent,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleApiError(error, "Failed to log action");
  }
}
