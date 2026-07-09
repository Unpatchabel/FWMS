import { requireUser } from "@/lib/auth";
import { listAccounts } from "@/services/accounts.service";
import { AccountsTable } from "@/components/accounts/accounts-table";
import { QuickAddAccount } from "@/components/accounts/quick-add-account";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  const user = await requireUser();
  const accounts = await listAccounts(user.householdId);

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
        <QuickAddAccount />
      </div>

      <AccountsTable accounts={accounts} />
    </div>
  );
}
