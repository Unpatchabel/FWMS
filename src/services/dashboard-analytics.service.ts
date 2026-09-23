import { prisma } from "@/lib/prisma";

export interface MonthlyTrend {
  key: string;
  label: string;
  incomeFils: number;
  spendingFils: number;
}

export interface SpendingCategory {
  name: string;
  amountFils: number;
}

/** Six calendar months of income and actual spending, including this month. */
export async function getDashboardAnalytics(householdId: string, ref = new Date()) {
  const firstMonth = new Date(ref.getFullYear(), ref.getMonth() - 5, 1);
  const nextMonth = new Date(ref.getFullYear(), ref.getMonth() + 1, 1);
  const months: MonthlyTrend[] = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: new Intl.DateTimeFormat("en-AE", {
        month: "short", year: "2-digit",
      }).format(date),
      incomeFils: 0,
      spendingFils: 0,
    };
  });

  const transactions = await prisma.transaction.findMany({
    where: {
      householdId,
      status: "ACTIVE",
      type: { in: ["INCOME", "EXPENSE"] },
      date: { gte: firstMonth, lt: nextMonth },
    },
    select: {
      type: true,
      date: true,
      amount: true,
      category: { select: { name: true } },
      loanPayment: { select: { principal: true } },
    },
  });

  const byMonth = new Map(months.map((month) => [month.key, month]));
  const categoryAmounts = new Map<string, number>();
  const currentKey = months[months.length - 1].key;

  for (const transaction of transactions) {
    const key = `${transaction.date.getFullYear()}-${String(transaction.date.getMonth() + 1).padStart(2, "0")}`;
    const month = byMonth.get(key);
    if (!month) continue;

    if (transaction.type === "INCOME") {
      month.incomeFils += transaction.amount;
      continue;
    }

    // A loan payment debits cash in full, while only its interest is spending.
    const spendingFils = Math.abs(transaction.amount) - (transaction.loanPayment?.principal ?? 0);
    month.spendingFils += spendingFils;
    if (key === currentKey && spendingFils > 0) {
      const name = transaction.category?.name ?? "Uncategorized";
      categoryAmounts.set(name, (categoryAmounts.get(name) ?? 0) + spendingFils);
    }
  }

  const ordered = [...categoryAmounts.entries()]
    .map(([name, amountFils]) => ({ name, amountFils }))
    .sort((a, b) => b.amountFils - a.amountFils);
  const categories: SpendingCategory[] = ordered.slice(0, 5);
  if (ordered.length > 5) {
    categories.push({
      name: "Other categories",
      amountFils: ordered.slice(5).reduce((sum, item) => sum + item.amountFils, 0),
    });
  }

  return { months, categories, currentSpendingFils: months[5].spendingFils };
}
