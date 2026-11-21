// Exercise the built Server Action and download boundaries with disposable synthetic data.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn, spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const { freePort, waitForServer } = require('../desktop/bootstrap.cjs');
async function main() {
  const root = path.join(__dirname, '..');
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'fwms-http-'));
  let child;
  try {
    const env = { ...process.env, NODE_ENV: 'production', FWMS_DESKTOP: '1',
      DATABASE_URL: `file:${path.join(temp, 'ledger.db').replace(/\\/g, '/')}`,
      AUTH_SECRET: crypto.randomBytes(48).toString('base64'), FWMS_DOCUMENTS_DIR: path.join(temp, 'reports') };
    const migration = spawnSync(process.execPath, [path.join(root, 'scripts/migrate.cjs')], { cwd: root, env, encoding: 'utf8' });
    assert.equal(migration.status, 0, 'Disposable database migration failed');
    const port = await freePort();
    const serverDir = path.join(root, '.next/standalone');
    child = spawn(process.execPath, [path.join(serverDir, 'server.js')], { cwd: serverDir, env: { ...env, HOSTNAME: '127.0.0.1', PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    // Drain output without storing passwords, cookies or page content in audit evidence.
    for (const stream of [child.stdout, child.stderr]) stream.on('data', () => {});
    const origin = await waitForServer(child, port);
    const manifest = JSON.parse(await fs.readFile(path.join(root, '.next/server/server-reference-manifest.json'), 'utf8'));
    const ids = Object.fromEntries(Object.entries(manifest.node).map(([id, item]) => [item.exportedName, id]));
    async function action(name, route, args, cookie, requestOrigin = origin) {
      assert.ok(ids[name], `Missing built action ${name}`);
      const response = await fetch(`${origin}${route}`, { method: 'POST', redirect: 'manual', headers: {
        'Next-Action': ids[name], 'Content-Type': 'text/plain;charset=UTF-8', Accept: 'text/x-component', Origin: requestOrigin,
        ...(cookie ? { Cookie: cookie } : {}),
      }, body: JSON.stringify(args) });
      const body = await response.text();
      let result;
      for (const line of body.split('\n')) {
        const index = line.indexOf(':');
        try { const candidate = JSON.parse(line.slice(index + 1)); if (candidate && typeof candidate.ok === 'boolean') result = candidate; } catch { /* Other RSC records are not action results. */ }
      }
      return { response, result };
    }
    let response = await fetch(`${origin}/api/backup`, { redirect: 'manual' });
    assert.equal(response.status, 401); console.log('PASS unauthenticated backup returns 401');
    const password = crypto.randomBytes(24).toString('base64');
    let attempt = await action('setupAction', '/setup', [{ username: 'HTTP Demo', password, currency: 'AED' }], null, 'https://untrusted.example');
    assert.ok(attempt.response.status >= 400); console.log('PASS cross-origin Server Action is rejected');
    attempt = await action('setupAction', '/setup', [{ username: 'HTTP Demo', password, currency: 'AED' }]);
    assert.equal(attempt.result?.ok, true, 'Owner setup action failed');
    let cookie = attempt.response.headers.get('set-cookie')?.split(';')[0];
    assert.ok(cookie); console.log('PASS fresh owner setup sets session cookie');
    response = await fetch(`${origin}/dashboard`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200); assert.ok((await response.text()).includes('Combined Net Worth')); console.log('PASS authenticated dashboard renders');
    attempt = await action('setupAction', '/setup', [{ username: 'Second Owner', password, currency: 'AED' }], cookie);
    assert.equal(attempt.result?.ok, false); console.log('PASS repeated setup is refused');
    attempt = await action('createAccountAction', '/accounts', [{ name: 'Synthetic cash', type: 'CASH', openingBalanceAed: '1000.00' }], cookie);
    assert.equal(attempt.result?.ok, true); console.log('PASS authenticated account action succeeds');
    response = await fetch(`${origin}/api/backup`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    let archive = await response.json();
    assert.equal(archive.accounts.length, 1); assert.equal(archive.transactions[0].amount, 100000);
    assert.ok(!JSON.stringify(archive).includes('passwordHash')); console.log('PASS private no-store export reconciles opening balance and omits hashes');
    attempt = await action('saveReportAction', '/reports', ['2026-01', 'docx'], cookie);
    assert.equal(attempt.result?.ok, true);
    response = await fetch(`${origin}/api/documents/${attempt.result.filename}`, { headers: { Cookie: cookie } });
    assert.equal(response.status, 200); assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 2).toString(), 'PK'); console.log('PASS authenticated DOCX generation/download');
    await action('logoutAction', '/dashboard', [], cookie);
    response = await fetch(`${origin}/api/backup`, { headers: { Cookie: cookie }, redirect: 'manual' });
    assert.equal(response.status, 401); console.log('PASS logged-out token cannot replay against backup');
    attempt = await action('loginAction', '/login', [{ username: 'HTTP Demo', password: 'wrong-password' }]);
    assert.equal(attempt.result?.ok, false); console.log('PASS invalid password denied');
    attempt = await action('loginAction', '/login', [{ username: 'HTTP Demo', password }]);
    assert.equal(attempt.result?.ok, true);
    cookie = attempt.response.headers.get('set-cookie')?.split(';')[0]; assert.ok(cookie);
    response = await fetch(`${origin}/api/backup`, { headers: { Cookie: cookie } });
    archive = await response.json(); assert.equal(archive.accounts.length, 1); console.log('PASS owner can sign in again and records are preserved');
  } finally {
    if (child && child.exitCode === null) { child.kill(); await new Promise(resolve => child.once('close', resolve)); }
    await fs.rm(temp, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
