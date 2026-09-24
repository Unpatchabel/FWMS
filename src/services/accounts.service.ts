import { prisma } from "@/lib/prisma";
import { aedToFils } from "@/lib/money";
import { logAudit } from "@/lib/audit";
import { recordAdjustment } from "@/services/transactions.service";
import type { AccountCreateInput } from "@/lib/validators";

export interface AccountWithBalance {
  id: string;
  name: string;
  type: string;
  institution: string | null;
  isActive: boolean;
  balanceFils: number;
}

/**
 * List active accounts with their DERIVED balance (SUM of ACTIVE transaction
 * amounts for that account) — never a stored field. VOIDed transactions are
 * excluded, same as everywhere else. Accounts with no transactions yet simply
 * show a zero balance.
 */
export async function listAccounts(
  householdId: string
): Promise<AccountWithBalance[]> {
  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({
      where: { householdId, isActive: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.transaction.groupBy({
      by: ["accountId"],
      where: { householdId, status: "ACTIVE" },
      _sum: { amount: true },
    }),
  ]);

  const balanceByAccount = new Map(
    sums.map((s) => [s.accountId, s._sum.amount ?? 0])
  );

  return accounts.map((a) => ({
    id: a.id,
    name: a.name,
    type: a.type,
    institution: a.institution,
    isActive: a.isActive,
    balanceFils: balanceByAccount.get(a.id) ?? 0,
  }));
}

/**
 * Create an account and, if an opening balance was supplied, write it as a
 * single ADJUSTMENT transaction dated today. The write itself goes through
 * TransactionService.recordAdjustment() — this function never touches the
 * Transaction table directly — passing `tx` through so account creation, the
 * opening-balance entry, and the audit log all commit or roll back together.
 */
export async function createAccount(
  householdId: string,
  userId: string,
  input: AccountCreateInput
): Promise<AccountWithBalance> {
  const openingFils =
    input.openingBalanceAed && input.openingBalanceAed !== ""
      ? aedToFils(input.openingBalanceAed)
      : 0;

  const account = await prisma.$transaction(async (tx) => {
    const household = await tx.household.findUniqueOrThrow({ where: { id: householdId }, select: { currency: true } });
    const created = await tx.account.create({
      data: {
        householdId,
        currency: household.currency,
        name: input.name,
        type: input.type,
        institution: input.institution || null,
      },
    });

    if (openingFils !== 0) {
      await recordAdjustment(tx, {
        householdId,
        userId,
        accountId: created.id,
        amountFils: openingFils,
        description: "Opening balance",
      });
    }

    await logAudit(
      {
        householdId,
        userId,
        action: "CREATE",
        entity: "Account",
        entityId: created.id,
        summary: `Created account "${created.name}"`,
      },
      tx
    );

    return created;
  });

  return {
    id: account.id,
    name: account.name,
    type: account.type,
    institution: account.institution,
    isActive: account.isActive,
    balanceFils: openingFils,
  };
}
