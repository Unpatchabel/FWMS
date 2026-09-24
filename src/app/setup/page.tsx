import { redirect } from "next/navigation";
import { isInstallationConfigured } from "@/services/setup.service";
import { SetupForm } from "./setup-form";

export const dynamic = "force-dynamic";

export default async function SetupPage() {
  if (await isInstallationConfigured()) redirect("/login");
  return <main className="min-h-screen bg-canvas flex items-center justify-center p-6">
    <div className="w-full max-w-md rounded-card border border-beige-border bg-surface p-8 shadow-card">
      <p className="font-display text-2xl text-ink-brand">FWMS</p>
      <h1 className="mt-8 font-display text-3xl text-ink">Create your owner account</h1>
      <p className="mt-2 mb-6 text-sm text-ink-soft">Choose the currency for this new ledger. Your data stays in this installation.</p>
      <SetupForm />
    </div>
  </main>;
}
