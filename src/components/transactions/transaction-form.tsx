"use client";

import { useCurrency } from "@/components/currency-context";


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CategoryPicker, type CategoryOption } from "./category-picker";
import { createTransactionAction } from "@/actions/transactions";

export interface AccountOption {
  id: string;
  name: string;
}

function todayIso(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * The single transaction form behind both "Add Income" and "Add Expense".
 * `type` is passed in by the caller and is NOT editable here — the entry
 * point (which button was clicked) decides it, so there's no control that
 * could let a user file income as an expense or vice versa. The server
 * re-derives the sign from `type` regardless, as a second line of defence.
 */
export function TransactionForm({
  type,
  accounts,
  categories,
  isOwner,
  onSuccess,
}: {
  type: "INCOME" | "EXPENSE";
  accounts: AccountOption[];
  categories: CategoryOption[];
  isOwner: boolean;
  onSuccess: () => void;
}) {
  const currency = useCurrency();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState("");
  const [amountAed, setAmountAed] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const noun = type === "INCOME" ? "income" : "expense";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!accountId) return setError("Select an account.");
    if (!categoryId) return setError("Select a category.");

    setSaving(true);
    try {
      const result = await createTransactionAction({
        type,
        accountId,
        categoryId,
        amountAed,
        date,
        description,
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
        Add an account first before recording {noun}.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <span
        className={`inline-flex rounded-pill px-3 py-1 text-xs font-medium uppercase tracking-wide ${
          type === "INCOME" ? "bg-emerald-soft text-emerald" : "bg-danger-soft text-danger"
        }`}
      >
        {type === "INCOME" ? "Income" : "Expense"}
      </span>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Amount ({currency})</label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={amountAed}
          onChange={(e) => setAmountAed(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Account</label>
        <Select value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </Select>
      </div>

      <CategoryPicker
        type={type}
        categories={categories}
        value={categoryId}
        onChange={setCategoryId}
        isOwner={isOwner}
      />

      <div>
        <label className="block text-sm text-ink-soft mb-1">Date</label>
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Description <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          placeholder={type === "INCOME" ? "e.g. Monthly salary" : "e.g. Groceries"}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={200}
        />
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving} className="w-full">
        {saving ? "Saving\u2026" : `Save ${noun}`}
      </Button>
    </form>
  );
}
