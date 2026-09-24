"use client";

import { useCurrency } from "@/components/currency-context";


import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import { createTransferAction } from "@/actions/transfers";

type AccountOption = { id: string; name: string; balanceFils: number };

function todayIso() {
  const date = new Date();
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function QuickTransfer({ accounts }: { accounts: AccountOption[] }) {
  const currency = useCurrency();
  const [open, setOpen] = useState(false);
  const [fromSelection, setFromSelection] = useState("");
  const [toSelection, setToSelection] = useState("");
  const fromAccountId = fromSelection || accounts[0]?.id || "";
  const toAccountId = toSelection || accounts.find((a) => a.id !== fromAccountId)?.id || "";
  const [amountAed, setAmountAed] = useState("");
  const [date, setDate] = useState(todayIso());
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (fromAccountId === toAccountId) {
      setError("Choose two different accounts.");
      return;
    }
    setSaving(true);
    try {
      const result = await createTransferAction({
        fromAccountId, toAccountId, amountAed, date, description,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAmountAed("");
      setDescription("");
      setOpen(false);
      router.refresh();
    } catch {
      setError("Transfer could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        disabled={accounts.length < 2}
        title={accounts.length < 2 ? "Add a second account to make a transfer" : undefined}
        onClick={() => setOpen(true)}
      >
        <ArrowLeftRight className="h-4 w-4" />
        Transfer
      </Button>
      <Modal open={open} onClose={() => setOpen(false)} title="Transfer between accounts">
        <form onSubmit={submit} className="space-y-4">
          <p className="text-sm text-ink-soft">
            Move money between your accounts. Your household total will stay the same.
          </p>
          <label className="block text-sm text-ink-soft">
            From account
            <Select value={fromAccountId} onChange={(e) => {
              setFromSelection(e.target.value);
              setToSelection("");
            }} className="mt-1">
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </Select>
          </label>
          <label className="block text-sm text-ink-soft">
            To account
            <Select value={toAccountId} onChange={(e) => setToSelection(e.target.value)} className="mt-1">
              {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
            </Select>
          </label>
          <label className="block text-sm text-ink-soft">
            Amount ({currency})
            <Input inputMode="decimal" value={amountAed} onChange={(e) => setAmountAed(e.target.value)} placeholder="0.00" required className="mt-1" />
          </label>
          <label className="block text-sm text-ink-soft">
            Date
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required className="mt-1" />
          </label>
          <label className="block text-sm text-ink-soft">
            Note (optional)
            <Input value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} placeholder="e.g. Monthly savings" className="mt-1" />
          </label>
          {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
          <Button type="submit" disabled={saving} className="w-full">
            {saving ? "Transferring…" : "Transfer money"}
          </Button>
        </form>
      </Modal>
    </>
  );
}
