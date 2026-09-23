import { Suspense } from "react";
import { requireUser, canWrite, isOwner } from "@/lib/auth";
import { formatAED } from "@/lib/money";
import { listTransactionsByType, type PeriodFilter } from "@/services/transactions.service";
import { listCategories } from "@/services/categories.service";
import { listAccounts } from "@/services/accounts.service";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { QuickAddTransaction } from "@/components/transactions/quick-add-transaction";
import { PeriodFilter as PeriodFilterBar } from "@/components/transactions/period-filter";
import { TransactionSearch } from "@/components/transactions/transaction-search";
import { TransactionsTable } from "@/components/transactions/transactions-table";

export const dynamic = "force-dynamic";

const VALID_PERIODS: PeriodFilter[] = ["this-month", "last-month", "all"];

export default async function IncomePage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; categoryId?: string; q?: string }>;
}) {
  const user = await requireUser();
  const filters = await searchParams;
  const period: PeriodFilter = VALID_PERIODS.includes(
    filters.period as PeriodFilter
  )
    ? (filters.period as PeriodFilter)
    : "this-month";

  const [transactions, categories, accounts] = await Promise.all([
    listTransactionsByType(user.householdId, "INCOME", {
      period,
      categoryId: filters.categoryId,
      search: filters.q,
    }),
    listCategories(user.householdId, "INCOME"),
    listAccounts(user.householdId),
  ]);

  const totalFils = transactions.reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Income</h1>
          <p className="text-sm text-ink-soft mt-1">
            Every credit to a household account, categorized and dated.
          </p>
        </div>
        {canWrite(user) && (
          <QuickAddTransaction
            type="INCOME"
            label="Add Income"
            accounts={accounts}
            categories={categories}
            isOwner={isOwner(user)}
          />
        )}
      </div>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-silver-muted">
          Total for selection
        </p>
        <p className="tabular text-2xl font-medium text-emerald mt-1">
          {formatAED(totalFils)}
        </p>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="mb-0">History</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Suspense fallback={null}>
                <TransactionSearch initialValue={filters.q} />
              </Suspense>
              <Suspense fallback={null}>
                <PeriodFilterBar
                  period={period}
                  categoryId={filters.categoryId}
                  categories={categories}
                />
              </Suspense>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <TransactionsTable
            transactions={transactions}
            canDelete={canWrite(user)}
            emptyLabel="No income recorded for this period yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
