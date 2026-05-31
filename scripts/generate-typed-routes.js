/**
 * Generates .expo/types/router.d.ts from the src/app/ directory so tsc --noEmit
 * works without needing to start the Expo dev server first.
 *
 * Called by the "typecheck" npm script. The generated file is gitignored.
 */

const {
  getTypedRoutesDeclarationFile,
} = require('../node_modules/expo/node_modules/@expo/cli/node_modules/@expo/router-server/build/typed-routes/generate.js');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const appDir = path.join(root, 'src', 'app');
const outFile = path.join(root, '.expo/types/router.d.ts');

function collectRouteFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectRouteFiles(fullPath));
    } else if (/^(index|_layout)\.[jt]sx?$/.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
}

const relFiles = collectRouteFiles(appDir).map((f) => './' + path.relative(appDir, f));

function ctx(_key) {
  return {};
}
ctx.keys = () => relFiles;
ctx.resolve = (key) => path.join(appDir, key);
ctx.id = appDir;

const declaration = getTypedRoutesDeclarationFile(ctx);

fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, declaration);
