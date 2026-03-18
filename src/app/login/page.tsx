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

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

type LoginStep = "email" | "password" | "google";

function LoginForm() {
  const [step, setStep] = useState<LoginStep>("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
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

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setCheckingEmail(true);

    try {
      const res = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();

      if (data.error === "not_found") {
        setError("No account found. Contact your administrator.");
        return;
      }

      if (data.error) {
        setError("Something went wrong. Please try again or use the Google button above.");
        return;
      }

      if (data.provider === "google") {
        setStep("google");
        setError("This account uses Google Sign-In — please use the button above.");
      } else {
        setStep("password");
      }
    } catch {
      setError("Something went wrong. Please try again or use the Google button above.");
    } finally {
      setCheckingEmail(false);
    }
  };

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        { redirectTo: `${window.location.origin}/auth/callback?next=/reset-password` }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSuccess("Check your email for a password reset link.");
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep("email");
    setPassword("");
    setError("");
    setSuccess("");
    setForgotPassword(false);
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center px-4 py-12">
      <Image
        src="/hero-bg.jpg"
        alt=""
        fill
        className="object-cover object-center"
        loading="eager"
        sizes="(max-width: 1920px) 100vw, 1920px"
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
              sizes="(max-width: 640px) 120px, 160px"
            />
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-lg sm:p-8">
          <h1 className="mb-6 text-center text-2xl font-bold text-gray-900 dark:text-white">
            {forgotPassword ? "Reset Password" : "Sign In"}
          </h1>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-300">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-700 dark:bg-green-900/20 dark:text-green-300">
              {success}
            </div>
          )}

          {forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label
                  htmlFor="forgot-email"
                  className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] w-full rounded-lg bg-stemania-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stemania-teal-600 disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send Reset Link"}
              </button>

              <button
                type="button"
                onClick={handleBack}
                className="w-full text-sm font-medium text-stemania-teal-600 hover:text-stemania-teal-700 dark:text-stemania-teal-400 dark:hover:text-stemania-teal-300"
              >
                Back to Sign In
              </button>
            </form>

          ) : step === "email" ? (
            <>
              <button
                type="button"
                onClick={handleSignInWithGoogle}
                disabled={googleLoading}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                {googleLoading ? "Redirecting..." : (
                  <>
                    <GoogleIcon />
                    Continue with Google
                  </>
                )}
              </button>

              <div className="relative my-5">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                    — or continue with email —
                  </span>
                </div>
              </div>

              <form onSubmit={handleCheckEmail} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Email
                  </label>
                  <input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={checkingEmail}
                  className="min-h-[48px] w-full rounded-lg bg-stemania-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stemania-teal-600 disabled:opacity-50"
                >
                  {checkingEmail ? "Checking..." : "Continue"}
                </button>
              </form>
            </>

          ) : step === "google" ? (
            <>
              <button
                type="button"
                onClick={handleSignInWithGoogle}
                disabled={googleLoading}
                className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-lg border-2 border-stemania-teal-500 bg-stemania-teal-50 px-4 py-3 text-sm font-semibold text-stemania-teal-700 shadow-sm transition-colors hover:bg-stemania-teal-100 disabled:opacity-50 dark:border-stemania-teal-400 dark:bg-stemania-teal-900/20 dark:text-stemania-teal-300 dark:hover:bg-stemania-teal-900/40"
              >
                {googleLoading ? "Redirecting..." : (
                  <>
                    <GoogleIcon />
                    Sign in with Google
                  </>
                )}
              </button>

              <div className="mt-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm font-medium text-stemania-teal-600 hover:text-stemania-teal-700 dark:text-stemania-teal-400 dark:hover:text-stemania-teal-300"
                >
                  &larr; Back
                </button>
              </div>
            </>

          ) : (
            <>
              <div className="mb-4">
                <button
                  type="button"
                  onClick={handleBack}
                  className="text-sm font-medium text-stemania-teal-600 hover:text-stemania-teal-700 dark:text-stemania-teal-400 dark:hover:text-stemania-teal-300"
                >
                  &larr; Back
                </button>
              </div>

              <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
                Signing in as{" "}
                <span className="font-medium text-gray-900 dark:text-white">{email}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => { setForgotPassword(true); setError(""); }}
                      className="text-xs font-medium text-stemania-teal-600 hover:text-stemania-teal-700 dark:text-stemania-teal-400 dark:hover:text-stemania-teal-300"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <input
                    id="login-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoFocus
                    autoComplete="current-password"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:border-stemania-teal-500 focus:outline-none focus:ring-2 focus:ring-stemania-teal-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="min-h-[48px] w-full rounded-lg bg-stemania-teal-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stemania-teal-600 disabled:opacity-50"
                >
                  {loading ? "Signing in..." : "Sign In"}
                </button>
              </form>
            </>
          )}
        </div>

        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-sm font-medium text-white/80 hover:text-white"
          >
            &larr; Back to Home
          </Link>
        </div>

        <p className="mt-8 text-center text-sm text-white/50">
          &copy; {new Date().getFullYear()} STEMania. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="relative flex min-h-screen items-center justify-center">
        <div className="absolute inset-0 bg-black/40" />
        <p className="relative z-10 text-white/70">Loading...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
