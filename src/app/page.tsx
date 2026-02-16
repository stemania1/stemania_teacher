import Image from "next/image";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const { userId } = await auth();

  if (userId) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="container mx-auto px-4 py-16 sm:px-6 lg:px-8">
        {/* Header with Logo */}
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

        {/* Hero Section */}
        <section className="mb-20 text-center">
          <h1 className="mb-6 text-4xl font-bold tracking-tight text-gray-900 dark:text-white sm:text-5xl md:text-6xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-teal-600 to-blue-600 bg-clip-text text-transparent">
              STEMania Teacher Portal
            </span>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600 dark:text-gray-300 sm:text-xl">
            Access lesson plans, class schedules, student resources, and
            teaching tools — all in one place.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/login"
              className="rounded-lg bg-teal-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 dark:bg-teal-500 dark:hover:bg-teal-600"
            >
              Sign In
            </Link>
          </div>
        </section>

        {/* Feature Cards */}
        <section className="mx-auto grid max-w-5xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            title="Lesson Plans"
            description="Access and manage curriculum-aligned lesson plans for all your classes."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            }
          />
          <FeatureCard
            title="Class Schedules"
            description="View your upcoming classes, locations, and student rosters at a glance."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
              </svg>
            }
          />
          <FeatureCard
            title="Teaching Resources"
            description="Download worksheets, presentations, and activity guides for your lessons."
            icon={
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
            }
          />
        </section>

        {/* Footer */}
        <footer className="mt-20 border-t border-gray-200 pt-8 text-center text-gray-600 dark:border-gray-700 dark:text-gray-400">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} STEMania. All rights reserved.
          </p>
        </footer>
      </main>
    </div>
  );
}

function FeatureCard({
  title,
  description,
  icon,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white/80 p-6 text-left shadow-sm transition-all hover:shadow-md dark:border-gray-700 dark:bg-gray-800/80">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-400">
        {description}
      </p>
    </div>
  );
}
