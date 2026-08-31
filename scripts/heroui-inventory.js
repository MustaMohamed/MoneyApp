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

const EXPORT_RE = /^export (?:default )?(?:function|const) ([A-Za-z][A-Za-z0-9_]*)/gm;
// SCREAMING_SNAKE means constant; a bare acronym like FAB is still a component.
const isConstant = (name) => /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/.test(name);
const isComponent = (name, file) =>
  file.endsWith('.tsx') && /^[A-Z]/.test(name) && !isConstant(name);

const wrapperComponents = [];
const helpers = [];

for (const file of fs.readdirSync(wrappersDir).sort()) {
  if (!file.endsWith('.tsx') && !file.endsWith('.ts')) continue;
  const source = fs.readFileSync(path.join(wrappersDir, file), 'utf8');
  for (const [, name] of source.matchAll(EXPORT_RE)) {
    (isComponent(name, file) ? wrapperComponents : helpers).push({ name, file });
  }
}

function printGroup(title, entries) {
  if (entries.length === 0) return;
  const width = Math.max(...entries.map((e) => e.name.length)) + 2;
  console.log(`\n${title}\n`);
  for (const { name, file } of entries) console.log(`  ${name.padEnd(width)} ${file}`);
}

printGroup(
  'Project components (src/components/ui) — check here before building anything new',
  wrapperComponents,
);
printGroup('Helpers and constants in the same folder', helpers);
console.log(`\n${wrapperComponents.length} project components, ${helpers.length} helpers`);
