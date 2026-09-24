/** Reference exchange rates. External service receives currency codes only, never amounts or ledger data. */
export async function getExchangeRate(base: string, quote: string) {
  if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(quote)) throw new Error("Select valid currencies.");
  if (base === quote) return { rate: 1, date: null };
  const response = await fetch(`https://api.frankfurter.dev/v2/rate/${base.toLowerCase()}/${quote.toLowerCase()}`, {
    next: { revalidate: 3600 }, signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("No current reference rate for this currency pair.");
  const data: unknown = await response.json();
  if (!data || typeof data !== "object" || !("rate" in data) || !("date" in data) ||
    typeof data.rate !== "number" || !Number.isFinite(data.rate) || data.rate <= 0 ||
    typeof data.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.date)) {
    throw new Error("The rate provider returned invalid data.");
  }
  return { rate: data.rate, date: data.date };
}

export type ExchangeCurrency = { code: string; name: string };

const displayNames = new Intl.DisplayNames("en", { type: "currency" });
export function currencyName(code: string): string {
  return displayNames.of(code) ?? code;
}

export async function listExchangeCurrencies(): Promise<ExchangeCurrency[]> {
  try {
    const response = await fetch("https://api.frankfurter.dev/v2/currencies", {
      next: { revalidate: 86400 }, signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Provider unavailable");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid provider data");
    const currencies = data.flatMap((item: unknown): ExchangeCurrency[] => {
      if (!item || typeof item !== "object" || !("iso_code" in item) || typeof item.iso_code !== "string") return [];
      const code = item.iso_code.toUpperCase();
      if (!/^[A-Z]{3}$/.test(code)) return [];
      const name = "name" in item && typeof item.name === "string" && item.name.trim().length > 0 && item.name.length <= 100
        ? item.name.trim() : currencyName(code);
      return [{ code, name }];
    });
    if (currencies.length === 0) throw new Error("Provider returned no currencies");
    return currencies.sort((a, b) => a.code.localeCompare(b.code));
  } catch {
    return ["AED", "AUD", "CAD", "EUR", "GBP", "INR", "JPY", "USD"].map(code => ({ code, name: currencyName(code) }));
  }
}
