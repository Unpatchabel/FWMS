import { prisma } from "@/lib/prisma";
import { monthRange } from "@/lib/dates";
import { deriveSavingsRatePct } from "@/lib/ledger-math";

export interface ReportCategory {
  name: string;
  amountFils: number;
}

/** A single calendar month's household income, spending and cash leaving accounts. */
export async function getMonthlyReport(householdId: string, ref: Date = new Date()) {
  const { start, end } = monthRange(ref);
  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      status: "ACTIVE",
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: start, lt: end },
    },
    select: {
      type: true,
      amount: true,
      category: { select: { name: true } },
      loanPayment: { select: { principal: true } },
    },
  });

  const income = new Map<string, number>();
  const spending = new Map<string, number>();
  let incomeFils = 0;
  let spendingFils = 0;
  let cashPaidFils = 0;
  let principalPaidFils = 0;

  for (const transaction of transactions) {
    const name = transaction.category?.name ?? "Uncategorized";
    if (transaction.type === "INCOME") {
      incomeFils += transaction.amount;
      income.set(name, (income.get(name) ?? 0) + transaction.amount);
    } else {
      const paid = Math.abs(transaction.amount);
      const principal = transaction.loanPayment?.principal ?? 0;
      const spent = paid - principal;
      cashPaidFils += paid;
      principalPaidFils += principal;
      spendingFils += spent;
      if (spent > 0) spending.set(name, (spending.get(name) ?? 0) + spent);
    }
  }

  const categories = (amounts: Map<string, number>): ReportCategory[] =>
    [...amounts.entries()]
      .map(([name, amountFils]) => ({ name, amountFils }))
      .sort((a, b) => b.amountFils - a.amountFils || a.name.localeCompare(b.name));

  return {
    incomeFils,
    spendingFils,
    cashPaidFils,
    principalPaidFils,
    remainingFils: incomeFils - spendingFils,
    savingsRatePct: deriveSavingsRatePct(incomeFils, spendingFils),
    incomeCategories: categories(income),
    spendingCategories: categories(spending),
  };
}
