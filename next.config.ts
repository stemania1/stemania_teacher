import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
