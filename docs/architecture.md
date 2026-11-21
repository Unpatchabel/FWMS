# Architecture and financial contract

## Actual product scope

FWMS is a single-owner installation. `USER_ROLES` contains only OWNER. Authentication rejects legacy MEMBER and VIEWER records; EDITOR is not implemented. Existing legacy records remain in SQLite. The Household model scopes data but does not make this a supported multi-tenant service. Goals are reserved schema, not a working UI. Insights are local rules, not AI. A JSON export is an archive, not an implemented restore system.

## Request and storage boundaries

| Boundary | Implementation | Responsibility |
| --- | --- | --- |
| Pages | `src/app/(app)`, `/login`, `/setup` | Server-render data; require a fresh database-backed owner session |
| Browser forms | `src/components`, `src/actions` | Structured results, pending states, authentication, role check, Zod validation |
| Services | `src/services` | Household/object scoping, ledger operations, audit records, atomic writes |
| Pure domain helpers | `src/lib/money.ts`, `ledger-math.ts` | Exact decimal parsing, principal/interest split, derived balances |
| Database | `prisma/schema.prisma`, migrations | SQLite foreign keys, unique keys, indexes, additive financial guard triggers |
| Read APIs | `/api/backup`, `/api/documents/[filename]` | Fresh owner authentication, private downloadable files |
| Desktop | `desktop/main.cjs`, `bootstrap.cjs` | OS-private files, migrations, loopback server child, sandboxed renderer |
| Preload | `desktop/preload.cjs`, `security.cjs` | Two narrow IPC methods; main-frame sender and origin validation |
| External request | `exchange.service.ts` | Fixed Frankfurter host; currency codes only; timeout and response validation |

Server Actions provide the mutation transport. Next checks Origin against Host for action requests; no wildcard allowed origin was introduced. Read endpoints do not mutate the ledger. Middleware rejects missing/invalid JWTs, while protected pages, actions and APIs re-read active OWNER and sessionVersion from the database. JWT household must match the user's stored household. Layout authentication alone is not relied upon to protect services or mutations.

## Financial definitions

| Figure or operation | Definition |
| --- | --- |
| Account cash | SUM of signed ACTIVE transactions for the account |
| Household cash | SUM of signed ACTIVE transactions for the household, including opening adjustments |
| Income | Positive INCOME rows; excludes transfers and opening adjustments |
| Spending | Absolute EXPENSE amount minus the linked loan principal |
| Loan cash paid | Full payment debits the cash account |
| Loan liability | Opening principal less all recorded payment principal; excess principal is rejected |
| Asset value | Latest valuation by business date, then creation time and ID; purchase value fallback |
| Net worth | Cash + active assets − active liabilities |
| Transfer | Two reciprocal signed rows in one transaction; household net change is zero |
| VOID | Preserve the transaction and audit trail; exclude from balances and reports |

A linked loan transaction and system opening/transfer rows cannot be voided individually. There is no loan reversal or transfer-reversal UI. Do not simulate one by editing SQLite. Asset registration records ownership/value, not a cash purchase; record the actual cash movement separately and avoid double-counting an investment held both as an account and an asset.

Amounts are integer hundredths. Internal AED/fils names remain for compatibility; the setup currency supplies the display label. Individual monetary inputs are limited to 2,147,483,647 hundredths (21,474,836.47 units) because Prisma Int cannot decode larger stored values. Cash aggregation casts SQLite SUM to decimal text before checked Number conversion, allowing account totals above Int32. The total exact integer ceiling is JavaScript's safe integer range; cash totals explicitly fail above it. This is a household-scale ledger, not an unlimited-precision accounting engine.

Writes and their audit records commit together. Loan balance checks run inside the payment transaction. SQLite serializes writes; concurrent contention can reject a request rather than applying stale values. No automatic retry of financial mutations is added because a blind retry can duplicate a payment. Refresh and reconcile before resubmitting after an uncertain response. There is no idempotency-key facility.

Dashboard summary components and JSON archive queries use a single database transaction for a consistent snapshot. Other independent page widgets can refresh at slightly different instants. Business dates are stored at server-local noon and grouped by the server's local calendar month. Keep the server timezone stable; cross-timezone calendar accounting is not implemented.

## Database guard scope

The new migration adds INSERT/UPDATE triggers, without rewriting existing records or changing columns. It checks integer bounds, transaction sign/type/status, household links, payment split, cumulative principal and linked payment cash integrity. Transfer pairing is guaranteed by the service's atomic two-row operation, not a deferred database constraint. Direct SQL users can still bypass/drop guards, delete records, or corrupt unsupported relations. This is not a tamper-proof audit ledger.

Apply migrations with `npm run setup`. Tests use `migrate deploy` against an absolute disposable database path, so triggers are exercised. `prisma db push` does not reproduce trigger migrations and is not the setup method. Run `npm run db:check` on a private copy before upgrading an existing installation. Its count-only output detects selected legacy inconsistencies but does not repair or certify the complete database. Preserve and reconcile old unlinked loan payments manually; no synthetic debit is invented.
