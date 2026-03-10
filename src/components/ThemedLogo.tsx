"use client";

import Image from "next/image";
import { useSyncExternalStore } from "react";

function subscribeMatchMedia(callback: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getMatchMediaSnapshot() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerSnapshot() {
  return false;
}

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
  const isDark = useSyncExternalStore(
    subscribeMatchMedia,
    getMatchMediaSnapshot,
    getServerSnapshot
  );

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
