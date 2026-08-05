/**
 * Generates .expo/types/router.d.ts from the src/app/ directory so tsc --noEmit
 * works without needing to start the Expo dev server first.
 *
 * Called by the "typecheck" npm script. The generated file is gitignored.
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const GENERATOR_PKG = '@expo/router-server';
const GENERATOR_SUBPATH = 'build/typed-routes/generate.js';

/**
 * `expo` is a direct dependency, but `@expo/cli` and `@expo/router-server` are
 * transitive — nothing pins where npm puts them, so it is free to hoist them to the
 * root or nest them under either parent. This used to be a hardcoded
 * `../node_modules/expo/node_modules/@expo/cli/node_modules/@expo/...` path, which
 * encoded one particular arrangement as if it were guaranteed. When that kind of
 * path breaks it takes `npm run typecheck` with it — this script runs before `tsc` —
 * and reports a bare MODULE_NOT_FOUND naming a path nobody wrote deliberately.
 *
 * Most-specific first. Each entry gets a full `node_modules` walk-up, so `root`
 * alone would also find a nested copy — but it reaches every ancestor directory and
 * Node's global folders first, meaning a stray hoisted copy elsewhere on the machine
 * would outrank the one `@expo/cli` actually depends on, and quietly generate types
 * from it. Ordering the narrowest scope first makes the right copy win by
 * construction; `cliDir`'s walk-up is a superset of the other two anyway.
 */
function generatorSearchPaths() {
  let expoDir;
  try {
    expoDir = path.dirname(require.resolve('expo/package.json', { paths: [root] }));
  } catch {
    return [root];
  }

  try {
    const cliDir = path.dirname(require.resolve('@expo/cli/package.json', { paths: [expoDir] }));
    return [cliDir, expoDir, root];
  } catch {
    // @expo/cli is transitive and may sit anywhere; the expo and root entries still apply.
    return [expoDir, root];
  }
}

function loadTypedRoutesGenerator() {
  // Resolve package.json and join the subpath, rather than resolving the deep path
  // directly. A bare deep specifier goes through the package's `exports` map, which
  // the old literal path bypassed entirely — @expo/router-server has no `exports`
  // today, but @expo/cli gained one between SDK 55 and 57, so it is a live direction
  // of travel. A package that adds `exports` almost always keeps `./package.json`
  // while dropping deep `./build/*` paths, which is exactly the case this survives.
  let generatorPath;
  try {
    const pkgJson = require.resolve(`${GENERATOR_PKG}/package.json`, {
      paths: generatorSearchPaths(),
    });
    generatorPath = path.join(path.dirname(pkgJson), GENERATOR_SUBPATH);
  } catch (error) {
    throw new Error(
      `Could not resolve ${GENERATOR_PKG}. It ships inside @expo/cli (via the expo ` +
        `package), so this usually means dependencies are not installed or are ` +
        `stale — try 'npm ci'.\nUnderlying error: ${error.message}`,
      { cause: error },
    );
  }

  // Deliberately outside the try above: a module that resolves but throws while
  // loading is a different failure, and blaming resolution for it sends the reader
  // hunting in the wrong place.
  return require(generatorPath);
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
