"use client";

import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function SignOutPage() {
  const router = useRouter();

  const handleSignOut = async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
          Sign Out
        </h1>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          Are you sure you want to sign out?
        </p>
        <button
          onClick={handleSignOut}
          className="rounded-lg bg-gray-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-gray-700 dark:bg-gray-500 dark:hover:bg-gray-600"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
}
