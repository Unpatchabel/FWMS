import { Card } from "@/components/ui/card";
import { formatAED } from "@/lib/money";
import type { MonthlyTrend } from "@/services/dashboard-analytics.service";

export function CashFlowTrend({ months }: { months: MonthlyTrend[] }) {
  const max = Math.max(1, ...months.flatMap((m) => [m.incomeFils, m.spendingFils]));
  const hasData = months.some((m) => m.incomeFils > 0 || m.spendingFils > 0);

  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-xl text-ink">Income &amp; spending</h2>
          <p className="mt-1 text-sm text-ink-soft">Last six months, including this month</p>
        </div>
        <div className="flex gap-4 text-xs text-ink-soft">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-emerald" />Income</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-sky" />Spending</span>
        </div>
      </div>

      {!hasData ? (
        <p className="py-16 text-center text-sm text-ink-soft">
          Add income or expenses to see your monthly trend.
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <div className="grid min-w-[420px] grid-cols-6 gap-3">
            {months.map((month) => (
              <div key={month.key} className="min-w-0 text-center">
                <div
                  className="flex h-36 items-end justify-center gap-1 rounded-lg bg-surface-sunken/60 px-2 pt-3"
                  role="img"
                  aria-label={`${month.label}: income ${formatAED(month.incomeFils)}, spending ${formatAED(month.spendingFils)}`}
                >
                  <div
                    className="w-5 rounded-t-md bg-emerald transition-[height]"
                    style={{ height: month.incomeFils ? `${Math.max(5, (month.incomeFils / max) * 100)}%` : 0 }}
                  />
                  <div
                    className="w-5 rounded-t-md bg-sky transition-[height]"
                    style={{ height: month.spendingFils ? `${Math.max(5, (month.spendingFils / max) * 100)}%` : 0 }}
                  />
                </div>
                <p className="mt-2 text-xs text-ink-soft">{month.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
      <p className="mt-4 text-xs text-silver-muted">
        Loan principal moves money out of an account but does not count as spending.
      </p>
    </Card>
  );
}
