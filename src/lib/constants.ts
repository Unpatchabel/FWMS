/**
 * Domain value sets.
 *
 * SQLite has no native ENUM type, so the fields that are conceptually enums are
 * stored as String in the database (see prisma/schema.prisma). This file is the
 * single source of truth for their allowed values and derived TypeScript types.
 * Zod validators (src/lib/validators.ts) reference these arrays so no invalid
 * value can ever reach the ledger.
 */

export const USER_ROLES = ["OWNER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ACCOUNT_TYPES = [
  "CHECKING",
  "SAVINGS",
  "CASH",
  "WALLET",
  "INVESTMENT",
  "OTHER",
] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const CATEGORY_TYPES = ["INCOME", "EXPENSE"] as const;
export type CategoryType = (typeof CATEGORY_TYPES)[number];

export const TRANSACTION_TYPES = [
  "INCOME",
  "EXPENSE",
  "ADJUSTMENT",
  "TRANSFER",
] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const TRANSACTION_STATUSES = ["ACTIVE", "VOID"] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const ASSET_TYPES = [
  "REAL_ESTATE",
  "LAND_PLOT",
  "VEHICLE",
  "INVESTMENT",
  "OTHER",
] as const;
export type AssetType = (typeof ASSET_TYPES)[number];

/** Human-readable labels for values shown in the UI. */
export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  CHECKING: "Checking",
  SAVINGS: "Savings",
  CASH: "Cash",
  WALLET: "Wallet",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

export const ASSET_TYPE_LABELS: Record<AssetType, string> = {
  REAL_ESTATE: "Real estate",
  LAND_PLOT: "Land plot",
  VEHICLE: "Vehicle",
  INVESTMENT: "Investment",
  OTHER: "Other",
};

/**
 * The system EXPENSE category every loan payment is filed under, so it shows
 * up in Expenses/cash-flow like any other spend. Auto-provisioned per
 * household on first use (see loans.service.getOrCreateLoanPaymentCategory) —
 * not part of the seeded defaults list, since existing households need it
 * created on demand too, not only fresh ones.
 */
export const LOAN_PAYMENT_CATEGORY_NAME = "Loan Payment";
