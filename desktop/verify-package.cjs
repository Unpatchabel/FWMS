const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const output = path.join(__dirname, '..', 'dist-desktop');
const entries = fs.readdirSync(output, { withFileTypes: true }).filter(entry => entry.isDirectory());
const unpacked = entries.find(entry => entry.name.startsWith('win-unpacked'))
  || entries.find(entry => entry.name.startsWith('mac-'))
  || entries.find(entry => entry.name === 'linux-unpacked');
if (!unpacked) throw new Error('No unpacked desktop application was produced.');
const root = path.join(output, unpacked.name);
const isMac = unpacked.name.startsWith('mac-');
const resources = isMac ? path.join(root, 'FWMS.app', 'Contents', 'Resources') : path.join(root, 'resources');
const executable = isMac ? path.join(root, 'FWMS.app', 'Contents', 'MacOS', 'FWMS')
  : path.join(root, process.platform === 'win32' ? 'FWMS.exe' : 'fwms');
for (const file of ['server/server.js', 'server/node_modules/next/package.json',
  'server/node_modules/.prisma/client', 'server/.next/static',
  'migration/prisma/schema.prisma', 'migration/node_modules/prisma/build/index.js',
  'migration/node_modules/@prisma/engines']) {
  if (!fs.existsSync(path.join(resources, file))) throw new Error(`Installer is missing ${file}`);
}
if (!fs.existsSync(executable)) throw new Error('Installer is missing its app executable.');
const test = spawnSync(process.execPath, [path.join(__dirname, 'smoke.cjs')], {
  env: { ...process.env, FWMS_SMOKE_RESOURCES: resources, FWMS_SMOKE_EXECUTABLE: executable },
  stdio: 'inherit', timeout: 120000,
});
if (test.error) throw test.error;
if (test.status !== 0) throw new Error(`Packaged application smoke test failed (${test.status}).`);
