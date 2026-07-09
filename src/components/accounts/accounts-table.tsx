import { Wallet, Landmark, Banknote, CreditCard, TrendingUp, PiggyBank } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatAED } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";
import type { AccountWithBalance } from "@/services/accounts.service";

const TYPE_ICON: Record<AccountType, LucideIcon> = {
  CHECKING: Landmark,
  SAVINGS: PiggyBank,
  CASH: Banknote,
  WALLET: Wallet,
  INVESTMENT: TrendingUp,
  OTHER: CreditCard,
};

export function AccountsTable({ accounts }: { accounts: AccountWithBalance[] }) {
  if (accounts.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-ink-soft">
          No accounts yet. Add your first bank account, savings account, or cash wallet.
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {accounts.map((a) => {
        const Icon = TYPE_ICON[a.type as AccountType] ?? Wallet;
        return (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium truncate">{a.name}</p>
                <p className="text-xs text-silver-muted mt-0.5">
                  {ACCOUNT_TYPE_LABELS[a.type as AccountType] ?? a.type}
                  {a.institution ? ` \u00b7 ${a.institution}` : ""}
                </p>
              </div>
              <span className="rounded-lg bg-surface-sunken p-2 text-ink-soft shrink-0">
                <Icon className="h-4 w-4" />
              </span>
            </div>
            <p
              className={`tabular text-xl font-medium mt-4 ${
                a.balanceFils < 0 ? "text-danger" : "text-ink"
              }`}
            >
              {formatAED(a.balanceFils)}
            </p>
          </Card>
        );
      })}
    </div>
  );
}
