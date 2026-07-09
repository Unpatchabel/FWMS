import {
  Wallet,
  Building2,
  Landmark,
  TrendingUp,
  Receipt,
  PiggyBank,
} from "lucide-react";
import { requireUser, isOwner } from "@/lib/auth";
import { formatAED } from "@/lib/money";
import {
  getFinancialSummary,
  getRecentTransactions,
} from "@/services/summary.service";
import { getInsights } from "@/services/insights.service";
import { listAccounts } from "@/services/accounts.service";
import { listCategories } from "@/services/categories.service";
import { NetWorthHero } from "@/components/dashboard/net-worth-hero";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { InsightsPanel } from "@/components/dashboard/insights-panel";
import { QuickAddTransaction } from "@/components/transactions/quick-add-transaction";

// Financial data must always be current — never served from a stale cache.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const { householdId } = user;

  const [summary, recent, accounts, incomeCategories, expenseCategories] =
    await Promise.all([
      getFinancialSummary(householdId),
      getRecentTransactions(householdId),
      listAccounts(householdId),
      listCategories(householdId, "INCOME"),
      listCategories(householdId, "EXPENSE"),
    ]);
  const insights = await getInsights(householdId, summary);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-3">
        <QuickAddTransaction
          type="EXPENSE"
          label="Add Expense"
          accounts={accounts}
          categories={expenseCategories}
          isOwner={isOwner(user)}
          variant="secondary"
        />
        <QuickAddTransaction
          type="INCOME"
          label="Add Income"
          accounts={accounts}
          categories={incomeCategories}
          isOwner={isOwner(user)}
        />
      </div>

      <NetWorthHero
        netWorthFils={summary.netWorthFils}
        cashFils={summary.cashFils}
        assetsFils={summary.assetsFils}
        liabilitiesFils={summary.liabilitiesFils}
      />

      {/* KPI grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Cash on hand"
          value={formatAED(summary.cashFils)}
          icon={Wallet}
          accent="ink"
        />
        <MetricCard
          label="Total assets"
          value={formatAED(summary.assetsFils)}
          icon={Building2}
          accent="emerald"
        />
        <MetricCard
          label="Total liabilities"
          value={formatAED(summary.liabilitiesFils)}
          icon={Landmark}
          accent="danger"
        />
        <MetricCard
          label="Income this month"
          value={formatAED(summary.incomeThisMonthFils)}
          icon={TrendingUp}
          accent="emerald"
        />
        <MetricCard
          label="Expenses this month"
          value={formatAED(summary.expensesThisMonthFils)}
          icon={Receipt}
          accent="danger"
        />
        <MetricCard
          label="Savings rate"
          value={
            summary.savingsRatePct === null
              ? "\u2014"
              : `${summary.savingsRatePct}%`
          }
          hint="This month"
          icon={PiggyBank}
          accent="sky"
        />
      </div>

      {/* Activity + insights */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RecentActivity transactions={recent} />
        </div>
        <InsightsPanel insights={insights} />
      </div>
    </div>
  );
}
