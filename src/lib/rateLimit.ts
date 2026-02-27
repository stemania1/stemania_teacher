import { NextResponse, type NextRequest } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

let ratelimit: Ratelimit | null = null;

function getRateLimiter(): Ratelimit | null {
  if (ratelimit) return ratelimit;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  ratelimit = new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
    prefix: "teacher",
  });
  return ratelimit;
}

const ipHits = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

function inMemoryRateLimit(ip: string): { success: boolean; remaining: number } {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true, remaining: MAX_REQUESTS - 1 };
  }
  entry.count++;
  const remaining = Math.max(0, MAX_REQUESTS - entry.count);
  return { success: entry.count <= MAX_REQUESTS, remaining };
}

export function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "127.0.0.1"
  );
}

export async function checkRateLimit(
  request: NextRequest,
  options?: { prefix?: string }
): Promise<{ success: boolean; response?: NextResponse }> {
  const ip = getClientIp(request);
  const identifier = options?.prefix ? `${options.prefix}:${ip}` : ip;

  const limiter = getRateLimiter();

  if (limiter) {
    const result = await limiter.limit(identifier);
    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Too many requests. Please try again later." },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.ceil(result.reset / 1000 - Date.now() / 1000)),
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": String(result.remaining),
            },
          }
        ),
      };
    }
    return { success: true };
  }

  const fallback = inMemoryRateLimit(identifier);
  if (!fallback.success) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "X-RateLimit-Remaining": String(fallback.remaining),
          },
        }
      ),
    };
  }
  return { success: true };
}

const authIpHits = new Map<string, { count: number; resetAt: number }>();
const AUTH_MAX = 10;

export async function checkAuthRateLimit(
  request: NextRequest
): Promise<{ success: boolean; response?: NextResponse }> {
  const ip = getClientIp(request);
  const identifier = `auth:${ip}`;

  const limiter = getRateLimiter();

  if (limiter) {
    const authLimiter = new Ratelimit({
      redis: new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL!,
        token: process.env.UPSTASH_REDIS_REST_TOKEN!,
      }),
      limiter: Ratelimit.slidingWindow(AUTH_MAX, "1 m"),
      prefix: "teacher:auth",
    });

    const result = await authLimiter.limit(identifier);
    if (!result.success) {
      return {
        success: false,
        response: NextResponse.json(
          { error: "Too many authentication attempts. Please try again later." },
          { status: 429, headers: { "Retry-After": "60" } }
        ),
      };
    }
    return { success: true };
  }

  const now = Date.now();
  const entry = authIpHits.get(ip);
  if (!entry || now > entry.resetAt) {
    authIpHits.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { success: true };
  }
  entry.count++;
  if (entry.count > AUTH_MAX) {
    return {
      success: false,
      response: NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": "60" } }
      ),
    };
  }
  return { success: true };
}
