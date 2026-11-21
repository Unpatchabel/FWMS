// Ensure a fresh SQLite file exists without ever truncating an existing ledger.
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
const url = process.env.DATABASE_URL;
if (!url || !url.startsWith('file:') || !url.slice(5).split('?')[0]) {
  console.error('Set DATABASE_URL to a SQLite file: URL in .env before running setup.');
  process.exit(1);
}
const filename = path.resolve(root, 'prisma', url.slice(5).split('?')[0]);
fs.mkdirSync(path.dirname(filename), { recursive: true, mode: 0o700 });
try { fs.closeSync(fs.openSync(filename, 'wx', 0o600)); }
catch (error) { if (error.code !== 'EEXIST') throw error; }
const result = spawnSync(process.execPath, [path.join(root, 'node_modules/prisma/build/index.js'), 'migrate', 'deploy'], {
  cwd: root, env: process.env, stdio: 'inherit',
});
if (result.error) { console.error('Could not start Prisma migrations. Install dependencies first.'); process.exit(1); }
process.exitCode = result.status ?? 1;
