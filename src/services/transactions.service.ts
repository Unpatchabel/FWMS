import { transactionCreateSchema, transferCreateSchema } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { aedToFils } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { monthRange, previousMonthRange, parseFormDate } from "@/lib/dates";
import { signedTransactionAmount } from "@/lib/ledger-math";
import { randomUUID } from "node:crypto";
import type { TransactionCreateInput, TransferCreateInput } from "@/lib/validators";
import type { Prisma } from "@prisma/client";

export class TransactionValidationError extends Error {}

export type PeriodFilter = "this-month" | "last-month" | "all";

/** Either the top-level Prisma client or an active interactive-transaction client. */
type Db = Prisma.TransactionClient;

/**
 * Every Transaction row in the system — a user-entered income/expense, a
 * system-generated ADJUSTMENT, or a linked entry created by another domain
 * (e.g. a loan payment) — is written through this one function, so the shape
 * of a ledger row is defined in exactly one place. Not exported outside this
 * module: callers use createTransaction(), recordAdjustment(), or
 * recordLinkedTransaction(), which add validation and audit logging around it.
 */
async function insertTransactionRow(
  db: Db,
  data: Prisma.TransactionUncheckedCreateInput
) {
  return db.transaction.create({ data });
}

/**
 * Shared integrity check for any INCOME/EXPENSE row, whether entered directly
 * by a user (createTransaction) or attached by another service to its own
 * action (recordLinkedTransaction, used by loan payments). Centralizing this
 * here — rather than letting each caller re-implement it — is what "one
 * definition of a valid ledger row" means in practice.
 */
async function validateAccountAndCategory(
  db: Db,
  householdId: string,
  accountId: string,
  categoryId: string,
  type: "INCOME" | "EXPENSE"
) {
  const [account, category] = await Promise.all([
    db.account.findFirst({
      where: { id: accountId, householdId, isActive: true },
    }),
    db.category.findFirst({
      where: { id: categoryId, householdId },
    }),
  ]);

  if (!account) {
    throw new TransactionValidationError("Select a valid account.");
  }
  if (!category) {
    throw new TransactionValidationError("Select a valid category.");
  }
  if (category.type !== type) {
    throw new TransactionValidationError(
      `"${category.name}" is a ${category.type.toLowerCase()} category and can't be used for ${type.toLowerCase()}.`
    );
  }

  return { account, category };
}

/**
 * List transactions of a given type for a household, most recent first.
 * VOIDed rows never appear here — a removed entry is gone from history and
 * from every total, exactly as if it were deleted, even though the row still
 * exists underneath (see voidTransaction below).
 */
export async function listTransactionsByType(
  householdId: string,
  type: "INCOME" | "EXPENSE",
  opts: { period?: PeriodFilter; categoryId?: string; search?: string } = {}
) {
  const { period = "all", categoryId, search } = opts;

  let dateFilter: { gte?: Date; lt?: Date } | undefined;
  if (period === "this-month") {
    const { start, end } = monthRange();
    dateFilter = { gte: start, lt: end };
  } else if (period === "last-month") {
    const { start, end } = previousMonthRange();
    dateFilter = { gte: start, lt: end };
  }

  return prisma.transaction.findMany({
    where: {
      householdId,
      type,
      status: "ACTIVE",
      ...(dateFilter ? { date: dateFilter } : {}),
      ...(categoryId ? { categoryId } : {}),
      // Basic search across description, category name, and account name.
      // SQLite's LIKE (which Prisma's `contains` compiles to) is already
      // case-insensitive for ASCII, so this covers the common case for free.
      ...(search
        ? {
            OR: [
              { description: { contains: search } },
              { category: { name: { contains: search } } },
              { account: { name: { contains: search } } },
            ],
          }
        : {}),
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    include: {
      account: { select: { id: true, name: true } },
      category: { select: { id: true, name: true, color: true } },
      loanPayment: { select: { principal: true, interest: true } },
    },
  });
}

/**
 * Create an income or expense transaction.
 *
 * The sign of the stored amount is decided HERE, from `input.type` — never
 * trusted from the client's amount field — so a tampered request cannot
 * credit an account under an EXPENSE type or vice versa.
 */
export async function createTransaction(
  householdId: string,
  userId: string,
  input: TransactionCreateInput
) {
  input = transactionCreateSchema.parse(input);
  const magnitude = aedToFils(input.amountAed);
  const amount = signedTransactionAmount(input.type, magnitude);

  return prisma.$transaction(async (tx) => {
    const { category } = await validateAccountAndCategory(tx, householdId, input.accountId, input.categoryId, input.type);
    const created = await insertTransactionRow(tx, {
      householdId,
      accountId: input.accountId,
      type: input.type,
      amount,
      categoryId: input.categoryId,
      date: parseFormDate(input.date),
      description: input.description || null,
      createdById: userId,
    });

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "Transaction",
        entityId: created.id,
        summary: `${input.type === "INCOME" ? "Income" : "Expense"} of ${(
          magnitude / 100
        ).toFixed(2)} ledger units (${category.name})`,
      },
      tx
    );

    return created;
  });
}

