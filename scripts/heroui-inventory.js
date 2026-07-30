/**
 * Prints what UI building blocks actually exist right now: the installed
 * heroui-native component catalog and the project's own wrappers.
 *
 * Exists so no document has to hand-maintain either list. A written catalog
 * goes stale on the next `npm i` and nobody notices; this cannot.
 *
 *   node scripts/heroui-inventory.js        # or: npm run ui:inventory
 */

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const componentsDir = path.join(root, 'node_modules/heroui-native/src/components');
const wrappersDir = path.join(root, 'src/components/ui');

function heroUiVersion() {
  try {
    return require(path.join(root, 'node_modules/heroui-native/package.json')).version;
  } catch {
    return null;
  }
}

const version = heroUiVersion();
if (!version) {
  console.error('heroui-native is not installed — run npm install first.');
  process.exit(1);
}

console.log(`heroui-native ${version} — installed components`);
console.log(`docs: node_modules/heroui-native/src/components/<name>/<name>.md\n`);

const components = fs
  .readdirSync(componentsDir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

const undocumented = components.filter(
  (name) => !fs.existsSync(path.join(componentsDir, name, `${name}.md`)),
);

console.log(components.join(' · '));
console.log(
  `\n${components.length} components${
    undocumented.length
      ? `, no local doc for: ${undocumented.join(', ')}`
      : ', all documented locally'
  }`,
);

// Project wrappers: the exported symbol is what a caller imports, so surface that
// rather than the filename.
const EXPORT_RE = /^export (?:default )?(?:function|const) ([A-Za-z][A-Za-z0-9_]*)/gm;

const wrappers = fs
  .readdirSync(wrappersDir)
  .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
  .sort()
  .map((file) => {
    const source = fs.readFileSync(path.join(wrappersDir, file), 'utf8');
    const names = [...source.matchAll(EXPORT_RE)].map((m) => m[1]);
    return { file, names };
  })
  .filter((w) => w.names.length > 0);

console.log(`\nProject wrappers (src/components/ui) — check here before building anything new\n`);
for (const { file, names } of wrappers) {
  console.log(`  ${names.join(', ').padEnd(34)} ${file}`);
}
console.log(`\n${wrappers.length} wrapper files`);
