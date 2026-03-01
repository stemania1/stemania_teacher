import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getSupabaseUserByEmail, linkAuthIdByEmail, LOGIN_STATUS_ACTIVE } from "@/lib/supabaseUsers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as
    | "recovery"
    | "signup"
    | "invite"
    | "magiclink"
    | "email_change"
    | null;
  const next = searchParams.get("next") ?? "/dashboard";

  const destination = type === "recovery" ? "/reset-password" : next;

  const makeSupabase = (response: NextResponse) =>
    createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

  const redirectToLogin = (error: string, sessionEmail?: string | null) => {
    const url = new URL(`${origin}/login`);
    url.searchParams.set("error", error);
    if (sessionEmail != null && sessionEmail !== "") {
      url.searchParams.set("session_email", sessionEmail);
    }
    return NextResponse.redirect(url.toString());
  };

  const runActiveUserCheck = async (
    response: NextResponse,
    redirectTarget: string,
    supabase: ReturnType<typeof makeSupabase>
  ): Promise<NextResponse> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const sessionEmail = user?.email?.trim() ?? null;
    const metaEmail = (user?.user_metadata as { email?: string } | undefined)?.email?.trim() ?? null;
    const identityEmail = (user?.identities?.[0]?.identity_data as { email?: string } | undefined)?.email?.trim() ?? null;
    const email = sessionEmail || metaEmail || identityEmail || null;

    if (!email) {
      console.error("[auth/callback] No email on user:", user?.id);
      await supabase.auth.signOut();
      return redirectToLogin("unregistered", "(no email in session)");
    }

    const sbUser = await getSupabaseUserByEmail(email);
    if (!sbUser) {
      console.error("[auth/callback] No users row for email:", email);
      await supabase.auth.signOut();
      return redirectToLogin("unregistered", email);
    }

    const loginStatus = sbUser.login_status ?? "inactive";
    if (loginStatus !== LOGIN_STATUS_ACTIVE) {
      await supabase.auth.signOut();
      return redirectToLogin("inactive");
    }

    if (!sbUser.supabase_user_id) {
      await linkAuthIdByEmail(user!.id, email);
    }

    response.headers.set("Location", `${origin}${redirectTarget}`);
    return response;
  };

  if (code) {
    const response = NextResponse.redirect(`${origin}${destination}`);
    const supabase = makeSupabase(response);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return runActiveUserCheck(response, destination, supabase);
    }
    console.error("Auth callback: code exchange failed:", error.message);
  }

  if (token_hash && type) {
    const response = NextResponse.redirect(`${origin}${destination}`);
    const supabase = makeSupabase(response);
    const { error } = await supabase.auth.verifyOtp({ token_hash, type });
    if (!error) {
      return runActiveUserCheck(response, destination, supabase);
    }
    console.error("Auth callback: OTP verification failed:", error.message);
  }

  return redirectToLogin("auth");
}
