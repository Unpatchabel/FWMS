# Security policy

FWMS is a portfolio project for one owner on a trusted machine. It is not independently certified or intended as a public financial SaaS. Only the current main branch is maintained; there is no LTS/security-response SLA.

## Report privately

Use the repository's GitHub **Security → Report a vulnerability** feature if enabled. Do not open a public issue containing an exploit, token, database, financial export, or personal data. If private reporting is unavailable, ask the maintainer for a private reporting channel without disclosing vulnerability details publicly. No reporting email is invented here.

Include the affected revision, prerequisites, minimal synthetic reproduction, impact and proposed fix. Never test against someone else's installation.

## Deployment requirements

Run on loopback by default and initialize the owner before permitting any remote access. A fresh `/setup` is deliberately unauthenticated: the first person who can reach it can claim an unconfigured installation. Do not expose an uninitialized server.

For remote use, put TLS and access controls in front of the app, preserve the actual Host/Origin relationship, and add persistent request throttling. Do not set FWMS_DESKTOP=1 for a network deployment: it disables Secure cookies for Electron's HTTP loopback only. The built-in login attempt budget is process-local, shared across this one-owner app, resets on restart, and is not a distributed abuse-control service. An attacker can consume that budget and temporarily deny sign-in.

Use a unique random AUTH_SECRET of at least 32 characters; never the example placeholder. Rotating it invalidates every session. Password/username changes and sign-out invalidate existing sessions through sessionVersion. Sign-out currently signs out all sessions for this owner. Protect the OS user account, SQLite file, auth.secret, .env, reports and downloaded JSON exports. They are not encrypted by FWMS; use disk encryption and encrypted backups. An OS user who can modify the database or application can defeat application controls.

Next Server Actions provide same-origin checks. React escapes text; generated DOCX XML and PDF literal strings escape their respective formats. Only the launcher has a restrictive CSP; the Next UI does not have a strict nonce-based CSP yet. Do not claim blanket XSS protection.

Electron disables node integration, uses context isolation and renderer sandboxing, denies permissions/new windows/webviews, restricts navigation, and validates IPC sender frames. Its local server remains reachable by other local programs and requires owner authentication. Loopback is not a secret transport. Desktop installers still need native platform verification and trusted code signing/notarization before general distribution.

Re-audit dependencies before releases. The audit snapshot and unresolved findings in docs/audit are evidence for one revision, not a permanent guarantee. Audit logs are ordinary database rows, not tamper-evident records. Exports omit password hashes and session counters but contain highly sensitive financial and activity information.
