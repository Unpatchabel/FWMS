"use client";

import { useState } from "react";
import { changeOwnUsernameAction } from "@/actions/account";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function UsernameManager({ username }: { username: string }) {
  const [nextUsername, setNextUsername] = useState(username);
  const [currentPassword, setCurrentPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await changeOwnUsernameAction({ username: nextUsername, currentPassword });
      if (!result.ok) { setError(result.error); return; }
      window.location.assign("/settings");
    } catch { setError("Could not change your username. Try again."); }
    finally { setPending(false); }
  }

  return <Card className="min-w-0 p-5 sm:p-6">
    <h2 className="font-display text-xl text-ink">Your username</h2>
    <p className="mt-1 text-sm text-ink-soft">This name appears in your welcome message and on the sign-in screen.</p>
    <form onSubmit={submit} className="mt-4 space-y-3">
      <label className="block text-sm text-ink-soft">Username
        <Input className="mt-1" type="text" autoComplete="username" maxLength={40} required value={nextUsername} onChange={(event) => setNextUsername(event.target.value)} />
      </label>
      <label className="block text-sm text-ink-soft">Current password
        <Input className="mt-1" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} />
      </label>
      {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save username"}</Button>
    </form>
  </Card>;
}
