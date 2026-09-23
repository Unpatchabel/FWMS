import { requireUser, canWrite } from "@/lib/auth";
import { listAccounts } from "@/services/accounts.service";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { QuickAddAccount } from "@/components/accounts/quick-add-account";
import { QuickTransfer } from "@/components/accounts/quick-transfer";
import { TransferHistory } from "@/components/accounts/transfer-history";
import { listTransfers } from "@/services/transactions.service";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const [accounts, transfers] = await Promise.all([
    listAccounts(user.householdId),
    listTransfers(user.householdId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Accounts</h1>
          <p className="text-sm text-ink-soft mt-1">
            Every balance below is calculated from its transaction history — never
            entered directly.
          </p>
        </div>
        {canWrite(user) && (
          <div className="flex flex-wrap gap-2">
            <QuickTransfer accounts={accounts} />
            <QuickAddAccount />
          </div>
        )}
      </div>

      <AccountsTable accounts={accounts} canWrite={canWrite(user)} />
      <TransferHistory transfers={transfers} />
    </div>
  );
}
