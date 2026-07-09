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

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: { period?: string; categoryId?: string; q?: string };
}) {
  const user = await requireUser();
  const period: PeriodFilter = VALID_PERIODS.includes(
    searchParams.period as PeriodFilter
  )
    ? (searchParams.period as PeriodFilter)
    : "this-month";

  const [transactions, categories, accounts] = await Promise.all([
    listTransactionsByType(user.householdId, "EXPENSE", {
      period,
      categoryId: searchParams.categoryId,
      search: searchParams.q,
    }),
    listCategories(user.householdId, "EXPENSE"),
    listAccounts(user.householdId),
  ]);

  const totalFils = Math.abs(transactions.reduce((sum, t) => sum + t.amount, 0));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Expenses</h1>
          <p className="text-sm text-ink-soft mt-1">
            Every debit from a household account, categorized and dated.
          </p>
        </div>
        <QuickAddTransaction
          type="EXPENSE"
          label="Add Expense"
          accounts={accounts}
          categories={categories}
          isOwner={isOwner(user)}
        />
      </div>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-silver-muted">
          Total for selection
        </p>
        <p className="tabular text-2xl font-medium text-danger mt-1">
          {formatAED(totalFils)}
        </p>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="mb-0">History</CardTitle>
            <div className="flex flex-wrap items-center gap-3">
              <Suspense fallback={null}>
                <TransactionSearch initialValue={searchParams.q} />
              </Suspense>
              <Suspense fallback={null}>
                <PeriodFilterBar
                  period={period}
                  categoryId={searchParams.categoryId}
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
            emptyLabel="No expenses recorded for this period yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
