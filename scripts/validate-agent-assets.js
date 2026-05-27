// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-argument, typescript/no-unsafe-return, typescript/no-unsafe-call, typescript/no-unsafe-member-access -- untyped Node.js maintenance script; syntax/runtime validation is performed by npm run validate:agent-assets
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const roots = ['.agents', '.claude/agents', '.codex/agents']
  .map((dir) => path.join(root, dir))
  .filter((dir) => fs.existsSync(dir));

const errors = [];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

function rel(file) {
  return path.relative(root, file);
}

function checkFrontmatter(file, text) {
  if (!text.startsWith('---\n')) return;
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    errors.push(`${rel(file)}: missing closing frontmatter marker`);
    return;
  }
  const yaml = text.slice(4, end);
  for (const key of ['name', 'description']) {
    if (!new RegExp(`^${key}:`, 'm').test(yaml)) {
      errors.push(`${rel(file)}: missing ${key} in frontmatter`);
    }
  }
}

function checkToml(file, text) {
  for (const key of ['name', 'description']) {
    if (!new RegExp(`^${key} = ".*"$`, 'm').test(text)) {
      errors.push(`${rel(file)}: missing or non-string ${key}`);
    }
  }
  if (!/^developer_instructions = """[\s\S]*"""/m.test(text)) {
    errors.push(`${rel(file)}: missing developer_instructions block`);
  }
}

function runSyntax(file, cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    errors.push(`${rel(file)}: ${cmd} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
}

for (const dir of roots) {
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, 'utf8');
    const relative = rel(file);

    if (/[ \t]$/m.test(text)) errors.push(`${relative}: trailing whitespace`);
    if (text.length > 0 && !text.endsWith('\n')) errors.push(`${relative}: missing final newline`);

    if (file.endsWith('.md')) checkFrontmatter(file, text);
    if (file.endsWith('.toml')) checkToml(file, text);
    if (/\.(js|cjs|mjs)$/.test(file)) runSyntax(file, 'node', ['--check', file]);
    if (file.endsWith('.sh')) runSyntax(file, 'bash', ['-n', file]);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Agent assets validated (${roots.map(rel).join(', ')})`);
