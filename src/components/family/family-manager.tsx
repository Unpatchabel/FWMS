"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Modal } from "@/components/ui/modal";
import {
  createFamilyMemberAction, changeFamilyRoleAction, changeFamilyAccessAction,
  changeOwnPasswordAction,
} from "@/actions/family";

type Member = { id: string; name: string; email?: string; role: string; isActive: boolean };
type Change = { member: Member; kind: "role" | "access" };

export function FamilyManager({ members, currentUserId, canManage }: {
  members: Member[]; currentUserId: string; canManage: boolean;
}) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [change, setChange] = useState<Change | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [role, setRole] = useState<"OWNER" | "MEMBER" | "VIEWER">("MEMBER");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  function close() {
    if (pending) return;
    setAdding(false);
    setChangingPassword(false);
    setChange(null);
    setError(null);
    setPassword("");
    setOwnerPassword("");
    setCurrentPassword("");
    setNewPassword("");
  }

  async function addMember(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      const result = await createFamilyMemberAction({ name, email, password, role, ownerPassword });
      if (!result.ok) { setError(result.error); return; }
      setName(""); setEmail(""); setRole("MEMBER");
      closeAfterSuccess();
    } catch { setError("Could not add this person. Try again."); }
    finally { setPending(false); }
  }

  function closeAfterSuccess() {
    setAdding(false); setChange(null); setError(null); setPassword(""); setOwnerPassword("");
    router.refresh();
  }

  async function updateMember(event: React.FormEvent) {
    event.preventDefault();
    if (!change) return;
    setPending(true); setError(null);
    try {
      const result = change.kind === "role"
        ? await changeFamilyRoleAction({ memberId: change.member.id, role, ownerPassword })
        : await changeFamilyAccessAction({ memberId: change.member.id,
          isActive: !change.member.isActive, ownerPassword });
      if (!result.ok) { setError(result.error); return; }
      closeAfterSuccess();
    } catch { setError("Could not update access. Try again."); }
    finally { setPending(false); }
  }

  async function updatePassword(event: React.FormEvent) {
    event.preventDefault();
    setPending(true); setError(null);
    try {
      const result = await changeOwnPasswordAction({ currentPassword, newPassword });
      if (!result.ok) { setError(result.error); return; }
      // The server revoked every old session (including this one).
      window.location.assign("/login");
    } catch { setError("Could not change your password. Try again."); }
    finally { setPending(false); }
  }

  function startChange(member: Member, kind: Change["kind"]) {
    setError(null); setOwnerPassword("");
    setRole(member.role === "VIEWER" ? "VIEWER" : "MEMBER");
    setChange({ member, kind });
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-xl text-ink">People with access</h2>
        {canManage && <Button type="button" onClick={() => { setError(null); setAdding(true); }}>
          <Plus className="h-4 w-4" /> Add person
        </Button>}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {members.map((member) => (
          <Card key={member.id} className="min-w-0 p-5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-medium text-ink">{member.name}{member.id === currentUserId ? " (you)" : ""}</h3>
                {member.email && <p className="truncate text-sm text-ink-soft" title={member.email}>{member.email}</p>}
              </div>
              <span className={`rounded-pill px-2.5 py-1 text-xs font-medium ${
                member.isActive ? "bg-emerald-soft text-emerald" : "bg-surface-sunken text-ink-soft"
              }`}>{member.isActive ? member.role.toLowerCase() : "Disabled"}</span>
            </div>
            {canManage && member.id !== currentUserId && (
              <div className="mt-4 flex flex-wrap gap-2 border-t border-beige-border pt-3">
                {member.role !== "OWNER" && member.isActive && (
                  <Button variant="secondary" type="button" onClick={() => startChange(member, "role")}>Change role</Button>
                )}
                <Button variant="secondary" type="button" onClick={() => startChange(member, "access")}>
                  {member.isActive ? "Disable access" : "Restore access"}
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Card className="min-w-0 p-5 sm:p-6">
        <h2 className="font-display text-xl text-ink">Your sign-in</h2>
        <p className="mt-1 text-sm text-ink-soft">Change your password and sign in again on your devices.</p>
        <Button variant="secondary" type="button" className="mt-4" onClick={() => { setError(null); setChangingPassword(true); }}>
          Change password
        </Button>
      </Card>

      <Modal open={adding} onClose={close} title="Add person">
        <form onSubmit={addMember} className="space-y-3">
          <Field label="Name"><Input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></Field>
          <Field label="Email"><Input required type="email" autoComplete="off" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="Initial password (12+ characters)"><Input required minLength={12} maxLength={72} type="password"
            autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
          <Field label="Access level"><Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
            <option value="MEMBER">Member — update finances</option>
            <option value="VIEWER">Viewer — read only</option>
            <option value="OWNER">Owner — manage access</option>
          </Select></Field>
          <Field label="Your owner password"><Input required type="password" autoComplete="current-password"
            value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} /></Field>
          <p className="text-xs text-ink-soft">Share the initial password privately. Each person can change it after signing in.</p>
          {error && <ErrorText message={error} />}
          <Button type="submit" disabled={pending} className="w-full">{pending ? "Adding…" : "Add person"}</Button>
        </form>
      </Modal>

      <Modal open={change !== null} onClose={close} title={change?.kind === "role" ? "Change role" : "Change access"}>
        {change && <form onSubmit={updateMember} className="space-y-3">
          <p className="text-sm text-ink">{change.member.name}</p>
          {change.kind === "role" ? (
            <Field label="New role"><Select value={role} onChange={(e) => setRole(e.target.value as typeof role)}>
              <option value="MEMBER">Member — update finances</option>
              <option value="VIEWER">Viewer — read only</option>
            </Select></Field>
          ) : <p className="text-sm text-ink-soft">{change.member.isActive
            ? "Disable sign-in for this person? Their records stay in the household."
            : "Restore sign-in for this person?"}</p>}
          <Field label="Your owner password"><Input required type="password" autoComplete="current-password"
            value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} /></Field>
          {error && <ErrorText message={error} />}
          <Button type="submit" disabled={pending} className="w-full">{pending ? "Saving…" : "Confirm"}</Button>
        </form>}
      </Modal>

      <Modal open={changingPassword} onClose={close} title="Change your password">
        <form onSubmit={updatePassword} className="space-y-3">
          <Field label="Current password"><Input required type="password" autoComplete="current-password"
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /></Field>
          <Field label="New password (12+ characters)"><Input required minLength={12} maxLength={72} type="password"
            autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>
          <p className="text-xs text-ink-soft">Changing your password signs you out on all devices.</p>
          {error && <ErrorText message={error} />}
          <Button type="submit" disabled={pending} className="w-full">{pending ? "Updating…" : "Change password"}</Button>
        </form>
      </Modal>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm text-ink-soft">{label}<div className="mt-1">{children}</div></label>;
}

function ErrorText({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">{message}</p>;
}
