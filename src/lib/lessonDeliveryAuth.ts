import { createServerSupabaseClient } from "@/lib/supabaseServer";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface CurrentTeacher {
  employeeNumber: number;
  firstName: string;
  lastName: string;
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
    .select("employee_number, first_name, last_name, clerk_user_id")
    .eq("clerk_user_id", authUser.id)
    .single();

  // Fallback: find by email and link the auth ID
  if ((error || !user) && authUser.email) {
    const { data: emailUser } = await admin
      .from("users")
      .select("employee_number, first_name, last_name, clerk_user_id")
      .eq("email", authUser.email)
      .single();

    if (emailUser) {
      if (!emailUser.clerk_user_id) {
        await admin
          .from("users")
          .update({ clerk_user_id: authUser.id })
          .eq("employee_number", emailUser.employee_number);
      }
      user = emailUser;
      error = null;
    }
  }

  if (error || !user || user.employee_number == null) return null;
  return {
    employeeNumber: user.employee_number as number,
    firstName: (user.first_name as string) || "",
    lastName: (user.last_name as string) || "",
    authUserId: authUser.id,
  };
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
