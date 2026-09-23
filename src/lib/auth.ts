import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session-cookie";
import type { UserRole } from "@/lib/constants";

/**
 * Server-side auth helpers used by pages and API routes.
 * `requireUser` is the guard every protected page/route calls first.
 */

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  householdId: string;
};

/** Return the signed-in user (fresh from DB) or null. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  // Re-read from DB so deactivated users lose access immediately, even if
  // they still hold a valid cookie.
  const user = await prisma.user.findFirst({
    where: { id: session.userId, isActive: true },
    select: { id: true, name: true, email: true, role: true, householdId: true, sessionVersion: true },
  });
  if (!user || session.sessionVersion !== user.sessionVersion) return null;

  // `role` is stored as String in SQLite; narrow it to the UserRole union.
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role as UserRole,
    householdId: user.householdId,
  };
}

/** Guard for pages: redirects to /login if not authenticated. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/**
 * Permission checks for API routes.
 *
 * VIEWER can read everything but never write. OWNER additionally controls
 * shared configuration such as categories. These return a boolean rather than
 * throwing, so route handlers can decide the HTTP response themselves —
 * keeping this file free of any Next.js response concerns.
 */
export function canWrite(user: CurrentUser): boolean {
  return user.role === "OWNER" || user.role === "MEMBER";
}

export function isOwner(user: CurrentUser): boolean {
  return user.role === "OWNER";
}
