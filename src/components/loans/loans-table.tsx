import { Landmark } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatAED } from "@/lib/money";
import type { LoanWithBalance } from "@/services/loans.service";
import { RecordPaymentButton } from "./record-payment-button";
import type { AccountOption } from "@/components/transactions/transaction-form";

export function LoansTable({
  loans,
  accounts,
  canWrite,
}: {
  loans: LoanWithBalance[];
  accounts: AccountOption[];
  canWrite: boolean;
}) {
  if (loans.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-ink-soft">
          {canWrite
            ? "No loans yet. Add a mortgage, car loan, or other financing."
            : "No loans have been added yet."}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {loans.map((l) => {
        const percentPaid =
          l.openingBalanceFils > 0
            ? Math.round(
                ((l.openingBalanceFils - l.remainingBalanceFils) / l.openingBalanceFils) * 100
              )
            : 100;
        return (
          <Card key={l.id} className="p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium truncate">{l.name}</p>
                <p className="text-xs text-silver-muted mt-0.5">
                  {l.lender ?? "No lender on file"}
                  {l.interestRatePct !== null ? ` \u00b7 ${l.interestRatePct}% APR` : ""}
                </p>
              </div>
              <span className="rounded-lg bg-danger-soft p-2 text-danger shrink-0">
                <Landmark className="h-4 w-4" />
              </span>
            </div>

            <p className="tabular text-xl font-medium text-danger mt-4">
              {formatAED(l.remainingBalanceFils)}
            </p>
            <p className="text-xs text-silver-muted mt-1">
              remaining of {formatAED(l.openingBalanceFils)} tracked{" "}
              {l.openingBalanceFils > 0 ? `(${percentPaid}% paid down)` : ""}
            </p>
            {l.monthlyPaymentFils !== null && (
              <p className="text-xs text-ink-soft mt-1">
                {formatAED(l.monthlyPaymentFils)} / month
              </p>
            )}

            {canWrite && (
              <div className="mt-auto pt-4">
                <RecordPaymentButton loanId={l.id} loanName={l.name} accounts={accounts} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
