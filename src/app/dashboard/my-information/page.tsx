import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";

export default async function MyInformationPage() {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  let firstName = "";
  let lastName = "";
  let email: string | null = authUser.email ?? null;

  if (authUser.email) {
    const admin = getSupabaseAdmin();
    const { data: dbUser } = await admin
      .from("users")
      .select("first_name, last_name, email")
      .eq("email", authUser.email)
      .single();
    if (dbUser) {
      firstName = (dbUser.first_name as string) || "";
      lastName = (dbUser.last_name as string) || "";
      email = (dbUser.email as string) || email;
    }
  }

  const displayName = [firstName, lastName].filter(Boolean).join(" ") || "Teacher";

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        My Information
      </h1>
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
        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          To update your profile or password, use the Admin portal or contact your administrator.
        </p>
      </div>
    </div>
  );
}
