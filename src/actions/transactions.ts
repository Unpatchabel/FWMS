"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canWrite } from "@/lib/auth";
import { transactionCreateSchema } from "@/lib/validators";
import {
  createTransaction,
  voidTransaction,
  TransactionValidationError,
} from "@/services/transactions.service";
import type { ActionResult } from "./types";

function refreshLedgerPages() {
  revalidatePath("/dashboard");
  revalidatePath("/income");
  revalidatePath("/expenses");
}

export async function createTransactionAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't add transactions." };

  const parsed = transactionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    const transaction = await createTransaction(user.householdId, user.id, parsed.data);
    refreshLedgerPages();
    return { ok: true, data: { id: transaction.id } };
  } catch (err) {
    if (err instanceof TransactionValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}

/**
 * Removes a transaction from the ledger. Implemented as a VOID (soft delete —
 * see transactions.service.ts) rather than a hard delete, so a future
 * "restore" or "reversing entry" feature needs no schema or call-site change.
 */
export async function voidTransactionAction(
  transactionId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't remove transactions." };

  try {
    await voidTransaction(user.householdId, user.id, transactionId);
    refreshLedgerPages();
    return { ok: true };
  } catch (err) {
    if (err instanceof TransactionValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
