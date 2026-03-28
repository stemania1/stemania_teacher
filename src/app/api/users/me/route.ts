import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { parseBody, updateProfileSchema } from "@/lib/validations";

export async function GET() {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    email: teacher.email,
    firstName: teacher.firstName,
    lastName: teacher.lastName,
    displayName: [teacher.firstName, teacher.lastName].filter(Boolean).join(" ") || "Teacher",
  });
}

export async function PATCH(request: Request) {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = await parseBody(request, updateProfileSchema);
  if ("error" in parsed) return parsed.error;

  const { firstName, lastName } = parsed.data;

  const updates: Record<string, string> = {};
  if (firstName !== undefined) updates.first_name = firstName.trim();
  if (lastName !== undefined) updates.last_name = lastName.trim();

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("users")
    .update(updates)
    .eq("employee_number", teacher.employeeNumber);

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  const updatedFirst = firstName !== undefined ? firstName.trim() : teacher.firstName;
  const updatedLast = lastName !== undefined ? lastName.trim() : teacher.lastName;

  return NextResponse.json({
    email: teacher.email,
    firstName: updatedFirst,
    lastName: updatedLast,
    displayName: [updatedFirst, updatedLast].filter(Boolean).join(" ") || "Teacher",
  });
}
