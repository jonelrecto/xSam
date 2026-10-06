export type Role = "student" | "teacher" | "admin";

export const ALL_ROLES: Role[] = ["student", "teacher", "admin"];

export const SELF_SIGNUP_ROLES: Role[] = ["student", "teacher"];

export function isValidRole(role: string): role is Role {
  return ALL_ROLES.includes(role as Role);
}
