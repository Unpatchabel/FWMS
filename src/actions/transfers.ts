"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canWrite } from "@/lib/auth";
import { transferCreateSchema } from "@/lib/validators";
import { createTransfer, TransactionValidationError } from "@/services/transactions.service";
import type { ActionResult } from "./types";

export async function createTransferAction(input: unknown): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't transfer money." };

  const parsed = transferCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid transfer." };
  }

  try {
    await createTransfer(user.householdId, user.id, parsed.data);
    revalidatePath("/accounts");
    revalidatePath("/dashboard");
    return { ok: true };
  } catch (error) {
    if (error instanceof TransactionValidationError) {
      return { ok: false, error: error.message };
    }
    throw error;
  }
}
