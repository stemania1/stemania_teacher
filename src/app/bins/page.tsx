"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Bin {
  id: string;
  series: string;
  label: string;
  status: "ready" | "needs_restock" | "checked_out";
  notes: string | null;
  itemCount: number;
  latestCheck: {
    id: string;
    checkType: string;
    status: string;
    createdAt: string;
  } | null;
}

const STATUS_CONFIG = {
  ready: {
    label: "Ready",
    bg: "bg-stemania-green-50 dark:bg-stemania-green-500/10",
    text: "text-stemania-green-600 dark:text-stemania-green-400",
    dot: "bg-stemania-green-500",
  },
  needs_restock: {
    label: "Needs Restock",
    bg: "bg-stemania-red-50 dark:bg-stemania-red-500/10",
    text: "text-stemania-red-600 dark:text-stemania-red-400",
    dot: "bg-stemania-red-500",
  },
  checked_out: {
    label: "Checked Out",
    bg: "bg-stemania-yellow-50 dark:bg-stemania-yellow-500/10",
    text: "text-stemania-yellow-500 dark:text-stemania-yellow-400",
    dot: "bg-stemania-yellow-500",
  },
} as const;

export default function BinsPage() {
  const [bins, setBins] = useState<Bin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/bins")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bins");
        return res.json();
      })
      .then((data) => setBins(data.bins || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <div className="mb-6">
          <div className="h-9 w-40 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700"
            />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-stemania-red-400 bg-stemania-red-50 p-6 dark:border-stemania-red-600 dark:bg-stemania-red-50/10">
        <h2 className="text-lg font-semibold text-stemania-red-600">Error</h2>
        <p className="mt-1 text-stemania-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
        My Bins
      </h1>

      {bins.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <p className="text-gray-500 dark:text-gray-400">
            No bins assigned to your franchise.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {bins.map((bin) => {
            const cfg = STATUS_CONFIG[bin.status] || STATUS_CONFIG.ready;
            return (
              <Link
                key={bin.id}
                href={`/bins/${bin.id}`}
                className="block rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-gray-700 dark:bg-gray-800 sm:p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {bin.label}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                      {bin.series}
                    </p>
                    <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                      {bin.itemCount} {bin.itemCount === 1 ? "item" : "items"}
                      {bin.latestCheck && (
                        <>
                          {" \u00B7 "}Last checked{" "}
                          {new Date(bin.latestCheck.createdAt).toLocaleDateString()}
                        </>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${cfg.bg} ${cfg.text}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`}
                      aria-hidden="true"
                    />
                    {cfg.label}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
