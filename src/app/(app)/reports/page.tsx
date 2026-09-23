import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { formatAED } from "@/lib/money";
import { Card } from "@/components/ui/card";
import { getMonthlyReport, type ReportCategory } from "@/services/reports.service";

export const dynamic = "force-dynamic";

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const user = await requireUser();
  const selected = (await searchParams).month;
  const valid = selected && /^(19|20)\d{2}-(0[1-9]|1[0-2])$/.test(selected);
  const ref = valid
    ? new Date(Number(selected.slice(0, 4)), Number(selected.slice(5)) - 1, 1)
    : new Date();
  const report = await getMonthlyReport(user.householdId, ref);
  const monthName = new Intl.DateTimeFormat("en-AE", { month: "long", year: "numeric" }).format(ref);
  const previous = monthKey(new Date(ref.getFullYear(), ref.getMonth() - 1, 1));
  const next = monthKey(new Date(ref.getFullYear(), ref.getMonth() + 1, 1));

  return (
    <div className="min-w-0 space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Monthly report</h1>
          <p className="mt-1 text-sm text-ink-soft">A clear view of money earned, spent, and paid toward debt.</p>
        </div>
        <div className="flex items-center gap-2" aria-label="Choose month">
          <Link href={`/reports?month=${previous}`} aria-label="Previous month"
            className="rounded-lg border border-beige-border bg-surface p-2 text-ink hover:bg-surface-sunken">
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <span className="min-w-36 text-center text-sm font-medium text-ink">{monthName}</span>
          <Link href={`/reports?month=${next}`} aria-label="Next month"
            className="rounded-lg border border-beige-border bg-surface p-2 text-ink hover:bg-surface-sunken">
            <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ReportMetric label="Income" value={formatAED(report.incomeFils)} accent="text-emerald" />
        <ReportMetric label="Spending" value={formatAED(report.spendingFils)} accent="text-danger" />
        <ReportMetric label="Income after spending" value={formatAED(report.remainingFils)}
          detail={report.savingsRatePct === null ? "No income this month" : `${report.savingsRatePct}% of income retained`} />
      </div>

      <Card className="min-w-0 p-5 sm:p-6">
        <h2 className="font-display text-xl text-ink">Where cash went</h2>
        <p className="mt-1 text-sm text-ink-soft">Loan principal reduces debt. Only interest counts as spending.</p>
        <dl className="mt-5 grid gap-4 sm:grid-cols-3">
          <div><dt className="text-xs uppercase tracking-wide text-silver-muted">Spending</dt>
            <dd className="tabular mt-1 break-words text-lg font-medium text-ink">{formatAED(report.spendingFils)}</dd></div>
          <div><dt className="text-xs uppercase tracking-wide text-silver-muted">Loan principal repaid</dt>
            <dd className="tabular mt-1 break-words text-lg font-medium text-ink">{formatAED(report.principalPaidFils)}</dd></div>
          <div className="border-t border-beige-border pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
            <dt className="text-xs uppercase tracking-wide text-silver-muted">Total cash paid</dt>
            <dd className="tabular mt-1 break-words text-lg font-medium text-ink">{formatAED(report.cashPaidFils)}</dd></div>
        </dl>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <CategoryCard title="Spending by category" categories={report.spendingCategories}
          totalFils={report.spendingFils} empty="No spending this month." color="bg-danger" />
        <CategoryCard title="Income by source" categories={report.incomeCategories}
          totalFils={report.incomeFils} empty="No income this month." color="bg-emerald" />
      </div>
    </div>
  );
}

function ReportMetric({ label, value, detail, accent = "text-ink" }: {
  label: string; value: string; detail?: string; accent?: string;
}) {
  return (
    <Card className="min-w-0 p-5">
      <p className="text-xs uppercase tracking-wide text-silver-muted">{label}</p>
      <p className={`tabular mt-2 break-words text-xl font-medium ${accent}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-ink-soft">{detail}</p>}
    </Card>
  );
}

function CategoryCard({ title, categories, totalFils, empty, color }: {
  title: string; categories: ReportCategory[]; totalFils: number; empty: string; color: string;
}) {
  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">{title}</h2>
      {categories.length === 0 ? (
        <p className="py-12 text-sm text-ink-soft">{empty}</p>
      ) : (
        <ul className="mt-5 space-y-4">
          {categories.map((category) => {
            const share = totalFils > 0 ? category.amountFils / totalFils * 100 : 0;
            return (
              <li key={category.name}>
                <div className="flex min-w-0 justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate text-ink" title={category.name}>{category.name}</span>
                  <span className="tabular shrink-0 text-ink-soft">{formatAED(category.amountFils)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-sunken"
                  role="img" aria-label={`${category.name}: ${Math.round(share)}%`}>
                  <div className={`h-full rounded-pill ${color}`} style={{ width: `${share}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
