import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";

type Accent = "emerald" | "sky" | "danger" | "ink";

const accentBg: Record<Accent, string> = {
  emerald: "bg-emerald-soft text-emerald",
  sky: "bg-sky-soft text-sky",
  danger: "bg-danger-soft text-danger",
  ink: "bg-surface-sunken text-ink-soft",
};

/** Compact KPI card used across the dashboard grid. */
export function MetricCard({
  label,
  value,
  icon: Icon,
  accent = "ink",
  hint,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  accent?: Accent;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-silver-muted">
            {label}
          </p>
          <p className="tabular text-2xl font-medium text-ink mt-2">{value}</p>
          {hint && <p className="text-xs text-ink-soft mt-1">{hint}</p>}
        </div>
        <span className={`rounded-lg p-2 ${accentBg[accent]}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
    </Card>
  );
}
