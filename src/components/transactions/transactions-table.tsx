"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { useMoney } from "@/components/currency-context";
import { voidTransactionAction } from "@/actions/transactions";

type Row = {
  id: string;
  amount: number;
  date: Date | string;
  description: string | null;
  account: { name: string };
  category: { name: string; color: string } | null;
  loanPayment?: { principal: number; interest: number } | null;
};

/** Ledger rows for the Income/Expenses pages, with an optional delete action. */
export function TransactionsTable({
  transactions,
  canDelete,
  emptyLabel,
}: {
  transactions: Row[];
  canDelete: boolean;
  emptyLabel: string;
}) {
  const { format: formatAED } = useMoney();
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (!confirm("Remove this entry? It will no longer count toward your totals.")) return;
    setPendingId(id);
    try {
      const result = await voidTransactionAction(id);
      if (result.ok) {
        router.refresh();
      } else {
        alert(result.error);
      }
    } finally {
      setPendingId(null);
    }
  }

  if (transactions.length === 0) {
    return <p className="text-sm text-ink-soft py-10 text-center">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-silver-line">
      {transactions.map((t) => (
        <li key={t.id} className="flex items-center justify-between py-3 gap-4">
          <div className="min-w-0">
            <p className="text-sm text-ink truncate">
              {t.description || t.category?.name || "Uncategorized"}
            </p>
            <p className="text-xs text-silver-muted">
              {t.category?.name ? `${t.category.name} \u00b7 ` : ""}
              {t.account.name} &middot; {format(new Date(t.date), "d MMM yyyy")}
            </p>
            {t.loanPayment && (
              <p className="mt-1 text-xs text-ink-soft">
                {formatAED(t.loanPayment.principal)} to principal · {formatAED(t.loanPayment.interest)} interest
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <p
              className={`tabular text-sm font-medium ${
                t.amount >= 0 ? "text-emerald" : "text-danger"
              }`}
            >
              {formatAED(t.amount, { signed: true })}
            </p>
            {canDelete && (
              <button
                type="button"
                onClick={() => handleDelete(t.id)}
                disabled={pendingId === t.id}
                aria-label="Delete entry"
                className="rounded-lg p-1.5 text-silver-muted hover:bg-danger-soft hover:text-danger transition-colors disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
