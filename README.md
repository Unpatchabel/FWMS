# FWMS — Family Wealth Management System

A private, self-hosted family financial dashboard. Runs entirely on your own
machine — no external AI, no cloud, no paid APIs.

**Stack:** Next.js 14 (App Router, TypeScript) · SQLite + Prisma · Tailwind CSS ·
custom cookie-session auth (bcrypt + jose).

---

## What's in this build

**Phase 1 (Day 1)**
- Ledger-based data model: account balances are **derived** from transactions,
  never stored. Money is stored as **integer fils** (1 AED = 100 fils).
- Secure login/logout (bcrypt-hashed passwords, HTTP-only signed session cookie)
  with an edge middleware route guard.
- The wealth dashboard: combined **net worth** hero, KPI cards (cash, assets,
  liabilities, income, expenses, savings rate), recent activity, and a
  **local rule-based insights** panel (the slot future AI insights will fill).

**Phase 2 (Day 2)**
- **Accounts** — add checking/savings/cash/wallet/investment accounts, each
  with an optional opening balance recorded as a real ledger entry (not a
  stored balance field). Balances shown are always calculated live.
- **Income & Expenses** — one underlying Transaction type behind two entry
  points: "Add Income" and "Add Expense" open the same form with the type
  pre-set and locked, so the entry point — not a dropdown — decides the type.
  The server independently re-derives the sign from that type, so a tampered
  request can't credit an account as an expense or vice versa.
- **Categories** — seeded defaults (Income: Salary, Business, Rental,
  Investment, Other · Expense: Food, Bills, Transport, Education, Healthcare,
  Shopping, Other). Custom categories can be added inline from the transaction
  form, but only by the **OWNER** role — enforced on the server, not just
  hidden in the UI.
- **Dashboard integration** — Add Income / Add Expense buttons on the
  dashboard itself, refreshing the real totals immediately on save.

**Architecture cleanup (before Phase 3)**
- **Single mutation path** — every write (login/logout, accounts, categories,
  transactions, assets, loans) is now a **Server Action** in `src/actions/`.
  The old API routes are gone; reads still go directly from server components
  to the service layer, unchanged.
- **All transaction writes go through TransactionService** — including
  system-generated ones. An account's opening-balance entry used to be written
  directly by `accounts.service`; it now calls
  `transactions.service.recordAdjustment()`, so the shape of a ledger row is
  defined in exactly one place.
- **Soft-delete via VOID, not hard delete** — removing a transaction now sets
  `status: "VOID"` instead of deleting the row. Every balance and history
  query excludes VOIDed rows, so it behaves like a delete today, but the row
  and its audit trail are preserved — a future "restore" or "reversing entry"
  feature is a small addition, not a schema change.
- **Basic search** — Income/Expenses pages now have a free-text search across
  description, category name, and account name, alongside the existing
  period/category filters.
- **Audit-log atomicity fix** — audit rows written inside a `$transaction`
  block now use that transaction's own client, so they commit or roll back
  together with the write they describe (previously they could persist even
  if the surrounding write rolled back).

**Phase 3 (Day 3)**
- **Assets** (`/assets`) — track real estate, land plots, vehicles,
  investments, or anything else of value. Real Estate and Land Plot are the
  same `Asset` model as everything else (just a `type` discriminator), so
  they get full support without a parallel table — but get distinct icons and
  labels in the UI as first-class categories. "Current value" is always the
  most recent recorded valuation (or the purchase price if none has been
  recorded yet); recording a new value adds to history rather than overwriting
  it, so appreciation/depreciation stays chartable later.
- **Loans** (`/loans`) — track a loan's original amount, opening balance,
  monthly payment, and interest rate. Recording a payment only asks for the
  total and the interest portion — principal is derived as the remainder, so
  the two figures can never fail to add up the way two independently-typed
  fields could.
- **Known boundary (by design):** loan payments reduce the loan's own derived
  balance but do **not** automatically debit a cash account as an Expense
  transaction — the ledger's "single source of truth" covers cash flow;
  assets and loans keep their own valuation/payment history, as established
  in Phase 1. If a payment should also show up in cash-flow totals, log it
  separately as an Expense (e.g. under a "Loan Payment" category).

Reports appears in the nav marked **"Soon"** — built in Phase 4.

**Known gaps (by design, deferred):** transactions can be voided but not
edited in place (void + re-add for now); accounts, assets, and loans can't yet
be edited after creation.

**Phase 3.1 — loan payments joined the ledger**
The Phase 3 boundary above was closed: recording a loan payment now debits the
chosen cash/bank account through a real EXPENSE transaction — filed under an
auto-provisioned "Loan Payment" category — atomically with reducing the
loan's own derived remaining balance. One `prisma.$transaction` covers the
category lookup, the ledger transaction, the `LoanPayment` row (which now
stores the id of the transaction it created), and the audit log: any failure
rolls back all of it. This means:
- A payment shows up in Expenses history, the period/category filters, and
  search — exactly like any other expense.
