# Desktop installer workflow (maintainers)

The desktop version bundles a local Next.js server, Electron, and Prisma's
platform-specific migration engine. The user installs the app and clicks
**Start FWMS**. First launch applies migrations to a new SQLite database,
generates a private authentication secret, and opens the owner signup in the
application window. Reopening the app keeps the same database and secret.

Data lives in Electron's per-user application data directory, outside Git and
outside the installation directory. Updating or removing the application must
not delete that directory. Saved reports live in `Documents/FWMS-Recent-Docs`.

## Produce test installers

Open the repository's **Actions → Build FWMS desktop installers → Run workflow**.
The jobs build on Apple Silicon macOS, Intel macOS, and Windows. Each job runs
the existing tests and boots the packaged server against a fresh database.
Download the `.dmg` or `.exe` from the workflow's artifacts and test it on
that operating system. The temporary workflow artifacts are not a public
distribution channel.

Mac test artifacts use an ad-hoc signature and the CI job checks that the
packaged app's signature is structurally valid. Gatekeeper does not trust
ad-hoc signatures from downloads, so a Mac tester may still need to approve
the app in System Settings → Privacy & Security.

Developers can run `npm ci`, `npm run desktop:smoke`, and
`npm run desktop:package` on a supported build machine. Packaging must run
on each target OS so Prisma includes that OS's native engines. Node.js is
only required to *build* the installer; packaged users do not need it.

## Release gate

Before offering installers to nontechnical users, sign Windows builds and
sign/notarize the macOS builds with the appropriate developer credentials.
Replace the test-only `mac.identity: '-'` in `desktop/builder.yml` with a
Developer ID signing configuration before publishing a Mac Release.
Unsigned macOS downloads can be blocked by Gatekeeper, and unsigned Windows
builds can trigger SmartScreen. Test the signed `.dmg` and `.exe` on clean
machines, then attach them to a GitHub Release. The repo clone remains the
technical source distribution; the Release download is the ordinary install
path. Signing credentials must be kept out of this repository.

The application binds only to `127.0.0.1` on a temporary port. No public
hosting is configured. Closing FWMS stops its bundled server.
