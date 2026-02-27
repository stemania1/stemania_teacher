import { NextRequest, NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Validates the Origin/Referer header against the app's URL to prevent CSRF.
 * Returns null if valid, or a 403 NextResponse if the request is suspicious.
 */
export function validateCsrf(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) return null;

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  if (!appUrl) return null;

  const allowedHost = new URL(appUrl).host;

  if (origin) {
    try {
      if (new URL(origin).host !== allowedHost) {
        return NextResponse.json(
          { error: "Forbidden: cross-origin request" },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { error: "Forbidden: invalid origin" },
        { status: 403 }
      );
    }
  }

  if (referer) {
    try {
      if (new URL(referer).host !== allowedHost) {
        return NextResponse.json(
          { error: "Forbidden: cross-origin request" },
          { status: 403 }
        );
      }
      return null;
    } catch {
      return NextResponse.json(
        { error: "Forbidden: invalid referer" },
        { status: 403 }
      );
    }
  }

  return null;
}
