import { getServerSession } from "next-auth";
import type { Session } from "next-auth";
import { authOptions } from "./options";
import { canDelete, canEdit, canView, isAdmin } from "./permissions";

// Server-side enforcement of the rules declared in ./permissions.ts. Every mutating server
// action must start with one of these — hiding a button in the UI is a convenience, not a
// control, since server actions are directly invocable endpoints.

export async function requireSession(): Promise<Session> {
  const session = await getServerSession(authOptions);
  if (!session) throw new Error("Not authenticated.");
  return session;
}

export async function requireView(): Promise<Session> {
  const session = await requireSession();
  if (!canView(session.user.role)) throw new Error("Access denied.");
  return session;
}

export async function requireEdit(): Promise<Session> {
  const session = await requireSession();
  if (!canEdit(session.user.role)) {
    throw new Error("Your account has view-only access and cannot make changes.");
  }
  return session;
}

export async function requireDelete(): Promise<Session> {
  const session = await requireSession();
  if (!canDelete(session.user.role)) {
    throw new Error("Only an admin can delete records.");
  }
  return session;
}

export async function requireAdmin(): Promise<Session> {
  const session = await requireSession();
  if (!isAdmin(session.user.role)) throw new Error("Admin access required.");
  return session;
}
