const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');

void test('feature command exposes only current human gates', () => {
  const text = fs.readFileSync(path.join(root, '.claude/commands/feature.md'), 'utf8');
  assert.match(text, /Spec sign-off/);
  assert.match(text, /Device QA/);
  assert.match(text, /critical trigger/);
  assert.match(text, /npm run workflow -- status/);
  assert.match(text, /npm run workflow -- init/);
  assert.match(text, /ledger/i);
  assert.doesNotMatch(text, /Gate 1 \(plan approval\)|Gate 2 \(code review\)/);
  assert.match(text, /Do not infer[\s\S]*chat/i);
});

void test('status command reports repository-integration authority separately', () => {
  const text = fs.readFileSync(path.join(root, '.claude/commands/status.md'), 'utf8');
  assert.match(text, /push, merge, or destructive action awaiting an explicit user request/);
  assert.match(text, /npm run workflow -- status.*--json/);
  assert.match(text, /ledger/i);
  assert.match(text, /Do not infer[\s\S]*chat/i);
  assert.doesNotMatch(text, /Gate 1|Gate 2/);
});
