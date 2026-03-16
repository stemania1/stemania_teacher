import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email?.trim()?.toLowerCase();

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "invalid_email" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    const { data: user, error: userError } = await supabase
      .from("users")
      .select("supabase_user_id, email")
      .ilike("email", email)
      .limit(1)
      .maybeSingle();

    if (userError || !user) {
      return NextResponse.json({ error: "not_found" });
    }

    if (!user.supabase_user_id) {
      return NextResponse.json({ provider: "email" });
    }

    const { data: authUser, error: authError } =
      await supabase.auth.admin.getUserById(user.supabase_user_id);

    if (authError || !authUser?.user) {
      return NextResponse.json({ provider: "email" });
    }

    const hasGoogle = authUser.user.identities?.some(
      (id) => id.provider === "google"
    );

    return NextResponse.json({ provider: hasGoogle ? "google" : "email" });
  } catch (err) {
    console.error("[check-email] Unexpected error:", err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}
