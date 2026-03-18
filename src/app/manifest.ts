import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STEMania Teacher",
    short_name: "STEMania Teacher",
    description: "Teacher resources and tools for STEMania educators",
    start_url: "/",
    display: "standalone",
    background_color: "#20C997",
    theme_color: "#20C997",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-180.png", sizes: "180x180", type: "image/png", purpose: "any" },
      { src: "/icons/icon-167.png", sizes: "167x167", type: "image/png", purpose: "any" },
    ],
  };
}
