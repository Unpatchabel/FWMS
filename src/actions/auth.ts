"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { loginSchema } from "@/lib/validators";
import type { UserRole } from "@/lib/constants";
import type { ActionResult } from "./types";

/**
 * Authenticate and set the session cookie. Called directly (not via a native
 * <form action>) from the login form so the client can keep its own
 * loading/error state — this is a fully supported way to invoke a Server
 * Action from client code.
 */
export async function loginAction(input: {
  email: string;
  password: string;
}): Promise<ActionResult> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  const ok =
    user && user.isActive && (await verifyPassword(password, user.passwordHash));
  if (!ok || !user) {
    return { ok: false, error: "Incorrect email or password." };
  }

  const token = await createSessionToken({
    userId: user.id,
    householdId: user.householdId,
    role: user.role as UserRole,
    name: user.name,
  });

  cookies().set(SESSION_COOKIE, token, sessionCookieOptions());
  return { ok: true };
}

/**
 * Clears the session and redirects to /login. Bound directly to the sign-out
 * form's `action` prop — no client JavaScript needed for logout at all.
 */
export async function logoutAction(): Promise<void> {
  cookies().set(SESSION_COOKIE, "", sessionCookieOptions(0));
  redirect("/login");
}
