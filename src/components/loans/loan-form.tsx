"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLoanAction } from "@/actions/loans";

export function LoanForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [lender, setLender] = useState("");
  const [originalAmountAed, setOriginalAmountAed] = useState("");
  const [openingBalanceAed, setOpeningBalanceAed] = useState("");
  const [monthlyPaymentAed, setMonthlyPaymentAed] = useState("");
  const [interestRatePct, setInterestRatePct] = useState("");
  const [startDate, setStartDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await createLoanAction({
        name,
        lender,
        originalAmountAed,
        openingBalanceAed,
        monthlyPaymentAed,
        interestRatePct,
        startDate,
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
        <label className="block text-sm text-ink-soft mb-1">Loan name</label>
        <Input
          placeholder="e.g. Home Mortgage"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Lender <span className="text-silver-muted">(optional)</span>
        </label>
        <Input placeholder="e.g. Emirates NBD" value={lender} onChange={(e) => setLender(e.target.value)} />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Original loan amount (AED)</label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={originalAmountAed}
          onChange={(e) => setOriginalAmountAed(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Balance remaining today (AED)</label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={openingBalanceAed}
          onChange={(e) => setOpeningBalanceAed(e.target.value)}
          required
        />
        <p className="text-xs text-ink-soft mt-1">
          The starting point for tracking — future payments reduce this.
        </p>
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Monthly payment (AED) <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={monthlyPaymentAed}
          onChange={(e) => setMonthlyPaymentAed(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Interest rate % <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          inputMode="decimal"
          placeholder="e.g. 4.2"
          value={interestRatePct}
          onChange={(e) => setInterestRatePct(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Start date <span className="text-silver-muted">(optional)</span>
        </label>
        <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving || !name.trim()} className="w-full">
        {saving ? "Adding\u2026" : "Add loan"}
      </Button>
    </form>
  );
}