/** Move money between two active household accounts as one atomic ledger pair. */
export async function createTransfer(
  householdId: string,
  userId: string,
  input: TransferCreateInput
) {
  const parsed = transferCreateSchema.safeParse(input);
  if (!parsed.success) throw new TransactionValidationError(parsed.error.issues[0]?.message ?? "Invalid transfer.");
  input = parsed.data;
  if (input.fromAccountId === input.toAccountId) {
    throw new TransactionValidationError("Choose two different accounts.");
  }
  const amountFils = aedToFils(input.amountAed);
  if (amountFils <= 0) {
    throw new TransactionValidationError("Transfer amount must be greater than zero.");
  }
  const date = parseFormDate(input.date);
  const transferGroupId = randomUUID();

  return prisma.$transaction(async (tx) => {
    const accounts = await tx.account.findMany({
      where: {
        householdId,
        isActive: true,
        id: { in: [input.fromAccountId, input.toAccountId] },
      },
      select: { id: true, name: true },
    });
    if (accounts.length !== 2) {
      throw new TransactionValidationError("Choose two active accounts in this household.");
    }

    const common = {
      householdId,
      type: "TRANSFER",
      status: "ACTIVE",
      date,
      description: input.description || null,
      transferGroupId,
      createdById: userId,
    };
    const debit = await insertTransactionRow(tx, {
      ...common,
      accountId: input.fromAccountId,
      transferAccountId: input.toAccountId,
      amount: -amountFils,
    });
    const credit = await insertTransactionRow(tx, {
      ...common,
      accountId: input.toAccountId,
      transferAccountId: input.fromAccountId,
      amount: amountFils,
    });

    await logAudit({
      householdId,
      userId,
      action: "CREATE",
      entity: "Transfer",
      entityId: transferGroupId,
      summary: `Transferred ${(amountFils / 100).toFixed(2)} ledger units from ${accounts.find((a) => a.id === input.fromAccountId)!.name} to ${accounts.find((a) => a.id === input.toAccountId)!.name}`,
    }, tx);

    return { transferGroupId, debit, credit };
  });
}

/** One debit row per transfer, with both account names for account history. */
export async function listTransfers(householdId: string, take = 10) {
  return prisma.transaction.findMany({
    where: { householdId, type: "TRANSFER", status: "ACTIVE", amount: { lt: 0 } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      account: { select: { name: true } },
      transferAccount: { select: { name: true } },
    },
  });
}

/**
 * System-generated ledger entry (e.g. an account's opening balance). Accepts
 * the caller's own `db` client so it can participate in an outer interactive
 * transaction (see accounts.service.createAccount) and commit or roll back
 * atomically with whatever else that transaction is doing. No category is
 * attached — ADJUSTMENT rows don't appear in Income/Expenses or monthly flow.
 */
