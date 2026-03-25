import { cookies } from "next/headers";

export const SIMULATE_COOKIE = "simulate_teacher";

export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return false;
  return email.toLowerCase() === superAdminEmail.toLowerCase();
}

export async function getSimulatedEmployeeNumber(): Promise<number | null> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SIMULATE_COOKIE);
  if (!cookie?.value) return null;
  const num = parseInt(cookie.value, 10);
  return isNaN(num) ? null : num;
}

export async function isSimulationActive(): Promise<boolean> {
  const cookieStore = await cookies();
  const cookie = cookieStore.get(SIMULATE_COOKIE);
  return !!cookie?.value;
}
