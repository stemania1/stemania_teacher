import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET() {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json(
        { error: "Unauthorized or user not found in directory" },
        { status: 401 }
      );
    }

    const supabase = getSupabaseAdmin();
    const { data: assignments, error: assignError } = await supabase
      .from("teacher_lesson_assignments")
      .select("lesson_id")
      .eq("teacher_id", teacher.employeeNumber)
      .eq("status", "active")
      .or("expires_at.is.null,expires_at.gt.now()");

    if (assignError) throw new Error(assignError.message);
    const lessonIds = (assignments || []).map((a: { lesson_id: string }) => a.lesson_id).filter(Boolean);
    if (lessonIds.length === 0) {
      return NextResponse.json({ lessons: [] });
    }

    const { data: lessons, error: lessError } = await supabase
      .from("lessons")
      .select("id, title, description, estimated_duration, curriculum_id")
      .in("id", lessonIds)
      .eq("status", "published");

    if (lessError) throw new Error(lessError.message);

    const curriculumIds = [...new Set((lessons || []).map((l: { curriculum_id: string }) => l.curriculum_id).filter(Boolean))];
    const { data: curricula } = await supabase
      .from("curricula")
      .select("id, title, subject, grade_level")
      .in("id", curriculumIds);

    type CurriculumRow = { id: string; title: string; subject: string | null; grade_level: string | null };
    const currMap = new Map((curricula || []).map((c: CurriculumRow) => [c.id, c]));
    const list = (lessons || []).map((l: { id: string; title: string; description: string | null; estimated_duration: number | null; curriculum_id: string }) => ({
      lessonId: l.id,
      title: l.title,
      description: l.description ?? null,
      curriculumTitle: currMap.get(l.curriculum_id)?.title ?? null,
      subject: currMap.get(l.curriculum_id)?.subject ?? null,
      gradeLevel: currMap.get(l.curriculum_id)?.grade_level ?? null,
      estimatedDuration: l.estimated_duration ?? null,
    }));

    return NextResponse.json({ lessons: list });
  } catch (error) {
    return handleApiError(error, "Failed to list lessons");
  }
}
