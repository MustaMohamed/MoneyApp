# Harness Phase 1: Canonical Policy and Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a dependency-free harness generator and validator that makes one canonical MoneyApp policy produce consistent Codex and Claude adapters and enforces the repository's six-check publish-readiness contract.

**Architecture:** Human-maintained Markdown modules, persona sections, adapter templates, semantic rules, and a JSON manifest live under `harness/`. Small CommonJS modules under `scripts/harness/` validate paths, render registered targets, compare generated output, check repository facts, and execute the verification registry. Generated files remain tool-specific views; they never become sources.

**Tech Stack:** Node.js 20 CommonJS, `node:test`, npm scripts, Git/Husky, lint-staged, GitHub Actions, Markdown, JSON, TOML

**Status:** Approved by Sarah

---

## Signed Inputs and Boundaries

- Approved specification: `docs/superpowers/specs/2026-07-24-harness-canonical-policy-validation-design.md`
- Execution branch: create a child implementation branch in an isolated worktree from `refactor/project-harness-automation`.
- Supported agent surfaces: Codex and Claude.
- No new npm dependency, native module, application source change, workflow-state engine, task dispatcher, PR automation, QA automation, session cleanup, or destructive worktree cleanup.
- Preserve `docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md`; it is unrelated user-owned work.

## Execution Context Budget

- Sarah dispatches one numbered task at a time; a worker receives the approved spec, this plan's file map, and only its assigned task section.
- Workers do not inherit archived MoneyApp task history or unrelated task transcripts.
- Each task ends in focused verification and one commit before the next task begins.
- Shared-file tasks remain sequential. No two workers edit `harness/manifest.json`, generated adapters, `package.json`, or hooks concurrently.
- If a task grows beyond its listed files or decisions, stop and return it to Sarah/Tariq for plan amendment instead of expanding the worker context.

## File Responsibility Map

### Canonical inputs

- `harness/manifest.json` — versioned registry of policy order, personas, generated targets, semantic rules, and verification checks.
- `harness/policy/authority.md` — branch rules, human repository authority, team laws, and critical triggers.
- `harness/policy/workflow.md` — superpowers phase mapping and user-facing gates.
- `harness/policy/stack.md` — current Expo/React Native dependencies and explicit Signals rollback.
- `harness/policy/architecture.md` — project structure, route rules, state shape, database rules, and conventions.
- `harness/policy/ui.md` — HeroUI, styling, screen layout, bottom-sheet, theme, and patch rules.
- `harness/policy/verification.md` — commands, development-client loop, and publish-readiness contract.
- `harness/personas/{sarah,marcus,layla,tariq,dev}.md` — each persona's dispatched and inline sections.
- `harness/templates/agents.md` — Codex root policy layout.
- `harness/templates/claude.md` — Claude root policy layout.
- `harness/templates/codex_agent.toml` — Codex dispatched-persona serialization.
- `harness/templates/claude_agent.md` — Claude dispatched-persona serialization.
- `harness/templates/expert_panel.md` — shared inline-persona skill.
- `harness/templates/claude_feature_command.md` — Claude feature-flow command.
- `harness/templates/claude_status_command.md` — Claude workflow-status command.
- `harness/rules/semantics.json` — required and forbidden live-policy claims.
- `harness/fixtures/invalid/*.json` and `harness/fixtures/valid/*.json` — regression cases.

### Runtime and tests

- `scripts/harness/lib/paths.js` — repository-bounded path resolution and atomic writes.
- `scripts/harness/lib/manifest.js` — manifest loading and structural validation.
- `scripts/harness/lib/render.js` — variables, includes, persona sections, and target rendering.
- `scripts/harness/lib/structure.js` — registered-file, persona-surface, output-format, provenance, and orphan-output validation.
- `scripts/harness/lib/semantics.js` — scoped required/forbidden rule evaluation.
- `scripts/harness/lib/repository_facts.js` — dependency, source, path, CI, and hook checks.
- `scripts/harness/lib/verification.js` — ordered execution of registered publish-readiness checks.
- `scripts/harness/generate.js` — write-mode CLI.
- `scripts/harness/check.js` — read-only parity and semantic CLI.
- `scripts/harness/verify_pr.js` — six-check local verification CLI.
- `scripts/harness/__tests__/*.test.js` — built-in Node test-runner coverage.

### Existing integration surfaces

- `AGENTS.md`, `CLAUDE.md` — generated root policies.
- `.codex/agents/*.toml`, `.claude/agents/*.md` — generated dispatched personas.
- `.agents/skills/moneyapp-expert-panel/SKILL.md`, `.claude/skills/moneyapp-expert-panel/SKILL.md` — identical generated inline panel.
- `.claude/commands/feature.md`, `.claude/commands/status.md` — generated workflow commands.
- `package.json` — harness, harness-test, and verification scripts.
- `scripts/validate-agent-assets.js` — retains generic syntax validation and delegates MoneyApp semantic consistency to the new checker.
- `lint-staged.config.mjs` — ordered formatting/linting followed by harness parity for relevant staged paths.
- `.husky/pre-push` — calls only `npm run verify:pr`.
- `.github/workflows/pr-checks.yml` — runs harness validation through lint and retains six separate observable jobs.
- `docs/superpowers/reviews/2026-07-24-harness-phase-1-baseline.md` — before/after evidence.

## Execution Preflight

- [ ] **Step 1: Verify the signed inputs exist in the base commit**

Run:

```bash
git status --short --branch
git rev-parse refactor/project-harness-automation
git cat-file -e refactor/project-harness-automation:docs/superpowers/specs/2026-07-24-harness-canonical-policy-validation-design.md
git cat-file -e refactor/project-harness-automation:docs/superpowers/plans/2026-07-24-harness-canonical-policy-validation.md
git show refactor/project-harness-automation:docs/superpowers/specs/2026-07-24-harness-canonical-policy-validation-design.md | rg 'Status: Approved'
git show refactor/project-harness-automation:docs/superpowers/plans/2026-07-24-harness-canonical-policy-validation.md | rg 'Status: Approved by Sarah'
```

Expected: all commands exit 0. Stop before creating a worktree if either signed artifact is absent from the base commit. The unrelated untracked July 23 audit remains in the main checkout and is not staged, copied, or removed.

- [ ] **Step 2: Create an isolated execution worktree**

Use `superpowers:using-git-worktrees`. Create `.worktrees/harness-phase-1` on a new branch named `refactor/harness-phase-1-implementation`, based on the verified `refactor/project-harness-automation` commit.

Expected: the new worktree is on `refactor/harness-phase-1-implementation`; both signed artifacts are readable there; the main checkout, its unrelated untracked audit, and existing auxiliary worktrees are unchanged.

- [ ] **Step 3: Capture the current harness baseline**

Run:

```bash
git ls-files AGENTS.md CLAUDE.md .agents .claude .codex | wc -l
wc -l AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md \
  .claude/commands/*.md
moneyapp_skill_diff_count=0
while IFS= read -r moneyapp_skill_file; do
  moneyapp_skill_peer=".claude/${moneyapp_skill_file#.agents/}"
  if test -f "$moneyapp_skill_peer" && ! cmp -s "$moneyapp_skill_file" "$moneyapp_skill_peer"; then
    moneyapp_skill_diff_count=$((moneyapp_skill_diff_count + 1))
  fi
done < <(git ls-files '.agents/skills/**/SKILL.md')
echo "shared_skill_differences=$moneyapp_skill_diff_count"
rg -n 'signals-react|Babel signals transform is installed|approve and merge|Gate 1|Gate 2' \
  AGENTS.md CLAUDE.md .agents .claude .codex
```

Expected: the command exposes current duplication and stale live claims. Record its exact counts and matches in Task 9; do not edit the existing untracked quality audit.

- [ ] **Step 4: Commit the measured before-state report**

Create `docs/superpowers/reviews/2026-07-24-harness-phase-1-baseline.md` from the exact Step 3 output. Include the base commit SHA, each command, its raw count, and every matching live path. Do not copy the previously observed values `120` or `17` unless the new commands independently produce them.

```bash
git add docs/superpowers/reviews/2026-07-24-harness-phase-1-baseline.md
git commit -m "docs: capture harness phase 1 baseline"
```

### Task 1: Add the bounded manifest model

**Files:**

- Create: `harness/manifest.json`
- Create: `harness/rules/semantics.json`
- Create: `scripts/harness/lib/paths.js`
- Create: `scripts/harness/lib/manifest.js`
- Create: `scripts/harness/__tests__/manifest.test.js`
- Modify: `package.json`

- [ ] **Step 1: Register the built-in test command**

Add this script to `package.json` without changing dependencies:

```json
"harness:test": "node --test scripts/harness/__tests__/*.test.js"
```

- [ ] **Step 2: Write failing manifest safety tests**

Create `scripts/harness/__tests__/manifest.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { assertSafeRelativePath } = require('../lib/paths');
const { loadManifest, validateManifest } = require('../lib/manifest');

test('accepts a unique repository-relative target', () => {
  assert.doesNotThrow(() =>
    validateManifest({
      version: 1,
      targets: [
        {
          id: 'root-agents',
          path: 'AGENTS.md',
          template: 'harness/templates/agents.md',
          sources: ['harness/policy/authority.md'],
        },
      ],
      personas: [],
      verification: { checks: [] },
    }),
  );
});

test('rejects parent traversal and absolute paths', () => {
  for (const value of ['../AGENTS.md', '/tmp/AGENTS.md']) {
    assert.throws(() => assertSafeRelativePath(value), /repository-relative/);
  }
});

test('rejects duplicate target ids and paths', () => {
  const target = {
    id: 'root-agents',
    path: 'AGENTS.md',
    template: 'harness/templates/agents.md',
    sources: [],
  };
  assert.throws(
    () =>
      validateManifest({
        version: 1,
        targets: [target, { ...target }],
        personas: [],
        verification: { checks: [] },
      }),
    /duplicate target/,
  );
});

test('rejects a source repeated within one target', () => {
  assert.throws(
    () =>
      validateManifest({
        version: 1,
        targets: [
          {
            id: 'root-agents',
            path: 'AGENTS.md',
            template: 'harness/templates/agents.md',
            sources: ['harness/policy/authority.md', 'harness/policy/authority.md'],
          },
        ],
        personas: [],
        verification: { checks: [] },
      }),
    /duplicate source/,
  );
});

test('load rejects missing registered rules, templates, and sources', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-manifest-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(
    path.join(root, 'harness/manifest.json'),
    JSON.stringify({
      version: 1,
      rules: 'harness/rules/missing.json',
      targets: [],
      personas: [],
      verification: { checks: [] },
    }),
  );
  assert.throws(() => loadManifest(root), /missing registered input/);
});
```

- [ ] **Step 3: Run the tests to verify the missing modules fail**

Run:

```bash
npm run harness:test
```

Expected: FAIL with `Cannot find module '../lib/paths'`.

