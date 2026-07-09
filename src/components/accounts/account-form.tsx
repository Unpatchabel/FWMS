"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ACCOUNT_TYPES, ACCOUNT_TYPE_LABELS, type AccountType } from "@/lib/constants";
import { createAccountAction } from "@/actions/accounts";

export function AccountForm({ onSuccess }: { onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [type, setType] = useState<AccountType>("CHECKING");
  const [institution, setInstitution] = useState("");
  const [openingBalanceAed, setOpeningBalanceAed] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const result = await createAccountAction({ name, type, institution, openingBalanceAed });
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
        <label className="block text-sm text-ink-soft mb-1">Account name</label>
        <Input
          placeholder="e.g. Emirates NBD Checking"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">Type</label>
        <Select value={type} onChange={(e) => setType(e.target.value as AccountType)}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>
              {ACCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </Select>
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Institution <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          placeholder="e.g. Emirates NBD"
          value={institution}
          onChange={(e) => setInstitution(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm text-ink-soft mb-1">
          Opening balance (AED) <span className="text-silver-muted">(optional)</span>
        </label>
        <Input
          inputMode="decimal"
          placeholder="0.00"
          value={openingBalanceAed}
          onChange={(e) => setOpeningBalanceAed(e.target.value)}
        />
        <p className="text-xs text-ink-soft mt-1">
          Recorded as a starting balance entry — you can add real transactions from here on.
        </p>
      </div>

      {error && (
        <p className="text-sm text-danger bg-danger-soft rounded-lg px-3 py-2">{error}</p>
      )}

      <Button type="submit" disabled={saving || !name.trim()} className="w-full">
        {saving ? "Creating\u2026" : "Create account"}
      </Button>
    </form>
  );
}
