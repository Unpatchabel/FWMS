import { LoginForm } from "./login-form";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return (
    <main className="min-h-screen grid lg:grid-cols-2">
      {/* Brand panel — legacy/trust side of the identity. */}
      <section className="relative hidden lg:flex flex-col justify-between bg-ink-brand text-beige p-12 overflow-hidden">
        <div className="relative z-10">
          <p className="font-display text-2xl tracking-wide">FWMS</p>
          <p className="text-beige/60 text-sm mt-1">Family Wealth</p>
        </div>

        <div className="relative z-10 max-w-md">
          <h1 className="font-display text-4xl leading-tight text-beige">
            One clear view of your family&rsquo;s wealth.
          </h1>
          <p className="text-beige/70 mt-4 leading-relaxed">
            Income, assets, property and liabilities — brought together into a
            single private dashboard your family can trust.
          </p>
        </div>

        {/* Quiet ambient accent: emerald-to-sky gradient wash. */}
        <div
          aria-hidden
          className="absolute -bottom-32 -right-32 h-96 w-96 rounded-full opacity-30 blur-3xl"
          style={{
            background:
              "radial-gradient(circle at center, #12876A 0%, #3E8FD0 70%, transparent 100%)",
          }}
        />
      </section>

      {/* Credential panel. */}
      <section className="flex items-center justify-center p-6 bg-canvas">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <p className="font-display text-2xl text-ink-brand">FWMS</p>
            <p className="text-ink-soft text-sm">Family Wealth</p>
          </div>
          <h2 className="font-display text-2xl text-ink">Welcome back</h2>
          <p className="text-ink-soft text-sm mt-1 mb-6">
            Sign in to your family dashboard.
          </p>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
