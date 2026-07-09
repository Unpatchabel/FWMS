import { Sparkles } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import type { Insight, InsightTone } from "@/services/insights.service";

const toneDot: Record<InsightTone, string> = {
  positive: "bg-emerald",
  neutral: "bg-sky",
  warning: "bg-danger",
};

/**
 * Insights panel. Content comes from the local rule-based engine today; the
 * same component will render LLM-generated insights unchanged in a later phase.
 */
export function InsightsPanel({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <span className="rounded-lg bg-sky-soft p-1.5 text-sky">
          <Sparkles className="h-4 w-4" />
        </span>
        <CardTitle className="mb-0">Insights</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-3">
        {insights.map((i) => (
          <div key={i.id} className="flex gap-3">
            <span
              className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${toneDot[i.tone]}`}
            />
            <div>
              <p className="text-sm font-medium text-ink">{i.title}</p>
              <p className="text-xs text-ink-soft">{i.detail}</p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
