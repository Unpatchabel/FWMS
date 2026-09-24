// Test the exact bundled Next server and Prisma migration engine on this OS.
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { databaseUrl, initializeFiles, migrate, freePort, waitForServer } = require('./bootstrap.cjs');

async function main() {
  const root = path.join(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fwms-desktop-smoke-'));
  let child;
  try {
    const resources = process.env.FWMS_SMOKE_RESOURCES || path.join(temp, 'resources');
    const executable = process.env.FWMS_SMOKE_EXECUTABLE || process.execPath;
    if (!process.env.FWMS_SMOKE_RESOURCES) {
    const pairs = [
      ['.next/standalone', 'server'], ['.next/static', 'server/.next/static'],
      ['node_modules/prisma', 'migration/node_modules/prisma'],
      ['node_modules/@prisma', 'migration/node_modules/@prisma'],
      ['prisma/schema.prisma', 'migration/prisma/schema.prisma'],
      ['prisma/migrations', 'migration/prisma/migrations'],
    ];
    for (const [source, target] of pairs) {
      await fs.mkdir(path.dirname(path.join(resources, target)), { recursive: true });
      await fs.cp(path.join(root, source), path.join(resources, target), { recursive: true });
    }
    }
    const { database, secret } = await initializeFiles(path.join(temp, 'user-data'));
    const env = { ...process.env, DATABASE_URL: databaseUrl(database), AUTH_SECRET: secret,
      FWMS_DESKTOP: '1', ELECTRON_RUN_AS_NODE: '1', NODE_ENV: 'production',
      FWMS_DOCUMENTS_DIR: path.join(temp, 'recent-docs') };
    await migrate({ resources, executable, environment: env });
    const port = await freePort();
    child = spawn(executable, [path.join(resources, 'server', 'server.js')], {
      cwd: path.join(resources, 'server'), env: { ...env, HOSTNAME: '127.0.0.1', PORT: String(port) },
      stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
    });
    let logs = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', data => { logs += data.toString(); });
    let url;
    try { url = await waitForServer(child, port); }
    catch (error) { throw new Error(`${error.message}\n${logs.slice(-1200)}`); }
    const response = await fetch(`${url}/setup`);
    const html = await response.text();
    if (!response.ok || !html.includes('Create your owner account'))
      throw new Error(`First-run owner screen failed (HTTP ${response.status}). ${logs.slice(-1000)}`);
    console.log('Desktop smoke test passed: migration, localhost server, and first-run owner screen.');
  } finally {
    if (child && child.exitCode === null) {
      child.kill();
      await new Promise(resolve => child.once('close', resolve));
    }
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
