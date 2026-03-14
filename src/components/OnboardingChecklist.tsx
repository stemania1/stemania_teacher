"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface OnboardingSteps {
  accountCreated: boolean;
  passwordSet: boolean;
  w9Submitted: boolean;
  contractSigned: boolean;
  bankConnected: boolean;
  fullyOnboarded: boolean;
}

interface OnboardingData {
  onboardingStatus: string;
  steps: OnboardingSteps;
}

interface StepConfig {
  key: keyof OnboardingSteps;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function CheckIcon() {
  return (
    <svg
      className="h-5 w-5 text-white"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.5}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function StepIcon({ complete }: { complete: boolean }) {
  return (
    <div
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors ${
        complete
          ? "bg-emerald-500"
          : "border-2 border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800"
      }`}
    >
      {complete && <CheckIcon />}
    </div>
  );
}

export default function OnboardingChecklist() {
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/onboarding-status")
      .then((r) => r.json())
      .then((d: OnboardingData) => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data || data.steps.fullyOnboarded) return null;

  const adminAppUrl =
    process.env.NEXT_PUBLIC_ADMIN_APP_URL ??
    process.env.NEXT_PUBLIC_ADMIN_URL ??
    "";

  const steps: StepConfig[] = [
    {
      key: "accountCreated",
      title: "Account Created",
      description: "Your STEMania teacher account is set up and ready.",
    },
    {
      key: "passwordSet",
      title: "Set Password",
      description: "Secure your account with a permanent password.",
      action: (
        <Link
          href={`${adminAppUrl}/set-password`}
          className="rounded-lg bg-stemania-teal-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-stemania-teal-600"
        >
          Set Password
        </Link>
      ),
    },
    {
      key: "w9Submitted",
      title: "W-9 Submitted",
      description: "Submit your tax form so we can pay you.",
      action: (
        <a
          href={`${adminAppUrl}/login?next=/w9`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-medium text-[#0D6EFD] hover:underline"
        >
          Complete your W-9
        </a>
      ),
    },
    {
      key: "contractSigned",
      title: "Contract Signed",
      description: "Review and sign your teaching contract.",
      action: (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Your admin will send this
        </span>
      ),
    },
    {
      key: "bankConnected",
      title: "Bank Account Connected",
      description: "Link your bank account to receive payments.",
      action: (
        <span className="text-xs text-gray-500 dark:text-gray-400">
          Your admin will set this up
        </span>
      ),
    },
    {
      key: "fullyOnboarded",
      title: "Fully Onboarded",
      description: "You're all set to start teaching with STEMania!",
    },
  ];

  const completedCount = steps.filter((s) => data.steps[s.key]).length;

  return (
    <div className="mb-8 rounded-xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-6 shadow-sm dark:border-blue-900/40 dark:from-blue-950/30 dark:to-gray-900">
      {/* Header */}
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            Getting Started
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Complete these steps to start teaching
          </p>
        </div>
        <span className="text-sm font-semibold text-stemania-teal-600 dark:text-stemania-teal-400">
          {completedCount} of {steps.length} complete
        </span>
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
        <div
          className="h-2 rounded-full bg-emerald-500 transition-all duration-500"
          style={{ width: `${(completedCount / steps.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <ol className="space-y-3">
        {steps.map((step, i) => {
          const complete = data.steps[step.key];
          return (
            <li
              key={step.key}
              data-testid={step.key === "w9Submitted" ? "step-w9Submitted" : undefined}
              className={`flex items-start gap-4 rounded-lg p-3 transition-colors ${
                complete
                  ? "opacity-60"
                  : "bg-white shadow-sm dark:bg-gray-800/60"
              }`}
            >
              <StepIcon complete={complete} />
              <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p
                    className={`text-sm font-semibold ${
                      complete
                        ? "text-gray-400 line-through dark:text-gray-500"
                        : "text-gray-800 dark:text-gray-100"
                    }`}
                  >
                    {i + 1}. {step.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
                {!complete && step.action && (
                  <div className="mt-2 shrink-0 sm:mt-0 sm:ml-4">
                    {step.action}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