- [ ] **Step 4: Implement repository-bounded paths**

Create `scripts/harness/lib/paths.js`:

```js
const fs = require('node:fs');
const path = require('node:path');

function assertSafeRelativePath(value) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    path.isAbsolute(value) ||
    value.split(/[\\/]/).includes('..')
  ) {
    throw new Error(`Path must be repository-relative: ${String(value)}`);
  }
  return value;
}

function resolveInside(root, relativePath) {
  assertSafeRelativePath(relativePath);
  const resolvedRoot = path.resolve(root);
  const resolved = path.resolve(resolvedRoot, relativePath);
  if (resolved !== resolvedRoot && !resolved.startsWith(`${resolvedRoot}${path.sep}`)) {
    throw new Error(`Path escapes repository: ${relativePath}`);
  }
  return resolved;
}

function writeFileAtomic(root, relativePath, content) {
  const target = resolveInside(root, relativePath);
  const temp = `${target}.harness-${process.pid}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  try {
    fs.writeFileSync(temp, content, 'utf8');
    fs.renameSync(temp, target);
  } finally {
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

module.exports = { assertSafeRelativePath, resolveInside, writeFileAtomic };
```

- [ ] **Step 5: Implement manifest validation**

Create `scripts/harness/lib/manifest.js`:

```js
const fs = require('node:fs');
const { assertSafeRelativePath, resolveInside } = require('./paths');

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
}

function validateManifest(manifest) {
  if (manifest.version !== 1) throw new Error('manifest version must be 1');
  requireArray(manifest.targets, 'targets');
  requireArray(manifest.personas, 'personas');
  requireArray(manifest.verification?.checks, 'verification.checks');

  const ids = new Set();
  const paths = new Set();
  for (const target of manifest.targets) {
    assertSafeRelativePath(target.path);
    assertSafeRelativePath(target.template);
    requireArray(target.sources, `${target.id}.sources`);
    for (const source of target.sources) assertSafeRelativePath(source);
    if (new Set(target.sources).size !== target.sources.length) {
      throw new Error(`${target.id}: duplicate source`);
    }
    if (ids.has(target.id) || paths.has(target.path)) {
      throw new Error(`duplicate target: ${target.id} (${target.path})`);
    }
    ids.add(target.id);
    paths.add(target.path);
  }

  const personaIds = new Set();
  for (const persona of manifest.personas) {
    assertSafeRelativePath(persona.source);
    if (personaIds.has(persona.id)) {
      throw new Error(`duplicate persona: ${persona.id}`);
    }
    for (const key of ['id', 'description', 'claudeTools', 'claudeModel']) {
      if (typeof persona[key] !== 'string' || persona[key].length === 0) {
        throw new Error(`persona ${persona.id || '<unknown>'} missing ${key}`);
      }
    }
    personaIds.add(persona.id);
  }
  return manifest;
}

function loadManifest(root) {
  const path = resolveInside(root, 'harness/manifest.json');
  const manifest = validateManifest(JSON.parse(fs.readFileSync(path, 'utf8')));
  const registeredInputs = [
    manifest.rules,
    ...manifest.targets.flatMap((target) => [target.template, ...target.sources]),
    ...manifest.personas.map((persona) => persona.source),
  ];
  for (const input of registeredInputs) {
    if (!fs.existsSync(resolveInside(root, input))) {
      throw new Error(`missing registered input: ${input}`);
    }
  }
  return manifest;
}

module.exports = { loadManifest, validateManifest };
```

- [ ] **Step 6: Add the initial manifest**

Create `harness/manifest.json` with an empty target list that later tasks populate:

```json
{
  "version": 1,
  "generatedNotice": "GENERATED BY npm run harness:generate. EDIT harness/ SOURCES, NOT THIS FILE.",
  "policyOrder": [
    "harness/policy/authority.md",
    "harness/policy/workflow.md",
    "harness/policy/stack.md",
    "harness/policy/architecture.md",
    "harness/policy/ui.md",
    "harness/policy/verification.md"
  ],
  "personas": [],
  "targets": [],
  "rules": "harness/rules/semantics.json",
  "verification": {
    "checks": []
  }
}
```

Create `harness/rules/semantics.json` so the manifest has no dangling input:

```json
{
  "rules": []
}
```

- [ ] **Step 7: Run focused tests**

Run:

```bash
npm run harness:test
```

Expected: PASS for all three manifest tests.

- [ ] **Step 8: Commit the manifest foundation**

```bash
git add package.json harness/manifest.json harness/rules/semantics.json scripts/harness/lib/paths.js \
  scripts/harness/lib/manifest.js scripts/harness/__tests__/manifest.test.js
git commit -m "test: add bounded harness manifest model"
```

### Task 2: Build deterministic target rendering

**Files:**

- Create: `scripts/harness/lib/render.js`
- Create: `scripts/harness/generate.js`
- Create: `scripts/harness/__tests__/render.test.js`
- Modify: `package.json`

- [ ] **Step 1: Write failing rendering and section tests**

Create `scripts/harness/__tests__/render.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { extractSection, renderTarget } = require('../lib/render');

test('extracts one named persona section', () => {
  const source = [
    '# Dev',
    '<!-- harness:section agent -->',
    'Agent body.',
    '<!-- harness:endsection -->',
    '<!-- harness:section inline -->',
    'Inline body.',
    '<!-- harness:endsection -->',
    '',
  ].join('\n');
  assert.equal(extractSection(source, 'inline'), 'Inline body.\n');
});

test('renders declared includes and escaped JSON variables', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/source.md'), 'Policy body.\\n');
  fs.writeFileSync(
    path.join(root, 'harness/template.md'),
    '{{raw:notice}}\\n{{json:description}}\\n{{include:harness/source.md}}',
  );

  const output = renderTarget(root, 'NOTICE', {
    id: 'target',
    template: 'harness/template.md',
    sources: ['harness/source.md'],
    variables: { description: 'A "quoted" description' },
  });

  assert.equal(output, 'NOTICE\\n"A \\\\"quoted\\\\" description"\\nPolicy body.\\n');
});

test('rejects undeclared includes and unresolved placeholders', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{include:harness/secret.md}}');
  fs.writeFileSync(path.join(root, 'harness/secret.md'), 'secret');

  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'target',
        template: 'harness/template.md',
        sources: [],
        variables: {},
      }),
    /undeclared include/,
  );
});

test('rejects repeated canonical includes in one target', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/source.md'), 'Policy.\\n');
  fs.writeFileSync(
    path.join(root, 'harness/template.md'),
    '{{include:harness/source.md}}{{include:harness/source.md}}',
  );
  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'duplicate',
        template: 'harness/template.md',
        sources: ['harness/source.md'],
        variables: {},
      }),
    /duplicate include/,
  );
});

test('rejects unsupported placeholder modes', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-'));
  fs.mkdirSync(path.join(root, 'harness'), { recursive: true });
  fs.writeFileSync(path.join(root, 'harness/template.md'), '{{yaml:description}}');
  assert.throws(
    () =>
      renderTarget(root, 'NOTICE', {
        id: 'unsupported',
        template: 'harness/template.md',
        sources: [],
        variables: { description: 'value' },
      }),
    /unresolved placeholder/,
  );
});
```

- [ ] **Step 2: Run the rendering tests to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/render.test.js
```

Expected: FAIL with `Cannot find module '../lib/render'`.

- [ ] **Step 3: Implement exact section and template rendering**

Create `scripts/harness/lib/render.js`:

```js
const fs = require('node:fs');
const { resolveInside } = require('./paths');

const SECTION_START = (name) => `<!-- harness:section ${name} -->`;
const SECTION_END = '<!-- harness:endsection -->';

function extractSection(text, name) {
  const startToken = SECTION_START(name);
  const start = text.indexOf(startToken);
  if (start === -1) throw new Error(`missing section: ${name}`);
  const contentStart = start + startToken.length;
  const end = text.indexOf(SECTION_END, contentStart);
  if (end === -1) throw new Error(`missing end section: ${name}`);
  return `${text.slice(contentStart, end).trim()}\n`;
}

function read(root, relativePath) {
  return fs.readFileSync(resolveInside(root, relativePath), 'utf8');
}

function renderTarget(root, notice, target) {
  const declared = new Set(target.sources);
  const included = new Set();
  const variables = { notice, ...(target.variables || {}) };
  let output = read(root, target.template);

  output = output.replace(
    /{{include:([^#}]+)(?:#([^}]+))?}}/g,
    (_match, sourcePath, section) => {
      if (!declared.has(sourcePath)) {
        throw new Error(`${target.id}: undeclared include ${sourcePath}`);
      }
      if (included.has(sourcePath)) {
        throw new Error(`${target.id}: duplicate include ${sourcePath}`);
      }
      included.add(sourcePath);
      const text = read(root, sourcePath);
      return section ? extractSection(text, section) : text;
    },
  );

  output = output.replace(/{{(raw|json):([^}]+)}}/g, (_match, mode, key) => {
    if (!Object.hasOwn(variables, key)) {
      throw new Error(`${target.id}: missing variable ${key}`);
    }
    const value = String(variables[key]);
    return mode === 'json' ? JSON.stringify(value) : value;
  });

  if (/{{[^}]+}}/.test(output)) {
    throw new Error(`${target.id}: unresolved placeholder`);
  }
  return output.endsWith('\n') ? output : `${output}\n`;
}

function renderAll(root, manifest) {
  return new Map(
    manifest.targets.map((target) => [
      target.path,
      renderTarget(root, manifest.generatedNotice, target),
    ]),
  );
}

module.exports = { extractSection, renderAll, renderTarget };
```

- [ ] **Step 4: Implement the write-only generator CLI**

Create `scripts/harness/generate.js`:

```js
#!/usr/bin/env node
const path = require('node:path');
const { loadManifest } = require('./lib/manifest');
const { renderAll } = require('./lib/render');
const { writeFileAtomic } = require('./lib/paths');

const root = path.resolve(__dirname, '../..');
const manifest = loadManifest(root);
const rendered = renderAll(root, manifest);

for (const [target, content] of rendered) {
  writeFileAtomic(root, target, content);
}

console.log(`Generated ${rendered.size} harness targets`);
```

Add to `package.json`:

```json
"harness:generate": "node scripts/harness/generate.js"
```

- [ ] **Step 5: Run tests and two empty-manifest generations**

Run:

```bash
npm run harness:test
npm run harness:generate
npm run harness:generate
git status --short
```

Expected: tests PASS; each generation reports `Generated 0 harness targets`; the second generation adds no diff.

- [ ] **Step 6: Commit the renderer**

```bash
git add package.json scripts/harness/generate.js scripts/harness/lib/render.js \
  scripts/harness/__tests__/render.test.js
git commit -m "feat: add deterministic harness renderer"
```

### Task 3: Add semantic and repository-fact validation

**Files:**

