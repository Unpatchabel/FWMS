import { formatAED } from "@/lib/money";

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
  return (
    <section className="relative overflow-hidden rounded-card border border-beige-border bg-surface shadow-card px-8 py-8">
      <p className="text-sm uppercase tracking-widest text-ink-soft">
        Combined Net Worth
      </p>

      <p className="tabular font-display text-hero text-ink mt-2">
        {formatAED(netWorthFils)}
      </p>

      {/* Signature accent: a short emerald-to-sky underline. */}
      <div
        aria-hidden
        className="mt-3 h-1 w-28 rounded-pill"
        style={{
          background: "linear-gradient(90deg, #0F6B4F 0%, #3E8FD0 100%)",
        }}
      />

      <div className="mt-8 grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-xl">
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
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-silver-muted">
        {label}
      </p>
      <p className={`tabular text-lg font-medium mt-1 ${accent}`}>
        {formatAED(value)}
      </p>
    </div>
  );
}
