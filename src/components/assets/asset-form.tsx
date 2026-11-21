"use client";

import { useCurrency } from "@/components/currency-context";


import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ASSET_TYPES, ASSET_TYPE_LABELS, type AssetType } from "@/lib/constants";
import { createAssetAction } from "@/actions/assets";

export function AssetForm({ onSuccess }: { onSuccess: () => void }) {
  const currency = useCurrency();
  const formId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState<AssetType>("REAL_ESTATE");
  const [purchaseValueAed, setPurchaseValueAed] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [ownership, setOwnership] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const isLandOrRealEstate = type === "REAL_ESTATE" || type === "LAND_PLOT";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await createAssetAction({
        name,
        type,
        purchaseValueAed,
        purchaseDate,
        ownership,
        notes,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSuccess();
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${formId}-0`} className="block text-sm text-ink-soft mb-1">Name</label>
        <Input id={`${formId}-0`}
          placeholder={
            type === "REAL_ESTATE"
              ? "e.g. Villa \u2014 Al Barsha"
              : type === "LAND_PLOT"
              ? "e.g. Plot 42, Al Ain"
              : "e.g. Toyota Land Cruiser"
          }
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor={`${formId}-1`} className="block text-sm text-ink-soft mb-1">Type</label>
        <Select id={`${formId}-1`} value={type} onChange={(e) => setType(e.target.value as AssetType)}>
          {ASSET_TYPES.map((t) => (
            <option key={t} value={t}>
              {ASSET_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor={`${formId}-2`} className="block text-sm text-ink-soft mb-1">Purchase value ({currency})</label>
        <Input id={`${formId}-2`}
          inputMode="decimal"
          placeholder="0.00"
          value={purchaseValueAed}
          onChange={(e) => setPurchaseValueAed(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor={`${formId}-3`} className="block text-sm text-ink-soft mb-1">
          Purchase date <span className="text-silver-muted">(optional)</span>
        </label>
        <Input id={`${formId}-3`}
          type="date"
          value={purchaseDate}
          onChange={(e) => setPurchaseDate(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-4`} className="block text-sm text-ink-soft mb-1">
          Ownership <span className="text-silver-muted">(optional)</span>
        </label>
        <Input id={`${formId}-4`}
          placeholder="e.g. Family (100%)"
          value={ownership}
          onChange={(e) => setOwnership(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={`${formId}-5`} className="block text-sm text-ink-soft mb-1">
          Notes <span className="text-silver-muted">(optional)</span>
        </label>
        <Input id={`${formId}-5`}
          placeholder={
            isLandOrRealEstate ? "e.g. address, plot number, title deed ref" : "Any details worth keeping"
          }
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          maxLength={500}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving || !name.trim()} className="w-full">
        {saving ? "Adding\u2026" : "Add asset"}
      </Button>
    </form>
  );
}