- Modify: `harness/rules/semantics.json`
- Create: `harness/fixtures/invalid/semantic_cases.json`
- Create: `harness/fixtures/invalid/structure_cases.json`
- Create: `harness/fixtures/valid/minimal.json`
- Create: `scripts/harness/lib/structure.js`
- Create: `scripts/harness/lib/semantics.js`
- Create: `scripts/harness/lib/repository_facts.js`
- Create: `scripts/harness/check.js`
- Create: `scripts/harness/__tests__/semantics.test.js`
- Create: `scripts/harness/__tests__/structure.test.js`
- Create: `scripts/harness/__tests__/repository_facts.test.js`
- Modify: `package.json`

- [ ] **Step 1: Define the semantic rule schema**

Create `harness/rules/semantics.json`:

```json
{
  "rules": [
    {
      "id": "AUTH-USER-INTEGRATION",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/*.toml",
        ".claude/agents/*.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/commands/*.md"
      ],
      "require": ["explicit user request"],
      "forbid": [
        "approve and merge",
        "approves and merges",
        "approves & merges",
        "merge code reviews on the user's behalf",
        "merges code reviews on the user's behalf"
      ]
    },
    {
      "id": "GATE-SPEC-SIGNOFF",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/sarah.toml",
        ".claude/agents/sarah.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/commands/feature.md"
      ],
      "require": ["Spec sign-off"],
      "forbid": ["Gate 1 (plan approval)"]
    },
    {
      "id": "GATE-DEVICE-QA",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/sarah.toml",
        ".claude/agents/sarah.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/commands/feature.md"
      ],
      "require": ["Device QA"],
      "forbid": ["Gate 2 (code review)"]
    },
    {
      "id": "GATE-CRITICAL-TRIGGER",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/*.toml",
        ".claude/agents/*.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/commands/feature.md"
      ],
      "require": ["critical trigger"],
      "forbid": []
    },
    {
      "id": "LEAD-PLAN-APPROVAL",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/sarah.toml",
        ".claude/agents/sarah.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md"
      ],
      "require": ["Sarah approves plans"],
      "forbid": []
    },
    {
      "id": "LEAD-REVIEW-VERDICT",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/tariq.toml",
        ".claude/agents/tariq.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md"
      ],
      "require": ["merge recommendation"],
      "forbid": ["Tariq merges", "Tariq approves and merges"]
    },
    {
      "id": "STACK-ZUSTAND",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/dev.toml",
        ".codex/agents/tariq.toml",
        ".claude/agents/dev.md",
        ".claude/agents/tariq.md",
        ".agents/skills/moneyapp-expert-panel/SKILL.md",
        ".claude/skills/moneyapp-expert-panel/SKILL.md"
      ],
      "require": ["Zustand v5"],
      "forbid": []
    },
    {
      "id": "STACK-NO-SIGNALS",
      "files": ["AGENTS.md", "CLAUDE.md", ".agents/**/*.md", ".claude/**/*.md", ".codex/**/*.toml"],
      "require": [],
      "forbid": [
        "Babel signals transform is installed",
        "Signals migration shape:",
        "for migrated state, use `@preact/signals-react`"
      ]
    },
    {
      "id": "PATH-SRC-CANONICAL",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/dev.toml",
        ".codex/agents/tariq.toml",
        ".claude/agents/dev.md",
        ".claude/agents/tariq.md"
      ],
      "require": ["src/modules/<domain>/"],
      "forbid": ["canonical feature code lives under `modules/<domain>/`"]
    },
    {
      "id": "UI-HEROUI",
      "files": [
        "AGENTS.md",
        "CLAUDE.md",
        ".codex/agents/dev.toml",
        ".codex/agents/marcus.toml",
        ".codex/agents/tariq.toml",
        ".claude/agents/dev.md",
        ".claude/agents/marcus.md",
        ".claude/agents/tariq.md"
      ],
      "require": ["HeroUI Native"],
      "forbid": []
    },
    {
      "id": "PERSONA-SARAH-OWNERSHIP",
      "files": [".codex/agents/sarah.toml", ".claude/agents/sarah.md"],
      "require": ["orchestration"],
      "forbid": ["owns architecture", "owns financial formulas"]
    },
    {
      "id": "PERSONA-MARCUS-OWNERSHIP",
      "files": [".codex/agents/marcus.toml", ".claude/agents/marcus.md"],
      "require": ["product/UX"],
      "forbid": ["owns financial formulas", "owns architecture"]
    },
    {
      "id": "PERSONA-LAYLA-OWNERSHIP",
      "files": [".codex/agents/layla.toml", ".claude/agents/layla.md"],
      "require": ["financial formulas"],
      "forbid": ["owns product/UX", "owns architecture"]
    },
    {
      "id": "PERSONA-TARIQ-OWNERSHIP",
      "files": [".codex/agents/tariq.toml", ".claude/agents/tariq.md"],
      "require": ["architecture"],
      "forbid": ["owns product/UX", "owns financial formulas"]
    },
    {
      "id": "PERSONA-DEV-OWNERSHIP",
      "files": [".codex/agents/dev.toml", ".claude/agents/dev.md"],
      "require": ["implements approved plans"],
      "forbid": ["approves plans", "owns product/UX", "owns financial formulas"]
    }
  ]
}
```

Required and forbidden claims are evaluated case-insensitively in every matched file. A correct root document cannot satisfy a missing claim in a stale adapter.

- [ ] **Step 2: Add representative fixture cases**

Create `harness/fixtures/invalid/semantic_cases.json`:

```json
[
  {
    "name": "signals-installed",
    "files": { ".codex/agents/dev.toml": "The Babel signals transform is installed." },
    "expectedRule": "STACK-NO-SIGNALS"
  },
  {
    "name": "agent-merge-authority",
    "files": { ".claude/agents/tariq.md": "Tariq may approve and merge." },
    "expectedRule": "AUTH-USER-INTEGRATION"
  },
  {
    "name": "obsolete-gates",
    "files": {
      ".claude/commands/feature.md": "Gate 1 (plan approval) then Gate 2 (code review)."
    },
    "expectedRule": "GATE-SPEC-SIGNOFF"
  },
  {
    "name": "missing-src-prefix",
    "files": {
      ".codex/agents/dev.toml": "Canonical feature code lives under `modules/<domain>/`."
    },
    "expectedRule": "PATH-SRC-CANONICAL"
  },
  {
    "name": "divergent-persona-ownership",
    "files": {
      ".claude/agents/marcus.md": "Marcus owns architecture."
    },
    "expectedRule": "PERSONA-MARCUS-OWNERSHIP"
  },
  {
    "name": "missing-critical-trigger",
    "files": {
      ".codex/agents/sarah.toml": "Sarah owns orchestration. Sarah approves plans. explicit user request."
    },
    "expectedRule": "GATE-CRITICAL-TRIGGER"
  }
]
```

Create `harness/fixtures/invalid/structure_cases.json`:

```json
[
  {
    "name": "direct-generated-edit",
    "expected": "<!-- GENERATED -->\nCanonical.\n",
    "actual": "<!-- GENERATED -->\nEdited directly.\n",
    "expectedRule": "GENERATION-PARITY"
  },
  {
    "name": "unregistered-generated-output",
    "generatedFiles": ["AGENTS.md", ".claude/agents/orphan.md"],
    "registeredTargets": ["AGENTS.md"],
    "expectedRule": "UNREGISTERED-GENERATED-OUTPUT"
  },
  {
    "name": "nondeterministic-generation",
    "first": "<!-- GENERATED -->\nFirst pass.\n",
    "second": "<!-- GENERATED -->\nSecond pass.\n",
    "expectedRule": "NONDETERMINISTIC-GENERATION"
  }
]
```

Create `harness/fixtures/valid/minimal.json`:

```json
{
  "AGENTS.md": "explicit user request. Spec sign-off. Device QA. critical trigger. Sarah approves plans. merge recommendation. Zustand v5. Signals rollback. src/modules/<domain>/. HeroUI Native."
}
```

- [ ] **Step 3: Write failing semantic tests**

Create `scripts/harness/__tests__/semantics.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { evaluateRules } = require('../lib/semantics');

const root = path.resolve(__dirname, '../../..');
const rules = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/rules/semantics.json'), 'utf8'),
).rules;
const cases = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/fixtures/invalid/semantic_cases.json'), 'utf8'),
);

for (const fixture of cases) {
  test(`reports ${fixture.name}`, () => {
    const errors = evaluateRules(rules, fixture.files, { requireCompleteScope: false });
    assert(errors.some((error) => error.ruleId === fixture.expectedRule));
  });
}
```

- [ ] **Step 4: Run the semantic test to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/semantics.test.js
```

Expected: FAIL with `Cannot find module '../lib/semantics'`.

- [ ] **Step 5: Implement scoped semantic evaluation**

Create `scripts/harness/lib/semantics.js` with deterministic glob matching limited to `*` and `**`:

```js
function globToRegExp(glob) {
  const escaped = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE_STAR::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function matchesAny(file, globs) {
  return globs.some((glob) => globToRegExp(glob).test(file));
}

function evaluateRules(rules, files, options = {}) {
  const errors = [];
  for (const rule of rules) {
    const scoped = Object.entries(files).filter(([file]) => matchesAny(file, rule.files));
    if (options.requireCompleteScope && scoped.length === 0) {
      errors.push({ ruleId: rule.id, file: '<scope>', message: 'no matching live files' });
      continue;
    }
    for (const [file, text] of scoped) {
      const normalized = text.toLowerCase();
      for (const claim of rule.require || []) {
        if (!normalized.includes(claim.toLowerCase())) {
          errors.push({ ruleId: rule.id, file, message: `missing claim: ${claim}` });
        }
      }
      for (const claim of rule.forbid || []) {
        if (normalized.includes(claim.toLowerCase())) {
          errors.push({ ruleId: rule.id, file, message: `forbidden claim: ${claim}` });
        }
      }
    }
  }
  return errors;
}

module.exports = { evaluateRules, globToRegExp };
```

- [ ] **Step 6: Write failing structural regression tests**

Create `scripts/harness/__tests__/structure.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const {
  compareRenderPasses,
  findOrphanGeneratedOutputs,
  findParityErrors,
  validateFormat,
  validateRegisteredStructure,
} = require('../lib/structure');

const root = path.resolve(__dirname, '../../..');
const cases = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/fixtures/invalid/structure_cases.json'), 'utf8'),
);

test('direct target edits fail generation parity', () => {
  const fixture = cases.find((entry) => entry.name === 'direct-generated-edit');
  const errors = findParityErrors(
    new Map([['AGENTS.md', fixture.expected]]),
    { 'AGENTS.md': fixture.actual },
  );
  assert(errors.some((error) => error.ruleId === fixture.expectedRule));
});

