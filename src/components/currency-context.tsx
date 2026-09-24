"use client";
import { createContext, useContext, type ReactNode } from "react";
import { formatAED, formatAEDCompact } from "@/lib/money";

const CurrencyContext = createContext("AED");
export function CurrencyProvider({ currency, children }: { currency: string; children: ReactNode }) {
  return <CurrencyContext.Provider value={currency}>{children}</CurrencyContext.Provider>;
}
export function useCurrency() { return useContext(CurrencyContext); }
export function useMoney() {
  const currency = useCurrency();
  return {
    currency,
    format: (amount: number, opts: { withSymbol?: boolean; signed?: boolean } = {}) => formatAED(amount, { ...opts, currency }),
    compact: (amount: number) => formatAEDCompact(amount, currency),
  };
}
