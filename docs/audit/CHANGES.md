# Change inventory

Compared against the supplied ZIP, excluding generated files and audit output. The original archive is preserved separately. No financial database was included or modified.

`source-changes.patch` contains exact text diffs; `changes.json` records per-file before/after SHA-256 hashes. New audit documents/evidence are separate additions and are not recursively included in their own patch.

| File | Change |
| --- | --- |
| `.env.example` | modified |
| `.github/dependabot.yaml` | modified |
| `.github/workflows/ci.yml` | added |
| `.github/workflows/desktop-build.yml` | modified |
| `.gitignore` | modified |
| `CONTRIBUTING.md` | added |
| `README.md` | modified |
| `SECURITY.md` | added |
| `desktop/builder.yml` | modified |
| `desktop/main.cjs` | modified |
| `desktop/security.cjs` | added |
| `docs/architecture.md` | added |
| `docs/desktop-release.md` | modified |
| `docs/screenshots/README.md` | added |
| `eslint.config.mjs` | added |
| `next.config.mjs` | modified |
| `package-lock.json` | modified |
| `package.json` | modified |
| `prisma/migrations/20261121000100_ledger_integrity/migration.sql` | added |
| `prisma/schema.prisma` | modified |
| `scripts/check-ledger.ts` | added |
| `scripts/http-smoke.cjs` | added |
| `scripts/migrate.cjs` | added |
| `src/actions/assets.ts` | modified |
| `src/actions/auth.ts` | modified |
| `src/actions/documents.ts` | modified |
| `src/actions/loans.ts` | modified |
| `src/actions/transactions.ts` | modified |
| `src/app/api/backup/route.ts` | modified |
| `src/app/login/page.tsx` | modified |
| `src/components/accounts/account-form.tsx` | modified |
| `src/components/assets/asset-form.tsx` | modified |
| `src/components/assets/valuation-form.tsx` | modified |
| `src/components/dashboard/net-worth-hero.tsx` | modified |
| `src/components/loans/loan-form.tsx` | modified |
| `src/components/loans/payment-form.tsx` | modified |
| `src/components/transactions/transaction-form.tsx` | modified |
| `src/components/ui/modal.tsx` | modified |
| `src/lib/auth.ts` | modified |
| `src/lib/ledger-totals.ts` | added |
| `src/lib/login-limit.ts` | added |
| `src/lib/money.ts` | modified |
| `src/lib/session.ts` | modified |
| `src/lib/validators.ts` | modified |
| `src/middleware.ts` | modified |
| `src/services/accounts.service.ts` | modified |
| `src/services/assets.service.ts` | modified |
| `src/services/backup.service.ts` | modified |
| `src/services/categories.service.ts` | modified |
| `src/services/document.service.ts` | modified |
| `src/services/loans.service.ts` | modified |
| `src/services/summary.service.ts` | modified |
| `src/services/transactions.service.ts` | modified |
| `tests/integration/integrity.test.ts` | added |
| `tests/setup/global-setup.ts` | modified |
| `tests/setup/test-db-url.ts` | modified |
| `tests/unit/security-boundaries.test.ts` | added |
| `tests/unit/session-token.test.ts` | added |
