import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";
import { deriveNetWorth, deriveSavingsRatePct } from "@/lib/ledger-math";
import { listAssets } from "@/services/assets.service";
import { listLoans } from "@/services/loans.service";

/**
 * Summary service — the single source of financial truth for the dashboard.
 *
 * Every figure here is DERIVED, not read from a stored "balance" field:
 *   - cash        = SUM(ACTIVE transaction amounts)               [signed fils]
 *   - assets      = SUM(latest valuation per active asset)         (assets.service)
 *   - liabilities = SUM(each loan's derived remaining balance)     (loans.service)
 *   - net worth   = cash + assets - liabilities
 *
 * Assets and liabilities are computed by assets.service / loans.service —
 * this file does not recompute those formulas, so "how much is a loan's
 * remaining balance" has exactly one definition in the codebase.
 *
 * Keeping these as plain functions means they can be unit-tested against known
 * inputs without a browser (see README "Testing").
 */

export interface FinancialSummary {
  cashFils: number;
  assetsFils: number;
  liabilitiesFils: number;
  netWorthFils: number;
  incomeThisMonthFils: number;
  expensesThisMonthFils: number;
  savingsRatePct: number | null; // null when there is no income this month
}

/** Total cash across all accounts = SUM(amount) of ACTIVE transactions. VOIDed rows never count. */
export async function getTotalCashFils(householdId: string): Promise<number> {
  const result = await prisma.transaction.aggregate({
    where: { householdId, status: "ACTIVE" },
    _sum: { amount: true },
  });
  return result._sum.amount ?? 0;
}

/** Total assets = sum of the latest valuation for each active asset (or purchase value if none yet). */
export async function getTotalAssetsFils(householdId: string): Promise<number> {
  const assets = await listAssets(householdId);
  return assets.reduce((sum, a) => sum + a.currentValueFils, 0);
}

/** Total liabilities = sum of each loan's derived remaining balance. */
export async function getTotalLiabilitiesFils(householdId: string): Promise<number> {
  const loans = await listLoans(householdId);
  return loans.reduce((sum, l) => sum + l.remainingBalanceFils, 0);
}

/** Income/expense totals for a given month (defaults to the current month). VOIDed rows never count. */
/** Monthly income and spending. Loan principal reduces debt, not spending. */
export async function getMonthlyFlow(
  householdId: string,
  ref: Date = new Date()
): Promise<{ incomeFils: number; expensesFils: number }> {
  const { start, end } = monthRange(ref);

  const [income, expenses] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        householdId,
        type: "INCOME",
        status: "ACTIVE",
        date: { gte: start, lt: end },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        type: "EXPENSE",
        status: "ACTIVE",
        date: { gte: start, lt: end },
      },
      select: {
        amount: true,
        loanPayment: { select: { principal: true } },
      },
    }),
  ]);

  return {
    incomeFils: income._sum.amount ?? 0,
    expensesFils: expenses.reduce(
      (total, transaction) =>
        total + Math.abs(transaction.amount) - (transaction.loanPayment?.principal ?? 0),
      0
    ),
  };
}

/** Assemble the full dashboard summary in one call. */
export async function getFinancialSummary(
  householdId: string
): Promise<FinancialSummary> {
  const [cashFils, assetsFils, liabilitiesFils, flow] = await Promise.all([
    getTotalCashFils(householdId),
    getTotalAssetsFils(householdId),
    getTotalLiabilitiesFils(householdId),
    getMonthlyFlow(householdId),
  ]);

  const netWorthFils = deriveNetWorth(cashFils, assetsFils, liabilitiesFils);
  const savingsRatePct = deriveSavingsRatePct(flow.incomeFils, flow.expensesFils);

  return {
    cashFils,
    assetsFils,
    liabilitiesFils,
    netWorthFils,
    incomeThisMonthFils: flow.incomeFils,
    expensesThisMonthFils: flow.expensesFils,
    savingsRatePct,
  };
}

/** Most recent ACTIVE transactions for the "Recent activity" panel. */
export async function getRecentTransactions(householdId: string, take = 8) {
  return prisma.transaction.findMany({
    // Show a transfer once, using its debit row; the paired credit still
    // contributes to the destination account's derived balance.
    where: {
      householdId,
      status: "ACTIVE",
      OR: [{ type: { not: "TRANSFER" } }, { type: "TRANSFER", amount: { lt: 0 } }],
    },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take,
    include: {
      account: { select: { name: true } },
      transferAccount: { select: { name: true } },
      category: { select: { name: true, type: true, color: true } },
    },
  });
}
