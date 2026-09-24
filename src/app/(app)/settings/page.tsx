import { requireUser } from "@/lib/auth";
import { PasswordManager } from "@/components/account/password-manager";
import { UsernameManager } from "@/components/account/username-manager";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser();
  return (
    <div className="min-w-0 space-y-6">
      <div>
        <h1 className="font-display text-2xl text-ink">Account settings</h1>
        <p className="mt-1 text-sm text-ink-soft">Manage your owner sign-in.</p>
      </div>
      <UsernameManager username={user.name} />
      <PasswordManager />
    </div>
  );
}
