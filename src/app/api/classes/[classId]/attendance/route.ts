import { NextResponse, NextRequest } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET(
  request: NextRequest,
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
    const date = request.nextUrl.searchParams.get("date");
    if (!date) {
      return NextResponse.json(
        { error: "date query parameter is required" },
        { status: 400 }
      );
    }

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

    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("id, student_id, status, notes, recorded_at")
      .eq("class_id", classId)
      .eq("session_date", date);

    if (error) throw new Error(error.message);

    return NextResponse.json({ records: records || [] });
  } catch (error) {
    return handleApiError(error, "Failed to fetch attendance");
  }
}

export async function POST(
  request: NextRequest,
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
    const body = await request.json();
    const { date, records } = body as {
      date: string;
      records: { studentId: string; status: string; notes?: string }[];
    };

    if (!date || !records || !Array.isArray(records)) {
      return NextResponse.json(
        { error: "date and records[] are required" },
        { status: 400 }
      );
    }

    // Validate status values
    const validStatuses = ["present", "absent", "tardy"];
    for (const r of records) {
      if (!r.studentId || !validStatuses.includes(r.status)) {
        return NextResponse.json(
          { error: `Invalid record: studentId and status (present|absent|tardy) are required` },
          { status: 400 }
        );
      }
    }

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

    // Upsert attendance records
    const rows = records.map((r) => ({
      class_id: classId,
      student_id: r.studentId,
      session_date: date,
      status: r.status,
      notes: r.notes || null,
      recorded_by: teacher.employeeNumber,
      recorded_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from("attendance_records")
      .upsert(rows, { onConflict: "class_id,student_id,session_date" });

    if (error) throw new Error(error.message);

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    return handleApiError(error, "Failed to save attendance");
  }
}
