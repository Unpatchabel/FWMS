# FWMS — Family Wealth Management System

A self-hosted financial dashboard built around a transaction ledger. FWMS derives account balances from signed transactions, connects loan repayments to cash movements, and preserves history through VOID records and audit logs.

Built as a full-stack software engineering and application security portfolio project. The current product supports **one owner per installation**. It is not a public banking service or a supported multi-user financial SaaS.

## Implemented capabilities

- Dashboard: derived cash, assets, liabilities, net worth, six-month trends and rule-based insights.
- Accounts: opening balance adjustments, signed income/expenses, custom categories, search and period filters.
- Transfers: linked debit/credit rows committed atomically; household cash is conserved.
- Assets: purchase values and append-only valuation history, including property and land.
- Loans: principal/interest split, remaining principal, cash-account debit, and overpayment rejection.
- Reports: monthly income/spending, debt principal reconciliation, PDF and editable DOCX snapshots.
- Archive: authenticated JSON export, including VOID history and excluding password hashes/session counters.
- Owner setup, sign-in, username/password changes, session invalidation and sign-out.
- Electron launcher, isolated renderer, loopback Next server, per-installation SQLite database and migration packaging.

Goals, EDITOR access, multi-user account management, bank synchronization, automatic forecasting and AI insights are **not implemented**. There is no automated restore, loan-payment reversal or transfer-reversal feature. Interest rates are reference metadata; the user supplies the actual interest component of each payment.

## Architecture and stack

| Layer | Technology / responsibility |
| --- | --- |
| UI | Next.js 15 App Router, React 19, TypeScript, Tailwind CSS, Recharts |
| Mutation boundary | Server Actions, fresh owner authorization, Zod runtime validation |
| Domain | Services, shared ledger math, atomic financial/audit writes |
| Persistence | Prisma 5, SQLite, migration-based integrity triggers |
| Authentication | bcrypt cost 12, HS256 JWT, HttpOnly session cookie, database session version |
| Desktop | Electron 44, standalone Next server and native Prisma migration engine |
| Validation | Vitest unit/integration tests, ESLint, TypeScript, production and desktop smoke builds |

See [architecture and financial contract](docs/architecture.md) for exact definitions, boundaries and limitations. The security and verification record is in [docs/audit/REPORT.md](docs/audit/REPORT.md).

## Financial correctness

Balances are `SUM(amount)` over ACTIVE transactions; they are not mutable balance fields. Income is positive and expense negative. Opening balances are ADJUSTMENT entries. Transfers write two reciprocal rows in one transaction. A loan payment debits full cash while only interest counts as spending; principal reduces the liability. Voiding a linked loan transaction independently is refused.

Money is stored as integer hundredths. Exact decimal parsing rejects excess decimals, malformed thousands grouping and unsupported magnitudes. Individual entries and asset/loan values are limited to **21,474,836.47 ledger units** by Prisma's Int range. Balance totals can exceed that per-entry limit. The installation uses one fixed two-decimal currency; Tools conversion is a separate reference calculation that does not alter the ledger. Existing AED/fils code identifiers remain for compatibility.

## Local setup

Requirements: **Node 22.13+ (22 LTS preferred) or Node 24**, npm and a supported Prisma platform. Native installers must be built on their target OS/architecture.

```bash
git clone https://github.com/Unpatchabel/FWMS.git
cd FWMS
npm ci
cp .env.example .env
```

On PowerShell use `Copy-Item .env.example .env`; use `npm.cmd` if your execution policy blocks the npm wrapper. Generate a unique secret:

```bash
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64'))"
```

Put it in `AUTH_SECRET` in `.env`. Keep `DATABASE_URL="file:./dev.db"` for the default `prisma/dev.db`; relative SQLite paths are relative to `prisma/schema.prisma`. An absolute `file:` path can point to another private directory. Set `SESSION_MAX_AGE` to an integer from 60 to 2592000 seconds, default 604800.

```bash
npm run db:generate
npm run setup
npm run dev
```

Open `http://127.0.0.1:3000`. A fresh installation opens `/setup`. Choose your owner credentials and currency; setup creates the owner and default categories, with empty finances. **There is no seed script or default password.** The first person reaching an unconfigured installation can claim it, so initialize on loopback before permitting any remote access.

`npm run setup` creates a missing SQLite file without truncating existing data, then runs `prisma migrate deploy`. For schema development use `npm run db:migrate`. Do not substitute `prisma db push`: it does not apply the SQL integrity triggers. `db:reset` destroys data and is only for disposable development databases.

## Production web setup

Use a private OS user and private data directories. Configure `.env`, generate Prisma and apply migrations, then:

```bash
npm run build
npm start
```

The start script binds to `127.0.0.1`. Keep the `.next` build and installed production dependencies available. Next may print a standalone-output warning when using `next start`; the smoke test verifies the standalone entry separately. For a minimal standalone deployment, copy `.next/static` to `.next/standalone/.next/static`, then run `.next/standalone/server.js` with `HOSTNAME=127.0.0.1` and explicit `DATABASE_URL` and `AUTH_SECRET`. Standalone is intended for packaged deployment, not a second database configuration.

Web production cookies require HTTPS; for network access, use a TLS reverse proxy with access controls, preserve Host/Origin and apply persistent throttling. Do not set `FWMS_DESKTOP=1` for a web deployment. A production HTTP browser session on `127.0.0.1` may reject Secure cookies; use HTTPS for browser production validation. Desktop sets the explicit HTTP-loopback exception itself. The development script is for local development, not exposure to the internet.

