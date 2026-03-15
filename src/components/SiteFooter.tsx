import Link from "next/link";

export function SiteFooter() {
  return (
    <footer
      className="mt-auto border-t border-gray-200 py-3 text-center text-sm text-gray-600 dark:border-gray-700 dark:text-gray-400"
      role="contentinfo"
    >
      <nav className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link
          href="/privacy-policy"
          className="underline hover:text-gray-900 dark:hover:text-gray-200"
        >
          Privacy Policy
        </Link>
        <span aria-hidden="true">·</span>
        <Link
          href="/terms"
          className="underline hover:text-gray-900 dark:hover:text-gray-200"
        >
          Terms of Service
        </Link>
      </nav>
      <p className="mt-1 text-[14px] text-[#6C757D]">
        © {new Date().getFullYear()} STEMania
      </p>
    </footer>
  );
}
