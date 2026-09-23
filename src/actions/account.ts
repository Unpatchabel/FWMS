"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { SESSION_COOKIE, sessionCookieOptions } from "@/lib/session";
import { changePasswordSchema } from "@/lib/validators";
import { changeOwnPassword, AccountValidationError } from "@/services/account.service";
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