export async function recordAdjustment(
  db: Db,
  params: {
    householdId: string;
    userId: string;
    accountId: string;
    amountFils: number;
    description: string;
  }
) {
  const created = await insertTransactionRow(db, {
    householdId: params.householdId,
    accountId: params.accountId,
    type: "ADJUSTMENT",
    amount: params.amountFils,
    date: new Date(),
    description: params.description,
    createdById: params.userId,
  });

  await logAudit(
    {
      householdId: params.householdId,
      userId: params.userId,
      action: "CREATE",
      entity: "Transaction",
      entityId: created.id,
      summary: `Adjustment of ${(params.amountFils / 100).toFixed(2)} ledger units (${
        params.description
      })`,
    },
    db
  );

  return created;
}

/**
 * A categorized INCOME/EXPENSE row created BY another domain's own action,
 * not typed in directly by a user on the Income/Expenses page — currently
 * used by loans.service when recording a loan payment. Runs the same
 * account/category validation as createTransaction() and accepts the
 * caller's `db` client so it can join that caller's own interactive
 * transaction: this is what keeps "all transaction operations go through
 * TransactionService" true even as other domains (loans, and later
 * transfers) start affecting cash balances.
 */
export async function recordLinkedTransaction(
  db: Db,
  params: {
    householdId: string;
    userId: string;
    accountId: string;
    categoryId: string;
    type: "INCOME" | "EXPENSE";
    /** Positive magnitude in fils — the sign is applied here, same rule as createTransaction. */
    amountFils: number;
    date: Date;
    description: string;
  }
) {
  await validateAccountAndCategory(
    db,
    params.householdId,
    params.accountId,
    params.categoryId,
    params.type
  );

  const amount = signedTransactionAmount(params.type, params.amountFils);

  const created = await insertTransactionRow(db, {
    householdId: params.householdId,
    accountId: params.accountId,
    type: params.type,
    amount,
    categoryId: params.categoryId,
    date: params.date,
    description: params.description,
    createdById: params.userId,
  });

  await logAudit(
    {
      householdId: params.householdId,
      userId: params.userId,
      action: "CREATE",
      entity: "Transaction",
      entityId: created.id,
      summary: `${params.type === "INCOME" ? "Income" : "Expense"} of ${(
        Math.abs(params.amountFils) / 100
      ).toFixed(2)} ledger units (${params.description})`,
    },
    db
  );

  return created;
}

/**
 * Removes a transaction from the ledger via a soft VOID rather than a hard
 * delete: `status` flips to VOID, the row disappears from every
 * balance/history query, but the row and its audit trail are preserved.
 *
 * Refuses to void a transaction that was created by recording a loan payment
 * (see LoanPayment.transactionId) — voiding it here would drop it from cash
 * flow and expense totals while the loan's own remaining balance stayed
 * reduced by that payment's principal, silently desyncing the two. That case
 * needs a symmetric change on the loan side, which doesn't exist yet.
 */
export async function voidTransaction(
  householdId: string,
  userId: string,
  transactionId: string
) {
  const existing = await prisma.transaction.findFirst({
    where: { id: transactionId, householdId },
    include: {
      loanPayment: { select: { loan: { select: { name: true } } } },
    },
  });
  if (!existing) {
    throw new TransactionValidationError("Transaction not found.");
  }
  if (existing.status === "VOID") {
    throw new TransactionValidationError("This entry has already been removed.");
  }
  if (existing.type === "TRANSFER" || existing.type === "ADJUSTMENT") {
    throw new TransactionValidationError("This system entry can't be removed individually.");
  }
  if (existing.loanPayment) {
    throw new TransactionValidationError(
      `This entry was created from a payment on "${existing.loanPayment.loan.name}" and can't be removed here.`
    );
  }

  await prisma.$transaction(async (tx) => {
    const changed = await tx.transaction.updateMany({
      where: { id: transactionId, householdId, status: "ACTIVE" },
      data: { status: "VOID" },
    });
    if (changed.count !== 1) throw new TransactionValidationError("This entry has already been removed.");

    await logAudit(
      {
        householdId,
        userId,
        action: "VOID",
        entity: "Transaction",
        entityId: transactionId,
        summary: `Voided ${existing.type.toLowerCase()} of ${(
          Math.abs(existing.amount) / 100
        ).toFixed(2)} ledger units`,
      },
      tx
    );
  });
}
