"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { changeOwnPasswordAction } from "@/actions/account";

export function PasswordManager({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function close() {
    if (pending) return;
    setOpen(false);
    setError(null);
    setCurrentPassword("");
    setNewPassword("");
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const result = await changeOwnPasswordAction({ currentPassword, newPassword });
      if (!result.ok) { setError(result.error); return; }
      window.location.assign("/login");
    } catch { setError("Could not change your password. Try again."); }
    finally { setPending(false); }
  }

  return <>
    <Card className="min-w-0 p-5 sm:p-6">
      <h2 className="font-display text-xl text-ink">Your sign-in</h2>
      <p className="mt-1 text-sm text-ink-soft">{email}</p>
      <Button variant="secondary" type="button" className="mt-4" onClick={() => { setError(null); setOpen(true); }}>
        Change password
      </Button>
    </Card>
    <Modal open={open} onClose={close} title="Change your password">
      <form onSubmit={updatePassword} className="space-y-3">
        <label className="block text-sm text-ink-soft">Current password
          <Input required type="password" autoComplete="current-password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </label>
        <label className="block text-sm text-ink-soft">New password (12+ characters)
          <Input required minLength={12} maxLength={72} type="password" autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </label>
        <p className="text-xs text-ink-soft">Changing your password signs you out on all devices.</p>
        {error && <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{error}</p>}
        <Button type="submit" disabled={pending} className="w-full">{pending ? "Updating…" : "Change password"}</Button>
      </form>
    </Modal>
  </>;
}
