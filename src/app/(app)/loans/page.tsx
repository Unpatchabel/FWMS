import { getHouseholdCurrency } from "@/services/currency.service";
import { requireUser, canWrite } from "@/lib/auth";
import { formatAED as formatLedgerMoney } from "@/lib/money";
import { listLoans } from "@/services/loans.service";
import { listAccounts } from "@/services/accounts.service";
import { LoansTable } from "@/components/loans/loans-table";
import { QuickAddLoan } from "@/components/loans/quick-add-loan";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function LoansPage() {
  const user = await requireUser();
  const currency = await getHouseholdCurrency(user.householdId);
  const formatAED = (value: number) => formatLedgerMoney(value, { currency });
  const [loans, accounts] = await Promise.all([
    listLoans(user.householdId),
    listAccounts(user.householdId),
  ]);
  const totalFils = loans.reduce((sum, l) => sum + l.remainingBalanceFils, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Loans</h1>
          <p className="text-sm text-ink-soft mt-1">
            Every balance below is derived from the opening balance minus payments recorded —
            never entered directly.
          </p>
        </div>
        {canWrite(user) && <QuickAddLoan />}
      </div>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-silver-muted">Total remaining</p>
        <p className="tabular text-2xl font-medium text-danger mt-1">
          {formatAED(totalFils)}
        </p>
      </Card>

      <LoansTable loans={loans} accounts={accounts} canWrite={canWrite(user)} />
    </div>
  );
}
