import { Suspense } from "react";
import { getHouseholdCurrency } from "@/services/currency.service";
import { requireUser, canWrite, isOwner } from "@/lib/auth";
import { formatAED as formatLedgerMoney } from "@/lib/money";
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
  searchParams: Promise<{ period?: string; categoryId?: string; q?: string }>;
}) {
  const user = await requireUser();
  const currency = await getHouseholdCurrency(user.householdId);
  const formatAED = (value: number) => formatLedgerMoney(value, { currency });
  const filters = await searchParams;
  const period: PeriodFilter = VALID_PERIODS.includes(
    filters.period as PeriodFilter
  )
    ? (filters.period as PeriodFilter)
    : "this-month";

  const [transactions, categories, accounts] = await Promise.all([
    listTransactionsByType(user.householdId, "EXPENSE", {
      period,
      categoryId: filters.categoryId,
      search: filters.q,
    }),
    listCategories(user.householdId, "EXPENSE"),
    listAccounts(user.householdId),
  ]);

  const cashPaidFils = transactions.reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const spendingFils = transactions.reduce(
    (sum, t) => sum + Math.abs(t.amount) - (t.loanPayment?.principal ?? 0),
    0
  );

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-xl text-ink sm:text-2xl">Expenses &amp; payments</h1>
          <p className="text-sm text-ink-soft mt-1">
            Cash leaving your accounts. Loan principal reduces debt; only interest
            counts toward spending.
          </p>
        </div>
        {canWrite(user) && (
          <QuickAddTransaction
            type="EXPENSE"
            label="Add Expense"
            accounts={accounts}
            categories={categories}
            isOwner={isOwner(user)}
          />
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-silver-muted">Spending for selection</p>
          <p className="tabular mt-1 text-2xl font-medium text-danger">{formatAED(spendingFils)}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs uppercase tracking-wide text-silver-muted">Cash paid for selection</p>
          <p className="tabular mt-1 text-2xl font-medium text-ink">{formatAED(cashPaidFils)}</p>
        </Card>
      </div>

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
            emptyLabel="No expenses recorded for this period yet."
          />
        </CardContent>
      </Card>
    </div>
  );
}
