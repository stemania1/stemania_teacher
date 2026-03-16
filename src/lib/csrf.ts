import { NextRequest, NextResponse } from "next/server";
import { validateCsrf as validateCsrfShared } from "@stemania/shared";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

function getRequestHost(request: NextRequest): string | null {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).hostname;
    } catch {
      return null;
    }
  }
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).hostname;
    } catch {
      return null;
    }
  }
  return null;
}

export function validateCsrf(request: NextRequest): NextResponse | null {
  if (SAFE_METHODS.has(request.method)) return null;

  if (process.env.NODE_ENV === "development") {
    const requestHost = getRequestHost(request);
    if (requestHost && LOCAL_HOSTS.has(requestHost)) {
      return null;
    }
  }

  return validateCsrfShared(request);
}
