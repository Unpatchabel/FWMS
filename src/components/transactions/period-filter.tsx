"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Select } from "@/components/ui/select";
import type { CategoryOption } from "./category-picker";

const PERIODS: { value: string; label: string }[] = [
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "all", label: "All time" },
];

/**
 * Updates the page's own query string (?period=&categoryId=) and lets the
 * server component re-render with the new filter — no client-side data
 * fetching needed, and the URL stays shareable/bookmarkable.
 */
export function PeriodFilter({
  period,
  categoryId,
  categories,
}: {
  period: string;
  categoryId?: string;
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
      <div className="max-w-full overflow-x-auto rounded-pill bg-surface-sunken p-1">
        <div className="flex w-max">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
              onClick={() => setParam("period", p.value)}
              className={cn(
                "rounded-pill px-3 py-1.5 text-sm transition-colors",
                period === p.value
                  ? "bg-surface text-ink shadow-sm font-medium"
                  : "text-ink-soft hover:text-ink"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <Select
        value={categoryId ?? ""}
        onChange={(e) => setParam("categoryId", e.target.value)}
        className="w-full sm:w-auto"
      >
        <option value="">All categories</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
