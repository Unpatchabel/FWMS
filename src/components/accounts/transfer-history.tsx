import { format } from "date-fns";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAED } from "@/lib/money";

type TransferRow = {
  id: string;
  amount: number;
  date: Date;
  description: string | null;
  account: { name: string };
  transferAccount: { name: string } | null;
};

export function TransferHistory({ transfers }: { transfers: TransferRow[] }) {
  return (
    <Card>
      <CardHeader><CardTitle>Recent transfers</CardTitle></CardHeader>
      <CardContent className="pt-0">
        {transfers.length === 0 ? (
          <p className="py-6 text-sm text-ink-soft">No transfers recorded yet.</p>
        ) : (
          <ul className="divide-y divide-silver-line">
            {transfers.map((transfer) => (
              <li key={transfer.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-medium text-ink">
                    <span className="truncate">{transfer.account.name}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-emerald" />
                    <span className="truncate">{transfer.transferAccount?.name ?? "Account"}</span>
                  </p>
                  <p className="mt-1 text-xs text-silver-muted">
                    {format(transfer.date, "d MMM yyyy")}
                    {transfer.description ? ` · ${transfer.description}` : ""}
                  </p>
                </div>
                <p className="tabular text-sm font-medium text-ink">{formatAED(Math.abs(transfer.amount))}</p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
