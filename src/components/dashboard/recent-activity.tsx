import { format } from "date-fns";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatAED } from "@/lib/money";

type Row = {
  id: string;
  type: string;
  amount: number;
  date: Date;
  description: string | null;
  account: { name: string };
  category: { name: string } | null;
  transferAccount: { name: string } | null;
};

/** Recent ledger activity. Amounts show their sign; income green, expense red. */
export function RecentActivity({ transactions }: { transactions: Row[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent activity</CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {transactions.length === 0 ? (
          <p className="text-sm text-ink-soft py-6 text-center">
            No transactions yet. Add income or an expense to see it here.
          </p>
        ) : (
          <ul className="divide-y divide-silver-line">
            {transactions.map((t) => {
              const transfer = t.type === "TRANSFER";
              const positive = t.amount >= 0;
              return (
                <li
                  key={t.id}
                  className="flex items-center justify-between py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-ink truncate">
                      {transfer
                        ? `Transfer to ${t.transferAccount?.name ?? "account"}`
                        : t.description || t.category?.name || t.type}
                    </p>
                    <p className="text-xs text-silver-muted">
                      {t.account.name} &middot; {format(t.date, "d MMM yyyy")}
                      {transfer && t.description ? ` · ${t.description}` : ""}
                    </p>
                  </div>
                  <p
                    className={`tabular text-sm font-medium shrink-0 ${
                      transfer ? "text-sky" : positive ? "text-emerald" : "text-danger"
                    }`}
                  >
                    {transfer ? formatAED(Math.abs(t.amount)) : formatAED(t.amount, { signed: true })}
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
