import { describe, it, expect } from "vitest";
import { aedToFils, filsToAed, formatAED, formatAEDCompact, MAX_ABS_AED } from "@/lib/money";

describe("aedToFils", () => {
  it("parses a plain integer", () => {
    expect(aedToFils("1250")).toBe(125_000);
  });

  it("parses two decimal places", () => {
    expect(aedToFils("12.34")).toBe(1234);
  });

  it("strips thousands separators", () => {
    expect(aedToFils("1,250.50")).toBe(125_050);
  });

  it("accepts a plain number input", () => {
    expect(aedToFils(1250.5)).toBe(125_050);
  });

  it("accepts a negative amount (used for opening balances)", () => {
    expect(aedToFils("-99.99")).toBe(-9999);
  });

  it("avoids float drift on values known to be tricky in plain JS", () => {
    // 0.1 + 0.2 !== 0.3 in raw floating point; going through the string form
    // (as a real form input would) must still land on exactly 30 fils.
    expect(aedToFils((0.1 + 0.2).toFixed(2))).toBe(30);
  });

  it("rejects more than 2 decimal places instead of silently rounding away precision", () => {
    expect(() => aedToFils("12.345")).toThrow(/up to 2 decimal places/);
  });

  it("rejects an empty string", () => {
    expect(() => aedToFils("")).toThrow();
  });

  it("rejects non-numeric junk", () => {
    expect(() => aedToFils("abc")).toThrow();
  });

  it("rejects scientific notation", () => {
    expect(() => aedToFils("1e10")).toThrow();
  });

  it("rejects a bare minus sign or decimal point", () => {
    expect(() => aedToFils("-")).toThrow();
    expect(() => aedToFils(".")).toThrow();
  });

  it("rejects an amount beyond the sanity ceiling", () => {
    expect(() => aedToFils(String(MAX_ABS_AED + 1))).toThrow(/too large/);
  });

  it("accepts an amount right at the ceiling", () => {
    expect(aedToFils(String(MAX_ABS_AED))).toBe(MAX_ABS_AED * 100);
  });

  it("treats whitespace-padded input the same as trimmed input", () => {
    expect(aedToFils("  42.00  ")).toBe(4200);
  });
});

describe("filsToAed", () => {
  it("converts back to a plain AED number", () => {
    expect(filsToAed(125_050)).toBe(1250.5);
  });
});

describe("formatAED", () => {
  it("formats with the AED symbol and two decimals by default", () => {
    expect(formatAED(1_234_567)).toBe("AED 12,345.67");
  });

  it("formats a negative amount with a leading minus", () => {
    expect(formatAED(-5000)).toBe("-AED 50.00");
  });

  it("adds a leading plus when signed is requested for a positive amount", () => {
    expect(formatAED(5000, { signed: true })).toBe("+AED 50.00");
  });

  it("omits the symbol when withSymbol is false", () => {
    expect(formatAED(5000, { withSymbol: false })).toBe("50.00");
  });

  it("formats zero without a sign even when signed is requested", () => {
    expect(formatAED(0, { signed: true })).toBe("+AED 0.00");
  });
});

describe("formatAEDCompact", () => {
  it("compacts large values with a suffix", () => {
    expect(formatAEDCompact(1_250_000_000)).toBe("AED 12.5M");
  });

  it("keeps the negative sign on a compacted negative value", () => {
    expect(formatAEDCompact(-1_250_000_000)).toBe("-AED 12.5M");
  });
});
