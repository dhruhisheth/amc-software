import type { Role } from "@/generated/prisma/enums";

/**
 * The owner account for the whole system.
 *
 * Deliberately hard-coded rather than read from an env var — the same decision the warehouse
 * system makes (`ROOT_ADMIN_EMAIL` in `api/auth/_util.py`). A misconfigured deployment or a
 * stray `.env` value must never be able to hand owner access to a different address.
 *
 * This account is always ADMIN, can never be demoted, and can never be deleted, so there is no
 * sequence of in-app actions that can lock everyone out of the admin areas.
 */
export const ROOT_ADMIN_EMAIL = "warehouse@dhruvishahvac.com";

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export function isRootAdminEmail(email: string | null | undefined): boolean {
  return !!email && normalizeEmail(email) === ROOT_ADMIN_EMAIL;
}

/**
 * The role an account effectively has. The root admin's stored role is ignored — it is ADMIN
 * whatever the database says, so a bad write can't strip the owner's access.
 */
export function effectiveRole(email: string | null | undefined, storedRole: Role): Role {
  return isRootAdminEmail(email) ? "ADMIN" : storedRole;
}
