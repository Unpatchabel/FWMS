"use client";

import { Building2, MapPin, Car, TrendingUp, Boxes } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMoney } from "@/components/currency-context";
import { ASSET_TYPE_LABELS, type AssetType } from "@/lib/constants";
import type { AssetWithValue } from "@/services/assets.service";
import { RecordValuationButton } from "./record-valuation-button";

// Real Estate and Land Plot get their own icons — the two asset types the
// original brief called out by name — everything else shares sensible
// defaults.
const TYPE_ICON: Record<AssetType, LucideIcon> = {
  REAL_ESTATE: Building2,
  LAND_PLOT: MapPin,
  VEHICLE: Car,
  INVESTMENT: TrendingUp,
  OTHER: Boxes,
};

export function AssetsTable({ assets, canWrite }: { assets: AssetWithValue[]; canWrite: boolean }) {
  const { format: formatAED } = useMoney();
  if (assets.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-ink-soft">
          {canWrite
            ? "No assets yet. Add real estate, land, a vehicle, or another valuable item."
            : "No assets have been added yet."}
        </p>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {assets.map((a) => {
        const Icon = TYPE_ICON[a.type as AssetType] ?? Boxes;
        const gainFils = a.currentValueFils - a.purchaseValueFils;
        return (
          <Card key={a.id} className="p-5 flex flex-col">
            <div className="flex items-start justify-between">
              <div className="min-w-0">
                <p className="text-sm text-ink font-medium truncate">{a.name}</p>
                <p className="text-xs text-silver-muted mt-0.5">
                  {ASSET_TYPE_LABELS[a.type as AssetType] ?? a.type}
                  {a.ownership ? ` \u00b7 ${a.ownership}` : ""}
                </p>
              </div>
              <span className="rounded-lg bg-surface-sunken p-2 text-ink-soft shrink-0">
                <Icon className="h-4 w-4" />
              </span>
            </div>

            <p className="tabular text-xl font-medium text-ink mt-4">
              {formatAED(a.currentValueFils)}
            </p>
            <p
              className={`text-xs mt-1 ${
                gainFils > 0 ? "text-emerald" : gainFils < 0 ? "text-danger" : "text-silver-muted"
              }`}
            >
              {gainFils === 0
                ? "At purchase value"
                : `${gainFils > 0 ? "+" : ""}${formatAED(gainFils)} vs purchase`}
            </p>

            {a.notes && (
              <p className="text-xs text-ink-soft mt-2 line-clamp-2">{a.notes}</p>
            )}

            {canWrite && (
              <div className="mt-auto pt-4">
                <RecordValuationButton assetId={a.id} assetName={a.name} />
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
