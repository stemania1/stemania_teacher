import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getSimulatedEmployeeNumber, isSuperAdmin } from "@/lib/simulation";

export interface CurrentTeacher {
  employeeNumber: number;
  firstName: string;
  lastName: string;
  email: string | null;
  authUserId: string;
}

export async function getCurrentTeacherFromDb(): Promise<CurrentTeacher | null> {
  const supabase = await createServerSupabaseClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;

  const admin = getSupabaseAdmin();

  // Try by auth ID first
  let { data: user, error } = await admin
    .from("users")
    .select("employee_number, first_name, last_name, email, supabase_user_id")
    .eq("supabase_user_id", authUser.id)
    .single();

  // Fallback: find by email and link the auth ID
  if ((error || !user) && authUser.email) {
    const { data: emailUser } = await admin
      .from("users")
      .select("employee_number, first_name, last_name, email, supabase_user_id")
      .eq("email", authUser.email)
      .single();

    if (emailUser) {
      if (!emailUser.supabase_user_id) {
        await admin
          .from("users")
          .update({ supabase_user_id: authUser.id })
          .eq("employee_number", emailUser.employee_number);
      }
      user = emailUser;
      error = null;
    }
  }

  if (error || !user || user.employee_number == null) return null;

  const realTeacher: CurrentTeacher = {
    employeeNumber: user.employee_number as number,
    firstName: (user.first_name as string) || "",
    lastName: (user.last_name as string) || "",
    email: (user.email as string) || authUser.email || null,
    authUserId: authUser.id,
  };

  // Super admin simulation: if the authenticated user is a super admin
  // and a simulation cookie is set, return the simulated teacher instead
  const callerEmail = realTeacher.email || authUser.email;
  if (isSuperAdmin(callerEmail)) {
    const simulatedEmpNumber = await getSimulatedEmployeeNumber();
    if (simulatedEmpNumber !== null) {
      const { data: simUser } = await admin
        .from("users")
        .select("employee_number, first_name, last_name, email, supabase_user_id")
        .eq("employee_number", simulatedEmpNumber)
        .single();

      if (simUser && simUser.employee_number != null) {
        return {
          employeeNumber: simUser.employee_number as number,
          firstName: (simUser.first_name as string) || "",
          lastName: (simUser.last_name as string) || "",
          email: (simUser.email as string) || null,
          authUserId: authUser.id, // keep real auth ID for session
        };
      }
    }
  }

  return realTeacher;
}

export async function hasAssignment(
  employeeNumber: number,
  lessonId: string
): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("teacher_lesson_assignments")
    .select("id")
    .eq("teacher_id", employeeNumber)
    .eq("lesson_id", lessonId)
    .eq("status", "active")
    .or("expires_at.is.null,expires_at.gt.now()")
    .limit(1);

  if (error || !data || data.length === 0) return false;
  return true;
}