test('generated files not registered in the manifest fail', () => {
  const fixture = cases.find((entry) => entry.name === 'unregistered-generated-output');
  const files = Object.fromEntries(
    fixture.generatedFiles.map((file) => [file, '<!-- GENERATED -->\\n']),
  );
  const errors = findOrphanGeneratedOutputs(
    'GENERATED',
    new Set(fixture.registeredTargets),
    files,
  );
  assert(errors.some((error) => error.ruleId === fixture.expectedRule));
});

test('different consecutive render passes fail determinism', () => {
  const fixture = cases.find((entry) => entry.name === 'nondeterministic-generation');
  const errors = compareRenderPasses(
    new Map([['AGENTS.md', fixture.first]]),
    new Map([['AGENTS.md', fixture.second]]),
  );
  assert(errors.some((error) => error.ruleId === fixture.expectedRule));
});

test('missing personas and supported targets fail structural validation', () => {
  const errors = validateRegisteredStructure(
    root,
    { generatedNotice: 'GENERATED', personas: [], targets: [] },
    new Map(),
    {},
  );
  assert(errors.some((error) => error.ruleId === 'PERSONA-SURFACE-REGISTRATION'));
  assert(errors.some((error) => error.ruleId === 'INCOMPLETE-TARGET-REGISTRATION'));
});

test('invalid generated TOML and frontmatter fail format validation', () => {
  assert(
    validateFormat('.codex/agents/dev.toml', 'name = "dev"\\n').some(
      (error) => error.ruleId === 'GENERATED-FORMAT',
    ),
  );
  assert(
    validateFormat('.claude/agents/dev.md', 'no frontmatter\\n').some(
      (error) => error.ruleId === 'GENERATED-FORMAT',
    ),
  );
});

test('generated targets require provenance markers', () => {
  const errors = validateRegisteredStructure(
    root,
    {
      generatedNotice: 'GENERATED',
      personas: [],
      targets: [{ path: 'AGENTS.md' }],
    },
    new Map([['AGENTS.md', '# MoneyApp\\n']]),
    { 'AGENTS.md': '# MoneyApp\\n' },
  );
  assert(errors.some((error) => error.ruleId === 'PROVENANCE-MARKER'));
});
```

- [ ] **Step 7: Implement structural, provenance, and budget checks**

Create `scripts/harness/lib/structure.js`:

```js
const fs = require('node:fs');
const { extractSection } = require('./render');
const { resolveInside } = require('./paths');

function findParityErrors(rendered, actualFiles) {
  const errors = [];
  for (const [file, expected] of rendered) {
    if (actualFiles[file] !== expected) {
      errors.push({
        ruleId: 'GENERATION-PARITY',
        file,
        message: 'run npm run harness:generate',
      });
    }
  }
  return errors;
}

function findOrphanGeneratedOutputs(notice, registeredTargets, files) {
  return Object.entries(files)
    .filter(([file, text]) => text.includes(notice) && !registeredTargets.has(file))
    .map(([file]) => ({
      ruleId: 'UNREGISTERED-GENERATED-OUTPUT',
      file,
      message: 'generated marker exists outside harness/manifest.json',
    }));
}

function compareRenderPasses(first, second) {
  const errors = [];
  const paths = new Set([...first.keys(), ...second.keys()]);
  for (const file of paths) {
    if (first.get(file) !== second.get(file)) {
      errors.push({
        ruleId: 'NONDETERMINISTIC-GENERATION',
        file,
        message: 'consecutive in-memory renders differ',
      });
    }
  }
  return errors;
}

function validateFormat(file, text) {
  const errors = [];
  if (file.endsWith('.toml')) {
    if (
      !/^name = ".*"$/m.test(text) ||
      !/^description = ".*"$/m.test(text) ||
      !/^developer_instructions = """[\s\S]*"""$/m.test(text)
    ) {
      errors.push({ ruleId: 'GENERATED-FORMAT', file, message: 'invalid agent TOML' });
    }
  }
  const isAgentOrSkill =
    /^\.claude\/agents\//.test(file) ||
    /^\.agents\/skills\//.test(file) ||
    /^\.claude\/skills\//.test(file);
  const isCommand = /^\.claude\/commands\//.test(file);
  if (
    (isAgentOrSkill || isCommand) &&
    (!/^---\n[\s\S]+?\n---\n/.test(text) ||
      !/^description:/m.test(text) ||
      (isAgentOrSkill && !/^name:/m.test(text)))
  ) {
    errors.push({ ruleId: 'GENERATED-FORMAT', file, message: 'invalid frontmatter' });
  }
  return errors;
}

const REQUIRED_PERSONA_IDS = ['sarah', 'marcus', 'layla', 'tariq', 'dev'];

function expectedPersonaTargets() {
  return REQUIRED_PERSONA_IDS.flatMap((id) => [
    `.codex/agents/${id}.toml`,
    `.claude/agents/${id}.md`,
  ]);
}

function validateRegisteredStructure(root, manifest, rendered, liveFiles) {
  const errors = [];
  const targets = new Set(manifest.targets.map((target) => target.path));
  const personaIds = manifest.personas.map((persona) => persona.id);
  if (JSON.stringify(personaIds) !== JSON.stringify(REQUIRED_PERSONA_IDS)) {
    errors.push({
      ruleId: 'PERSONA-SURFACE-REGISTRATION',
      file: 'harness/manifest.json',
      message: `expected personas ${REQUIRED_PERSONA_IDS.join(', ')}`,
    });
  }
  const requiredTargets = [
    'AGENTS.md',
    'CLAUDE.md',
    ...expectedPersonaTargets(),
    '.agents/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/commands/feature.md',
    '.claude/commands/status.md',
  ];

  for (const file of requiredTargets) {
    if (!targets.has(file)) {
      errors.push({
        ruleId: 'INCOMPLETE-TARGET-REGISTRATION',
        file,
        message: 'required supported-surface target is not registered',
      });
    }
  }

  for (const persona of manifest.personas) {
    const text = fs.readFileSync(resolveInside(root, persona.source), 'utf8');
    for (const section of ['agent', 'inline']) {
      try {
        extractSection(text, section);
      } catch (error) {
        errors.push({
          ruleId: 'PERSONA-SECTION',
          file: persona.source,
          message: error.message,
        });
      }
    }
  }

  for (const [file, text] of rendered) {
    if (!text.includes(manifest.generatedNotice)) {
      errors.push({ ruleId: 'PROVENANCE-MARKER', file, message: 'missing generated notice' });
    }
    errors.push(...validateFormat(file, text));
  }
  errors.push(...findParityErrors(rendered, liveFiles));
  errors.push(...findOrphanGeneratedOutputs(manifest.generatedNotice, targets, liveFiles));
  return errors;
}

function measureRenderedTargets(rendered) {
  return [...rendered].map(([file, text]) => ({
    file,
    lines: text.split('\n').length - 1,
    bytes: Buffer.byteLength(text, 'utf8'),
  }));
}

module.exports = {
  compareRenderPasses,
  findOrphanGeneratedOutputs,
  findParityErrors,
  measureRenderedTargets,
  validateFormat,
  validateRegisteredStructure,
};
```

Run:

```bash
node --test scripts/harness/__tests__/structure.test.js
```

Expected: PASS for direct-edit, orphan-output, and nondeterminism regression fixtures.

- [ ] **Step 8: Write repository-fact tests**

Create `scripts/harness/__tests__/repository_facts.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  validateDependencyFacts,
  validateRepositoryPaths,
  validateVerificationContract,
} = require('../lib/repository_facts');

const cleanPackage = { dependencies: { zustand: '^5.0.12' }, devDependencies: {} };
const cleanLock = { packages: { 'node_modules/zustand': {} } };
const zustandSource = "import { create } from 'zustand';";

for (const fixture of [
  {
    name: 'dependency',
    pkg: {
      dependencies: {
        zustand: '^5.0.12',
        '@preact/signals-react': '^3.0.0',
      },
    },
    lock: cleanLock,
    source: zustandSource,
    babel: '',
  },
  {
    name: 'lockfile',
    pkg: cleanPackage,
    lock: {
      packages: {
        'node_modules/zustand': {},
        'node_modules/@preact/signals-react': {},
      },
    },
    source: zustandSource,
    babel: '',
  },
  {
    name: 'Babel config',
    pkg: cleanPackage,
    lock: cleanLock,
    source: zustandSource,
    babel: "plugins: ['@preact/signals-react-transform']",
  },
  {
    name: 'source import',
    pkg: cleanPackage,
    lock: cleanLock,
    source: `${zustandSource}\\nimport { signal } from '@preact/signals-react';`,
    babel: '',
  },
]) {
  test(`rejects Signals reappearance in ${fixture.name}`, () => {
    const errors = validateDependencyFacts(
      fixture.pkg,
      fixture.lock,
      '',
      fixture.source,
      fixture.babel,
    );
    assert(errors.some((error) => error.ruleId === 'STACK-NO-SIGNALS'));
  });
}

test('rejects missing canonical paths and persona surfaces', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-facts-'));
  const errors = validateRepositoryPaths(root, {
    personas: [{ id: 'dev' }],
    targets: [],
  });
  assert(errors.some((error) => error.ruleId === 'PATH-SRC-CANONICAL'));
  assert(errors.some((error) => error.ruleId === 'PERSONA-SURFACE-REGISTRATION'));
});

test('accepts six registered CI checks with their exact job commands', () => {
  const checks = [
    { id: 'format', ci: { job: 'format', run: 'npm run format:check' } },
    { id: 'lint', ci: { job: 'lint', run: 'npm run lint' } },
  ];
  const workflow = '  format:\\n    steps:\\n      - run: npm run format:check\\n  lint:\\n    steps:\\n      - run: npm run lint\\n';
  assert.deepEqual(validateVerificationContract(checks, workflow), []);
});
```

- [ ] **Step 9: Implement repository-fact checks**

Create `scripts/harness/lib/repository_facts.js`:

```js
const fs = require('node:fs');
const path = require('node:path');
const { resolveInside } = require('./paths');

function allDependencies(pkg) {
  return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
}

function lockHasPackage(lock, packageName) {
  return Boolean(
    lock.packages?.[`node_modules/${packageName}`] ||
      lock.dependencies?.[packageName],
  );
}

function collectSourceText(root) {
  const chunks = [];
  const visit = (relativePath) => {
    const absolute = resolveInside(root, relativePath);
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) {
        visit(path.posix.join(relativePath, entry));
      }
    } else if (/\.[cm]?[jt]sx?$/.test(relativePath)) {
      chunks.push(fs.readFileSync(absolute, 'utf8'));
    }
  };
  visit('src');
  return chunks.join('\n');
}

