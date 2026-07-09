"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { recordLoanPaymentAction } from "@/actions/loans";
import type { AccountOption } from "@/components/transactions/transaction-form";

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function PaymentForm({
  loanId,
  loanName,
  accounts,
  onSuccess,
}: {
  loanId: string;
  loanName: string;
  accounts: AccountOption[];
  onSuccess: () => void;
}) {
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amountAed, setAmountAed] = useState("");
  const [interestAed, setInterestAed] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const amountNum = Number(amountAed || 0);
  const interestNum = Number(interestAed || 0);
  const principalPreview =
    amountAed && interestAed && Number.isFinite(amountNum) && Number.isFinite(interestNum)
      ? amountNum - interestNum
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accountId) return setError("Select an account.");

    setSaving(true);
    try {
      const result = await recordLoanPaymentAction({
        loanId,
        accountId,
        amountAed,
        interestAed,
        paymentDate,
        note,
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

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-ink-soft">
        Add an account first before recording a payment — the payment debits it directly.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <p className="text-sm text-ink-soft">
        Recording a payment on <span className="text-ink font-medium">{loanName}</span>. This
        will also debit the account you choose below.
      </p>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Paid from</label>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Total payment (AED)</label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={amountAed}
          onChange={(e) => setAmountAed(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Portion to interest (AED) <span className="text-silver-muted">(0 if none)</span>
        </label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={interestAed}
          onChange={(e) => setInterestAed(e.target.value)}
          required
        />
        <p className="text-xs text-ink-soft mt-1">
          {principalPreview !== null
            ? principalPreview >= 0
              ? `${principalPreview.toFixed(2)} AED will reduce the balance.`
              : "Interest can't exceed the total payment."
            : "The rest reduces the loan balance — you don't need to enter it separately."}
        </p>
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Payment date</label>
        <Input
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Note <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          placeholder="e.g. Monthly instalment"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving || !amountAed.trim()} className="w-full">
        {saving ? "Saving\u2026" : "Record payment"}
      </Button>
    </form>
  );
}
