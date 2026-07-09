"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canWrite } from "@/lib/auth";
import { accountCreateSchema } from "@/lib/validators";
import { createAccount } from "@/services/accounts.service";
import type { ActionResult } from "./types";

export async function createAccountAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't add accounts." };

  const parsed = accountCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const account = await createAccount(user.householdId, user.id, parsed.data);
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true, data: { id: account.id } };
}
