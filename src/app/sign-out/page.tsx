"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabaseBrowser";

export default function SignOutPage() {
  const router = useRouter();

  useEffect(() => {
    const signOut = async () => {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
      router.replace("/login");
      router.refresh();
    };
    signOut();
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-stemania-teal-50 via-white to-stemania-green-50 px-4 py-12 dark:from-stemania-dark dark:via-gray-800 dark:to-gray-900">
      <div className="w-full max-w-md text-center">
        <p className="text-gray-600 dark:text-gray-400">Signing out...</p>
      </div>
    </div>
  );
}
