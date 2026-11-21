# FWMS security and engineering audit

Audit date: 21 November 2026. Input: `FWMS-main(1).zip`, archive source revision marker `ced30c8f52fac566f5b3489fbe77008584e4d170`. Scope: supplied source snapshot, migrations, desktop runtime/packaging, dependency tree, tests and documentation. This is an implemented remediation review, not independent certification.

## Publication assessment

The revised source is substantially improved and passes the recorded automated checks. **Publication is not cleared until the original Git history and historical artifacts are checked for secrets and family financial information.** No Git history or real database was supplied, so those gates cannot be completed from this ZIP. Desktop source/package smoke validation is not a signed native release approval.

## Prioritized implemented changes

1. Patched dependency advisories: Next 15.5.26 → 15.5.29; Electron 44.4.5 → 44.11.5; Zod 3.23.8 → 4.6.7; Vitest 4.1.11 → 4.1.12; electron-builder 26.16.1 → 26.18.0; compatible transitive lockfile updates. Major Zod compatibility was checked through tests/type/build validation. No blind `npm audit fix --force` downgrade was applied.
2. Fixed a reproduced money-storage bug: the previous one-billion-unit input limit allowed values that Prisma could store in SQLite but could not decode as Int. Inputs now respect the actual Int limit; account/cash/monthly income aggregation supports totals above that per-row range. Parsing is decimal-digit based and rejects malformed comma grouping.
3. Added additive SQLite triggers protecting integer bounds, transaction signs/types/status, household relationships, payment splits, cumulative principal and linked cash rows. No columns changed and no historical data was rewritten. A read-only reconciliation command reports selected legacy inconsistencies.
4. Tightened JWT verification/claim validation, placeholder-secret rejection, session lifetime validation, household binding, logout revocation and login attempt budgeting. Removed the owner's username from the unauthenticated login page.
5. Hardened IPC sender validation and denied webview/permission boundaries while preserving renderer isolation. Excluded local .env/database files from packaged standalone resources.
6. Made JSON export and dashboard summary queries consistent snapshots; prevented duplicate concurrent VOID audit records; moved transaction account/category checks inside the write transaction. Retained original ledger definitions and principal-versus-spending behavior.
7. Fixed test database resolution/bootstrap and switched tests from schema push to actual migrations. Added meaningful monetary, household, concurrency, session, export and IPC regressions plus real built-server HTTP smoke checks.
8. Added working ESLint/typecheck scripts, fixed lint issues, improved form label associations and dialog keyboard focus handling, synchronized derived-view invalidation, sanitized document filesystem errors, and added private download/header defenses.
9. Replaced misleading README claims with actual capabilities, installation/migration steps, architecture, threat model, contributing/reporting guidance and publication/release gates. No license was invented.

## Security and integrity findings

Severity reflects impact in the intended local single-owner deployment. Dependency severity comes from npm advisories; an advisory's presence is not proof that its exploit prerequisites exist in this application's routes.

| ID | Severity | Affected files | Finding and remediation | Status |
| --- | --- | --- | --- | --- |
| DEP-01 | Critical (upstream) | `package.json`, `package-lock.json` | Next audit included an unauthenticated RCE advisory requiring image-optimization/SVG conditions, plus Server Action DoS/cache/cookie advisories. Updated to the audit-recommended 15.5.29. No claim of a demonstrated FWMS RCE exploit. | Fixed; final production audit clean |
| DEP-02 | High (upstream) | Same | Electron certificate mitigation, Zod resource-exhaustion and transitive high findings; updated supported patches/compatible transitives and tested Zod migration. | Fixed in final audit |
| FIN-01 | High | `src/lib/money.ts`, account/summary services, new `ledger-totals.ts` | Reproduced `100000000000` hundredths failing Prisma decoding. Original validation allowed this. Added realistic per-value cap, exact parser, and checked text-decoded SUM to avoid Int32 aggregate failures. | Fixed and regression tested |
| FIN-02 | Medium | New integrity migration; `scripts/check-ledger.ts` | Original SQLite constraints did not enforce signs, household linkage, splits or cumulative principal. Added future-write triggers and direct DB bypass tests. Existing rows are not silently repaired. | Fixed for new writes; historical reconciliation pending |
| FIN-03 | Medium | `transactions.service.ts` | VOID checked ACTIVE before its transaction, allowing duplicate audit records on racing requests. Conditional update now permits only one transition, with atomic audit. | Fixed and race tested |
| FIN-04 | Medium | `backup.service.ts`, `summary.service.ts` | Independent reads could mix states around concurrent financial writes. Archive/dashboard summary now use transaction snapshots. | Fixed; other independent widgets remain separate snapshots |
| AUTH-01 | Medium | `session.ts`, `auth.ts` | JWT algorithm and payload types were not explicitly pinned/validated; token household was not compared with DB; 16-character minimum accepted example placeholder; lifetime accepted NaN/fractions/unbounded values. Added strict checks and tests. | Fixed |
| AUTH-02 | Medium | `actions/auth.ts`, new `login-limit.ts` | No sign-in attempt budget; logout only cleared the client cookie so an old token could replay. Added bounded single-process budget and sessionVersion invalidation on sign-out. | Fixed with documented limiter limits; replay checked over HTTP |
| AUTH-03 | Low | `app/login/page.tsx` | Owner name/username was exposed before authentication. Login heading is now generic. | Fixed |
| DESK-01 | Medium | `desktop/main.cjs`, `security.cjs`, `builder.yml` | Narrow IPC channels lacked sender/frame validation. Added exact main-frame/WebContents/origin checks, webview denial, permission-check denial and package inclusion. | Fixed; unit and package smoke checked |
| DESK-02 | High if secrets present | `desktop/builder.yml` | Broad standalone resource copy could carry traced .env/database files into installers. Added explicit resource exclusions. No real secret file was found in supplied source. | Fixed for known file classes; inspect each release |
| DATA-01 | Low | Backup API and document action | JSON archive lacked explicit no-store/nosniff; raw filesystem errors could reveal host paths. Added headers and generic filesystem failure message while preserving known validation messages. | Fixed |
| CI-01 | Medium | `.github/workflows`, Dependabot | Workflows used movable action tags and lacked general PR validation. Pinned upstream-resolved commits, retained contents:read, added job timeouts/CI and GitHub Actions update monitoring. | Fixed in source; hosted workflow not run here |
| QA-01 | Medium | `tests/setup`, package/config files | Original tests failed during global setup; schema-push setup would also omit SQL triggers. Absolute disposable URL, missing-file bootstrap and migrate deploy now exercise real migrations. ESLint was previously absent/unconfigured. | Fixed; 106 tests pass |
| UX-01 | Low | Form components, modal, asset service | Unassociated form labels, incomplete dialog keyboard handling, grouped-amount preview mismatch, nondeterministic same-date asset valuation selection and stale dependent pages. Added targeted fixes without redesign. | Fixed in source; full UI/accessibility audit not performed |
| DEP-03 | Moderate (upstream) | electron-builder dependency chain | Six remaining audit package findings flow from minimatch glob-parts amplification in build tooling. Latest checked electron-builder still pulls affected 9.x/10.x minimatch. npm proposes a breaking downgrade, which was not blindly applied. | Open; build-input exposure, not production Next runtime |

