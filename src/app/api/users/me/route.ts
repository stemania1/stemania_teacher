import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";

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
