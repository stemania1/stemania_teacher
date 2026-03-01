import { getSupabaseAdmin } from "./supabaseAdmin";

export type LoginStatus = "active" | "inactive" | "suspended";

export const LOGIN_STATUS_ACTIVE: LoginStatus = "active";

export interface SupabaseUser {
  employee_number: number;
  supabase_user_id: string | null;
  email: string | null;
  first_name: string;
  last_name: string;
  role: string;
  payee_status: string;
  account_status: string | null;
  login_status?: LoginStatus;
  address: string | null;
  phone_number: string | null;
  contract_signed: boolean;
  created_at: string;
  updated_at: string;
  last_sign_in_at: string | null;
}

/** Returns true only if the user is allowed to sign in (login_status === 'active'). */
export function isLoginActive(user: SupabaseUser | null | undefined): boolean {
  if (!user) return false;
  const status = user.login_status ?? "inactive";
  return status === LOGIN_STATUS_ACTIVE;
}

export async function getSupabaseUserByAuthId(
  authUserId: string
): Promise<SupabaseUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("supabase_user_id", authUserId)
    .single();

  if (error || !data) return null;
  return data as SupabaseUser;
}

export async function getSupabaseUserByEmployeeNumber(
  empNum: number
): Promise<SupabaseUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("employee_number", empNum)
    .single();

  if (error || !data) return null;
  return data as SupabaseUser;
}

/** Get user from users table by email (e.g. after OAuth when we only have email). */
export async function getSupabaseUserByEmail(
  email: string
): Promise<SupabaseUser | null> {
  const trimmed = email?.trim();
  if (!trimmed) return null;

  const supabase = getSupabaseAdmin();

  const result = await supabase
    .from("users")
    .select("*")
    .eq("email", trimmed)
    .maybeSingle();

  if (result.error) {
    console.error("[getSupabaseUserByEmail]", result.error.message);
  }
  if (result.data) return result.data as SupabaseUser;

  const { data, error } = await supabase
    .from("users")
    .select("*")
    .ilike("email", trimmed)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getSupabaseUserByEmail] ilike:", error.message);
  }
  return (data as SupabaseUser) ?? null;
}

export async function linkAuthIdByEmail(
  authUserId: string,
  email: string
): Promise<SupabaseUser | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("email", email)
    .single();

  if (error || !data) return null;

  const user = data as SupabaseUser;
  if (!user.supabase_user_id) {
    await supabase
      .from("users")
      .update({ supabase_user_id: authUserId })
      .eq("employee_number", user.employee_number);
    user.supabase_user_id = authUserId;
  }

  return user;
}
