import { prisma } from "@/lib/prisma";
import { aedToFils } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { parseFormDate } from "@/lib/dates";
import { deriveLoanRemainingBalance, deriveLoanPaymentSplit } from "@/lib/ledger-math";
import {
  recordLinkedTransaction,
  TransactionValidationError,
} from "@/services/transactions.service";
import { LOAN_PAYMENT_CATEGORY_NAME } from "@/lib/constants";
import type { LoanCreateInput, LoanPaymentCreateInput } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export class LoanValidationError extends Error {}

export interface LoanWithBalance {
  id: string;
  name: string;
  lender: string | null;
  originalAmountFils: number;
  openingBalanceFils: number;
  /** DERIVED: openingBalance minus all principal paid so far. Never stored. */
  remainingBalanceFils: number;
  monthlyPaymentFils: number | null;
  interestRatePct: number | null;
  startDate: Date | null;
}

/**
 * List active loans with their DERIVED remaining balance. This is the single
 * place that formula lives — summary.service's liabilities total, and
 * recordLoanPayment's overpayment check below, both call this rather than
 * recomputing it, so there is exactly one definition of "how much is left on
 * a loan."
 */
export async function listLoans(householdId: string): Promise<LoanWithBalance[]> {
  const loans = await prisma.loan.findMany({
    where: { householdId, isActive: true },
    orderBy: { createdAt: "asc" },
    include: { payments: { select: { principal: true } } },
  });

  return loans.map((loan) => {
    const principalPaid = loan.payments.reduce((sum, p) => sum + p.principal, 0);
    return {
      id: loan.id,
      name: loan.name,
      lender: loan.lender,
      originalAmountFils: loan.originalAmount,
      openingBalanceFils: loan.openingBalance,
      remainingBalanceFils: deriveLoanRemainingBalance(loan.openingBalance, principalPaid),
      monthlyPaymentFils: loan.monthlyPayment,
      interestRatePct: loan.interestRate,
      startDate: loan.startDate,
    };
  });
}

/** Create a loan at its opening balance (the principal remaining when tracking began). */
export async function createLoan(
  householdId: string,
  userId: string,
  input: LoanCreateInput
) {
  const originalAmountFils = aedToFils(input.originalAmountAed);
  const openingBalanceFils = aedToFils(input.openingBalanceAed);
  const monthlyPaymentFils =
    input.monthlyPaymentAed && input.monthlyPaymentAed !== ""
      ? aedToFils(input.monthlyPaymentAed)
      : null;
  const interestRate =
    input.interestRatePct && input.interestRatePct !== ""
      ? Number(input.interestRatePct)
      : null;

  return prisma.$transaction(async (tx) => {
    const loan = await tx.loan.create({
      data: {
        householdId,
        name: input.name,
        lender: input.lender || null,
        originalAmount: originalAmountFils,
        openingBalance: openingBalanceFils,
        monthlyPayment: monthlyPaymentFils,
        interestRate,
        startDate: input.startDate ? parseFormDate(input.startDate) : null,
      },
    });

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "Loan",
        entityId: loan.id,
        summary: `Added loan "${loan.name}"`,
      },
      tx
    );

    return loan;
  });
}

/**
 * Find or create this household's "Loan Payment" EXPENSE category. Runs
 * inside the caller's own transaction client so it's atomic with everything
 * else recordLoanPayment does — if a household already has a category with
 * this exact name/type (e.g. created manually), the unique constraint on
 * Category means this just finds and reuses it.
 */
async function getOrCreateLoanPaymentCategory(
  db: Prisma.TransactionClient,
  householdId: string
) {
  const existing = await db.category.findUnique({
    where: {
      householdId_name_type: {
        householdId,
        name: LOAN_PAYMENT_CATEGORY_NAME,
        type: "EXPENSE",
      },
    },
  });
  if (existing) return existing;

  return db.category.create({
    data: {
      householdId,
      name: LOAN_PAYMENT_CATEGORY_NAME,
      type: "EXPENSE",
      isSystem: true,
    },
  });
}

/**
 * Records a payment against a loan AND, atomically, its effect on the ledger:
 * this debits the chosen cash/bank account via a real EXPENSE transaction
 * (through TransactionService.recordLinkedTransaction — loans.service never
 * writes to the Transaction table directly), so the payment shows up in
 * Expenses history and monthly cash flow exactly like any other expense,
 * while also reducing the loan's own derived remaining balance.
 *
 * Only the total and the interest portion are entered; principal is DERIVED
 * as amount − interest (deriveLoanPaymentSplit), so the two can never
 * disagree the way two independently-typed fields could. The payment is also
 * rejected if its principal would exceed the loan's CURRENT remaining
 * balance — computed inside this same transaction (not before it) so a
 * concurrent payment can't create a stale-read race condition. Everything —
 * the balance check, the category lookup, the ledger transaction, the
 * LoanPayment row, and the audit log — happens in one $transaction: if any
 * step fails, none of it is applied.
 */
export async function recordLoanPayment(
  householdId: string,
  userId: string,
  input: LoanPaymentCreateInput
) {
  const loan = await prisma.loan.findFirst({
    where: { id: input.loanId, householdId, isActive: true },
  });
  if (!loan) {
    throw new LoanValidationError("Loan not found.");
  }

  const amountFils = aedToFils(input.amountAed);
  const interestFils = aedToFils(input.interestAed);

  const split = deriveLoanPaymentSplit(amountFils, interestFils);
  if (!split) {
    throw new LoanValidationError("Interest can't exceed the total payment amount.");
  }
  const { principalFils } = split;

  const paymentDate = parseFormDate(input.paymentDate);
  const description = input.note || `Loan payment \u2014 ${loan.name}`;

  return prisma.$transaction(async (tx) => {
    // Read existing payments INSIDE the transaction, not before it, so this
    // check and the write below are atomic against a concurrent payment.
    const existingPayments = await tx.loanPayment.findMany({
      where: { loanId: input.loanId },
      select: { principal: true },
    });
    const principalPaidSoFar = existingPayments.reduce((sum, p) => sum + p.principal, 0);
    const remainingBeforePayment = deriveLoanRemainingBalance(
      loan.openingBalance,
      principalPaidSoFar
    );
    if (principalFils > remainingBeforePayment) {
      throw new LoanValidationError(
        `This payment's principal (${(principalFils / 100).toFixed(2)} ledger units) exceeds the loan's remaining balance (${(
          remainingBeforePayment / 100
        ).toFixed(2)} ledger units).`
      );
    }

    const category = await getOrCreateLoanPaymentCategory(tx, householdId);

    let transaction;
    try {
      transaction = await recordLinkedTransaction(tx, {
        householdId,
        userId,
        accountId: input.accountId,
        categoryId: category.id,
        type: "EXPENSE",
        amountFils,
        date: paymentDate,
        description,
      });
    } catch (err) {
      // Translate the ledger's validation error into this domain's error type
      // so the recordLoanPaymentAction caller only needs to catch one kind.
      if (err instanceof TransactionValidationError) {
        throw new LoanValidationError(err.message);
      }
      throw err;
    }

    const payment = await tx.loanPayment.create({
      data: {
        loanId: input.loanId,
        amount: amountFils,
        principal: principalFils,
        interest: interestFils,
        paymentDate,
        note: input.note || null,
        transactionId: transaction.id,
      },
    });

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "LoanPayment",
        entityId: payment.id,
        summary: `Recorded payment of ${(amountFils / 100).toFixed(2)} ledger units on "${loan.name}"`,
      },
      tx
    );

    return payment;
  });
}
