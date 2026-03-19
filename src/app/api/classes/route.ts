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

    // Get classes assigned to this teacher
    const { data: assignments, error: assignError } = await supabase
      .from("class_teacher_assignments")
      .select("class_id")
      .eq("teacher_id", teacher.employeeNumber);

    if (assignError) throw new Error(assignError.message);

    const classIds = (assignments || [])
      .map((a: { class_id: string }) => a.class_id)
      .filter(Boolean);

    if (classIds.length === 0) {
      return NextResponse.json({ classes: [] });
    }

    // Get class details from bookeo_classes
    const { data: classes, error: classError } = await supabase
      .from("bookeo_classes")
      .select("id, name, description, start_time, end_time")
      .in("id", classIds);

    if (classError) throw new Error(classError.message);

    const list = (classes || []).map(
      (c: {
        id: string;
        name: string;
        description: string | null;
        start_time: string | null;
        end_time: string | null;
      }) => ({
        classId: c.id,
        name: c.name,
        description: c.description ?? null,
        startTime: c.start_time ?? null,
        endTime: c.end_time ?? null,
      })
    );

    return NextResponse.json({ classes: list });
  } catch (error) {
    return handleApiError(error, "Failed to list classes");
  }
}
