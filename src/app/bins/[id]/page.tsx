"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface BinItem {
  id: string;
  itemName: string;
  expectedQuantity: number;
  notes: string | null;
}

interface CheckItem {
  id: string;
  binItemId: string;
  status: string;
  quantityFound: number;
  notes: string | null;
  itemName: string;
}

interface Check {
  id: string;
  checkType: string;
  status: string;
  notes: string | null;
  createdAt: string;
  checkedBy: string;
  checkedByName: string;
  items: CheckItem[];
}

interface BinDetail {
  id: string;
  series: string;
  label: string;
  status: "ready" | "needs_restock" | "checked_out";
  notes: string | null;
  items: BinItem[];
}

interface CheckFormItem {
  bin_item_id: string;
  itemName: string;
  expectedQuantity: number;
  status: "present" | "missing" | "damaged";
  quantity_found: number;
  notes: string;
}

const STATUS_CONFIG = {
  ready: {
    label: "Ready",
    bg: "bg-stemania-green-50 dark:bg-stemania-green-500/10",
    text: "text-stemania-green-600 dark:text-stemania-green-400",
    border: "border-stemania-green-200 dark:border-stemania-green-800",
  },
  needs_restock: {
    label: "Needs Restock",
    bg: "bg-stemania-red-50 dark:bg-stemania-red-500/10",
    text: "text-stemania-red-600 dark:text-stemania-red-400",
    border: "border-stemania-red-200 dark:border-stemania-red-800",
  },
  checked_out: {
    label: "Checked Out",
    bg: "bg-stemania-yellow-50 dark:bg-stemania-yellow-500/10",
    text: "text-stemania-yellow-500 dark:text-stemania-yellow-400",
    border: "border-stemania-yellow-200 dark:border-stemania-yellow-800",
  },
} as const;

const ITEM_STATUS_OPTIONS = [
  {
    value: "present" as const,
    label: "Present",
    active: "bg-stemania-green-600 text-white dark:bg-stemania-green-500",
  },
  {
    value: "missing" as const,
    label: "Missing",
    active: "bg-stemania-red-600 text-white dark:bg-stemania-red-500",
  },
  {
    value: "damaged" as const,
    label: "Damaged",
    active: "bg-stemania-yellow-500 text-white dark:bg-stemania-yellow-400",
  },
];

