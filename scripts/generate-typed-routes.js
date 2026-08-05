/**
 * Generates .expo/types/router.d.ts from the src/app/ directory so tsc --noEmit
 * works without needing to start the Expo dev server first.
 *
 * Called by the "typecheck" npm script. The generated file is gitignored.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const GENERATOR = '@expo/router-server/build/typed-routes/generate.js';

/**
 * `expo` is a direct dependency, but `@expo/cli` and `@expo/router-server` are
 * transitive — so npm is free to hoist them to the root or nest them under either
 * parent, and it has done both across SDK versions. This used to be a hardcoded
 * `../node_modules/expo/node_modules/@expo/cli/node_modules/@expo/...` path, which
 * survived two SDK majors on luck alone. When that kind of path does break it takes
 * `npm run typecheck` down with it — the script runs before `tsc` — and reports a
 * bare MODULE_NOT_FOUND naming a path nobody wrote deliberately.
 *
 * Resolve instead of traverse: ask Node to search from the root and from each
 * parent package's own directory, so any hoisted-or-nested arrangement works.
 */
function generatorSearchPaths() {
  const paths = [root];

  let expoDir;
  try {
    expoDir = path.dirname(require.resolve('expo/package.json', { paths: [root] }));
  } catch {
    return paths;
  }
  paths.push(expoDir);

  try {
    paths.push(path.dirname(require.resolve('@expo/cli/package.json', { paths: [expoDir] })));
  } catch {
    // @expo/cli is transitive and may sit anywhere; the root and expo entries still apply.
  }

  return paths;
}

function loadTypedRoutesGenerator() {
  try {
    return require(require.resolve(GENERATOR, { paths: generatorSearchPaths() }));
  } catch (error) {
    throw new Error(
      `Could not resolve ${GENERATOR}. It ships inside @expo/cli (via the expo ` +
        `package), so this usually means dependencies are not installed or are ` +
        `stale — try 'npm ci'. If it moved in a newer SDK, update GENERATOR in ` +
        `scripts/generate-typed-routes.js.\nUnderlying error: ${error.message}`,
      { cause: error },
    );
  }
}

const { getTypedRoutesDeclarationFile } = loadTypedRoutesGenerator();
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
