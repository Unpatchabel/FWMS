"use client";

import { useCurrency } from "@/components/currency-context";


import { aedToFils } from "@/lib/money";
import { useId, useState } from "react";
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
  const currency = useCurrency();
  const formId = useId();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [amountAed, setAmountAed] = useState("");
  const [interestAed, setInterestAed] = useState("");
  const [paymentDate, setPaymentDate] = useState(todayIso());
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  let principalPreview: number | null = null;
  try {
    if (amountAed && interestAed) principalPreview = (aedToFils(amountAed) - aedToFils(interestAed)) / 100;
  } catch { /* Server displays the precise validation error on submission. */ }


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
        <label htmlFor={`${formId}-0`} className="block text-sm text-ink-soft mb-1">Paid from</label>
        <Select id={`${formId}-0`} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label htmlFor={`${formId}-1`} className="block text-sm text-ink-soft mb-1">Total payment ({currency})</label>
        <Input id={`${formId}-1`}
          inputMode="decimal"
          placeholder="0.00"
          value={amountAed}
          onChange={(e) => setAmountAed(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor={`${formId}-2`} className="block text-sm text-ink-soft mb-1">
          Portion to interest ({currency}) <span className="text-silver-muted">(0 if none)</span>
        </label>
        <Input id={`${formId}-2`}
          inputMode="decimal"
          placeholder="0.00"
          value={interestAed}
          onChange={(e) => setInterestAed(e.target.value)}
          required
        />
        <p className="text-xs text-ink-soft mt-1">
          {principalPreview !== null
            ? principalPreview >= 0
              ? `${principalPreview.toFixed(2)} ${currency} will reduce the balance.`
              : "Interest can't exceed the total payment."
            : "The rest reduces the loan balance — you don't need to enter it separately."}
        </p>
      </div>

      <div>
        <label htmlFor={`${formId}-3`} className="block text-sm text-ink-soft mb-1">Payment date</label>
        <Input id={`${formId}-3`}
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />
      </div>

      <div>
        <label htmlFor={`${formId}-4`} className="block text-sm text-ink-soft mb-1">
          Note <span className="text-silver-muted">(optional)</span>
        </label>
        <Input id={`${formId}-4`}
          placeholder="e.g. Monthly instalment"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={200}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving || !amountAed.trim()} className="w-full">
        {saving ? "Saving\u2026" : "Record payment"}
      </Button>
    </form>
  );
}
