import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { redirect } from "next/navigation";
import ProfileEditor from "@/components/ProfileEditor";

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

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        My Information
      </h1>
      <ProfileEditor firstName={firstName} lastName={lastName} email={email} />
    </div>
  );
}
