// Next.js standalone traces the server; static assets need copying separately.
// Fail the packaging job early if either build output or Prisma's native
// migration engine is missing for the current platform.
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
for (const file of [
  '.next/standalone/server.js',
  '.next/standalone/node_modules/.prisma/client',
  '.next/static',
  'node_modules/prisma/build/index.js',
  'node_modules/@prisma/engines',
  'prisma/schema.prisma',
  'prisma/migrations',
]) {
  if (!fs.existsSync(path.join(root, file))) throw new Error(`Desktop build needs ${file}`);
}
const engineFiles = fs.readdirSync(path.join(root, 'node_modules/@prisma/engines'));
if (!engineFiles.some(file => file.startsWith('schema-engine-')))
  throw new Error('The Prisma migration engine is missing for this platform. Run npm ci here before packaging.');
