import { describe, it, expect } from "vitest";
import {
  signedTransactionAmount,
  deriveLoanRemainingBalance,
  deriveLoanPaymentSplit,
  deriveAssetCurrentValue,
  deriveNetWorth,
  deriveSavingsRatePct,
} from "@/lib/ledger-math";

describe("signedTransactionAmount", () => {
  it("keeps INCOME positive", () => {
    expect(signedTransactionAmount("INCOME", 5000)).toBe(5000);
  });

  it("makes EXPENSE negative", () => {
    expect(signedTransactionAmount("EXPENSE", 5000)).toBe(-5000);
  });

  it("normalizes an already-negative magnitude for EXPENSE (still negative, not double-negated)", () => {
    expect(signedTransactionAmount("EXPENSE", -5000)).toBe(-5000);
  });

  it("normalizes an already-negative magnitude for INCOME (still positive)", () => {
    expect(signedTransactionAmount("INCOME", -5000)).toBe(5000);
  });

  it("treats zero as zero regardless of type", () => {
    expect(signedTransactionAmount("INCOME", 0)).toBe(0);
    expect(signedTransactionAmount("EXPENSE", 0)).toBe(0);
  });
});

describe("deriveLoanRemainingBalance", () => {
  it("subtracts principal paid from the opening balance", () => {
    expect(deriveLoanRemainingBalance(100_000, 30_000)).toBe(70_000);
  });

  it("floors at zero rather than going negative when overpaid", () => {
    expect(deriveLoanRemainingBalance(100_000, 150_000)).toBe(0);
  });

  it("returns the full opening balance when nothing has been paid", () => {
    expect(deriveLoanRemainingBalance(100_000, 0)).toBe(100_000);
  });

  it("returns zero for a loan that's exactly paid off", () => {
    expect(deriveLoanRemainingBalance(100_000, 100_000)).toBe(0);
  });
});

describe("deriveLoanPaymentSplit", () => {
  it("derives principal as amount minus interest", () => {
    expect(deriveLoanPaymentSplit(9500, 4300)).toEqual({ principalFils: 5200 });
  });

  it("allows an all-principal payment (zero interest)", () => {
    expect(deriveLoanPaymentSplit(5000, 0)).toEqual({ principalFils: 5000 });
  });

  it("allows an all-interest payment (zero principal) as a boundary case", () => {
    expect(deriveLoanPaymentSplit(5000, 5000)).toEqual({ principalFils: 0 });
  });

  it("returns null when interest exceeds the total payment", () => {
    expect(deriveLoanPaymentSplit(5000, 5001)).toBeNull();
  });
});

describe("deriveAssetCurrentValue", () => {
  it("uses the latest valuation when one exists", () => {
    expect(deriveAssetCurrentValue(200_000, 250_000)).toBe(250_000);
  });

  it("falls back to purchase value when there is no valuation yet (undefined)", () => {
    expect(deriveAssetCurrentValue(200_000, undefined)).toBe(200_000);
  });

  it("falls back to purchase value when there is no valuation yet (null)", () => {
    expect(deriveAssetCurrentValue(200_000, null)).toBe(200_000);
  });

  it("still uses an explicit valuation of zero rather than falling back (0 is not nullish)", () => {
    expect(deriveAssetCurrentValue(200_000, 0)).toBe(0);
  });
});

describe("deriveNetWorth", () => {
  it("computes cash + assets - liabilities", () => {
    expect(deriveNetWorth(100_000, 500_000, 200_000)).toBe(400_000);
  });

  it("can go negative when liabilities exceed cash + assets", () => {
    expect(deriveNetWorth(10_000, 20_000, 100_000)).toBe(-70_000);
  });

  it("matches the mortgage-payment integration scenario from the FWMS changelog", () => {
    // cash 269,800 + assets 3,335,000 - liabilities 1,244,800 (all AED, x100 for fils)
    const cash = 26_980_000;
    const assets = 333_500_000;
    const liabilities = 124_480_000;
    expect(deriveNetWorth(cash, assets, liabilities)).toBe(236_000_000);
  });
});

describe("deriveSavingsRatePct", () => {
  it("computes the percentage of income not spent", () => {
    expect(deriveSavingsRatePct(10_000, 8_000)).toBe(20);
  });

  it("returns null when there is no income (division by zero avoided)", () => {
    expect(deriveSavingsRatePct(0, 500)).toBeNull();
  });

  it("returns null for negative income (shouldn't happen, but must not crash or mislead)", () => {
    expect(deriveSavingsRatePct(-100, 50)).toBeNull();
  });

  it("can go negative when expenses exceed income", () => {
    expect(deriveSavingsRatePct(1_000, 1_500)).toBe(-50);
  });

  it("rounds to the nearest whole percent", () => {
    expect(deriveSavingsRatePct(3, 1)).toBe(67); // 2/3 = 66.66... -> 67
  });
});