function collectBabelText(root) {
  return ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs']
    .map((file) => resolveInside(root, file))
    .filter((file) => fs.existsSync(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}

function validateDependencyFacts(pkg, lock, liveText, sourceText, babelText) {
  const dependencies = allDependencies(pkg);
  const errors = [];
  if (
    !dependencies.zustand ||
    !lockHasPackage(lock, 'zustand') ||
    !/from\s+['"]zustand(?:\/[^'"]+)?['"]/.test(sourceText)
  ) {
    errors.push({
      ruleId: 'STACK-ZUSTAND',
      file: 'package.json',
      message: 'Zustand guidance does not match package, lockfile, and source imports',
    });
  }
  const signalsEvidence = [
    dependencies['@preact/signals-react'] && 'package.json dependency',
    lockHasPackage(lock, '@preact/signals-react') && 'package-lock.json package',
    /@preact\/signals-react(?:-transform)?/.test(babelText) && 'Babel transform',
    /from\s+['"]@preact\/signals-react(?:\/[^'"]+)?['"]/.test(sourceText) &&
      'source import',
    /Babel signals transform is installed|Signals migration shape:|for migrated state, use `@preact\/signals-react`/i.test(
      liveText,
    ) && 'stale live guidance',
  ].filter(Boolean);
  if (signalsEvidence.length > 0) {
    errors.push({
      ruleId: 'STACK-NO-SIGNALS',
      file: 'package.json',
      message: `Signals rollback contradicted by ${signalsEvidence.join(', ')}`,
    });
  }
  return errors;
}

const REQUIRED_REPOSITORY_PATHS = [
  'src/app',
  'src/modules',
  'src/components/ui/screen.tsx',
  'src/components/ui/sheet.tsx',
  'src/constants/theme.ts',
  'src/constants/theme_tokens.ts',
];

function validateRepositoryPaths(root, manifest) {
  const errors = [];
  for (const relativePath of REQUIRED_REPOSITORY_PATHS) {
    if (!fs.existsSync(resolveInside(root, relativePath))) {
      errors.push({
        ruleId: 'PATH-SRC-CANONICAL',
        file: relativePath,
        message: 'required canonical path is absent',
      });
    }
  }
  const targets = new Set(manifest.targets.map((target) => target.path));
  for (const persona of manifest.personas) {
    for (const relativePath of [
      `.codex/agents/${persona.id}.toml`,
      `.claude/agents/${persona.id}.md`,
    ]) {
      if (!targets.has(relativePath) || !fs.existsSync(resolveInside(root, relativePath))) {
        errors.push({
          ruleId: 'PERSONA-SURFACE-REGISTRATION',
          file: relativePath,
          message: 'persona surface is absent or unregistered',
        });
      }
    }
  }
  return errors;
}

function extractJobBlock(workflow, job) {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line === `  ${job}:`);
  if (start === -1) return '';
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [a-zA-Z0-9_-]+:$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

function validateVerificationContract(checks, workflow) {
  const errors = [];
  const ids = new Set();
  for (const check of checks) {
    if (ids.has(check.id)) {
      errors.push({ ruleId: 'VERIFY-SIX-CHECKS', file: 'harness/manifest.json', message: `duplicate ${check.id}` });
    }
    ids.add(check.id);
    const block = extractJobBlock(workflow, check.ci.job);
    if (!block.includes(`run: ${check.ci.run}`)) {
      errors.push({
        ruleId: 'VERIFY-SIX-CHECKS',
        file: '.github/workflows/pr-checks.yml',
        message: `missing ${check.id}: ${check.ci.run}`,
      });
    }
  }
  return errors;
}

module.exports = {
  collectBabelText,
  collectSourceText,
  extractJobBlock,
  validateDependencyFacts,
  validateRepositoryPaths,
  validateVerificationContract,
};
```

- [ ] **Step 10: Implement the initial read-only checker**

Create `scripts/harness/check.js`:

```js
#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { loadManifest } = require('./lib/manifest');
const { renderAll } = require('./lib/render');
const { resolveInside } = require('./lib/paths');
const {
  compareRenderPasses,
  measureRenderedTargets,
  validateRegisteredStructure,
} = require('./lib/structure');
const { evaluateRules } = require('./lib/semantics');
const {
  collectBabelText,
  collectSourceText,
  validateDependencyFacts,
  validateRepositoryPaths,
  validateVerificationContract,
} = require('./lib/repository_facts');

const root = path.resolve(__dirname, '../..');
const manifest = loadManifest(root);
const errors = [];
const rendered = renderAll(root, manifest);

function collectLiveFiles() {
  const files = {};
  const visit = (relativePath) => {
    const absolute = resolveInside(root, relativePath);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) {
        visit(path.posix.join(relativePath, entry));
      }
      return;
    }
    if (relativePath.endsWith('.md') || relativePath.endsWith('.toml')) {
      files[relativePath] = fs.readFileSync(absolute, 'utf8');
    }
  };
  for (const liveRoot of ['AGENTS.md', 'CLAUDE.md', '.agents', '.claude', '.codex']) {
    visit(liveRoot);
  }
  return files;
}

const liveFiles = collectLiveFiles();
const secondRender = renderAll(root, manifest);
errors.push(...compareRenderPasses(rendered, secondRender));
errors.push(...validateRegisteredStructure(root, manifest, rendered, liveFiles));
const rules = JSON.parse(fs.readFileSync(resolveInside(root, manifest.rules), 'utf8')).rules;
errors.push(...evaluateRules(rules, liveFiles, { requireCompleteScope: true }));
errors.push(
  ...validateDependencyFacts(
    JSON.parse(fs.readFileSync(resolveInside(root, 'package.json'), 'utf8')),
    JSON.parse(fs.readFileSync(resolveInside(root, 'package-lock.json'), 'utf8')),
    Object.values(liveFiles).join('\n'),
    collectSourceText(root),
    collectBabelText(root),
  ),
);
errors.push(...validateRepositoryPaths(root, manifest));
errors.push(
  ...validateVerificationContract(
    manifest.verification.checks,
    fs.readFileSync(resolveInside(root, '.github/workflows/pr-checks.yml'), 'utf8'),
  ),
);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`${error.ruleId} ${error.file}: ${error.message}`);
  }
  process.exit(1);
}

for (const metric of measureRenderedTargets(rendered)) {
  console.log(`Harness budget ${metric.file}: ${metric.lines} lines, ${metric.bytes} bytes`);
}
console.log(`Harness valid (${manifest.targets.length} generated targets)`);
```

Add to `package.json`:

```json
"harness:check": "node scripts/harness/check.js"
```

- [ ] **Step 11: Run focused validation tests**

Run:

```bash
npm run harness:test
npm run harness:check
```

Expected: all Node tests PASS. `harness:check` exits non-zero and reports the known live semantic violations plus `INCOMPLETE-TARGET-REGISTRATION` for surfaces not yet adopted. Save this focused output for the baseline; enforcement is not wired into lint or hooks until the migration is clean.

- [ ] **Step 12: Commit semantic validation**

```bash
git add package.json harness/rules harness/fixtures scripts/harness/check.js \
  scripts/harness/lib/semantics.js scripts/harness/lib/structure.js \
  scripts/harness/lib/repository_facts.js \
  scripts/harness/__tests__/semantics.test.js \
  scripts/harness/__tests__/structure.test.js \
  scripts/harness/__tests__/repository_facts.test.js
git commit -m "feat: validate harness semantics and repository facts"
```

### Task 4: Extract canonical policy and generate root adapters

**Files:**

- Create: `harness/policy/{authority,workflow,stack,architecture,ui,verification}.md`
- Create: `harness/templates/agents.md`
- Create: `harness/templates/claude.md`
- Modify: `harness/manifest.json`
- Generate: `AGENTS.md`
- Generate: `CLAUDE.md`
- Create: `scripts/harness/__tests__/root_adapters.test.js`

- [ ] **Step 1: Write a failing root-adapter parity test**

Create `scripts/harness/__tests__/root_adapters.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');

test('root adapters contain identical binding decisions', () => {
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  const claude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  const bindings = [
    'explicit user request',
    'Spec sign-off',
    'Device QA',
    'Signals rollback',
    'src/modules/<domain>/',
    'HeroUI Native',
    'npm run verify:pr',
  ];
  for (const binding of bindings) {
    assert.equal(agents.includes(binding), true, `AGENTS.md missing ${binding}`);
    assert.equal(claude.includes(binding), true, `CLAUDE.md missing ${binding}`);
  }
});
```

- [ ] **Step 2: Run the new test to expose the missing canonical command**

Run:

```bash
node --test scripts/harness/__tests__/root_adapters.test.js
```

Expected: FAIL because the current root documents do not contain `npm run verify:pr`.

- [ ] **Step 3: Extract current root truth into focused modules**

Move current approved content without changing its meaning, using this exact ownership map:

| Canonical file | Existing `AGENTS.md` sections to move |
|---|---|
| `authority.md` | Project introduction, Workflow, Team, Team Laws, critical triggers |
| `workflow.md` | How the Team Plugs Into Superpowers and Notion Docs |
| `stack.md` | Tech Stack and Expo Dev Client |
| `architecture.md` | Project Structure, `src/app` rules, screen anatomy, Zustand shape, Signals rollback, conventions, database layer, business rules |
| `ui.md` | Styling, screen layout, Components, Bottom Sheets, Patches, Design System |
| `verification.md` | Commands and Pre-push CI parity |

Every module starts with one H1 and contains no generated notice. Preserve the exact current rules, including top-level partial Zustand setters, `src/` prefixes, HeroUI requirements, and the Signals rollback. Replace the duplicated shell chain in `verification.md` with:

```markdown
## Publish readiness

Run `npm run verify:pr` before every authorized push to a PR branch. It executes the six checks registered in `harness/manifest.json` and stops on the first failure. A passing check does not itself authorize a push.
```

Normalize the binding vocabulary without changing meaning so both roots contain these exact stable claims used by semantic rules:

- `explicit user request`
- `Spec sign-off`
- `Device QA`
- `critical trigger`
- `Sarah approves plans`
- `merge recommendation`
- `Zustand v5`
- `src/modules/<domain>/`
- `HeroUI Native`

- [ ] **Step 4: Create root templates**

Create `harness/templates/agents.md` and `harness/templates/claude.md` with the same ordered policy includes and a surface-specific title:

```markdown
<!-- {{raw:notice}} -->
# MoneyApp

{{include:harness/policy/authority.md}}
{{include:harness/policy/workflow.md}}
{{include:harness/policy/stack.md}}
{{include:harness/policy/architecture.md}}
{{include:harness/policy/ui.md}}
{{include:harness/policy/verification.md}}
```

Use `# MoneyApp — Claude Adapter` as the title in `claude.md`; all included policy remains identical.

- [ ] **Step 5: Register both root targets**

Add these targets to `harness/manifest.json`:

