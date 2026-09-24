import { z } from "zod";
import { aedToFils } from "@/lib/money";
import { ACCOUNT_TYPES, CATEGORY_TYPES, ASSET_TYPES } from "@/lib/constants";
import { LEDGER_CURRENCIES } from "@/lib/currencies";

/**
 * Shared validation schemas.
 * Every API route validates its input here so invalid data never reaches the
 * service or database layer. Schemas grow as features are added.
 */

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// Bcrypt only considers the first 72 bytes. Reject longer UTF-8 inputs so
// two different passwords cannot silently authenticate as the same value.
const newPassword = z.string().min(12, "Use at least 12 characters")
  .refine((value) => new TextEncoder().encode(value).length <= 72, "Use at most 72 bytes");

export const setupSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  password: newPassword,
  currency: z.enum(LEDGER_CURRENCIES),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword,
}).refine((input) => input.currentPassword !== input.newPassword, {
  message: "Choose a different password", path: ["newPassword"],
});
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ---------------------------------------------------------------------------
// Money — a string the user typed, checked here so a malformed amount never
// reaches aedToFils() inside a service. The service still calls aedToFils()
// itself; this only guarantees it won't throw when it does.
// ---------------------------------------------------------------------------

/** Any valid signed ledger amount (used for opening balances, which may be negative). */
const signedAmountAed = z
  .string()
  .trim()
  .min(1, "Amount is required")
  .refine((v) => {
    try {
      aedToFils(v);
      return true;
    } catch {
      return false;
    }
  }, "Enter a valid amount, e.g. 1250.50");

/** A strictly positive ledger amount (income/expense entry — sign is applied server-side). */
const positiveAmountAed = signedAmountAed.refine(
  (v) => aedToFils(v) > 0,
  "Enter an amount greater than zero"
);

/** A ledger amount that must be zero or more (e.g. a loan's opening balance). */
const nonNegativeAmountAed = signedAmountAed.refine(
  (v) => aedToFils(v) >= 0,
  "Enter an amount of zero or more"
);

/**
 * yyyy-mm-dd from an <input type="date">, kept as a plain string until the
 * service parses it. Also verifies it's a real calendar date — JS's Date
 * constructor is lenient and would silently roll "2026-02-30" over to
 * March 2 rather than reject it, which is exactly the kind of silent
 * misparse a financial app shouldn't allow through.
 */
const isoDateString = z
  .string()
  .trim()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Enter a valid date")
  .refine((v) => {
    const [y, m, d] = v.split("-").map(Number);
    const date = new Date(y, m - 1, d);
    return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
  }, "Enter a valid calendar date");

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export const accountCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(ACCOUNT_TYPES),
  institution: z.string().trim().max(100).optional().or(z.literal("")),
  // Optional; defaults to "0" so an account can be created with no history yet.
  openingBalanceAed: signedAmountAed.optional().or(z.literal("")),
});
export type AccountCreateInput = z.infer<typeof accountCreateSchema>;

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export const categoryCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(50),
  type: z.enum(CATEGORY_TYPES),
});
export type CategoryCreateInput = z.infer<typeof categoryCreateSchema>;

// ---------------------------------------------------------------------------
// Transactions — ordinary entries are INCOME or EXPENSE. Opening balances
// and transfers use their own validated service flows.
// ---------------------------------------------------------------------------

export const transactionCreateSchema = z.object({
  type: z.enum(["INCOME", "EXPENSE"]),
  accountId: z.string().min(1, "Account is required"),
  categoryId: z.string().min(1, "Category is required"),
  amountAed: positiveAmountAed,
  date: isoDateString,
  description: z.string().trim().max(200).optional().or(z.literal("")),
});
export type TransactionCreateInput = z.infer<typeof transactionCreateSchema>;

export const transferCreateSchema = z.object({
  fromAccountId: z.string().min(1, "Choose a source account"),
  toAccountId: z.string().min(1, "Choose a destination account"),
  amountAed: positiveAmountAed,
  date: isoDateString,
  description: z.string().trim().max(200).optional().or(z.literal("")),
}).refine((input) => input.fromAccountId !== input.toAccountId, {
  message: "Choose two different accounts",
  path: ["toAccountId"],
});
export type TransferCreateInput = z.infer<typeof transferCreateSchema>;

// ---------------------------------------------------------------------------
// Assets — covers every AssetType, including REAL_ESTATE and LAND_PLOT.
// There is deliberately no separate "real estate" schema: it is the same
// Asset model with `type` discriminating it, so real estate and land plots
// get full support without a parallel table to keep in sync.
// ---------------------------------------------------------------------------

export const assetCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(ASSET_TYPES),
  purchaseValueAed: positiveAmountAed,
  purchaseDate: isoDateString.optional().or(z.literal("")),
  ownership: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});
export type AssetCreateInput = z.infer<typeof assetCreateSchema>;

export const assetValuationCreateSchema = z.object({
  assetId: z.string().min(1, "Asset is required"),
  valueAed: positiveAmountAed,
  valuationDate: isoDateString,
  source: z.string().trim().max(50).optional().or(z.literal("")),
});
export type AssetValuationCreateInput = z.infer<typeof assetValuationCreateSchema>;

// ---------------------------------------------------------------------------
// Loans
// ---------------------------------------------------------------------------

const interestRatePctSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => {
    if (!v) return true;
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 && n <= 100;
  }, "Enter a rate between 0 and 100");

export const loanCreateSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  lender: z.string().trim().max(100).optional().or(z.literal("")),
  originalAmountAed: positiveAmountAed,
  openingBalanceAed: nonNegativeAmountAed,
  monthlyPaymentAed: nonNegativeAmountAed.optional().or(z.literal("")),
  interestRatePct: interestRatePctSchema,
  startDate: isoDateString.optional().or(z.literal("")),
});
export type LoanCreateInput = z.infer<typeof loanCreateSchema>;

/**
 * A loan payment splits into principal (reduces the balance) and interest
 * (doesn't). Only the total and the interest portion are entered — principal
 * is DERIVED as amount − interest in the service layer, so the two can never
 * fail to add up the way two independently-typed fields could. `accountId` is
 * the cash/bank account the payment is debited from — the payment now also
 * creates a real EXPENSE transaction against it (see loans.service).
 */
export const loanPaymentCreateSchema = z.object({
  loanId: z.string().min(1, "Loan is required"),
  accountId: z.string().min(1, "Account is required"),
  amountAed: positiveAmountAed,
  interestAed: nonNegativeAmountAed,
  paymentDate: isoDateString,
  note: z.string().trim().max(200).optional().or(z.literal("")),
});
export type LoanPaymentCreateInput = z.infer<typeof loanPaymentCreateSchema>;
