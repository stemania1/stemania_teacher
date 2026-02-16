import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

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
      <SignUp
        path="/sign-up"
        routing="path"
        signInUrl="/login"
        fallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
