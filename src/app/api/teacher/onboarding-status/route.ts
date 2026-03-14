import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  const teacher = await getCurrentTeacherFromDb();
  if (!teacher) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = getSupabaseAdmin();

  const { data: user, error: userError } = await admin
    .from("users")
    .select("requires_password_change, onboarding_status")
    .eq("employee_number", teacher.employeeNumber)
    .single();

  if (userError || !user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const { data: w9Submission } = await admin
    .from("w9_submissions")
    .select("status")
    .eq("user_id", teacher.employeeNumber)
    .eq("status", "completed")
    .maybeSingle();

  const w9Submitted = !!w9Submission;

  const { data: signingRequests } = await admin
    .from("signing_requests")
    .select("document_type, status")
    .eq("user_id", teacher.employeeNumber)
    .neq("status", "cancelled");

  const contractSigned =
    signingRequests?.some(
      (r) => r.document_type === "contract" && r.status === "completed"
    ) ?? false;

  const onboardingStatus: string = user.onboarding_status ?? "applied";

  const bankConnected =
    onboardingStatus === "bank_connected" ||
    onboardingStatus === "fully_onboarded";

  const fullyOnboarded = onboardingStatus === "fully_onboarded";

  return NextResponse.json({
    onboardingStatus,
    steps: {
      accountCreated: true,
      passwordSet: !(user.requires_password_change ?? false),
      w9Submitted,
      contractSigned,
      bankConnected,
      fullyOnboarded,
    },
  });
}
