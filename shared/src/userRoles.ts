export type UserRole = "super_admin" | "admin" | "teacher" | "owner" | "partner" | "contractor";

export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  ADMIN: "admin" as const,
  TEACHER: "teacher" as const,
  OWNER: "owner" as const,
  PARTNER: "partner" as const,
  CONTRACTOR: "contractor" as const,
} as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  teacher: "Teacher",
  owner: "Owner",
  partner: "Partner",
  contractor: "Contractor",
};

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 4,
  admin: 3,
  teacher: 2,
  owner: 2,
  partner: 2,
  contractor: 1,
};

export function canManageUsers(userRole: UserRole | null | undefined): boolean {
  if (!userRole) return false;
  return userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN;
}

export function canEditUserRole(
  currentUserRole: UserRole | null | undefined,
  targetUserRole: UserRole | null | undefined
): boolean {
  if (!currentUserRole) return false;
  if (currentUserRole === ROLES.SUPER_ADMIN) return true;
  if (currentUserRole === ROLES.ADMIN) {
    return (
      targetUserRole === ROLES.TEACHER ||
      targetUserRole === ROLES.OWNER ||
      targetUserRole === ROLES.PARTNER ||
      targetUserRole === ROLES.CONTRACTOR
    );
  }
  return false;
}

export function canChangeRoleOrStatus(userRole: UserRole | null | undefined): boolean {
  if (!userRole) return false;
  return userRole === ROLES.SUPER_ADMIN || userRole === ROLES.ADMIN;
}

export function isSuperAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const superAdminEmail = process.env.SUPER_ADMIN_EMAIL;
  if (!superAdminEmail) return false;
  return email.toLowerCase() === superAdminEmail.toLowerCase();
}

export function getUserRole(user: Record<string, any>): UserRole | null {
  const role = (user.role ?? user.publicMetadata?.role) as UserRole | undefined;
  if (role && Object.values(ROLES).includes(role)) return role;
  return null;
}

export function getEmployeeNumber(user: Record<string, any>): number | null {
  const num = user.employee_number ?? user.publicMetadata?.employeeNumber;
  if (typeof num === "number") return num;
  if (typeof num === "string") {
    const parsed = parseInt(num, 10);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

export function getFinalRole(
  userRole: UserRole | null | undefined,
  userEmail: string | undefined | null
): UserRole | null {
  if (isSuperAdminEmail(userEmail)) return ROLES.SUPER_ADMIN;
  return userRole || null;
}
