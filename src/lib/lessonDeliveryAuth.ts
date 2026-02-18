import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export interface CurrentTeacher {
  employeeNumber: number;
  firstName: string;
  lastName: string;
  clerkUserId: string;
}

export async function getCurrentTeacherFromDb(): Promise<CurrentTeacher | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = getSupabaseAdmin();
  const { data: user, error } = await supabase
    .from("users")
    .select("employee_number, first_name, last_name, clerk_user_id")
    .eq("clerk_user_id", userId)
    .single();

  if (error || !user || user.employee_number == null) return null;
  return {
    employeeNumber: user.employee_number as number,
    firstName: (user.first_name as string) || "",
    lastName: (user.last_name as string) || "",
    clerkUserId: (user.clerk_user_id as string) || userId,
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
