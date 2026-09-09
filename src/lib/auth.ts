import { useSyncExternalStore } from "react";

export const roles = ["ADMIN", "STAFF", "VIEWER"] as const;
export type Role = (typeof roles)[number];

export type Permission =
  | "view-dashboard"
  | "view-students"
  | "view-attendance"
  | "view-courses"
  | "view-finance"
  | "manage-students"
  | "manage-courses"
  | "manage-finance"
  | "view-teachers"
  | "manage-teachers"
  | "view-staff"
  | "manage-staff"
  | "view-audit-logs"
  | "delete-records";

const rolePermissions: Record<Role, readonly Permission[]> = {
  ADMIN: [
    "view-dashboard",
    "view-students",
    "view-attendance",
    "view-courses",
    "view-finance",
    "manage-students",
    "manage-courses",
    "manage-finance",
    "view-teachers",
    "manage-teachers",
    "view-staff",
    "manage-staff",
    "view-audit-logs",
    "delete-records",
  ],
  STAFF: [
    "view-dashboard",
    "view-students",
    "view-attendance",
    "view-courses",
    "manage-students",
    "manage-courses",
    "view-teachers",
    "manage-teachers",
    "view-staff",
    "manage-staff",
  ],
  VIEWER: ["view-dashboard", "view-students", "view-attendance", "view-courses", "view-teachers"],
};

const ROLE_STORAGE_KEY = "hopa-role";
const listeners = new Set<() => void>();

function roleFromValue(value: string | undefined | null): Role {
  const normalized = value?.toUpperCase();
  return roles.includes(normalized as Role) ? (normalized as Role) : "ADMIN";
}

function getStoredRole(): Role {
  if (typeof window === "undefined") {
    return roleFromValue(import.meta.env["VITE_USER_ROLE"] as string | undefined);
  }
  return roleFromValue(
    window.localStorage.getItem(ROLE_STORAGE_KEY) ?? import.meta.env["VITE_USER_ROLE"],
  );
}

let currentRole = getStoredRole();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return currentRole;
}

export function useCurrentRole() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getCurrentRole() {
  return currentRole;
}

export function setCurrentRole(role: Role) {
  currentRole = role;
  if (typeof window !== "undefined") window.localStorage.setItem(ROLE_STORAGE_KEY, role);
  listeners.forEach((listener) => listener());
}

export function hasPermission(role: Role, permission: Permission) {
  return rolePermissions[role].includes(permission);
}

export function usePermission(permission: Permission) {
  return hasPermission(useCurrentRole(), permission);
}

export function roleLabel(role: Role) {
  return role[0] + role.slice(1).toLowerCase();
}