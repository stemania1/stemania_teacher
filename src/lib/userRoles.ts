export type UserRole = "super_admin" | "admin" | "teacher" | "director" | "partner" | "contractor";

export const ROLES = {
  SUPER_ADMIN: "super_admin" as const,
  ADMIN: "admin" as const,
  TEACHER: "teacher" as const,
  DIRECTOR: "director" as const,
  PARTNER: "partner" as const,
  CONTRACTOR: "contractor" as const,
} as const;
