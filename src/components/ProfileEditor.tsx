"use client";

import { useState } from "react";

interface ProfileEditorProps {
  firstName: string;
  lastName: string;
  email: string | null;
}

export default function ProfileEditor({ firstName: initialFirst, lastName: initialLast, email }: ProfileEditorProps) {
  const [firstName, setFirstName] = useState(initialFirst);
  const [lastName, setLastName] = useState(initialLast);
  const [editFirst, setEditFirst] = useState(initialFirst);
  const [editLast, setEditLast] = useState(initialLast);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Teacher";

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: editFirst, lastName: editLast }),
      });
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Failed to update profile");
        return;
      }
      const data = await res.json();
      setFirstName(data.firstName);
      setLastName(data.lastName);
      setEditing(false);
    } catch {
      setError("Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setEditFirst(firstName);
    setEditLast(lastName);
    setError(null);
    setEditing(false);
  }

  function handleEdit() {
    setEditFirst(firstName);
    setEditLast(lastName);
    setEditing(true);
  }

  if (editing) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={editFirst}
              onChange={(e) => setEditFirst(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              maxLength={100}
            />
          </div>
          <div>
            <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={editLast}
              onChange={(e) => setEditLast(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              maxLength={100}
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
            <p className="mt-1 text-gray-900 dark:text-white">{email || "—"}</p>
          </div>
        </div>
        <div className="mt-4 flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Name</p>
          <p className="text-gray-900 dark:text-white">{displayName}</p>
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Email</p>
          <p className="text-gray-900 dark:text-white">{email || "—"}</p>
        </div>
      </div>
      <div className="mt-4">
        <button
          onClick={handleEdit}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700 dark:focus:ring-offset-gray-800"
        >
          Edit
        </button>
      </div>
    </div>
  );
}
