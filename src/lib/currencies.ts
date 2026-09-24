// Ledger amounts currently use integer hundredths. Only currencies with two
// decimal places are valid ledger bases until a minor-unit migration exists.
export const LEDGER_CURRENCIES = ["AED", "USD", "EUR", "GBP", "INR", "CAD", "AUD", "NZD", "SGD", "CHF", "ZAR", "SAR", "QAR", "CNY", "HKD", "MYR", "THB", "TRY", "BRL"] as const;
export type LedgerCurrency = (typeof LEDGER_CURRENCIES)[number];
