"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { changePasswordSchema, changeUsernameSchema } from "@/lib/validators";
import { changeOwnPassword, changeOwnUsername, AccountValidationError } from "@/services/account.service";
import type { ActionResult } from "./types";

export async function changeOwnPasswordAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    await changeOwnPassword(user.householdId, user.id, parsed.data);
    (await cookies()).set(SESSION_COOKIE, "", sessionCookieOptions(0));
    revalidatePath("/settings");
    return { ok: true };
  } catch (error) {
    if (error instanceof AccountValidationError) return { ok: false, error: error.message };
    throw error;
  }
}

export async function changeOwnUsernameAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user || user.role !== "OWNER") return { ok: false, error: "Your session has expired. Sign in again." };
  const parsed = changeUsernameSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  try {
    const updated = await changeOwnUsername(user.householdId, user.id, parsed.data);
    const token = await createSessionToken({ userId: user.id, householdId: user.householdId,
      role: user.role, name: updated.name, sessionVersion: updated.sessionVersion });
    (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions());
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (error) {
    if (error instanceof AccountValidationError) return { ok: false, error: error.message };
    throw error;
  }
}
