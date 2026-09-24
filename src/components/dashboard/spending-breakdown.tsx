"use client";

import { Card } from "@/components/ui/card";
import { useMoney } from "@/components/currency-context";
import type { SpendingCategory } from "@/services/dashboard-analytics.service";

export function SpendingBreakdown({
  categories,
  totalFils,
}: {
  categories: SpendingCategory[];
  totalFils: number;
}) {
  const { format: formatAED } = useMoney();
  return (
    <Card className="min-w-0 p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">Where it went</h2>
      <p className="mt-1 text-sm text-ink-soft">This month’s spending by category</p>

      {categories.length === 0 ? (
        <p className="py-16 text-center text-sm text-ink-soft">
          No spending recorded this month.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {categories.map((category) => {
            const percent = totalFils > 0 ? Math.round(category.amountFils / totalFils * 100) : 0;
            return (
              <li key={category.name}>
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="truncate text-ink">{category.name}</span>
                  <span className="tabular shrink-0 text-ink-soft">{formatAED(category.amountFils)}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-pill bg-surface-sunken"
                  role="img" aria-label={`${category.name}: ${percent}% of monthly spending`}>
                  <div className="h-full rounded-pill bg-emerald" style={{ width: `${percent}%` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
