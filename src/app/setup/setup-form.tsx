"use client";
import { useState, type FormEvent } from "react";
import { setupAction } from "@/actions/auth";
import { LEDGER_CURRENCIES } from "@/lib/currencies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SetupForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("AED");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const result = await setupAction({ username, password, currency });
      if (result.ok) window.location.assign("/dashboard");
      else setError(result.error);
    } catch { setError("Setup failed. Please try again."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm text-ink-soft">Username
      <Input className="mt-1" type="text" autoComplete="username" maxLength={40} required value={username} onChange={event => setUsername(event.target.value)} />
    </label>
    <label className="block text-sm text-ink-soft">Password (at least 12 characters)
      <Input className="mt-1" type="password" autoComplete="new-password" minLength={12} required value={password} onChange={event => setPassword(event.target.value)} />
    </label>
    <label className="block text-sm text-ink-soft">Ledger currency
      <select className="mt-1 w-full rounded-lg border border-beige-border bg-surface p-2 text-ink" value={currency} onChange={event => setCurrency(event.target.value)}>
        {LEDGER_CURRENCIES.map(code => <option key={code} value={code}>{code}</option>)}
      </select>
    </label>
    <p className="text-xs text-ink-soft">Choose carefully: existing ledger entries cannot be relabeled as another currency.</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <Button type="submit" disabled={busy} className="w-full">{busy ? "Creating account…" : "Create account"}</Button>
  </form>;
}
