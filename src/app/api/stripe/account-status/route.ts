import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function GET() {
  try {
    const teacher = await getCurrentTeacherFromDb();
    if (!teacher) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const admin = getSupabaseAdmin();
    const { data: user } = await admin
      .from("users")
      .select("stripe_account_id, stripe_onboarding_complete")
      .eq("employee_number", teacher.employeeNumber)
      .single();

    if (!user?.stripe_account_id) {
      return NextResponse.json({ status: "not_started" });
    }

    if (user.stripe_onboarding_complete) {
      return NextResponse.json({ status: "complete" });
    }

    return NextResponse.json({ status: "in_progress" });
  } catch (error) {
    return handleApiError(error, "Failed to check Stripe account status");
  }
}