export default function BinDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [bin, setBin] = useState<BinDetail | null>(null);
  const [checks, setChecks] = useState<Check[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check form state
  const [checkMode, setCheckMode] = useState<"pre_series" | "post_series" | null>(null);
  const [formItems, setFormItems] = useState<CheckFormItem[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const fetchBin = () => {
    setLoading(true);
    setError(null);
    fetch(`/api/bins/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load bin details");
        return res.json();
      })
      .then((data) => {
        setBin(data.bin);
        setChecks(data.checks || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchBin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const startCheck = (type: "pre_series" | "post_series") => {
    if (!bin) return;
    setCheckMode(type);
    setSubmitResult(null);
    setFormItems(
      bin.items.map((item) => ({
        bin_item_id: item.id,
        itemName: item.itemName,
        expectedQuantity: item.expectedQuantity,
        status: "present",
        quantity_found: item.expectedQuantity,
        notes: "",
      }))
    );
  };

  const updateFormItem = (index: number, updates: Partial<CheckFormItem>) => {
    setFormItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!checkMode || formItems.length === 0) return;
    setSubmitting(true);
    setSubmitResult(null);

    try {
      const res = await fetch(`/api/bins/${id}/inventory-check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          check_type: checkMode,
          items: formItems.map((fi) => ({
            bin_item_id: fi.bin_item_id,
            status: fi.status,
            quantity_found: fi.quantity_found,
            notes: fi.notes || undefined,
          })),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to submit check");
      }

      const data = await res.json();
      setSubmitResult({
        type: "success",
        text: `Inventory check submitted. Bin status: ${data.binStatus?.replace("_", " ") || "updated"}.`,
      });
      setCheckMode(null);
      // Refresh data
      fetchBin();
    } catch (err) {
      setSubmitResult({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to submit check",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        <div className="h-64 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
      </div>
    );
  }

  if (error || !bin) {
    return (
      <div className="rounded-xl border border-stemania-red-400 bg-stemania-red-50 p-6 dark:border-stemania-red-600 dark:bg-stemania-red-50/10">
        <h2 className="text-lg font-semibold text-stemania-red-600">Error</h2>
        <p className="mt-1 text-stemania-red-500">{error || "Bin not found"}</p>
        <Link
          href="/bins"
          className="mt-4 inline-block text-sm font-medium text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
        >
          Back to Bins
        </Link>
      </div>
    );
  }

  const cfg = STATUS_CONFIG[bin.status] || STATUS_CONFIG.ready;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/bins"
          className="mb-2 inline-flex items-center text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <svg
            className="mr-1 h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          All Bins
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white sm:text-3xl">
              {bin.label}
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {bin.series}
            </p>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium ${cfg.bg} ${cfg.text}`}
          >
            {cfg.label}
          </span>
        </div>
        {bin.notes && (
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {bin.notes}
          </p>
        )}
      </div>

      {/* Submit result feedback */}
      {submitResult && (
        <div
          role="alert"
          className={`mb-6 rounded-lg p-4 text-sm font-medium ${
            submitResult.type === "success"
              ? "bg-stemania-green-50 text-stemania-green-600 dark:bg-stemania-green-500/10 dark:text-stemania-green-400"
              : "bg-stemania-red-50 text-stemania-red-600 dark:bg-stemania-red-500/10 dark:text-stemania-red-400"
          }`}
        >
          {submitResult.text}
        </div>
      )}

      {/* Action buttons */}
      {!checkMode && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => startCheck("pre_series")}
            className="flex-1 rounded-xl bg-stemania-teal-600 px-5 py-4 text-center text-base font-semibold text-white transition-colors hover:bg-stemania-teal-700 active:bg-stemania-teal-800 sm:py-3"
          >
            Start Pre-Lecture Check
          </button>
          <button
            type="button"
            onClick={() => startCheck("post_series")}
            className="flex-1 rounded-xl border-2 border-stemania-teal-600 px-5 py-4 text-center text-base font-semibold text-stemania-teal-600 transition-colors hover:bg-stemania-teal-50 active:bg-stemania-teal-100 dark:border-stemania-teal-400 dark:text-stemania-teal-400 dark:hover:bg-stemania-teal-900/20 sm:py-3"
          >
            Start Post-Lecture Check
          </button>
        </div>
      )}

      {/* Check form */}
      {checkMode && (
        <div className="mb-8 rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="border-b border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {checkMode === "pre_series" ? "Pre-Lecture" : "Post-Lecture"} Check
              </h2>
              <button
                type="button"
                onClick={() => {
                  setCheckMode(null);
                  setSubmitResult(null);
                }}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {formItems.map((fi, index) => (
              <div key={fi.bin_item_id} className="px-4 py-4 sm:px-6">
                <div className="mb-3">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {fi.itemName}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Expected: {fi.expectedQuantity}
                  </p>
                </div>

                {/* Status buttons - large tap targets */}
                <div className="mb-3 flex gap-2">
                  {ITEM_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateFormItem(index, { status: opt.value })}
                      aria-label={`Mark ${fi.itemName} as ${opt.label}`}
                      aria-pressed={fi.status === opt.value}
                      className={`flex-1 rounded-lg px-3 py-3 text-sm font-medium transition-colors sm:py-2 ${
                        fi.status === opt.value
                          ? opt.active
                          : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Quantity and notes */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor={`qty-${fi.bin_item_id}`}
                      className="text-sm text-gray-600 dark:text-gray-400"
                    >
                      Qty found:
                    </label>
                    <input
                      id={`qty-${fi.bin_item_id}`}
                      type="number"
                      min={0}
                      value={fi.quantity_found}
                      onChange={(e) =>
                        updateFormItem(index, {
                          quantity_found: parseInt(e.target.value, 10) || 0,
                        })
                      }
                      className="w-20 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Notes (optional)"
                    aria-label={`Notes for ${fi.itemName}`}
                    value={fi.notes}
                    onChange={(e) =>
                      updateFormItem(index, { notes: e.target.value })
                    }
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-200 px-4 py-4 dark:border-gray-700 sm:px-6">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full rounded-xl bg-stemania-teal-600 px-5 py-4 text-base font-semibold text-white transition-colors hover:bg-stemania-teal-700 disabled:opacity-50 sm:w-auto sm:py-3"
            >
              {submitting ? "Submitting..." : "Submit Check"}
            </button>
          </div>
        </div>
      )}

      {/* Expected items */}
      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Expected Items ({bin.items.length})
        </h2>
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {bin.items.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 sm:px-6"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {item.itemName}
                  </p>
                  {item.notes && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {item.notes}
                    </p>
                  )}
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Qty: {item.expectedQuantity}
                </span>
              </div>
            ))}
            {bin.items.length === 0 && (
              <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                No items listed for this bin.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Check history */}
      <div>
        <h2 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
          Check History
        </h2>
        {checks.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-8 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No checks recorded yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checks.map((check) => (
              <div
                key={check.id}
                className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:p-5"
              >
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <span className="inline-block rounded-full bg-stemania-teal-50 px-2.5 py-0.5 text-xs font-medium text-stemania-teal-700 dark:bg-stemania-teal-900/30 dark:text-stemania-teal-400">
                      {check.checkType === "pre_series"
                        ? "Pre-Lecture"
                        : "Post-Lecture"}
                    </span>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {check.checkedByName} &middot;{" "}
                      {new Date(check.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                {check.notes && (
                  <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                    {check.notes}
                  </p>
                )}
                {check.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {check.items.map((ci) => {
                      const statusColor =
                        ci.status === "present"
                          ? "text-stemania-green-600 dark:text-stemania-green-400"
                          : ci.status === "missing"
                            ? "text-stemania-red-600 dark:text-stemania-red-400"
                            : "text-stemania-yellow-500 dark:text-stemania-yellow-400";
                      return (
                        <div
                          key={ci.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-gray-700 dark:text-gray-300">
                            {ci.itemName}
                          </span>
                          <span className={`font-medium capitalize ${statusColor}`}>
                            {ci.status}
                            {ci.quantityFound !== null && ` (${ci.quantityFound})`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
