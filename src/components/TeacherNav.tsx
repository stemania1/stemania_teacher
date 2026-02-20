"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Lessons", href: "/lessons" },
  { label: "Schedule", href: "/schedule" },
];

export default function TeacherNav() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="border-b border-stemania-teal-200 bg-white dark:border-stemania-teal-800 dark:bg-gray-800">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/dashboard" className="flex-shrink-0">
          <div className="relative h-10 w-28 sm:h-14 sm:w-36">
            <Image
              src="/logo/stemania-logo.png"
              alt="STEMania Teacher Portal"
              fill
              className="object-contain"
              priority
              unoptimized
            />
          </div>
        </Link>
        <nav aria-label="Main navigation" className="flex items-center gap-2">
          <div className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive(item.href) ? "page" : undefined}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  isActive(item.href)
                    ? "bg-stemania-teal-50 text-stemania-teal-700 dark:bg-stemania-teal-900/30 dark:text-stemania-teal-400"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
          <UserButton afterSignOutUrl="/" />
        </nav>
      </div>

      {/* Mobile nav */}
      <nav
        aria-label="Mobile navigation"
        className="flex items-center gap-1 overflow-x-auto px-4 pb-3 sm:px-6 md:hidden scrollbar-hide"
      >
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(item.href) ? "page" : undefined}
            className={`whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive(item.href)
                ? "bg-stemania-teal-50 text-stemania-teal-700 dark:bg-stemania-teal-900/30 dark:text-stemania-teal-400"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
