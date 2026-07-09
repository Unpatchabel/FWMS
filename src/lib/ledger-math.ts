/**
 * Pure ledger math — no Prisma, no I/O, no dates-as-side-effects. Every
 * derived financial figure in the app (a transaction's signed amount, a
 * loan's remaining balance, a payment's principal/interest split, an asset's
 * current value, net worth, savings rate) has exactly one definition here.
 *
 * Centralizing these matters for two reasons:
 *  1. The service layer and this module's unit tests exercise the SAME
 *     function, so "does net worth mean what the tests think it means" can
 *     never quietly drift between two independently-written implementations.
 *  2. A formula used in two places (e.g. a loan's remaining balance is shown
 *     on the Loans page AND checked when validating a new payment) is
 *     guaranteed to agree with itself, because there's only one copy of it.
 */

/** INCOME is stored positive, EXPENSE negative — the sign is decided here, nowhere else. */
export function signedTransactionAmount(
  type: "INCOME" | "EXPENSE",
  magnitudeFils: number
): number {
  if (magnitudeFils === 0) {
    return 0;
  }
  return type === "EXPENSE" 
    ? -Math.abs(magnitudeFils) 
    : Math.abs(magnitudeFils);
}

/** A loan's remaining balance is its opening balance minus all principal paid so far — never negative. */
export function deriveLoanRemainingBalance(
  openingBalanceFils: number,
  principalPaidFils: number
): number {
  return Math.max(0, openingBalanceFils - principalPaidFils);
}

/**
 * Splits a loan payment into principal/interest. Only the interest portion is
 * entered directly; principal is the remainder, so the two can never fail to
 * add up the way two independently-typed fields could. Returns null when
 * interest exceeds the payment amount — the caller decides how to surface
 * that as a validation error.
 */
export function deriveLoanPaymentSplit(
  amountFils: number,
  interestFils: number
): { principalFils: number } | null {
  const principalFils = amountFils - interestFils;
  if (principalFils < 0) return null;
  return { principalFils };
}

/** An asset's current value is its latest recorded valuation, or the purchase price if none has been recorded yet. */
export function deriveAssetCurrentValue(
  purchaseValueFils: number,
  latestValuationFils: number | null | undefined
): number {
  return latestValuationFils ?? purchaseValueFils;
}

/** Net worth = cash + assets − liabilities. */
export function deriveNetWorth(
  cashFils: number,
  assetsFils: number,
  liabilitiesFils: number
): number {
  return cashFils + assetsFils - liabilitiesFils;
}

/** Savings rate as a whole-number percentage, or null when there was no income to measure against (avoids dividing by zero or reporting a rate against no income). */
export function deriveSavingsRatePct(
  incomeFils: number,
  expensesFils: number
): number | null {
  if (incomeFils <= 0) return null;
  return Math.round(((incomeFils - expensesFils) / incomeFils) * 100);
}
