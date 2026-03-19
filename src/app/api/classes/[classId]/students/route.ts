import { NextResponse, NextRequest } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json(
        { error: "Unauthorized or user not found in directory" },
        { status: 401 }
      );
    }

    const { classId } = await params;
    const supabase = getSupabaseAdmin();

    // Verify teacher is assigned to this class
    const { data: assignment } = await supabase
      .from("class_teacher_assignments")
      .select("id")
      .eq("class_id", classId)
      .eq("teacher_id", teacher.employeeNumber)
      .limit(1)
      .single();

    if (!assignment) {
      return NextResponse.json(
        { error: "You are not assigned to this class" },
        { status: 403 }
      );
    }

    // Get enrolled students
    const { data: enrollments, error: enrollError } = await supabase
      .from("class_enrollments")
      .select("student_id")
      .eq("class_id", classId);

    if (enrollError) throw new Error(enrollError.message);

    const studentIds = (enrollments || [])
      .map((e: { student_id: string }) => e.student_id)
      .filter(Boolean);

    if (studentIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    const { data: students, error: studentError } = await supabase
      .from("students")
      .select("id, name, email")
      .in("id", studentIds)
      .order("name");

    if (studentError) throw new Error(studentError.message);

    return NextResponse.json({
      students: (students || []).map(
        (s: { id: string; name: string; email: string | null }) => ({
          id: s.id,
          name: s.name,
          email: s.email ?? null,
        })
      ),
    });
  } catch (error) {
    return handleApiError(error, "Failed to fetch students");
  }
}
