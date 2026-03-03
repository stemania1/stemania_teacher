export type UserRole = "super_admin" | "admin" | "teacher" | "owner" | "partner" | "contractor";

export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  ADMIN: "admin" as const,
  TEACHER: "teacher" as const,
  OWNER: "owner" as const,
  PARTNER: "partner" as const,
  CONTRACTOR: "contractor" as const,
} as const;
