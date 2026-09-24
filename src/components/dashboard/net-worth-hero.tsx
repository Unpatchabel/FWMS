"use client";

import { useMoney } from "@/components/currency-context";

/**
 * The dashboard's signature element: combined family net worth, set in the
 * display serif at hero scale, with the derived cash / assets / liabilities
 * breakdown beneath it. The emerald→sky underline is the one bold accent.
 */
export function NetWorthHero({
  netWorthFils,
  cashFils,
  assetsFils,
  liabilitiesFils,
}: {
  netWorthFils: number;
  cashFils: number;
  assetsFils: number;
  liabilitiesFils: number;
}) {
  const { currency, format: formatAED, compact: formatAEDCompact } = useMoney();
  return (
    <section className="relative min-w-0 overflow-hidden rounded-card border border-beige-border bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-8">
      <p className="text-sm uppercase tracking-widest text-ink-soft">
        Combined Net Worth
      </p>

      <p className="tabular mt-2 font-display text-ink">
        <span className="block text-sm font-sans font-medium text-ink-soft sm:inline sm:font-display sm:text-hero sm:text-ink">{currency} </span>
        <span className="block text-[clamp(1.75rem,7vw,3.25rem)] leading-tight tracking-tight sm:inline sm:text-hero">
          {formatAED(netWorthFils, { withSymbol: false })}
        </span>
      </p>

      {/* Signature accent: a short emerald-to-sky underline. */}
      <div
        aria-hidden
        className="mt-3 h-1 w-28 rounded-pill"
        style={{
          background: "linear-gradient(90deg, #0F6B4F 0%, #3E8FD0 100%)",
        }}
      />

      <div className="mt-8 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6">
        <Breakdown label="Cash" value={cashFils} accent="text-ink" />
        <Breakdown label="Assets" value={assetsFils} accent="text-emerald" />
        <Breakdown
          label="Liabilities"
          value={liabilitiesFils}
          accent="text-danger"
        />
      </div>

      <div
        aria-hidden
        className="absolute -top-24 -right-16 h-64 w-64 rounded-full opacity-[0.07] blur-3xl"
        style={{
          background:
            "radial-gradient(circle at center, #12876A 0%, #3E8FD0 70%, transparent 100%)",
        }}
      />
    </section>
  );
}

function Breakdown({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  const { format: formatAED, compact: formatAEDCompact } = useMoney();
  return (
    <div className="min-w-0">
      <p className="text-xs uppercase tracking-wide text-silver-muted">
        {label}
      </p>
      <p className={`tabular mt-1 text-sm font-medium sm:text-lg ${accent}`}>
        <span className="sm:hidden" aria-label={formatAED(value)}>{formatAEDCompact(value)}</span>
        <span className="hidden sm:inline">{formatAED(value)}</span>
      </p>
    </div>
  );
}
