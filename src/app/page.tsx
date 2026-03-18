import Image from "next/image";
import Link from "next/link";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { redirect } from "next/navigation";

const ADMIN_JOIN_URL = `${process.env.NEXT_PUBLIC_ADMIN_APP_URL || "https://admin.stemania.com"}/join`;

export default async function Home() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Full-bleed hero background */}
      <Image
        src="/hero-bg.jpg"
        alt=""
        fill
        className="object-cover object-center"
        loading="eager"
        sizes="(max-width: 1920px) 100vw, 1920px"
        quality={80}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Content */}
      <div className="relative z-10 flex flex-1 flex-col">
        {/* Header — logo top-left */}
        <header className="px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
          <Link
            href="/dashboard"
            aria-label="Return to dashboard"
            className="inline-block rounded-xl bg-white/80 px-3 py-2 shadow-md backdrop-blur-sm"
          >
            <Image
              src="/logo/stemania-logo.png"
              alt="STEMania Logo"
              width={160}
              height={48}
              className="h-10 w-auto sm:h-12"
              priority
              sizes="(max-width: 640px) 120px, 160px"
            />
          </Link>
        </header>

        {/* Hero — centered tagline + CTAs */}
        <main
          id="main-content"
          className="flex flex-1 flex-col items-center justify-center px-4 sm:px-6 lg:px-8"
        >
          <h1 className="mb-4 text-center text-[28px] font-bold leading-tight tracking-tight text-white drop-shadow-lg sm:text-[40px] md:text-[48px]">
            Welcome to STEMania&rsquo;s Teacher Portal
          </h1>

          <p className="mx-auto mb-12 max-w-[600px] text-center text-[15px] leading-relaxed text-white/80 sm:mb-14 sm:text-[16px] md:text-[18px]">
            Welcome to STEMania! This portal is for registered users only. If
            you would like to become a STEMania Teacher or STEMania Franchise
            Owner, please select &ldquo;Join Our Team&rdquo; below. Tell us
            about yourself, and we&rsquo;ll reach out!
          </p>

          <div className="flex w-full max-w-md flex-col gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-lg bg-[#0D6EFD] px-8 text-base font-semibold text-white shadow-lg transition-colors hover:bg-[#0b5ed7] focus:outline-none focus:ring-2 focus:ring-[#0D6EFD] focus:ring-offset-2 focus:ring-offset-black/50"
            >
              Sign In
            </Link>
            <a
              href={ADMIN_JOIN_URL}
              className="flex min-h-[48px] flex-1 items-center justify-center rounded-lg border-2 border-white/80 bg-transparent px-8 text-base font-semibold text-white shadow-lg transition-colors hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-black/50"
            >
              Join Our Team
            </a>
          </div>
        </main>

        {/* Footer */}
        <footer className="px-4 py-6 text-center sm:px-6 lg:px-8">
          <p className="mb-1 text-sm text-white/70">
            Questions?{" "}
            <a
              href="mailto:admin@stemania.com"
              className="underline hover:text-white"
            >
              admin@stemania.com
            </a>
          </p>
          <p className="text-sm text-white/50">
            &copy; {new Date().getFullYear()} STEMania. All rights reserved.
          </p>
        </footer>
      </div>
    </div>
  );
}