```json
[
  {
    "id": "root-agents",
    "path": "AGENTS.md",
    "template": "harness/templates/agents.md",
    "sources": [
      "harness/policy/authority.md",
      "harness/policy/workflow.md",
      "harness/policy/stack.md",
      "harness/policy/architecture.md",
      "harness/policy/ui.md",
      "harness/policy/verification.md"
    ]
  },
  {
    "id": "root-claude",
    "path": "CLAUDE.md",
    "template": "harness/templates/claude.md",
    "sources": [
      "harness/policy/authority.md",
      "harness/policy/workflow.md",
      "harness/policy/stack.md",
      "harness/policy/architecture.md",
      "harness/policy/ui.md",
      "harness/policy/verification.md"
    ]
  }
]
```

- [ ] **Step 6: Generate twice and inspect the root diff**

Run:

```bash
npm run harness:generate
git diff -- AGENTS.md CLAUDE.md harness/
shasum AGENTS.md CLAUDE.md
npm run harness:generate
shasum AGENTS.md CLAUDE.md
```

Expected: first generation changes both root adapters and adds canonical sources; the two checksum pairs are identical, proving the second generation did not alter either target.

- [ ] **Step 7: Run root and semantic tests**

Run:

```bash
node --test scripts/harness/__tests__/root_adapters.test.js
npm run harness:check
```

Expected: the root-adapter test PASSes. `harness:check` still exits non-zero for stale persona, expert-panel, and workflow-command surfaces and for their not-yet-registered targets; root-policy violations are gone.

- [ ] **Step 8: Commit canonical root policy**

```bash
git add AGENTS.md CLAUDE.md harness/policy harness/templates/agents.md \
  harness/templates/claude.md harness/manifest.json \
  scripts/harness/__tests__/root_adapters.test.js
git commit -m "refactor: generate root policy from canonical sources"
```

### Task 5: Generate dispatched and inline personas

**Files:**

- Create: `harness/personas/{sarah,marcus,layla,tariq,dev}.md`
- Create: `harness/templates/codex_agent.toml`
- Create: `harness/templates/claude_agent.md`
- Create: `harness/templates/expert_panel.md`
- Modify: `harness/manifest.json`
- Generate: `.codex/agents/*.toml`
- Generate: `.claude/agents/*.md`
- Generate: `.agents/skills/moneyapp-expert-panel/SKILL.md`
- Generate: `.claude/skills/moneyapp-expert-panel/SKILL.md`
- Create: `scripts/harness/__tests__/personas.test.js`

- [ ] **Step 1: Write failing persona-parity tests**

Create `scripts/harness/__tests__/personas.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { extractSection } = require('../lib/render');

const root = path.resolve(__dirname, '../../..');
const roles = ['sarah', 'marcus', 'layla', 'tariq', 'dev'];

test('each supported surface has one current persona', () => {
  for (const role of roles) {
    const codex = fs.readFileSync(path.join(root, `.codex/agents/${role}.toml`), 'utf8');
    const claude = fs.readFileSync(path.join(root, `.claude/agents/${role}.md`), 'utf8');
    assert.equal(codex.includes('Babel signals transform is installed'), false);
    assert.equal(claude.includes('Babel signals transform is installed'), false);
    assert.match(codex, new RegExp(`name = "${role}"`));
    assert.match(claude, new RegExp(`name: ${role}`));
  }
});

test('inline panel is byte-identical on both supported surfaces', () => {
  const agents = fs.readFileSync(
    path.join(root, '.agents/skills/moneyapp-expert-panel/SKILL.md'),
    'utf8',
  );
  const claude = fs.readFileSync(
    path.join(root, '.claude/skills/moneyapp-expert-panel/SKILL.md'),
    'utf8',
  );
  assert.equal(agents, claude);
});

test('every canonical persona has dispatched and inline sections', () => {
  for (const role of roles) {
    const source = fs.readFileSync(path.join(root, `harness/personas/${role}.md`), 'utf8');
    assert.doesNotThrow(() => extractSection(source, 'agent'));
    assert.doesNotThrow(() => extractSection(source, 'inline'));
  }
});
```

- [ ] **Step 2: Run the persona tests to verify current drift**

Run:

```bash
node --test scripts/harness/__tests__/personas.test.js
```

Expected: FAIL because current Codex personas contain Signals guidance and expert-panel files differ.

- [ ] **Step 3: Create one canonical document per persona**

Each `harness/personas/<role>.md` has exactly these markers:

```markdown
# Persona Name

<!-- harness:section agent -->
Full dispatched-agent instructions.
<!-- harness:endsection -->

<!-- harness:section inline -->
Concise advisory lens, owned decisions, escalation boundary, and output contract.
<!-- harness:endsection -->
```

Use the current `.claude/agents/<role>.md` body as the structural baseline, then apply these binding corrections:

- Sarah owns orchestration and plan approval but cannot push, merge, or perform destructive cleanup.
- Marcus owns product/UX decisions and cannot invent financial formulas or architecture.
- Layla owns financial formulas and testable examples and cannot override UX or architecture.
- Tariq owns architecture and review verdicts but recommends rather than merges.
- Dev implements approved plans with Zustand v5; top-level updates use `set({ x: value })`; Signals are explicitly absent.
- Every persona escalates dependency, native, data-loss, auth, critical-copy, high-blast-radius, and device-QA triggers.
- Every dispatched and inline persona section includes the exact phrases `critical trigger` and `explicit user request`.
- Sarah's dispatched and inline sections include `Spec sign-off`, `Device QA`, and `Sarah approves plans`.
- Tariq's dispatched and inline sections include `merge recommendation`, `Zustand v5`, `src/modules/<domain>/`, and `HeroUI Native`.
- Dev's dispatched section includes `implements approved plans`, `Zustand v5`, `src/modules/<domain>/`, and `HeroUI Native`.
- Marcus's dispatched section includes `product/UX` and `HeroUI Native`.
- Dispatched instructions reference generated root policy rather than restating the complete architecture.

- [ ] **Step 4: Create surface templates**

Create `harness/templates/codex_agent.toml`:

```toml
description = {{json:description}}
developer_instructions = """
<!-- {{raw:notice}} -->
{{include:personaSource#agent}}"""
name = {{json:id}}
```

Create `harness/templates/claude_agent.md`:

```markdown
---
name: {{raw:id}}
description: {{json:description}}
tools: {{raw:claudeTools}}
model: {{raw:claudeModel}}
---
<!-- {{raw:notice}} -->
{{include:personaSource#agent}}
```

Create `harness/templates/expert_panel.md` with valid skill frontmatter and these five explicit includes:

```markdown
---
name: moneyapp-expert-panel
description: MoneyApp inline advisory panel for [sarah], [marcus], [layla], [tariq], and [dev].
---
<!-- {{raw:notice}} -->
# MoneyApp Expert Panel

## Sarah
{{include:harness/personas/sarah.md#inline}}

## Marcus
{{include:harness/personas/marcus.md#inline}}

## Layla
{{include:harness/personas/layla.md#inline}}

## Tariq
{{include:harness/personas/tariq.md#inline}}

## Dev
{{include:harness/personas/dev.md#inline}}
```

- [ ] **Step 5: Extend rendering for variable-backed include paths**

Update `scripts/harness/lib/render.js` so `{{include:personaSource#agent}}` resolves `personaSource` from target variables before checking declared sources:

```js
function resolveIncludePath(token, variables) {
  return Object.hasOwn(variables, token) ? String(variables[token]) : token;
}
```

Replace the include callback's first four lines with:

```js
(_match, sourceToken, section) => {
  const sourcePath = resolveIncludePath(sourceToken, variables);
  if (!declared.has(sourcePath)) {
    throw new Error(`${target.id}: undeclared include ${sourcePath}`);
  }
  if (included.has(sourcePath)) {
    throw new Error(`${target.id}: duplicate include ${sourcePath}`);
  }
  included.add(sourcePath);
  const text = read(root, sourcePath);
  return section ? extractSection(text, section) : text;
}
```

Add a rendering test proving the resolved path must still appear in `target.sources`.

- [ ] **Step 6: Register persona metadata and targets**

Populate `manifest.personas` with five records shaped exactly as follows:

```json
{
  "id": "dev",
  "source": "harness/personas/dev.md",
  "description": "MoneyApp senior React Native developer. Implements approved plans inside the established architecture.",
  "claudeTools": "Read, Write, Edit, Glob, Grep, Bash, Skill",
  "claudeModel": "sonnet"
}
```

Use the same shape for Sarah, Marcus, Layla, and Tariq with their current descriptions and existing Claude tool/model settings. Register ten dispatched targets and two expert-panel targets. Every dispatched target declares its persona source and variables; both panel targets declare all five persona sources.

- [ ] **Step 7: Generate and validate personas**

Run:

```bash
npm run harness:generate
node --test scripts/harness/__tests__/render.test.js \
  scripts/harness/__tests__/personas.test.js
npm run validate:agent-assets
npm run harness:check
```

Expected: asset validation and persona tests PASS; both expert panels are identical; no generated persona contains installed-Signals guidance or autonomous merge authority. `harness:check` reports only the obsolete and not-yet-generated Claude workflow commands fixed in Task 6.

- [ ] **Step 8: Commit persona generation**

```bash
git add harness/personas harness/templates/codex_agent.toml \
  harness/templates/claude_agent.md harness/templates/expert_panel.md \
  harness/manifest.json scripts/harness/lib/render.js \
  scripts/harness/__tests__/render.test.js scripts/harness/__tests__/personas.test.js \
  .codex/agents .claude/agents \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md
git commit -m "refactor: generate MoneyApp personas from one source"
```

### Task 6: Generate current Claude workflow commands

**Files:**

- Create: `harness/templates/claude_feature_command.md`
- Create: `harness/templates/claude_status_command.md`
- Modify: `harness/manifest.json`
- Generate: `.claude/commands/feature.md`
- Generate: `.claude/commands/status.md`
- Create: `scripts/harness/__tests__/workflow_commands.test.js`
- Create: `scripts/harness/__tests__/semantic_integration.test.js`

- [ ] **Step 1: Write failing workflow-command tests**

Create `scripts/harness/__tests__/workflow_commands.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');

test('feature command exposes only current human gates', () => {
  const text = fs.readFileSync(path.join(root, '.claude/commands/feature.md'), 'utf8');
  assert.match(text, /Spec sign-off/);
  assert.match(text, /Device QA/);
  assert.match(text, /critical trigger/);
  assert.doesNotMatch(text, /Gate 1 \\(plan approval\\)|Gate 2 \\(code review\\)/);
});

test('status command reports repository-integration authority separately', () => {
  const text = fs.readFileSync(path.join(root, '.claude/commands/status.md'), 'utf8');
  assert.match(text, /push, merge, or destructive action awaiting an explicit user request/);
  assert.doesNotMatch(text, /Gate 1|Gate 2/);
});
```

- [ ] **Step 2: Run tests to verify obsolete gates fail**

Run:

```bash
node --test scripts/harness/__tests__/workflow_commands.test.js
```

Expected: FAIL because the current commands report Gate 1 and Gate 2.

- [ ] **Step 3: Create the feature command template**

