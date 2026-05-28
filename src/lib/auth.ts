export const FIA_ROLES = [
  "SUPERADMIN",
  "FEDERATION_ADMIN",
  "FIA_DELEGATE",
] as const;

export const CLUB_ADMIN_ROLES = [...FIA_ROLES, "CLUBADMIN"] as const;

export const INSPECTOR_ROLES = [
  ...CLUB_ADMIN_ROLES,
  "TECHNICAL_INSPECTOR",
] as const;

export const ALL_STAFF_ROLES = [
  ...INSPECTOR_ROLES,
  "WEIGHT_CONTROLLER",
  "RACE_OFFICIAL",
] as const;

export type UserRole =
  | "SUPERADMIN"
  | "CLUBADMIN"
  | "ATHLETE"
  | "TECHNICAL_INSPECTOR"
  | "WEIGHT_CONTROLLER"
  | "RACE_OFFICIAL"
  | "FEDERATION_ADMIN"
  | "FIA_DELEGATE";

export function hasRole(role: string, allowed: readonly string[]): boolean {
  return allowed.includes(role);
}

export function isFiaRole(role: string): boolean {
  return hasRole(role, FIA_ROLES);
}

export function isClubAdminOrAbove(role: string): boolean {
  return hasRole(role, CLUB_ADMIN_ROLES);
}

export function isInspectorOrAbove(role: string): boolean {
  return hasRole(role, INSPECTOR_ROLES);
}
