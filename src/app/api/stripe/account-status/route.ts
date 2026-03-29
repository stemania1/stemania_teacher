import { NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";
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

    // DB not yet updated — check Stripe directly (webhook may be delayed)
    const stripe = getStripe();
    const account = await stripe.accounts.retrieve(user.stripe_account_id);

    if (account.details_submitted && account.charges_enabled) {
      // Sync the DB so future checks are fast
      await admin
        .from("users")
        .update({ stripe_onboarding_complete: true })
        .eq("employee_number", teacher.employeeNumber);

      return NextResponse.json({ status: "complete" });
    }

    return NextResponse.json({ status: "in_progress" });
  } catch (error) {
    return handleApiError(error, "Failed to check Stripe account status");
  }
}
