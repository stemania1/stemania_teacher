"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "My Lessons", href: "/lessons" },
  { label: "Schedule", href: "/schedule" },
];

interface UserMe {
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
}

export default function TeacherNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserMe | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/users/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data && setUser(data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const initials = user
    ? [user.firstName, user.lastName]
        .map((s) => (s || "").trim().charAt(0))
        .filter(Boolean)
        .join("")
        .toUpperCase() || "?"
    : "?";

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

          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-stemania-teal-100 text-sm font-semibold text-stemania-teal-700 ring-1 ring-stemania-teal-200 dark:bg-stemania-teal-900 dark:text-stemania-teal-300 dark:ring-stemania-teal-700"
              aria-expanded={menuOpen}
              aria-haspopup="true"
            >
              {initials}
            </button>
            {menuOpen && (
              <div
                className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white py-1 shadow-lg dark:border-gray-700 dark:bg-gray-800"
                role="menu"
              >
                {user && (
                  <div className="border-b border-gray-100 px-4 py-3 dark:border-gray-700">
                    <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                      {user.displayName}
                    </p>
                    {user.email && (
                      <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                        {user.email}
                      </p>
                    )}
                  </div>
                )}
                <Link
                  href="/dashboard/my-information"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  My Information
                </Link>
                <Link
                  href="/sign-out"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-700"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  Sign Out
                </Link>
              </div>
            )}
          </div>
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
