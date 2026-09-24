const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const net = require('node:net');
const { spawn } = require('node:child_process');

function databaseUrl(filename) {
  // Prisma's file: SQLite URL accepts absolute POSIX paths and Windows drive paths.
  return `file:${filename.replace(/\\/g, '/')}`;
}

async function initializeFiles(directory) {
  await fs.mkdir(directory, { recursive: true, mode: 0o700 });
  const database = path.join(directory, 'ledger.db');
  const secretFile = path.join(directory, 'auth.secret');
  try { await fs.writeFile(database, '', { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  try { await fs.writeFile(secretFile, crypto.randomBytes(48).toString('base64'), { flag: 'wx', mode: 0o600 }); }
  catch (error) { if (error.code !== 'EEXIST') throw error; }
  const secret = (await fs.readFile(secretFile, 'utf8')).trim();
  if (secret.length < 32) throw new Error('The local authentication secret is invalid.');
  return { database, secret };
}

function run(executable, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(executable, args, { ...options, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    for (const stream of [child.stdout, child.stderr]) stream.on('data', chunk => {
      output = (output + chunk.toString()).slice(-10000);
    });
    child.once('error', reject);
    child.once('close', code => code === 0 ? resolve(output) : reject(new Error(`Database setup failed (${code}). ${output.slice(-1200)}`)));
  });
}

async function migrate({ resources, executable, environment }) {
  const cli = path.join(resources, 'migration', 'node_modules', 'prisma', 'build', 'index.js');
  const schema = path.join(resources, 'migration', 'prisma', 'schema.prisma');
  return run(executable, [cli, 'migrate', 'deploy', '--schema', schema], {
    cwd: path.join(resources, 'migration'), env: environment,
  });
}

async function freePort() {
  return new Promise((resolve, reject) => {
    const listener = net.createServer();
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', () => {
      const port = listener.address().port;
      listener.close(error => error ? reject(error) : resolve(port));
    });
  });
}

async function waitForServer(child, port) {
  const url = `http://127.0.0.1:${port}`;
  for (let attempts = 0; attempts < 80; attempts++) {
    if (child.exitCode !== null) throw new Error(`The local server exited (${child.exitCode}).`);
    try {
      const response = await fetch(`${url}/login`, { redirect: 'manual', signal: AbortSignal.timeout(500) });
      if (response.status === 200 || response.status === 307) return url;
    } catch { /* The server is still starting. */ }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  throw new Error('The local server did not start. Check that your firewall allows this app to use localhost.');
}

module.exports = { databaseUrl, initializeFiles, migrate, freePort, waitForServer };
