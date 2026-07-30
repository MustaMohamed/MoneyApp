// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-argument, typescript/no-unsafe-return, typescript/no-unsafe-call, typescript/no-unsafe-member-access -- untyped Node.js maintenance script; syntax/runtime validation is performed by npm run validate:agent-assets
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const roots = ['.claude/agents', '.claude/skills', '.claude/rules']
  .map((dir) => path.join(root, dir))
  .filter((dir) => fs.existsSync(dir));

const rulesDir = path.join(root, '.claude/rules');

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

// A rules file with malformed `paths` frontmatter never loads — silently. Fail loud here instead.
function checkRulesFrontmatter(file, text) {
  if (!text.startsWith('---\n')) {
    errors.push(`${rel(file)}: rules file must start with --- frontmatter containing a paths list`);
    return;
  }
  const end = text.indexOf('\n---\n', 4);
  if (end === -1) {
    errors.push(`${rel(file)}: missing closing frontmatter marker`);
    return;
  }
  const yaml = text.slice(4, end);
  if (!/^paths:\s*$/m.test(yaml)) {
    errors.push(`${rel(file)}: missing "paths:" key in frontmatter`);
    return;
  }
  const globs = [...yaml.matchAll(/^\s+-\s+"([^"]*)"\s*$/gm)].map((m) => m[1]);
  if (globs.length === 0) {
    errors.push(`${rel(file)}: "paths:" has no quoted glob entries (expected: - "src/**")`);
    return;
  }
  for (const glob of globs) {
    if (glob.trim() === '') errors.push(`${rel(file)}: empty glob in paths`);
    if (/[\n\r\t{}\\]/.test(glob))
      errors.push(`${rel(file)}: suspicious characters in glob "${glob}"`);
    if (glob.startsWith('/'))
      errors.push(`${rel(file)}: glob "${glob}" must be repo-relative, not absolute`);
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

    if (file.endsWith('.md')) {
      if (file.startsWith(rulesDir + path.sep)) checkRulesFrontmatter(file, text);
      else checkFrontmatter(file, text);
    }
    if (/\.(js|cjs|mjs)$/.test(file)) runSyntax(file, 'node', ['--check', file]);
    if (file.endsWith('.sh')) runSyntax(file, 'bash', ['-n', file]);
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Agent assets validated (${roots.map(rel).join(', ')})`);
