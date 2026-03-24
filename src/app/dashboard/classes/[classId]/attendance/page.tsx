"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AttendanceHistory from "./AttendanceHistory";

interface Student {
  id: string;
  name: string;
  email: string | null;
}

interface AttendanceEntry {
  studentId: string;
  status: "present" | "absent" | "tardy";
  notes: string;
}

type Tab = "take" | "history";

export default function AttendancePage() {
  const { classId } = useParams<{ classId: string }>();
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceEntry>>(
    {}
  );
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [className, setClassName] = useState("");
  const [tab, setTab] = useState<Tab>("take");
  const [error, setError] = useState<string | null>(null);

  // Fetch students
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/classes/${classId}/students`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load students");
        return res.json();
      })
      .then((data) => {
        setStudents(data.students || []);
        // Initialize attendance with no status
        const init: Record<string, AttendanceEntry> = {};
        for (const s of data.students || []) {
          init[s.id] = { studentId: s.id, status: "present", notes: "" };
        }
        setAttendance(init);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [classId]);

  // Fetch class name
  useEffect(() => {
    fetch("/api/classes")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.classes) {
          const cls = data.classes.find(
            (c: { classId: string }) => c.classId === classId
          );
          if (cls) setClassName(cls.name);
        }
      })
      .catch(() => {});
  }, [classId]);

  // Fetch existing attendance for selected date
  const fetchAttendance = useCallback(() => {
    fetch(`/api/classes/${classId}/attendance?date=${date}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data?.records?.length) return;
        setAttendance((prev) => {
          const updated = { ...prev };
          for (const r of data.records) {
            if (updated[r.student_id]) {
              updated[r.student_id] = {
                studentId: r.student_id,
                status: r.status,
                notes: r.notes || "",
              };
            }
          }
          return updated;
        });
      })
      .catch(() => {});
  }, [classId, date]);

  useEffect(() => {
    if (students.length > 0) {
      fetchAttendance();
    }
  }, [students, fetchAttendance]);

  const setStatus = (
    studentId: string,
    status: "present" | "absent" | "tardy"
  ) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], status },
    }));
    setSaveMessage(null);
  };

  const setNotes = (studentId: string, notes: string) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], notes },
    }));
    setSaveMessage(null);
  };

  const markAll = (status: "present" | "absent") => {
    setAttendance((prev) => {
      const updated = { ...prev };
      for (const key of Object.keys(updated)) {
        updated[key] = { ...updated[key], status };
      }
      return updated;
    });
    setSaveMessage(null);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const records = Object.values(attendance).map((a) => ({
        studentId: a.studentId,
        status: a.status,
        notes: a.notes || undefined,
      }));

      const res = await fetch(`/api/classes/${classId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, records }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }

      setSaveMessage({
        type: "success",
        text: `Attendance saved for ${records.length} students.`,
      });
    } catch (err) {
      setSaveMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Failed to save attendance",
      });
    } finally {
      setSaving(false);
    }
  };

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const counts = Object.values(attendance).reduce(
    (acc, a) => {
      acc[a.status]++;
      return acc;
    },
    { present: 0, absent: 0, tardy: 0 } as Record<string, number>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="skeleton h-8 w-48 rounded" />
        <div className="skeleton h-64 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-stemania-red-400 bg-stemania-red-50 p-6 dark:border-stemania-red-600 dark:bg-stemania-red-50/10">
        <h2 className="text-lg font-semibold text-stemania-red-600">Error</h2>
        <p className="mt-1 text-stemania-red-500">{error}</p>
        <Link
          href="/dashboard/classes"
          className="mt-4 inline-block text-sm font-medium text-stemania-teal-600 hover:underline dark:text-stemania-teal-400"
        >
          Back to My Classes
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/classes"
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
          My Classes
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {className || "Class Attendance"}
        </h1>
      </div>

      {/* Tabs */}
      <div role="tablist" aria-label="Attendance views" className="mb-6 flex gap-1 rounded-lg border border-gray-200 bg-gray-100 p-1 dark:border-gray-700 dark:bg-gray-800">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "take"}
          aria-controls="tabpanel-take"
          onClick={() => setTab("take")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "take"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          Take Attendance
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "history"}
          aria-controls="tabpanel-history"
          onClick={() => setTab("history")}
          className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            tab === "history"
              ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
              : "text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
          }`}
        >
          History
        </button>
      </div>

      {tab === "history" ? (
        <div id="tabpanel-history" role="tabpanel" aria-label="History">
          <AttendanceHistory classId={classId} />
        </div>
      ) : (
        <div id="tabpanel-take" role="tabpanel" aria-label="Take Attendance">
          {/* Controls */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div>
              <label
                htmlFor="attendance-date"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Date
              </label>
              <input
                id="attendance-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
            <div className="flex-1">
              <label
                htmlFor="student-search"
                className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Search
              </label>
              <input
                id="student-search"
                type="text"
                placeholder="Filter by student name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full max-w-xs rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              />
            </div>
          </div>

          {/* Quick actions and summary */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => markAll("present")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => markAll("absent")}
                className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Mark All Absent
              </button>
            </div>
            <div className="flex gap-3 text-sm">
              <span className="text-stemania-green-600 dark:text-stemania-green-400">
                {counts.present} Present
              </span>
              <span className="text-stemania-red-600 dark:text-stemania-red-400">
                {counts.absent} Absent
              </span>
              <span className="text-stemania-yellow-600 dark:text-stemania-yellow-400">
                {counts.tardy} Tardy
              </span>
            </div>
          </div>

          {/* Student roster */}
          {students.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white p-12 text-center shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <p className="text-gray-500 dark:text-gray-400">
                No students enrolled in this class.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {filteredStudents.map((student) => {
                  const entry = attendance[student.id];
                  return (
                    <div
                      key={student.id}
                      className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
                    >
                      {/* Student name */}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 dark:text-white">
                          {student.name}
                        </p>
                        {student.email && (
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {student.email}
                          </p>
                        )}
                      </div>

                      {/* Status toggle */}
                      <div className="flex gap-1">
                        {(
                          [
                            {
                              value: "present",
                              label: "Present",
                              activeClass:
                                "bg-stemania-green-600 text-white dark:bg-stemania-green-500",
                            },
                            {
                              value: "absent",
                              label: "Absent",
                              activeClass:
                                "bg-stemania-red-600 text-white dark:bg-stemania-red-500",
                            },
                            {
                              value: "tardy",
                              label: "Tardy",
                              activeClass:
                                "bg-stemania-yellow-500 text-white dark:bg-stemania-yellow-400",
                            },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setStatus(student.id, opt.value)}
                            aria-label={`Mark ${student.name} as ${opt.label}`}
                            aria-pressed={entry?.status === opt.value}
                            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                              entry?.status === opt.value
                                ? opt.activeClass
                                : "border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>

                      {/* Notes */}
                      <input
                        type="text"
                        placeholder="Notes (optional)"
                        aria-label={`Notes for ${student.name}`}
                        value={entry?.notes || ""}
                        onChange={(e) => setNotes(student.id, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm shadow-sm focus:border-stemania-teal-500 focus:outline-none focus:ring-1 focus:ring-stemania-teal-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white sm:w-48"
                      />
                    </div>
                  );
                })}
                {filteredStudents.length === 0 && search && (
                  <div className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                    No students match &quot;{search}&quot;
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Save */}
          {students.length > 0 && (
            <div className="mt-6 flex items-center gap-4">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-stemania-teal-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-stemania-teal-700 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Attendance"}
              </button>
              {saveMessage && (
                <p
                  role="alert"
                  className={`text-sm ${
                    saveMessage.type === "success"
                      ? "text-stemania-green-600 dark:text-stemania-green-400"
                      : "text-stemania-red-600 dark:text-stemania-red-400"
                  }`}
                >
                  {saveMessage.text}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
