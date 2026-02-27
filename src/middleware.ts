import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { checkRateLimit, checkAuthRateLimit } from "@/lib/rateLimit";
import { validateCsrf } from "@/lib/csrf";

const PUBLIC_ROUTES = ["/", "/login", "/sign-up", "/sign-out", "/auth/callback"];
const AUTH_ROUTES = ["/login", "/sign-up", "/api/auth"];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

function isAuthRoute(pathname: string): boolean {
  return AUTH_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rate limiting
  if (isAuthRoute(pathname)) {
    const authRL = await checkAuthRateLimit(request);
    if (!authRL.success) return authRL.response!;
  } else if (pathname.startsWith("/api/")) {
    const rl = await checkRateLimit(request);
    if (!rl.success) return rl.response!;
  }

  // CSRF check for mutating API requests
  if (pathname.startsWith("/api/")) {
    const csrfError = validateCsrf(request);
    if (csrfError) return csrfError;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("Middleware: Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500 }
    );
  }

  let supabaseResponse = NextResponse.next({ request });

  try {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !isPublicRoute(pathname)) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }
  } catch (error) {
    console.error("Middleware auth error:", error);
    if (isPublicRoute(pathname)) {
      return NextResponse.next();
    }
    return NextResponse.json(
      { error: "Authentication service error" },
      { status: 500 }
    );
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
