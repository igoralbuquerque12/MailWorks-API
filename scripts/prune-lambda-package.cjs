const fs = require('node:fs');
const path = require('node:path');

const buildRoot = path.resolve(process.cwd());
const expectedSuffix = path.join('.esbuild', '.build');

if (!buildRoot.endsWith(expectedSuffix)) {
  throw new Error(`Refusing to prune unexpected directory: ${buildRoot}`);
}

const targets = [
  'node_modules/prisma',
  'node_modules/typescript',
  'node_modules/@prisma/engines',
  'node_modules/@prisma/engines-version',
  'node_modules/@prisma/fetch-engine',
  'node_modules/@prisma/get-platform',
  'node_modules/.prisma/client/query_engine-windows.dll.node',
];

for (const relativeTarget of targets) {
  const target = path.resolve(buildRoot, relativeTarget);
  if (!target.startsWith(`${buildRoot}${path.sep}`)) {
    throw new Error(`Refusing to prune path outside build root: ${target}`);
  }
  fs.rmSync(target, { recursive: true, force: true });
}