- It's included in monthly cash flow, the dashboard's cash and expense totals,
  and the account's own derived balance — no separate manual logging needed
  anymore.
- **A payment's linked transaction can't be voided from the Expenses page** —
  doing so would reduce cash/expense totals while the loan's balance stayed
  reduced by that payment's principal, silently desyncing the two. Attempting
  it returns a clear message instead of allowing it. There's currently no way
  to remove a loan payment itself (matching the "no edit yet" gap above); a
  symmetric loan-payment-reversal feature is future work.
- Picking the account is now required when recording a payment.

---

## Requirements

- **Node.js 18.18+** (Node 20 or 22 recommended)
- Internet access **once**, for `npm install` and to fetch the web fonts on the
  first build. After that it runs fully offline.

---

## Setup & run

```bash
# 1. Install dependencies
npm install

# 2. Create your environment file
cp .env.example .env
#    then edit .env and set a strong AUTH_SECRET. Generate one with:
#    openssl rand -base64 48

# 3. Create the database and load seed data
npm run db:migrate      # creates prisma/dev.db from the schema
npm run db:seed         # loads the sample household + data (safe to re-run —
                         # it clears and reloads, e.g. after pulling a new phase)

# 4. Start the app
npm run dev
```

Open <http://localhost:3000>.

**Upgrading an existing install to this version:** the schema's relations and
indexes changed (an Account can no longer be hard-deleted while it has
transactions; a few indexes were tuned) but no new columns were added, so this
migration is lighter than previous ones. Run `npm run db:migrate` again first
— Prisma will detect the change and generate a migration (nothing to
backfill). Then `npm run db:seed` if you want the refreshed sample data, and
`npm test` to run the new test suite against a disposable database (never
your real one).

**Seed logins** (change these immediately for real use):

| Email             | Password    | Role   |
| ----------------- | ----------- | ------ |
| owner@fwms.local  | changeme123 | OWNER  |
| member@fwms.local | changeme123 | MEMBER |

For production on a trusted machine: `npm run build && npm run start`.

Useful scripts: `npm run db:studio` (visual DB browser), `npm run db:reset`
(wipe + re-migrate + re-seed).

---

## Security notes

- Passwords are bcrypt-hashed (cost 12); the raw password is never stored.
- Sessions are signed JWTs in an HTTP-only, SameSite=Lax cookie (Secure in
  production). Every app route is guarded by middleware **and** a server-side
  `requireUser()` check.
- All input is validated with Zod before reaching the database. Prisma uses
  parameterized queries, so there is no string-built SQL.
- **Run this on a trusted machine or private network, not a public URL.** The
  database file holds real family financial data.

## Backups

**In-app export:** click **Export data** in the top bar to download a complete
JSON snapshot of your household's data — every account, transaction (including
voided ones, clearly labeled, for a complete archival record), category,
asset, valuation, loan, payment, and audit log entry. Password hashes are
deliberately excluded. This is the one Route Handler in the app
(`src/app/api/backup/route.ts`) rather than a Server Action, because a browser
file download needs a `Content-Disposition` header a Server Action can't set —
everything else in the app is still a Server Action.

**File-level backup:** your entire dataset is also just one file,
`prisma/dev.db`. Back it up by copying it somewhere safe on a schedule (stop
the app first, or use the in-app export above, to avoid copying it mid-write).
To restore, put the file back and restart.

```bash
cp prisma/dev.db "backups/fwms-$(date +%Y%m%d).db"
```

---

## Architecture (how the code is organised)

```
src/
  app/                       Next.js routes (App Router) — reads only; no
                             mutation logic lives here
    login/                   public login screen
    (app)/                   authenticated shell (sidebar + topbar)
      dashboard/             the wealth dashboard
      accounts/              accounts list + add account
      income/                income history + add income
      expenses/              expense history + add expense
      assets/                assets list + add asset + record valuation
      loans/                 loans list + add loan + record payment
    api/backup/              the one deliberate Route Handler exception —
                             a file download, not a mutation (see Backups)
    middleware.ts            edge route guard
  actions/                   Server Actions — the ONLY mutation path. Each
                             checks auth/role, validates with Zod, calls the
                             matching service, then revalidates affected pages.
                             auth, accounts, categories, transactions, assets, loans
  components/
    ui/                      primitives (Card, Button, Input, Select, Modal)
    layout/                  Sidebar, Topbar
    dashboard/               NetWorthHero, MetricCard, RecentActivity, InsightsPanel
    transactions/            TransactionForm, CategoryPicker, QuickAddTransaction,
                             PeriodFilter, TransactionSearch, TransactionsTable
    accounts/                AccountForm, QuickAddAccount, AccountsTable
    assets/                  AssetForm, QuickAddAsset, ValuationForm,
                             RecordValuationButton, AssetsTable
    loans/                   LoanForm, QuickAddLoan, PaymentForm,
                             RecordPaymentButton, LoansTable
  lib/                       money, dates, ledger-math (pure formulas), prisma
                             client, session (edge-safe) + session-cookie
                             (server-only), password, auth, validators,
                             constants, audit
  services/                  business logic & financial calculations (unit
                             tested): summary, insights, accounts, categories,
                             transactions, assets, loans, backup
prisma/
  schema.prisma              the data model
  seed.ts                    sample data
tests/
  unit/                      pure-function tests — no database (ledger-math, money)
  integration/               real-DB tests against a disposable SQLite file,
                             exercising the actual service functions
  setup/                     test DB bootstrap + shared fixtures
```

