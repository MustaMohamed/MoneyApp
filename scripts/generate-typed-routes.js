// Generates `.expo/types/router.d.ts` so `tsc --noEmit` runs without the Expo dev server.

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const GENERATOR_PKG = '@expo/router-server';
const GENERATOR_SUBPATH = 'build/typed-routes/generate.js';

// Narrowest scope first, or a stray hoisted copy outranks the one `@expo/cli` depends on.
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
  // Resolve `package.json` and join the subpath; a deep specifier goes through the `exports` map.
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

  // Outside the try above: a module that resolves but throws while loading is a different failure.
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
