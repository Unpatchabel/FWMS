# GitHub publication checklist

## Required before visibility changes

- [ ] Apply the revised source in a review branch of the original repository. Do not replace or discard its Git history with a new ZIP-only repository to avoid dealing with exposures.
- [ ] Back up real financial records privately; run migrations and `npm run db:check` against a copy. Inspect count-only findings and reconcile legacy unlinked payments. Do not commit the copy.
- [ ] Scan the **original complete Git history**, including all fetched branches/tags. The attached ZIP cannot supply this evidence.
- [ ] If a credential was ever committed, revoke/rotate it first. Removing it from the current file is insufficient. Remove sensitive history through a coordinated history rewrite only after preserving a private backup and understanding collaborator/fork implications.
- [ ] Manually inspect historical SQLite files, JSON archives, reports, screenshots, logs, GitHub issues, Releases, Actions artifacts and git-lfs objects. Pattern scanners do not identify arbitrary personal financial information.
- [ ] Rerun the final verification commands on the exact commit intended for publication, preferably using Node 22 on a fresh machine. This audit ran on Linux x64, Node 24.22.3.
- [ ] Review the six remaining moderate build-tool audit findings. Do not claim a clean all-dependency audit or zero vulnerabilities.
- [ ] Enable GitHub private vulnerability reporting, secret scanning/push protection where available, Dependabot alerts and dependency updates.
- [ ] Add branch protection requiring the Verify FWMS workflow. Do not permit untrusted PR code to run with signing/publishing secrets.
- [ ] Choose a license based on rights to the source, assets, fonts and contributions. No license has been added by this audit. Public visibility alone does not make the repository open source.
- [ ] Capture the documented synthetic screenshots and inspect their content before committing them.
- [ ] Review the README's scope and known limitations. Keep EDITOR/VIEWER access and AI claims out of the feature list unless they are actually implemented.

## Scan the original history

Using Gitleaks 8.30.1 or a current verified release, in the original local Git checkout:

```bash
git fetch --all --tags --prune
gitleaks git . --log-opts="--all" --redact --report-format json --report-path ../fwms-history-gitleaks.json
gitleaks dir . --redact --report-format json --report-path ../fwms-working-tree-gitleaks.json
```

Review scanner help for the version you install. Keep reports outside the repository: even redacted reports can disclose filenames and personal metadata. Scan LFS content, submodules, release attachments and build artifacts separately if present. GitHub secret scanning complements this scan; neither proves that all secrets or financial records have been found.

For an additional history inventory:

```bash
git log --all --name-only --format= -- '*.db' '*.sqlite' '*.sqlite3' '.env*' '*.pdf' '*.docx' '*backup*.json'
```

A match is not automatically a leak (.env.example is expected), and a lack of matches is not clearance. If real data is found, stop publication and assess exposure. History rewriting and force pushes require a separate deliberate decision; none have been performed here.

## Suggested GitHub presentation

**Description:** Self-hosted financial ledger with derived balances, atomic loan repayments, authenticated exports, and a security-hardened Next.js/Electron architecture.

**Topics:** `nextjs`, `typescript`, `react`, `prisma`, `sqlite`, `electron`, `personal-finance`, `financial-ledger`, `application-security`, `vitest`, `self-hosted`

**Pin summary:** Full-stack financial engineering project: exact monetary inputs, transaction-derived balances, atomic transfers and loan payments, owner authorization, and tested security boundaries.

Pin it once the checklist's privacy/history gates are satisfied. For cloud-role applications, present this as application engineering/security evidence; it does not replace hands-on AWS infrastructure evidence.

## Separate desktop release checklist

- [ ] Resolve or explicitly accept remaining build-tool dependency findings with recorded rationale.
- [ ] Run macOS ARM64, macOS Intel and Windows native jobs successfully.
- [ ] Test actual renderer/launcher interaction and installation/update/uninstall on clean machines.
- [ ] Sign installers; notarize macOS builds; verify resulting signatures.
- [ ] Inspect final package contents for secrets/private records and publish checksums.
- [ ] Publish only artifacts from the reviewed source revision.

No push, visibility change or Release publication was authorized or performed by this audit.
