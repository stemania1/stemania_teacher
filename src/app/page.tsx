import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

const LANDING_SUBTITLE = "Your secure portal for STEMania teaching resources.";
const SIGN_IN_CLASS =
  "rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        <header className="mb-16 flex justify-center">
          <div className="relative h-24 w-64 sm:h-32 sm:w-80">
            <Image
              src="/logo/stemania-logo.png"
              alt="STEMania Logo"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </header>

        <section className="mb-20 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              STEMania Teacher Portal
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
            {LANDING_SUBTITLE}
          </p>
          <Link href="/login" className={SIGN_IN_CLASS}>
            Sign In
          </Link>
        </section>

        <footer className="mt-20 border-t border-gray-200 pt-8 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400">
          <p>&copy; {new Date().getFullYear()} STEMania. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
}
