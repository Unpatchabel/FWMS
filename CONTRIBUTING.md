# Contributing

Use synthetic data and a separate local database. Do not attach family exports, credentials, screenshots of real finances, or database files to issues or PRs. Report vulnerabilities through the private process in SECURITY.md.

Use Node 22.13+ (22 LTS preferred) or Node 24. Install with `npm ci`, generate Prisma, apply migrations, and configure `.env` as described in README.md. Never run `db:reset` against real records.

Keep the UI identity and financial contract intact. Before changing ledger math, write a regression that demonstrates the bug and expected reconciliation. A transfer must conserve household cash. A loan payment must debit full cash and reduce liability only by principal. Invalid operations must leave no orphan ledger or audit records. Do not loosen authorization or assertions to pass tests.

Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, `npm audit`, and `npm run desktop:check`. For desktop changes also run the standalone smoke test and the relevant native packaging workflow. Include exact results and skipped checks in your PR.

Add new migrations instead of changing already-applied SQL. Trigger changes require SQL migrations and direct database regression tests. Services are trusted internal modules: new entry points must authenticate the caller, derive household/user IDs on the server, and validate payloads. Do not accept a household ID supplied by the browser as authorization.

No license grant is supplied with this repository. Before accepting outside contributions, the maintainer must decide licensing and contributor terms; do not assume an open-source license from public visibility.
