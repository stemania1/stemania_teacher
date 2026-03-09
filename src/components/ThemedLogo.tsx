"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

interface ThemedLogoProps {
  alt: string;
  className?: string;
  priority?: boolean;
}

export function ThemedLogo({
  alt,
  className = "object-contain",
  priority = false,
}: ThemedLogoProps) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);

    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <Image
      src={isDark ? "/logo/stemania-logo-dark.png" : "/logo/stemania-logo.png"}
      alt={alt}
      fill
      className={className}
      unoptimized
      loading={priority ? "eager" : undefined}
      priority={priority}
    />
  );
}