The first build downloads Fraunces and Inter through `next/font/google`. A network-restricted clean build may need access to Google's font endpoints. Fonts are bundled into the resulting application; normal ledger use does not need that connection. Currency reference conversion uses Frankfurter and requires internet.

## Data, reports and backups

Web development stores records in `prisma/dev.db` by default. Electron uses its OS user-data directory and creates a unique local signing secret. Reports default to `~/Documents/FWMS-Recent-Docs` on the **host running FWMS**; `FWMS_DOCUMENTS_DIR` overrides it for web installations. Different installations on the same OS account should use different report directories.

PDF export supports ASCII labels only and rejects unsupported characters instead of silently substituting them. Use DOCX for non-English labels. Long PDF labels may exceed page width; review exported reports before sharing. Reports and JSON archives are plaintext sensitive data.

The JSON download is an archive, not a complete disaster-recovery mechanism: it intentionally omits login credentials and has no restore importer. For a recoverable installation backup, stop the application/server, copy the SQLite file and any journal/WAL sidecars, preserve private configuration/signing secret separately, and back up report files. Encrypt backups and test restoration privately. Do not copy only a live WAL-mode main file and assume it is consistent.

Before upgrading an existing installation, back up first and run the read-only reconciliation against a private copy:

```bash
npm run db:check
```

It prints finding counts and exits nonzero for selected inconsistencies. The new migration validates future writes; it does not rewrite or silently repair historical financial records. Legacy payments without linked cash rows require manual reconciliation. Keep your server timezone stable: reporting uses its local calendar.

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm audit
npm audit --omit=dev
npm run desktop:check
npm run test:http # after a successful build
```

Tests create and migrate a disposable absolute-path `prisma/test.db`; they do not use your configured production database. Never put real data in that filename. Coverage includes signed amounts, VOID, household boundaries, transfer conservation, loan debit/principal reconciliation, rollback, concurrent payments, duplicate VOID requests, Int limits, exports, session expiry/revocation and IPC sender validation. These are unit/integration and HTTP smoke checks, not a claim of full UI/accessibility coverage.

See [verification matrix](docs/audit/VERIFICATION.md) for exact results and saved command output. Dependency audits are point-in-time results; rerun before publishing a release.

## Electron development and packaging

```bash
npm run desktop:smoke
npm run desktop:package
node desktop/verify-package.cjs
```

`desktop:smoke` builds and validates standalone migrations/startup using a temporary database. Packaging builds DMG on macOS and NSIS on Windows through `desktop/builder.yml`. For Linux validation, `npx electron-builder --config desktop/builder.yml --linux dir --publish never` produces an unpacked application. The manual GitHub workflow also runs validation and uploads temporary installer artifacts; it does not publish a GitHub Release.

Native signing, Apple notarization, clean-machine installation and platform UI verification are separate release gates. Do not represent unsigned/ad-hoc test artifacts as a verified public desktop release. See [desktop release instructions](docs/desktop-release.md).

## Security design and limits

Fresh database-backed owner checks protect pages/actions/downloads, in addition to JWT middleware. Tokens pin HS256, require expiration and typed claims, and must match the database household/session version. Credential changes and sign-out revoke prior sessions; sign-out affects all owner sessions. Secrets must be at least 32 characters and cannot use the old placeholder. The process-local login budget caps expensive comparisons but is not distributed rate limiting.

Prisma parameterizes database requests; exported document formats escape values. Sensitive downloads disable caching. Electron uses context isolation, sandboxing, no node integration, restricted navigation, denied permissions and main-frame IPC checks. Packaged server resources exclude local environment/database files. CI has read-only permissions and pins external actions to verified commits.

FWMS does not encrypt SQLite, implement MFA/password recovery, or make audit logs tamper-proof. The Next UI does not yet have a strict nonce CSP. Financial mutations lack idempotency keys. SQLite is intended for modest write concurrency. For the complete threat model and private reporting process, read [SECURITY.md](SECURITY.md).

## Screenshots

Capture instructions and exact filenames are in [docs/screenshots/README.md](docs/screenshots/README.md). Use a separate synthetic installation. Screenshot files are intentionally pending; no real family data is included or fabricated as evidence.

## Repository guide

- `src/app` — pages, protected layout, backup/document GET handlers.
- `src/actions` — authenticated mutation entry points and validation.
- `src/services` — ledger and domain workflows.
- `src/lib` — authentication, money, calendar and audit helpers.
- `prisma` — schema and ordered SQL migrations.
- `desktop` — Electron launcher, bootstrap, IPC and packaging checks.
- `tests` — unit and database integration regressions.
- `scripts` — safe migration bootstrap and read-only reconciliation.
- `docs/audit` — findings, verification evidence, change inventory and publication checklist.

## Portfolio highlights

This project demonstrates a derived financial ledger, atomic cross-domain operations, owner/object authorization, exact amount parsing, database guard migrations, concurrency regression tests, desktop isolation and reproducible verification. It deliberately documents operational limits rather than claiming production certification.

## License and contributions

No LICENSE file was supplied and no license has been invented. Public source visibility does not grant an open-source license. The maintainer must select a license appropriate to their rights and intended reuse before describing FWMS as open source. See [CONTRIBUTING.md](CONTRIBUTING.md) and the [publication checklist](docs/audit/PUBLICATION.md).