Create `harness/templates/claude_feature_command.md`:

```markdown
---
description: Run a MoneyApp feature through the canonical superpowers workflow
---
<!-- {{raw:notice}} -->

@sarah Orchestrate this feature through brainstorm, design doc, Spec sign-off,
plan, execution, Tariq review, local verification, Device QA when applicable,
and repository integration.

Proceed autonomously between gates. Stop only for Spec sign-off, Device QA,
a critical trigger, or a push, merge, or destructive repository action that
requires an explicit user request.

Consult or dispatch the domain owner defined by the generated MoneyApp policy.

$ARGUMENTS
```

- [ ] **Step 4: Create the status command template**

Create `harness/templates/claude_status_command.md`:

```markdown
---
description: Report current MoneyApp workflow state from durable artifacts
---
<!-- {{raw:notice}} -->

@sarah Read the active signed spec, approved plan, branch/worktree status,
review evidence, verification evidence, QA artifact, and PR state that exist.
Do not infer missing approvals or QA from chat language.

Report:
- current phase and owner;
- durable artifacts with paths;
- blockers or critical triggers;
- any push, merge, or destructive action awaiting an explicit user request;
- the next recommended action.

Keep the report concise.
```

The exact phrase `explicit user request` is binding in both command templates because `AUTH-USER-INTEGRATION` evaluates each command independently.

- [ ] **Step 5: Add all-target semantic integration coverage**

Create `scripts/harness/__tests__/semantic_integration.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../lib/manifest');
const { renderAll } = require('../lib/render');
const { evaluateRules } = require('../lib/semantics');
const { resolveInside } = require('../lib/paths');

const root = path.resolve(__dirname, '../../..');

test('all sixteen rendered targets satisfy every scoped semantic rule', () => {
  const manifest = loadManifest(root);
  const rendered = renderAll(root, manifest);
  const files = Object.fromEntries(rendered);
  const rules = JSON.parse(
    fs.readFileSync(resolveInside(root, manifest.rules), 'utf8'),
  ).rules;

  assert.equal(rendered.size, 16);
  assert.deepEqual(
    evaluateRules(rules, files, { requireCompleteScope: true }),
    [],
  );
});
```

- [ ] **Step 6: Register, generate, and validate both commands**

Add two targets with no policy-source includes, using their respective templates. Then run:

```bash
npm run harness:generate
node --test scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/semantic_integration.test.js
npm run harness:check
```

Expected: PASS; old Gate 1/Gate 2 phrases are absent from live Claude commands.

- [ ] **Step 7: Commit workflow adapters**

```bash
git add harness/templates/claude_feature_command.md \
  harness/templates/claude_status_command.md harness/manifest.json \
  .claude/commands/feature.md .claude/commands/status.md \
  scripts/harness/__tests__/workflow_commands.test.js \
  scripts/harness/__tests__/semantic_integration.test.js
git commit -m "refactor: generate Claude workflow commands"
```

### Task 7: Make the six-check contract executable

**Files:**

- Modify: `harness/manifest.json`
- Create: `scripts/harness/lib/verification.js`
- Create: `scripts/harness/verify_pr.js`
- Create: `scripts/harness/__tests__/verification.test.js`
- Modify: `scripts/harness/lib/repository_facts.js`
- Modify: `scripts/harness/__tests__/repository_facts.test.js`
- Modify: `package.json`
- Modify: `.husky/pre-push`
- Generate: `AGENTS.md`
- Generate: `CLAUDE.md`

- [ ] **Step 1: Register the exact local and CI commands**

Set `manifest.verification.checks` to:

```json
[
  {
    "id": "format",
    "local": ["npm", "run", "format:check"],
    "ci": { "job": "format", "run": "npm run format:check" }
  },
  {
    "id": "lint",
    "local": ["npm", "run", "lint"],
    "ci": { "job": "lint", "run": "npm run lint" }
  },
  {
    "id": "typecheck",
    "local": ["npm", "run", "typecheck"],
    "ci": {
      "job": "typecheck",
      "run": "npm run typecheck -- --incremental --tsBuildInfoFile .tsbuildinfo"
    }
  },
  {
    "id": "test",
    "local": ["npm", "test", "--", "--ci"],
    "ci": { "job": "test", "run": "npm test -- --ci --cacheDirectory .jest-cache" }
  },
  {
    "id": "doctor",
    "local": ["npx", "--yes", "expo-doctor"],
    "ci": { "job": "doctor", "run": "npx --yes expo-doctor" }
  },
  {
    "id": "prebuild",
    "local": ["npx", "expo", "prebuild", "--no-install", "--platform", "android"],
    "assertDirectory": "android",
    "ci": { "job": "prebuild-check", "run": "npx expo prebuild --no-install --platform android" }
  }
]
```

- [ ] **Step 2: Write failing verification-runner tests**

Create `scripts/harness/__tests__/verification.test.js`:

```js
const assert = require('node:assert/strict');
const test = require('node:test');

const { runVerification } = require('../lib/verification');

test('runs checks in order and stops at first failure', () => {
  const calls = [];
  const checks = [
    { id: 'format', local: ['npm', 'run', 'format:check'] },
    { id: 'lint', local: ['npm', 'run', 'lint'] },
    { id: 'typecheck', local: ['npm', 'run', 'typecheck'] },
  ];
  const result = runVerification('/repo', checks, {
    spawn(command, args) {
      calls.push([command, ...args]);
      return { status: command === 'npm' && args[1] === 'lint' ? 1 : 0 };
    },
    isDirectory() {
      return true;
    },
  });
  assert.equal(result.ok, false);
  assert.equal(result.failedCheck, 'lint');
  assert.deepEqual(calls, [
    ['npm', 'run', 'format:check'],
    ['npm', 'run', 'lint'],
  ]);
});

test('requires the registered generated directory', () => {
  const result = runVerification(
    '/repo',
    [{ id: 'prebuild', local: ['npx', 'expo', 'prebuild'], assertDirectory: 'android' }],
    { spawn: () => ({ status: 0 }), isDirectory: () => false },
  );
  assert.equal(result.failedCheck, 'prebuild');
});
```

- [ ] **Step 3: Run verification tests to confirm failure**

Run:

```bash
node --test scripts/harness/__tests__/verification.test.js
```

Expected: FAIL with `Cannot find module '../lib/verification'`.

- [ ] **Step 4: Implement ordered verification**

Create `scripts/harness/lib/verification.js`:

```js
const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolveInside } = require('./paths');

function runVerification(root, checks, overrides = {}) {
  const spawn =
    overrides.spawn ||
    ((command, args) => spawnSync(command, args, { cwd: root, stdio: 'inherit' }));
  const isDirectory =
    overrides.isDirectory ||
    ((relativePath) => {
      const absolute = resolveInside(root, relativePath);
      return fs.existsSync(absolute) && fs.statSync(absolute).isDirectory();
    });

  for (const check of checks) {
    const [command, ...args] = check.local;
    const result = spawn(command, args);
    if (result.status !== 0) return { ok: false, failedCheck: check.id };
    if (check.assertDirectory && !isDirectory(check.assertDirectory)) {
      return { ok: false, failedCheck: check.id };
    }
  }
  return { ok: true };
}

module.exports = { runVerification };
```

- [ ] **Step 5: Add the publish-readiness CLI**

Create `scripts/harness/verify_pr.js`:

```js
#!/usr/bin/env node
const path = require('node:path');
const { loadManifest } = require('./lib/manifest');
const { runVerification } = require('./lib/verification');

const root = path.resolve(__dirname, '../..');
const result = runVerification(root, loadManifest(root).verification.checks);
if (!result.ok) {
  console.error(`PR verification failed at ${result.failedCheck}`);
  process.exit(1);
}
console.log('CI parity green — safe to request push authorization');
```

Add to `package.json`:

```json
"verify:pr": "node scripts/harness/verify_pr.js"
```

- [ ] **Step 6: Validate the manifest-owned verification registry**

The command arrays in `harness/manifest.json` remain the sole command authority. Replace `validateVerificationContract` with schema, identity, and CI-correspondence checks that do not copy those commands into JavaScript:

```js
const REQUIRED_CHECK_IDS = ['format', 'lint', 'typecheck', 'test', 'doctor', 'prebuild'];

function validateVerificationContract(checks, workflow) {
  const errors = [];
  const ids = checks.map((check) => check.id);
  if (JSON.stringify(ids) !== JSON.stringify(REQUIRED_CHECK_IDS)) {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: 'harness/manifest.json',
      message: `expected ordered check identities ${REQUIRED_CHECK_IDS.join(', ')}`,
    });
  }

  for (const check of checks) {
    if (
      !Array.isArray(check.local) ||
      check.local.length === 0 ||
      check.local.some((part) => typeof part !== 'string' || part.length === 0) ||
      typeof check.ci?.job !== 'string' ||
      typeof check.ci?.run !== 'string'
    ) {
      errors.push({
        ruleId: 'VERIFY-SIX-CHECKS',
        file: 'harness/manifest.json',
        message: `invalid registry entry for ${check.id}`,
      });
      continue;
    }
    const block = extractJobBlock(workflow, check.ci.job);
    if (!block.includes(`run: ${check.ci.run}`)) {
      errors.push({
        ruleId: 'VERIFY-SIX-CHECKS',
        file: '.github/workflows/pr-checks.yml',
        message: `CI job ${check.ci.job} does not run registered ${check.id} check`,
      });
    }
  }

  const prebuild = checks.find((check) => check.id === 'prebuild');
  if (prebuild?.assertDirectory !== 'android') {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: 'harness/manifest.json',
      message: 'prebuild must assert the worktree-owned android directory',
    });
  }
  return errors;
}

function validateIntegrationContract(pkg, prePush) {
  const errors = [];
  if (pkg.scripts?.['verify:pr'] !== 'node scripts/harness/verify_pr.js') {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: 'package.json',
      message: 'verify:pr must delegate to scripts/harness/verify_pr.js',
    });
  }
  if (prePush.trim() !== 'npm run verify:pr') {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: '.husky/pre-push',
      message: 'pre-push must contain only npm run verify:pr',
    });
  }
  return errors;
}
```

`REQUIRED_CHECK_IDS` defines identities and local execution order, not commands. Each manifest entry maps that ordered local check to an independently observable CI job, so CI may run the six jobs in parallel while the local runner preserves manifest order.

Export `REQUIRED_CHECK_IDS` and `validateIntegrationContract`. Update `scripts/harness/check.js` to parse `package.json` once, pass it to both dependency and integration validation, and read `.husky/pre-push` for the integration call:

```js
errors.push(
  ...validateIntegrationContract(
    pkg,
    fs.readFileSync(resolveInside(root, '.husky/pre-push'), 'utf8'),
  ),
);
```