Exact advisory titles/URLs and dependency nodes appear in `evidence/npm-audit-before.json` and `evidence/npm-audit-after.json`. First-party security guidance consulted: [Electron security checklist](https://www.electronjs.org/docs/latest/tutorial/security) and [Next 15.5 lint migration](https://nextjs.org/blog/next-15-5). External action commit pins were resolved with `git ls-remote` against their upstream repositories.

## OWASP-oriented review conclusions

- Authentication: signed expiring HttpOnly cookies; fresh active owner/session-version check at sensitive entry points. Legacy roles denied; EDITOR does not exist. Password inputs enforce bcrypt's new-password byte limit. No password reset or MFA is implemented.
- Authorization/IDOR: browser actions derive household/user from authentication. Account/category/asset/loan selection is household scoped. Direct DB boundary and service cross-household regressions were added. Services remain trusted internal modules; they do not authenticate arbitrary caller-supplied user IDs.
- CSRF: built-in Next Server Action Origin/Host enforcement retained and verified by a real cross-origin POST. No wildcard allowed-origin exception. API downloads are GET reads with explicit authorization.
- Injection/XSS: Prisma parameterization preserved, including tagged raw aggregate queries. React text escapes values; generated XML/PDF values are escaped. No unsafe HTML rendering was found in the supplied source. Strict nonce CSP on the Next UI remains unimplemented; the launcher retains its restrictive CSP.
- Sensitive data: exports exclude password hashes/session counters but remain highly sensitive plaintext. Downloads are authenticated and no-store. Files live outside public assets. OS compromise and local database modification are outside application authorization guarantees.
- Financial integrity: baseline ledger formulas were retained. Tested transfer conservation, full loan cash debit, principal/interest spending treatment, rollback, duplicate VOID, concurrent overpayment and Int32 boundaries. Additive guards cover future writes, not all historical/direct-SQL tampering scenarios.
- Supply chain: final production audit has no known findings. All-dependency audit still fails on six moderate build-tool findings. Scanners and clean tests are bounded evidence, not proof of safety.

## Unresolved risks and limits

1. **Original history/privacy gate:** no original `.git`, branches, LFS, historical Actions artifacts, releases or real financial records were available. Follow PUBLICATION.md before changing visibility.
2. **Build dependency debt:** six moderate toolchain findings remain. Re-evaluate upstream fixes before installer distribution. Do not run packaging against untrusted file trees.
3. **Platform release validation:** Linux x64 unpacked package/server smoke passed. macOS/Windows builds, signing/notarization, actual Electron UI and clean-machine install/update/uninstall remain unverified.
4. **Historical data:** new triggers do not repair old invalid signs, oversized values, broken transfer pairs or unlinked loan payments. Run db:check on a private copy, inspect findings and reconcile without inventing transactions.
5. **Deployment:** unauthenticated initial setup must stay private. Data/backups are not encrypted by the app. Rate limiting is process-local and can temporarily lock out the owner. Remote exposure needs TLS and operational access controls.
6. **Accounting scope:** no financial-mutation idempotency keys, automatic reversals, restore importer, loan amortization engine, multi-currency ledger or formal double-entry accounting. SQLite write contention can reject requests; ambiguous responses require reconciliation before retry.
7. **Precision/calendar:** per-value Int bound is explicit; this is not arbitrary-precision accounting. Business dates follow server-local calendar/timezone. Independent page widgets may observe different snapshots.
8. **Presentation/ownership:** screenshots await synthetic capture. Licensing remains a maintainer decision. Source publication is distinct from certifying financial software for other users.

See VERIFICATION.md for PASS/FAIL/NOT RUN and PUBLICATION.md for actionable gates and repository presentation.
