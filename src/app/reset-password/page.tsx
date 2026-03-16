"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <Image
        src="/hero-bg.jpg"
        alt=""
        fill
        className="object-cover object-center"
        loading="eager"
        sizes="100vw"
        quality={80}
      />
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="inline-block rounded-xl bg-white/80 px-3 py-2 shadow-md backdrop-blur-sm">
            <Image
              src="/logo/stemania-logo.png"
              alt="STEMania Logo"
              width={160}
              height={48}
              className="h-10 w-auto sm:h-12"
              priority
              unoptimized
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          <h1 className="mb-2 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Set New Password
          </h1>
          <p className="mb-6 text-center text-sm text-gray-600 dark:text-gray-400">
            Enter your new password below.
          </p>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                New Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] w-full rounded-lg bg-stemania-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stemania-teal-600 disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-medium text-white/80 hover:text-white"
          >
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