Update the earlier positive test to load the six checks directly from `harness/manifest.json` and use a workflow containing their six job/run pairs. Add a reordered manifest-copy test expecting `VERIFY-SIX-CHECKS`, a workflow with the registered `doctor` job removed expecting the same rule, and a hook test that rejects `npm test && npm run typecheck`.

- [ ] **Step 7: Replace the pre-push hook**

Set `.husky/pre-push` to exactly:

```sh
npm run verify:pr
```

Do not add `git push`, cleanup, or shell duplication.

The prebuild check leaves `android/` as ignored output owned by the isolated implementation worktree. Confirm with:

```bash
git check-ignore android
```

Expected: `android` is ignored. Do not remove, clean, or reuse an `android/` path from another worktree; no cleanup command belongs in `verify:pr`.

- [ ] **Step 8: Generate root references and run focused checks**

Run:

```bash
npm run harness:generate
node --test scripts/harness/__tests__/verification.test.js \
  scripts/harness/__tests__/repository_facts.test.js \
  scripts/harness/__tests__/root_adapters.test.js
npm run harness:check
bash -n .husky/pre-push
```

Expected: PASS; root adapters reference `npm run verify:pr`; the hook contains one command.

- [ ] **Step 9: Commit the verification contract**

```bash
git add harness/manifest.json scripts/harness/lib/verification.js \
  scripts/harness/lib/repository_facts.js scripts/harness/verify_pr.js \
  scripts/harness/__tests__/verification.test.js \
  scripts/harness/__tests__/repository_facts.test.js \
  package.json .husky/pre-push AGENTS.md CLAUDE.md
git commit -m "feat: enforce canonical PR verification"
```

### Task 8: Integrate validation with existing tooling

**Files:**

- Modify: `lint-staged.config.mjs`
- Modify: `package.json`
- Modify: `.github/workflows/pr-checks.yml` only if a focused harness step is required beyond the existing lint job
- Create: `scripts/harness/__tests__/integration.test.js`

- [ ] **Step 1: Write failing integration-surface tests**

Create `scripts/harness/__tests__/integration.test.js`:

```js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');

test('lint validates generic assets and canonical harness parity', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.lint, /validate:agent-assets/);
  assert.match(pkg.scripts['validate:agent-assets'], /harness:check/);
});

test('pre-push delegates to the canonical verifier', () => {
  const hook = fs.readFileSync(path.join(root, '.husky/pre-push'), 'utf8').trim();
  assert.equal(hook, 'npm run verify:pr');
});

test('lint-staged names harness check for relevant files', () => {
  const config = fs.readFileSync(path.join(root, 'lint-staged.config.mjs'), 'utf8');
  assert.match(config, /npm run harness:check/);
  assert.match(config, /harness\\//);
});
```

- [ ] **Step 2: Run the integration test to verify failure**

Run:

```bash
node --test scripts/harness/__tests__/integration.test.js
```

Expected: FAIL because `validate:agent-assets` and lint-staged do not yet call `harness:check`.

- [ ] **Step 3: Chain generic asset and harness validation**

Change the package script to:

```json
"validate:agent-assets": "node scripts/validate-agent-assets.js && npm run harness:check"
```

Keep `lint` as:

```json
"lint": "npm run validate:agent-assets && oxlint --type-aware --type-check"
```

Do not make `harness:check` call `validate:agent-assets`; that would create recursion.

- [ ] **Step 4: Make lint-staged operations sequential**

Refactor `lint-staged.config.mjs` to one `'*'` callback. Preserve the existing `.agents/` and `.claude/` exclusion for oxlint/oxfmt, but run harness parity after formatting when any staged file matches these prefixes or exact files:

```js
const HARNESS_PREFIXES = ['harness/', '.agents/', '.claude/', '.codex/', 'scripts/harness/'];
const HARNESS_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  'package.json',
  'lint-staged.config.mjs',
  '.husky/pre-push',
  '.github/workflows/pr-checks.yml',
  'scripts/validate-agent-assets.js',
]);

const relative = (file) => file.replace(`${process.cwd()}/`, '');
const affectsHarness = (file) => {
  const value = relative(file);
  return HARNESS_FILES.has(value) || HARNESS_PREFIXES.some((prefix) => value.startsWith(prefix));
};
```

The callback returns commands in this order:

1. `oxlint --fix` for non-vendored staged JS/TS files, if any.
2. `oxfmt` for non-vendored staged JS/TS/JSON files, if any.
3. `npm run harness:check` when `files.some(affectsHarness)`.

Use the existing `quote()` helper for file arguments. Returning one array from one callback guarantees order.

- [ ] **Step 5: Confirm CI observes harness validation**

Because the `lint` job already executes `npm run lint`, it receives `harness:check` through `validate:agent-assets`. Do not add a seventh required application job. Add a named step before the oxlint version log only if GitHub output would otherwise obscure harness failures:

```yaml
- name: Validate agent harness
  run: npm run harness:check
```

If added, retain the existing `npm run lint` step and all six application jobs.

- [ ] **Step 6: Run integration and syntax checks**

Run:

```bash
node --test scripts/harness/__tests__/integration.test.js
node --check scripts/validate-agent-assets.js
node --check scripts/harness/check.js
node --check scripts/harness/generate.js
node --check scripts/harness/verify_pr.js
npm run harness:test
npm run harness:check
```

Expected: PASS with no generated diff.

- [ ] **Step 7: Commit tooling integration**

```bash
git add package.json lint-staged.config.mjs \
  .github/workflows/pr-checks.yml scripts/harness/__tests__/integration.test.js
git commit -m "ci: enforce harness parity in local and PR checks"
```

Do not stage `.github/workflows/pr-checks.yml` if Step 5 confirms no workflow edit is required.

### Task 9: Record evidence and complete Phase 1 verification

**Files:**

- Modify: `docs/superpowers/reviews/2026-07-24-harness-phase-1-baseline.md`
- Modify: generated targets only through `npm run harness:generate`

- [ ] **Step 1: Measure the after-state with the baseline commands**

Rerun every command recorded under the report's `Before` section, plus:

```bash
node -e "const m=require('./harness/manifest.json'); console.log(JSON.stringify({policyModules:m.policyOrder.length,personas:m.personas.length,generatedTargets:m.targets.length,verificationChecks:m.verification.checks.map((c)=>c.id)},null,2))"
npm run harness:check
git worktree list --porcelain
git -C ../.. status --short
```

Append an `After` section containing the exact command outputs, not remembered audit values. The manifest measurement must report six policy modules, five personas, sixteen generated targets, and the ordered identities `format`, `lint`, `typecheck`, `test`, `doctor`, `prebuild`; otherwise stop and reconcile the implementation.

- [ ] **Step 2: Prove generation idempotence**

Run:

```bash
npm run harness:generate
shasum AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md .claude/commands/*.md
npm run harness:generate
shasum AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md .claude/commands/*.md
```

Expected: the checksum lists are byte-identical and `npm run harness:check` reports no generation-parity error.

- [ ] **Step 3: Scan live harness claims**

Run:

```bash
rg -n 'Babel signals transform is installed|Signals migration shape:|for migrated state, use `@preact/signals-react`|approve(s)? (and|&) merge(s)?|merge(s)? code reviews on the user.s behalf|Gate 1 \\(plan approval\\)|Gate 2 \\(code review\\)' \
  AGENTS.md CLAUDE.md .agents .claude .codex
```

Expected: no matches in registered live MoneyApp policy/persona/command surfaces. Generic historical or upstream skill text is not silently changed; any live match must either become a registered rule violation or be justified in the report.

- [ ] **Step 4: Run all harness and generic asset checks**

Run:

```bash
npm run harness:test
node --test --test-name-pattern='direct target edits|generated files not registered|different consecutive render passes' scripts/harness/__tests__/structure.test.js
node --test --test-name-pattern='reports ' scripts/harness/__tests__/semantics.test.js
npm run harness:check
npm run validate:agent-assets
npm run format:check
npm run lint
npm run typecheck
npm test -- --ci
```

Expected: every command exits 0.

- [ ] **Step 5: Run the canonical full verification**

Run:

```bash
npm run verify:pr
```

Expected: all six checks execute in manifest order and the command ends with `CI parity green — safe to request push authorization`.

- [ ] **Step 6: Update the report with exact evidence**

Append the exact outputs for:

- the before/after measurement commands;
- the direct-generated-edit rejection;
- the unregistered-output rejection;
- the consecutive-render nondeterminism rejection;
- every semantic fixture and its intended stable rule identifier;
- both generation checksum lists;
- generated target line/byte measurements from `harness:check`;
- Node test count and zero live semantic violations;
- the complete six-check verification result;
- `git rev-parse HEAD`;
- before/after `git worktree list --porcelain`;
- before/after main-checkout status showing the unrelated July 23 audit is unchanged.

Do not infer device QA; Phase 1 changes tooling only and does not require a product-behavior device matrix.

- [ ] **Step 7: Commit evidence**

```bash
git add docs/superpowers/reviews/2026-07-24-harness-phase-1-baseline.md
git commit -m "docs: record harness phase 1 verification"
```

- [ ] **Step 8: Request Tariq review**

Use `superpowers:requesting-code-review` with the approved spec, this plan, the complete branch diff, the semantic-rule fixtures, and the verification evidence.

Expected verdict: approve recommendation or a prioritized remediation list. Tariq does not merge.

- [ ] **Step 9: Apply review feedback and re-verify**

For accepted findings, use `superpowers:receiving-code-review`, add or update a failing test first, make the smallest fix, rerun focused tests, then rerun:

```bash
npm run harness:test
npm run harness:check
npm run verify:pr
```

Expected: all commands exit 0 after remediation.

- [ ] **Step 10: Stop at repository-integration authority**

Report the final branch, commits, generated target count, review verdict, verification SHA, and preserved unrelated files. Do not push, open a PR, merge, or clean worktrees without the user's explicit request.

## Plan Self-Review Checklist

- [ ] Every Phase 1 acceptance criterion maps to Tasks 1–9.
- [ ] Both Codex and Claude are generated from the same policy and persona sources.
- [ ] Required semantic claims are evaluated in every registered surface that owns them; one correct file cannot mask another.
- [ ] Manifest inputs, persona sections, placeholders, formats, provenance, parity, orphan outputs, and deterministic generation have failing regression coverage.
- [ ] `harness/manifest.json` is the sole verification-command registry; JavaScript duplicates only the six stable check identities.
- [ ] The six CI checks remain separately observable in GitHub Actions.
- [ ] The signed spec and Sarah-approved plan exist in the implementation worktree's base commit.
- [ ] Before/after report values come from recorded commands and include unrelated-file/worktree preservation evidence.
- [ ] No task implements Phase 2 workflow state, dispatch, PR, QA, session, or cleanup automation.
- [ ] No task adds a dependency or touches React Native application source.
- [ ] Every write is bounded to an exact path and every destructive/integration action remains user-controlled.
- [ ] The existing untracked July 23 review remains untouched.
