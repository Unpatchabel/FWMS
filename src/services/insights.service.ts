import { getMonthlyFlow, type FinancialSummary } from "@/services/summary.service";

/**
 * Insight engine.
 *
 * MVP implementation is RULE-BASED and fully local — no AI/API calls, so the
 * app runs independently. The public shape (`Insight[]`) is intentionally the
 * contract a future LLM-backed generator can implement instead, without any
 * change to the dashboard that consumes it.
 */

export type InsightTone = "positive" | "neutral" | "warning";

export interface Insight {
  id: string;
  tone: InsightTone;
  title: string;
  detail: string;
}

export async function getInsights(
  householdId: string,
  summary: FinancialSummary
): Promise<Insight[]> {
  const insights: Insight[] = [];

  // 1. Savings rate this month.
  if (summary.savingsRatePct !== null) {
    if (summary.savingsRatePct >= 20) {
      insights.push({
        id: "savings-strong",
        tone: "positive",
        title: `Saving ${summary.savingsRatePct}% of income`,
        detail: "You're keeping a healthy share of this month's income.",
      });
    } else if (summary.savingsRatePct >= 0) {
      insights.push({
        id: "savings-thin",
        tone: "neutral",
        title: `Savings rate is ${summary.savingsRatePct}%`,
        detail: "Spending is close to income this month — worth a look.",
      });
    } else {
      insights.push({
        id: "savings-negative",
        tone: "warning",
        title: "Spending exceeds income this month",
        detail: "Expenses are higher than income so far this month.",
      });
    }
  }

  // 2. Month-over-month expense change.
  const now = new Date();
  const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prev = await getMonthlyFlow(householdId, lastMonth);
  if (prev.expensesFils > 0) {
    const changePct = Math.round(
      ((summary.expensesThisMonthFils - prev.expensesFils) /
        prev.expensesFils) *
        100
    );
    if (changePct >= 15) {
      insights.push({
        id: "expenses-up",
        tone: "warning",
        title: `Expenses up ${changePct}% vs last month`,
        detail: "Spending has risen noticeably compared with last month.",
      });
    } else if (changePct <= -15) {
      insights.push({
        id: "expenses-down",
        tone: "positive",
        title: `Expenses down ${Math.abs(changePct)}% vs last month`,
        detail: "Nicely reduced spending compared with last month.",
      });
    }
  }

  // 3. Liability load relative to assets.
  if (summary.assetsFils > 0) {
    const ratio = summary.liabilitiesFils / summary.assetsFils;
    if (ratio > 0.5) {
      insights.push({
        id: "leverage-high",
        tone: "warning",
        title: "Liabilities exceed half of asset value",
        detail: "A large share of your assets is financed by debt.",
      });
    }
  }

  // Always return something meaningful.
  if (insights.length === 0) {
    insights.push({
      id: "all-clear",
      tone: "neutral",
      title: "Nothing needs attention right now",
      detail: "Add more transactions to unlock richer insights.",
    });
  }

  return insights;
}
