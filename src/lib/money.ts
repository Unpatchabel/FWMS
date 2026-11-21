/**
 * Money handling for FWMS.
 *
 * INVARIANT: money is stored and computed in INTEGER HUNDREDTHS everywhere.
 * Existing internal names say fils/AED for compatibility with older code.
 * Only two-decimal currencies may be selected as a ledger base.
 */

export const FILS_PER_AED = 100;

/** Defensive ceiling against fat-finger entry and float-precision issues at extreme magnitudes. */
export const MAX_ABS_AED = 21_474_836.47; // Prisma signed Int limit: 2,147,483,647 hundredths

/**
 * Parse a user-entered AED string/number into integer fils.
 * Accepts "1,250.50", "1250.5", 1250.5, "-1250.50". Rejects (rather than
 * silently rounding or misreading) anything with more than 2 decimal places,
 * scientific notation, stray characters, or a magnitude beyond MAX_ABS_AED —
 * so a typo becomes a clear error instead of quietly-wrong stored money.
 */
export function aedToFils(input: string | number): number {
  const raw = typeof input === "number" ? input.toString() : input.trim();
  if (raw.includes(",") && !/^-?\d{1,3}(,\d{3})+(\.\d{1,2})?$/.test(raw)) {
    throw new Error("Use valid thousands grouping, e.g. 1,250.50.");
  }
  const cleaned = raw.replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(
      `Enter a valid amount with up to 2 decimal places, e.g. 1250.50 (got "${input}")`
    );
  }
  const value = Number(cleaned);
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid monetary amount: "${input}"`);
  }
  if (Math.abs(value) > MAX_ABS_AED) {
    throw new Error(`Amount is too large (max ${MAX_ABS_AED.toLocaleString()} ledger units).`);
  }
  // Round via cents to avoid float drift (e.g. 12.34 * 100 = 1233.9999...).
  const negative = cleaned.startsWith("-");
  const [whole, fraction = ""] = cleaned.replace(/^-/, "").split(".");
  const units = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return negative && units !== 0 ? -units : units;
}

/** Convert integer fils to a Number of AED (for charts only, never for storage). */
export function filsToAed(fils: number): number {
  return fils / FILS_PER_AED;
}

/**
 * Format integer fils as an AED display string, e.g. 1234567 -> "AED 12,345.67".
 * `withSymbol=false` returns just the number ("12,345.67").
 */
export function formatAED(
  fils: number,
  opts: { withSymbol?: boolean; signed?: boolean; currency?: string } = {}
): string {
  const { withSymbol = true, signed = false, currency = "AED" } = opts;
  const negative = fils < 0;
  const absAed = Math.abs(fils) / FILS_PER_AED;
  const number = absAed.toLocaleString("en-AE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const sign = negative ? "-" : signed ? "+" : "";
  const symbol = withSymbol ? `${currency} ` : "";
  return `${sign}${symbol}${number}`;
}

/** Compact format for tight spaces: 1250000000 fils -> "AED 12.5M". */
export function formatAEDCompact(fils: number, currency = "AED"): string {
  const negative = fils < 0;
  const aed = Math.abs(fils) / FILS_PER_AED;
  const compact = new Intl.NumberFormat("en-AE", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(aed);
  return `${negative ? "-" : ""}${currency} ${compact}`;
}
