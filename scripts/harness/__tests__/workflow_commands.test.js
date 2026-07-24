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
  assert.doesNotMatch(text, /Gate 1 \(plan approval\)|Gate 2 \(code review\)/);
});

void test('status command reports repository-integration authority separately', () => {
  const text = fs.readFileSync(path.join(root, '.claude/commands/status.md'), 'utf8');
  assert.match(text, /push, merge, or destructive action awaiting an explicit user request/);
  assert.doesNotMatch(text, /Gate 1|Gate 2/);
});
