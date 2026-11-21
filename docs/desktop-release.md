# Desktop release validation

The application bundles Electron, a standalone Next server, SQLite through Prisma, and the platform-specific Prisma migration engine. The launcher creates private per-user files and applies migrations before opening setup/login. Reports live in the OS Documents/FWMS-Recent-Docs directory. Quit the application to stop the child server; macOS can keep it running after the last window closes.

## Build and test

Use Node 22.13+ or Node 24 on the target OS/architecture:

```bash
npm ci
npm run db:generate
npm run typecheck
npm run lint
npm test
npm run desktop:smoke
npm run desktop:package
node desktop/verify-package.cjs
```

The manual **Build FWMS desktop installers** GitHub workflow targets Apple Silicon macOS, Intel macOS and Windows x64. It builds and uploads temporary artifacts, not a published Release. Run it on the actual repository and confirm that each runner label is available to your account. Local Linux evidence is not evidence that those workflow runs have succeeded.

For a Linux unpacked validation build:

```bash
npm run build
node desktop/prepare.cjs
npx electron-builder --config desktop/builder.yml --linux dir --publish never
node desktop/verify-package.cjs
```

The package verifier checks server/static/native-engine presence and boots the **packaged executable in Node mode** against a temporary database. It does not exercise the Electron window, click the launcher or validate native installation/uninstallation. The main frame/IPC policy has unit tests, but full platform UI testing remains a release gate.

## Security boundaries

The renderer has node integration disabled, context isolation and sandboxing enabled. Permission checks/requests, new windows and webview attachment are denied. Navigation remains on the exact launcher or app loopback origin. Both IPC handlers validate the sender WebContents and main frame before starting the server or opening the fixed report directory.

The server binds to 127.0.0.1 on a temporary port and authenticates all financial access. Other local processes can connect to it; this is not an isolated private socket. FWMS_DESKTOP=1 permits non-Secure HttpOnly cookies for that HTTP loopback process only. Do not reuse this flag for public web hosting. Protect OS user data and auth.secret.

Packaging excludes root environment files and SQLite files from standalone resources. Before distributing any package, inspect the unpacked tree for environment files, databases, exported records, private build paths and unexpected dependencies. Never package directly from a directory containing real financial records.

## Native release gates

The default macOS identity is ad-hoc (`'-'`), suitable for test builds, not trusted distribution. Before a public macOS release, configure Developer ID signing and notarization and verify Gatekeeper behavior on a clean machine. Sign Windows installers and test SmartScreen behavior with your intended certificate. Keep signing credentials in protected CI secrets, never source control or PR workflows.

Test initial setup, sign-in/out, credential changes, restart persistence, reports, financial reconciliation, update with existing data, and uninstall behavior on each supported platform. Confirm that updating or uninstalling does not delete the user's private database or report directory. Record exact versions, checksums and results before publishing a GitHub Release. Do not ask users to disable Gatekeeper or other OS security controls globally.
