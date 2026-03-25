import { getSimulatedEmployeeNumber, isSuperAdmin } from "@/lib/simulation";
import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import SimulationBanner from "@/components/SimulationBanner";

export default async function SimulationBannerServer() {
  const simulatedEmpNumber = await getSimulatedEmployeeNumber();
  if (simulatedEmpNumber === null) return null;

  // Verify the current user is actually a super admin
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser || !isSuperAdmin(authUser.email ?? null)) return null;

  // Look up the simulated teacher's info
  const admin = getSupabaseAdmin();
  const { data: simUser } = await admin
    .from("users")
    .select("employee_number, first_name, last_name")
    .eq("employee_number", simulatedEmpNumber)
    .single();

  if (!simUser) return null;

  return (
    <SimulationBanner
      simulatedTeacher={{
        employeeNumber: simUser.employee_number as number,
        firstName: (simUser.first_name as string) || "",
        lastName: (simUser.last_name as string) || "",
      }}
    />
  );
}
