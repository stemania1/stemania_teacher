import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN || "";

// Extract origins for CSP from env vars
const supabaseOrigin = supabaseUrl ? new URL(supabaseUrl).origin : "";
const sentryOrigin = sentryDsn
  ? (() => {
      try {
        const match = sentryDsn.match(/https?:\/\/[^/]+/);
        return match ? match[0] : "";
      } catch {
        return "";
      }
    })()
  : "";

const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval'`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
  `img-src 'self' data: blob: ${supabaseOrigin}`.trim(),
  `font-src 'self' https://fonts.gstatic.com`,
  `connect-src 'self' ${supabaseOrigin} ${sentryOrigin}`.trim(),
  "frame-src 'self'",
  "frame-ancestors 'self'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
];

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@stemania/shared"],
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/app",
        destination: "/dashboard",
        permanent: false,
      },
      {
        source: "/app/:path*",
        destination: "/dashboard",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
