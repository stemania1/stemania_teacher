"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function W9ViewPage() {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/teacher/w9/view")
      .then((res) => {
        if (!res.ok) throw new Error(res.status === 404 ? "No completed W-9 found." : "Failed to load W-9.");
        return res.json();
      })
      .then((data) => setPdfUrl(data.url))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
        >
          &larr; Back to Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          My W-9
        </h1>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-stemania-teal-500 border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center dark:border-red-800 dark:bg-red-950">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Link
            href="/dashboard"
            className="mt-4 inline-block text-sm font-medium text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
          >
            Return to Dashboard
          </Link>
        </div>
      )}

      {pdfUrl && (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <iframe
            src={pdfUrl}
            title="W-9 Document"
            className="h-[80vh] w-full"
          />
        </div>
      )}
    </div>
  );
}
