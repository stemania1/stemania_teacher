import { NextRequest, NextResponse } from "next/server";
import { getCurrentTeacherFromDb } from "@/lib/lessonDeliveryAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getStripe } from "@/lib/stripe";
import { handleApiError } from "@/lib/apiErrorHandler";

export async function POST(request: NextRequest) {
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

    if (user?.stripe_onboarding_complete) {
      return NextResponse.json(
        { error: "Bank account onboarding already complete" },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    let stripeAccountId = user?.stripe_account_id;

    // Create a new Stripe Express account if one doesn't exist
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "US",
        business_type: "individual",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        individual: {
          first_name: teacher.firstName,
          last_name: teacher.lastName,
          email: teacher.email ?? undefined,
        },
        metadata: {
          stemania_user_id: String(teacher.employeeNumber),
        },
      });

      stripeAccountId = account.id;

      await admin
        .from("users")
        .update({ stripe_account_id: account.id })
        .eq("employee_number", teacher.employeeNumber);
    }

    // Generate the hosted onboarding link
    const baseUrl =
      request.headers.get("origin") ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://teacher.stemania.com";

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      type: "account_onboarding",
      return_url: `${baseUrl}/dashboard?stripe=complete`,
      refresh_url: `${baseUrl}/dashboard?stripe=refresh`,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    return handleApiError(error, "Failed to initiate Stripe onboarding");
  }
}
