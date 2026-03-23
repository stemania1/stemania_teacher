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

    // Get all attendance records for this class, ordered by date desc
    const { data: records, error } = await supabase
      .from("attendance_records")
      .select("id, student_id, session_date, status, notes, recorded_at")
      .eq("class_id", classId)
      .order("session_date", { ascending: false })
      .order("student_id");

    if (error) throw new Error(error.message);

    // Get student names for the records
    const studentIds = [
      ...new Set(
        (records || []).map((r: { student_id: string }) => r.student_id)
      ),
    ];

    let studentMap: Map<string, string> = new Map();
    if (studentIds.length > 0) {
      const { data: students } = await supabase
        .from("students")
        .select("id, name")
        .in("id", studentIds);

      studentMap = new Map(
        (students || []).map((s: { id: string; name: string }) => [
          s.id,
          s.name,
        ])
      );
    }

    // Group by session_date
    type RecordRow = {
      id: string;
      student_id: string;
      session_date: string;
      status: string;
      notes: string | null;
      recorded_at: string;
    };
    const grouped: Record<
      string,
      {
        date: string;
        records: {
          id: string;
          studentId: string;
          studentName: string;
          status: string;
          notes: string | null;
        }[];
        counts: { present: number; absent: number; tardy: number };
      }
    > = {};

    for (const r of (records || []) as RecordRow[]) {
      if (!grouped[r.session_date]) {
        grouped[r.session_date] = {
          date: r.session_date,
          records: [],
          counts: { present: 0, absent: 0, tardy: 0 },
        };
      }
      const group = grouped[r.session_date];
      group.records.push({
        id: r.id,
        studentId: r.student_id,
        studentName: studentMap.get(r.student_id) || "Unknown",
        status: r.status,
        notes: r.notes,
      });
      if (r.status === "present") group.counts.present++;
      else if (r.status === "absent") group.counts.absent++;
      else if (r.status === "tardy") group.counts.tardy++;
    }

    const sessions = Object.values(grouped).sort(
      (a, b) => b.date.localeCompare(a.date)
    );

    return NextResponse.json({ sessions });
  } catch (error) {
    return handleApiError(error, "Failed to fetch attendance history");
  }
}
