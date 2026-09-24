"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { authenticateOwner } from "@/services/account.service";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import { setupSchema } from "@/lib/validators";
import { createOwnerInstallation } from "@/services/setup.service";
import type { UserRole } from "@/lib/constants";
import type { ActionResult } from "./types";

/** One owner per installation. The fixed household key also closes concurrent setup attempts. */
export async function setupAction(input: { username: string; password: string; currency: string }): Promise<ActionResult> {
  const parsed = setupSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const owner = await createOwnerInstallation(parsed.data);
    const token = await createSessionToken({ userId: owner.id, householdId: owner.householdId,
      role: "OWNER", name: owner.name, sessionVersion: owner.sessionVersion });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  } catch {
    return { ok: false, error: "Setup could not finish. Check whether this installation already has an owner." };
  }
  return { ok: true };
}

/**
 * Authenticate and set the session cookie. Called directly (not via a native
 * <form action>) from the login form so the client can keep its own
 * loading/error state — this is a fully supported way to invoke a Server
 * Action from client code.
 */
export async function loginAction(input: {
  username: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const user = await authenticateOwner(parsed.data);
  if (!user) {
    return { ok: false, error: "Incorrect username or password." };
  }

  const token = await createSessionToken({
    userId: user.id,
    householdId: user.householdId,
    role: user.role as UserRole,
    name: user.name,
    sessionVersion: user.sessionVersion,
  });

  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
  return { ok: true };
}

/**
 * Clears the session and redirects to /login. Bound directly to the sign-out
 * form's `action` prop — no client JavaScript needed for logout at all.
 */
export async function logoutAction(): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
  redirect("/login");
}
