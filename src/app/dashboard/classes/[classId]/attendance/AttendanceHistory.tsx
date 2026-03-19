"use client";

import { useState, useEffect } from "react";

interface HistoryRecord {
  id: string;
  studentId: string;
  studentName: string;
  status: string;
  notes: string | null;
}

interface HistorySession {
  date: string;
  records: HistoryRecord[];
  counts: { present: number; absent: number; tardy: number };
}

export default function AttendanceHistory({ classId }: { classId: string }) {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/classes/${classId}/attendance/history`)
      .then((res) => (res.ok ? res.json() : { sessions: [] }))
      .then((data) => setSessions(data.sessions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [classId]);

  const toggle = (date: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <p className="text-gray-500 dark:text-gray-400">
          No attendance records found for this class.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.date}
          className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <button
            type="button"
            onClick={() => toggle(session.date)}
            className="flex w-full items-center justify-between px-6 py-4 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {formatDate(session.date)}
              </p>
              <div className="mt-1 flex gap-3 text-sm">
                <span className="text-stemania-green-600 dark:text-stemania-green-400">
                  {session.counts.present} Present
                </span>
                <span className="text-stemania-red-600 dark:text-stemania-red-400">
                  {session.counts.absent} Absent
                </span>
                <span className="text-stemania-yellow-500">
                  {session.counts.tardy} Tardy
                </span>
              </div>
            </div>
            <svg
              className={`h-5 w-5 text-gray-400 transition-transform ${
                expanded.has(session.date) ? "rotate-180" : ""
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>
          {expanded.has(session.date) && (
            <div className="border-t border-gray-100 dark:border-gray-700">
              <div className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {session.records.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between px-6 py-3"
                  >
                    <p className="text-sm text-gray-900 dark:text-white">
                      {record.studentName}
                    </p>
                    <div className="flex items-center gap-3">
                      {record.notes && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {record.notes}
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          record.status === "present"
                            ? "bg-stemania-green-50 text-stemania-green-600 dark:bg-stemania-green-500/10 dark:text-stemania-green-400"
                            : record.status === "absent"
                              ? "bg-stemania-red-50 text-stemania-red-600 dark:bg-stemania-red-500/10 dark:text-stemania-red-400"
                              : "bg-stemania-yellow-50 text-stemania-yellow-500 dark:bg-stemania-yellow-400/10 dark:text-stemania-yellow-400"
                        }`}
                      >
                        {record.status.charAt(0).toUpperCase() +
                          record.status.slice(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
