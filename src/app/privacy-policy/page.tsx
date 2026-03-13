import { readFile } from "fs/promises";
import path from "path";
import { marked } from "marked";
import type { Metadata } from "next";
import Link from "next/link";

function sanitizeHtml(html: string): string {
  return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");
}

export const metadata: Metadata = {
  title: "Privacy Policy - STEMania Teacher",
  description: "Privacy Policy for STEMania Admin and STEMania Teacher.",
};

export default async function PrivacyPolicyPage() {
  const docsPath = path.join(process.cwd(), "docs", "privacy-policy.md");
  const md = await readFile(docsPath, "utf-8").catch(() => "");
  const raw = typeof md === "string" && md ? (marked.parse(md) as string) : "";
  const html = sanitizeHtml(raw ?? "");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8" id="main-content">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          >
            ← Back to STEMania Teacher
          </Link>
        </div>
        <article
          className="legal-content rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 sm:p-8"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </main>
    </div>
  );
}