Layering is strict: **UI never calculates money and never touches SQL.** Every
derived figure (a transaction's sign, a loan's remaining balance, a payment's
principal/interest split, an asset's current value, net worth, savings rate)
has exactly one definition, in `src/lib/ledger-math.ts` — pure functions with
no I/O, so they're trivial to unit test and impossible for two call sites to
quietly disagree about. The service layer calls these functions and owns all
database access; every Transaction row — user-entered or system-generated —
is written through `transactions.service`, never ad hoc by another service.
Role checks (VIEWER/MEMBER/OWNER) and input validation live in `src/actions/`,
the only place a mutation can be triggered from.

---

## Testing

```bash
npm test          # run the full suite once
npm run test:watch  # re-run on file changes while developing
```

**Unit tests** (`tests/unit/`) cover the pure formulas in `lib/ledger-math.ts`
and the money parser/formatter in `lib/money.ts` — no database involved:
sign derivation, a loan's remaining balance, a payment's principal/interest
split (including the boundary where interest exactly equals the payment, and
the case where it exceeds it), an asset's valuation fallback, net worth, and
savings rate, plus money edge cases (more than 2 decimal places, scientific
notation, empty/junk input, amounts beyond the sanity ceiling).

**Integration tests** (`tests/integration/`) run the actual service functions
— `createTransaction`, `voidTransaction`, `createAccount`, `createLoan`,
`recordLoanPayment`, `getFinancialSummary`, and others — against a disposable
SQLite database (`prisma/test.db`, recreated fresh before every run; your real
`prisma/dev.db` is never touched). These cover the things a pure-function test
can't: that voiding a transaction actually removes it from cash totals while
leaving the row intact and marked VOID; that a loan payment atomically debits
an account, creates a linked expense, and reduces the loan balance — or, on a
validation failure (interest exceeding the payment, principal exceeding the
remaining balance, an invalid account), that **none** of it is left behind;
that a loan-payment-linked transaction can't be voided independently; and an
end-to-end net-worth scenario combining accounts, transactions, assets, and a
loan payment into one hand-computed expected figure.

If `npm test` fails on first run with something like "table does not exist,"
the most likely cause is the relative SQLite path in `tests/setup/test-db-url.ts`
resolving against an unexpected working directory — run `npm test` from the
project root (which `npm test` already does by default) and check whether
`prisma/test.db` was created there.

---

## Roadmap

- **Phase 2:** Accounts, Income, Expenses, Transactions (full CRUD + filters).
- **Phase 3:** Loans, Assets, Real estate & plots; loan payments integrated
  into the ledger.
- **Stabilization:** unit + integration tests, schema/index/cascade review,
  tightened validation, backup/export, architecture fixes (see below).
- **Phase 4:** Reports & analytics, document uploads.
- **Phase 5:** Advanced features; optional AI insights behind the existing
  `Insight[]` interface.

---

## Stabilization pass notes

A few things worth knowing about, done as part of hardening the financial
engine before building Reports:

- **`Transaction.account` no longer cascades on delete — it restricts.**
  Previously, hard-deleting an Account would have silently deleted its entire
  transaction history. There's no "delete account" feature yet, so this was
  never triggered in practice, but it was a real landmine for whenever one
  gets built. Deactivating an account (`isActive = false`, already supported)
  is the correct operation for an account with history; a future delete
  feature must now explicitly handle or refuse accounts that still have
  transactions, rather than the database quietly destroying records.
- **Money parsing is stricter.** Amounts with more than 2 decimal places are
  now rejected instead of silently rounded away, and amounts beyond AED 1
  billion are rejected as a sanity ceiling against fat-finger entry and
  float-precision edge cases at extreme magnitudes.
- **Dates are validated as real calendar dates**, not just "looks like
  yyyy-mm-dd" — `2026-02-30` is rejected rather than silently becoming March 2
  (JavaScript's `Date` constructor is lenient and will roll invalid dates
  over rather than reject them).
- **Category name matching is case-insensitive.** "Food" and "food" can no
  longer both exist as separate categories in the same household.
- **A loan payment now can't exceed the loan's remaining balance** — checked
  atomically inside the same transaction as the write, so a concurrent
  payment can't create a stale-read race condition.
- **An audit-log atomicity bug found during this review:** writes inside a
  `$transaction` block were sometimes using the outer Prisma client instead of
  that transaction's own client, meaning an audit row could persist even if
  the write it was describing rolled back. Fixed everywhere it occurred.
