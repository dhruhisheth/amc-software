import type { Role } from "@/generated/prisma/enums";

export type { Role };

// The three access levels, in the order they should appear in any role picker.
export const ROLES: Role[] = ["ADMIN", "STAFF", "VIEWER"];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  STAFF: "Staff (edit)",
  VIEWER: "View only",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access — everything Staff can do, plus deleting records, uploads, and settings.",
  STAFF: "Can add and edit everything, but cannot delete any record.",
  VIEWER: "Read-only — can browse every page but cannot change anything.",
};

// This module is the ONLY place the role rules live. Client components use these to decide what
// to render; server actions use the matching guards in ./guards.ts to actually enforce them.
// Never re-derive a rule inline (e.g. `role !== "VIEWER"`) at a call site — a rule change has to
// be a one-line change here.

/** Everyone who is signed in can read. */
export function canView(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "STAFF" || role === "VIEWER";
}

/** Creating and editing records. Staff may do this; viewers may not. */
export function canEdit(role: Role | undefined): boolean {
  return role === "ADMIN" || role === "STAFF";
}

/**
 * Deleting records. Admin only — this is the single rule that separates Staff from Admin on
 * day-to-day data ("Staff — Edit — do not delete data, otherwise all access").
 */
export function canDelete(role: Role | undefined): boolean {
  return role === "ADMIN";
}

/** Admin-only areas: Excel upload, app settings, team accounts, technician management. */
export function isAdmin(role: Role | undefined): boolean {
  return role === "ADMIN";
}
