# Verification matrix

Executed 21 November 2026 on Linux x64, Node **24.22.3**, npm **11.19.1**. PASS means the specific command/assertions completed successfully; it does not imply universal correctness. Original exploratory failures remain in `evidence/*working*` and `*-before*`; final evidence uses the names below.

| Check | Status | Evidence and result |
| --- | --- | --- |
| Dependency installation | PASS | `evidence/install.txt`: `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --fetch-retries=0 --fetch-timeout=20000`; 696 packages. npm 11's install-script approval policy skipped dependency lifecycle scripts; Prisma generation and Electron download were explicitly run separately. |
| Prisma generation | PASS | `npm run db:generate`; `evidence/prisma-generate.txt`; client 5.19.1 generated. |
| Fresh install/migrations | PASS | `DATABASE_URL=file:/tmp/fwms-fresh-check/ledger.db npm run setup`; `evidence/migrate-fresh.txt`; all four SQL migrations applied. |
| Read-only reconciliation (synthetic empty DB) | PASS | `npm run db:check` with that disposable URL; `evidence/reconcile-fresh.txt`; eight checks, zero findings. This is not an audit of your real database. |
| Type checking | PASS | `npm run typecheck`; `evidence/typecheck.txt`; exit 0. |
| Linting | PASS | `npm run lint`; `evidence/lint.txt`; zero warnings/errors. |
| Unit and integration tests | PASS | `npm test`; `evidence/tests.txt`; **106 tests in 17 files** pass, migrations used for DB setup. |
| Production build | PASS | `npm run build`; `evidence/build.txt`; compiled, type/lint/static generation/tracing completed. |
| All-dependency vulnerability audit | FAIL | `npm audit --json`; `evidence/npm-audit-after.json`; **6 moderate, 0 high, 0 critical**. Remaining electron-builder/minimatch chain documented in REPORT.md. |
| CI high/critical dependency gate | PASS | `npm audit --audit-level=high`; `evidence/audit-ci-gate.txt`; exits 0 while still reporting moderate build-tool findings. Includes dev dependencies so Electron advisories are not hidden. |
| Production dependency audit | PASS | `npm audit --omit=dev --json`; `evidence/npm-audit-production.json`; **0 findings**. Electron itself is a dev dependency but ships in desktop packages; its patch was updated separately. |
| Electron binary download | PASS | `node node_modules/electron/install.js`; `evidence/electron-download.txt`; explicit download completed. Version 44.11.5 was observed. |
| Electron syntax | PASS | `npm run desktop:check`; `evidence/desktop-check.txt`; main/bootstrap/security/preload parse successfully. |
| Desktop build resource prerequisites | PASS | `node desktop/prepare.cjs`; `evidence/desktop-prepare.txt`; standalone/static/native-engine presence checks passed. |
| Standalone desktop bootstrap | PASS | `node desktop/smoke.cjs`; `evidence/desktop-smoke.txt`; temporary private database, migrations, loopback server and initial owner screen. |
| Linux unpacked desktop package | PASS | `npx electron-builder --config desktop/builder.yml --linux dir --publish never`; `evidence/desktop-package.txt`; Linux x64 unpacked artifact produced. |
| Packaged-executable server check | PASS | `node desktop/verify-package.cjs`; `evidence/desktop-verify-package.txt`; packaged files validated and packaged Electron executable ran migration/server smoke in Node mode. |
| Built HTTP security/functional smoke | PASS | `npm run test:http`; `evidence/http-smoke.txt`; 11 checks: unauthenticated 401, cross-origin action rejection, setup/cookie, dashboard, repeated setup denial, account creation, protected no-store/hash-free export, DOCX generation/download, logout replay denial, bad-password denial and successful re-login preserving data. Uses explicit desktop HTTP-cookie mode and synthetic temporary data. |
| Current source secret scan | PASS | Gitleaks **8.30.1** default rules, `dir` mode with `--redact`; `evidence/gitleaks-source.txt` and JSON; no findings. Exact distributable source was scanned, excluding generated dependencies/build/test databases. |
| Package private-file inventory | PASS | `evidence/package-private-files.txt` and `evidence/package-asar-inventory.txt`; no .env, SQLite ledger or auth.secret in packaged resources. Pattern inventory does not certify all package content. |
| Original Git history secrets/privacy | NOT RUN | ZIP includes no `.git` history. Required commands and remediation gates are in PUBLICATION.md. |
| Real family database reconciliation/migration | NOT RUN | No real database was supplied; preserve private backups and validate a copy. |
| Hosted GitHub Actions | NOT RUN | Workflow files revised locally; no remote workflow was triggered. |
| macOS/Windows packaging and signing | NOT RUN | Target platforms and signing/notarization credentials unavailable in this Linux environment. |
| Full browser/Electron UI and accessibility | NOT RUN | No end-to-end native renderer/assistive-technology suite was run. Label/focus changes passed type/lint/build checks only. |
| Clean-machine install/update/uninstall | NOT RUN | Requires native platform testing and representative existing private records. |

## Important interpretation

The baseline test command failed before running tests. Its disposable database URL/path did not agree, and a missing fresh SQLite file needed safe creation. Those were repaired without using your production DATABASE_URL or weakening tests.

One intermediate rebuild overlapped an npm dependency reinstall and failed while module files were changing. The final install/generate/type/lint/test/build sequence was rerun sequentially and passed. It is not recorded as a passing build.

The final audit improves npm's baseline **17 findings (1 critical, 6 high, 10 moderate)** to **6 moderate build-tool findings**. Do not turn a production-only clean result into a claim that every shipped desktop/tool dependency is vulnerability-free.
