"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, canWrite } from "@/lib/auth";
import { loanCreateSchema, loanPaymentCreateSchema } from "@/lib/validators";
import {
  createLoan,
  recordLoanPayment,
  LoanValidationError,
} from "@/services/loans.service";
import type { ActionResult } from "./types";

function refreshLoanPages() {
  revalidatePath("/dashboard");
  revalidatePath("/loans");
}

export async function createLoanAction(
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't add loans." };

  const parsed = loanCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  const loan = await createLoan(user.householdId, user.id, parsed.data);
  refreshLoanPages();
  return { ok: true, data: { id: loan.id } };
}

export async function recordLoanPaymentAction(
  input: unknown
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "Your session has expired. Sign in again." };
  if (!canWrite(user)) return { ok: false, error: "Viewers can't record payments." };

  const parsed = loanPaymentCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input." };
  }

  try {
    await recordLoanPayment(user.householdId, user.id, parsed.data);
    refreshLoanPages();
    return { ok: true };
  } catch (err) {
    if (err instanceof LoanValidationError) {
      return { ok: false, error: err.message };
    }
    throw err;
  }
}
