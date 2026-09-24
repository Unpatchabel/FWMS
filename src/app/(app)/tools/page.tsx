import { requireUser } from "@/lib/auth";
import { getHouseholdCurrency } from "@/services/currency.service";
import { listExchangeCurrencies } from "@/services/exchange.service";
import { ToolsPanel } from "@/components/tools/tools-panel";

export const dynamic = "force-dynamic";
export default async function ToolsPage() {
  const user = await requireUser();
  const [currency, currencies] = await Promise.all([
    getHouseholdCurrency(user.householdId), listExchangeCurrencies(),
  ]);
  return <div className="space-y-6">
    <div><h1 className="font-display text-2xl text-ink">Tools</h1>
      <p className="mt-1 text-sm text-ink-soft">Convert currencies and calculate amounts. Conversions do not change your ledger.</p></div>
    <ToolsPanel currency={currency} currencies={currencies} />
  </div>;
}
