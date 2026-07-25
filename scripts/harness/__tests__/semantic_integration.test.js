const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../lib/manifest');
const { resolveInside } = require('../lib/paths');
const { renderAll } = require('../lib/render');
const { evaluateRules } = require('../lib/semantics');

const root = path.resolve(__dirname, '../../..');

void test('all sixteen rendered targets satisfy every scoped semantic rule', () => {
  const manifest = loadManifest(root);
  const rendered = renderAll(root, manifest);
  const files = Object.fromEntries(rendered);
  const rules = JSON.parse(fs.readFileSync(resolveInside(root, manifest.rules), 'utf8')).rules;

  assert.equal(rendered.size, 16);
  assert.deepEqual(evaluateRules(rules, files, { requireCompleteScope: true }), []);
});

void test('supported execution surfaces share the provider-neutral packet protocol', () => {
  const rendered = renderAll(root, loadManifest(root));
  const protocolSurfaces = [
    'AGENTS.md',
    'CLAUDE.md',
    '.codex/agents/sarah.toml',
    '.codex/agents/tariq.toml',
    '.codex/agents/dev.toml',
    '.claude/agents/sarah.md',
    '.claude/agents/tariq.md',
    '.claude/agents/dev.md',
    '.agents/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/commands/feature.md',
    '.claude/commands/status.md',
  ];
  const required = [
    /initiative\s+and\s+task\s+status/i,
    /exact\s+current\s+packet/i,
    /packet\s+write\s+scopes/i,
    /not\s+automatically\s+executed/i,
    /host\s+dispatcher/i,
    /explicit\s+user\s+request/i,
  ];
  const forbidden = [
    /repository dispatches agents/i,
    /harness dispatches agents/i,
    /executes packet commands/i,
    /workers record task events/i,
    /concurrent task claims/i,
    /task packets authorize push/i,
  ];

  for (const file of protocolSurfaces) {
    const text = rendered.get(file);
    for (const claim of required) assert.match(text, claim, `${file} is missing ${claim}`);
    for (const claim of forbidden) assert.doesNotMatch(text, claim, `${file} contains ${claim}`);
  }
});
