"use client";

import { useCurrency } from "@/components/currency-context";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { recordAssetValuationAction } from "@/actions/assets";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function ValuationForm({
  assetId,
  assetName,
  onSuccess,
}: {
  assetId: string;
  assetName: string;
  onSuccess: () => void;
}) {
  const currency = useCurrency();
  const [valueAed, setValueAed] = useState("");
  const [valuationDate, setValuationDate] = useState(todayIso());
  const [source, setSource] = useState("estimate");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await recordAssetValuationAction({
        assetId,
        valueAed,
        valuationDate,
        source,
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
      <p className="text-sm text-ink-soft">
        This adds a new value for <span className="text-ink font-medium">{assetName}</span> —
        past valuations stay in its history.
      </p>

      <div>
        <label className="block text-sm text-ink-soft mb-1">New value ({currency})</label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={valueAed}
          onChange={(e) => setValueAed(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">As of date</label>
        <Input
          type="date"
          value={valuationDate}
          onChange={(e) => setValuationDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Source <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          placeholder="estimate, appraisal, market\u2026"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          maxLength={50}
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving || !valueAed.trim()} className="w-full">
        {saving ? "Saving\u2026" : "Save value"}
      </Button>
    </form>
  );
}
