"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

const ERROR_MESSAGES: Record<string, string> = {
  unregistered: "You don't have an account. Contact your administrator.",
  inactive: "Your account is not active. Contact your administrator.",
  auth: "Authentication failed. Please try again.",
};

function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const err = searchParams.get("error");
    const sessionEmail = searchParams.get("session_email");
    if (err && ERROR_MESSAGES[err]) {
      let msg = ERROR_MESSAGES[err];
      if (err === "unregistered" && sessionEmail) {
        msg += ` (email: ${decodeURIComponent(sessionEmail)})`;
      }
      setError(msg);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
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

  const handleSignInWithGoogle = (e: React.MouseEvent) => {
    e.preventDefault();
    setError("");
    setGoogleLoading(true);
    const baseUrl =
      typeof window !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
        ? process.env.NEXT_PUBLIC_SITE_URL
        : typeof window !== "undefined"
          ? window.location.origin
          : "";
    const redirectTo = baseUrl ? `${baseUrl}/auth/callback` : `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`;
    const supabase = createSupabaseBrowserClient();
    supabase.auth
      .signInWithOAuth({
        provider: "google",
        options: {
          redirectTo,
          queryParams: {
            prompt: "select_account",
          },
        },
      })
      .then(({ error: oauthError }) => {
        if (oauthError) {
          setError(oauthError.message);
          setGoogleLoading(false);
        }
      })
      .catch(() => {
        setError("An unexpected error occurred. Please try again.");
        setGoogleLoading(false);
      });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stemania-teal-50 via-white to-stemania-green-50 px-4 py-12 dark:from-stemania-dark dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <div className="relative h-20 w-48 sm:h-24 sm:w-56">
            <Image
              src="/logo/stemania-logo.png"
              alt="STEMania Logo"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </div>

        <div className="rounded-2xl border border-stemania-teal-200 bg-white p-8 shadow-lg dark:border-stemania-teal-800 dark:bg-gray-800">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
            Teacher Sign In
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Sign in with Google — outside form for Safari */}
          <button
            type="button"
            onClick={handleSignInWithGoogle}
            disabled={googleLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-stemania-teal-400 bg-stemania-teal-50 px-4 py-3 text-sm font-semibold text-stemania-teal-800 shadow-sm transition-colors hover:bg-stemania-teal-100 disabled:opacity-50 dark:border-stemania-teal-600 dark:bg-stemania-teal-900/40 dark:text-stemania-teal-100 dark:hover:bg-stemania-teal-900/60"
          >
            {googleLoading ? (
              "Redirecting..."
            ) : (
              <>
                <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
                Sign in with Google
              </>
            )}
          </button>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-300 dark:border-gray-600" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                — or sign in with email —
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-stemania-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stemania-teal-600 disabled:opacity-50 dark:bg-stemania-teal-500 dark:hover:bg-stemania-teal-600"
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200"
          >
            &larr; Back to Home
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600 dark:text-gray-400">
          &copy; {new Date().getFullYear()} STEMania Teacher Portal. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stemania-teal-50 via-white to-stemania-green-50 dark:from-stemania-dark dark:via-gray-800 dark:to-gray-900">
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
