import Image from "next/image";
import Link from "next/link";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mb-8">
        <div className="relative h-16 w-48 sm:h-20 sm:w-56">
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
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-lg dark:border-gray-700 dark:bg-gray-800">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Invitation Only
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          This application is by invitation only. If you have received an invitation, please use the link provided in your email to create your account.
        </p>
        <Link
          href="/login"
          className="inline-block rounded-lg bg-stemania-teal-500 px-6 py-2 text-base font-semibold text-white transition-colors hover:bg-stemania-teal-600"
        >
          Sign In
        </Link>
      </div>
    </div>
  );
}
