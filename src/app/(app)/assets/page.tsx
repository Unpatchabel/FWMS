import { getHouseholdCurrency } from "@/services/currency.service";
import { requireUser, canWrite } from "@/lib/auth";
import { formatAED as formatLedgerMoney } from "@/lib/money";
import { listAssets } from "@/services/assets.service";
import { AssetsTable } from "@/components/assets/assets-table";
import { QuickAddAsset } from "@/components/assets/quick-add-asset";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function AssetsPage() {
  const user = await requireUser();
  const currency = await getHouseholdCurrency(user.householdId);
  const formatAED = (value: number) => formatLedgerMoney(value, { currency });
  const assets = await listAssets(user.householdId);
  const totalFils = assets.reduce((sum, a) => sum + a.currentValueFils, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl text-ink">Assets</h1>
          <p className="text-sm text-ink-soft mt-1">
            Real estate, land plots, vehicles, and everything else you own.
          </p>
        </div>
        {canWrite(user) && <QuickAddAsset />}
      </div>

      <Card className="p-5">
        <p className="text-xs uppercase tracking-wide text-silver-muted">Total asset value</p>
        <p className="tabular text-2xl font-medium text-emerald mt-1">
          {formatAED(totalFils)}
        </p>
      </Card>

      <AssetsTable assets={assets} canWrite={canWrite(user)} />
    </div>
  );
}
