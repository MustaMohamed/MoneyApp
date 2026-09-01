// oxlint-disable typescript/no-unsafe-assignment, typescript/no-unsafe-argument, typescript/no-unsafe-return, typescript/no-unsafe-call, typescript/no-unsafe-member-access -- untyped Node.js maintenance script; syntax/runtime validation is performed by npm run validate:agent-assets
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const roots = ['.claude/agents', '.claude/skills', '.claude/rules', '.claude/commands']
  .map((dir) => path.join(root, dir))
  .filter((dir) => fs.existsSync(dir));

const rulesDir = path.join(root, '.claude/rules');
const commandsDir = path.join(root, '.claude/commands');
const agentsDir = path.join(root, '.claude/agents');

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

// A rules file with malformed `paths` frontmatter never loads, silently, so fail loud here.
function checkRulesFrontmatter(file, text, trackedFiles) {
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
  checkGlobsMatchFiles(file, globs, trackedFiles);
}

// An agent told to run a command it has no Bash tool for fails silently and improvises instead.
const SHELL_CMD = /`((?:npm|npx|node|git|bash|ls|cat|grep) [^`]+)`/g;

function checkAgentToolsMatchProse(file, text) {
  const end = text.startsWith('---\n') ? text.indexOf('\n---\n', 4) : -1;
  if (end === -1) return;
  const tools = /^tools:(.*)$/m.exec(text.slice(4, end))?.[1] ?? '';
  if (/\bBash\b/.test(tools)) return;
  const commands = [...text.slice(end).matchAll(SHELL_CMD)].map((m) => m[1]);
  for (const command of new Set(commands)) {
    errors.push(`${rel(file)}: instructs \`${command}\` but has no Bash tool`);
  }
}

// Slash commands carry a description but no name; the filename is the command.
function checkCommandFrontmatter(file, text) {
  if (!text.startsWith('---\n') || text.indexOf('\n---\n', 4) === -1) {
    errors.push(`${rel(file)}: command must start with --- frontmatter containing a description`);
    return;
  }
  const yaml = text.slice(4, text.indexOf('\n---\n', 4));
  if (!/^description:\s*\S/m.test(yaml)) {
    errors.push(`${rel(file)}: missing description in frontmatter`);
  }
}

// The lookbehind stops URL segments and prose like "loads/scripts/paints" reading as repo paths.
// The second alternative admits relative citations like `](../../docs/x.md)` the first would eat.
const PATH_REF =
  /(?:(?<![A-Za-z0-9_./-])|(?<=[^A-Za-z0-9_-](?:\.{1,2}\/){1,4}))\b(?:src|__tests__|scripts|docs|node_modules|\.claude|\.github)\/[A-Za-z0-9_./@*<>{}[\]-]*[A-Za-z0-9_/]/g;

// `@/x` resolves to `src/x`, with or without an extension, or as a directory index.
const ALIAS_REF = /@\/[A-Za-z0-9_/.]+/g;
const ALIAS_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function isPlaceholder(p) {
  return /[*<>{}[\]]/.test(p) || p.includes('...') || p.includes('YYYY');
}

// Code fences are not skipped: CLAUDE.md's fenced structure tree is exactly what must be checked.
function checkPathRefs(file, text) {
  for (const alias of new Set(text.match(ALIAS_REF) ?? [])) {
    if (isPlaceholder(alias)) continue;
    const base = path.join(root, 'src', alias.slice(2));
    if (!ALIAS_SUFFIXES.some((suffix) => fs.existsSync(base + suffix))) {
      errors.push(`${rel(file)}: references "${alias}" which does not resolve under src/`);
    }
  }
  for (const match of new Set(text.match(PATH_REF) ?? [])) {
    if (isPlaceholder(match)) continue;
    if (!fs.existsSync(path.join(root, match))) {
      errors.push(`${rel(file)}: references "${match}" which does not exist`);
    }
  }
}

// A `paths:` glob that matches nothing is a rule that silently never loads.
function globToRegExp(glob) {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        out += glob[i + 2] === '/' ? '(?:.*/)?' : '.*';
        i += glob[i + 2] === '/' ? 2 : 1;
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') out += '[^/]';
    else out += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${out}$`);
}

function checkGlobsMatchFiles(file, globs, trackedFiles) {
  for (const glob of globs) {
    const re = globToRegExp(glob);
    if (!trackedFiles.some((f) => re.test(f))) {
      errors.push(
        `${rel(file)}: glob "${glob}" matches no tracked file — the rule will never load`,
      );
    }
  }
}

function runSyntax(file, cmd, args) {
  const result = spawnSync(cmd, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) {
    errors.push(`${rel(file)}: ${cmd} ${args.join(' ')} failed\n${result.stderr || result.stdout}`);
  }
}

const trackedFiles = spawnSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' })
  .stdout.split('\n')
  .filter(Boolean);

for (const dir of roots) {
  for (const file of walk(dir)) {
    const text = fs.readFileSync(file, 'utf8');
    const relative = rel(file);

    if (/[ \t]$/m.test(text)) errors.push(`${relative}: trailing whitespace`);
    if (text.length > 0 && !text.endsWith('\n')) errors.push(`${relative}: missing final newline`);

    if (file.endsWith('.md')) {
      if (file.startsWith(agentsDir + path.sep)) checkAgentToolsMatchProse(file, text);
      if (file.startsWith(rulesDir + path.sep)) checkRulesFrontmatter(file, text, trackedFiles);
      else if (file.startsWith(commandsDir + path.sep)) checkCommandFrontmatter(file, text);
      else checkFrontmatter(file, text);
      checkPathRefs(file, text);
    }
    if (/\.(js|cjs|mjs)$/.test(file)) runSyntax(file, 'node', ['--check', file]);
    if (file.endsWith('.sh')) runSyntax(file, 'bash', ['-n', file]);
  }
}

const claudeMd = path.join(root, 'CLAUDE.md');
if (fs.existsSync(claudeMd)) checkPathRefs(claudeMd, fs.readFileSync(claudeMd, 'utf8'));

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Agent assets validated (${roots.map(rel).join(', ')}, CLAUDE.md)`);
