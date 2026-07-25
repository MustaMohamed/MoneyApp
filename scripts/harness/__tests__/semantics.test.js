const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { evaluateRules, globToRegExp } = require('../lib/semantics');

const root = path.resolve(__dirname, '../../..');
const rules = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/rules/semantics.json'), 'utf8'),
).rules;
const cases = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/fixtures/invalid/semantic_cases.json'), 'utf8'),
);
const scopedFiles = { 'AGENTS.md': 'MoneyApp harness policy.' };
const expectedRuleIds = [
  'AUTH-USER-INTEGRATION',
  'GATE-SPEC-SIGNOFF',
  'GATE-DEVICE-QA',
  'GATE-CRITICAL-TRIGGER',
  'LEAD-PLAN-APPROVAL',
  'LEAD-REVIEW-VERDICT',
  'STACK-ZUSTAND',
  'PATH-SRC-CANONICAL',
  'UI-HEROUI',
  'PERSONA-SARAH-OWNERSHIP',
  'PERSONA-MARCUS-OWNERSHIP',
  'PERSONA-LAYLA-OWNERSHIP',
  'PERSONA-TARIQ-OWNERSHIP',
  'PERSONA-DEV-OWNERSHIP',
];

void test('semantic registry contains only current binding decisions', () => {
  assert.deepEqual(
    rules.map((rule) => rule.id),
    expectedRuleIds,
  );
});

void test('rejects an empty semantic rule registry', () => {
  const errors = evaluateRules([], scopedFiles, { requireCompleteScope: true });
  assert(errors.some((error) => error.ruleId === 'SEMANTIC-RULE-REGISTRY'));
});

void test('rejects a semantic registry with a required rule missing', () => {
  const errors = evaluateRules(
    rules.filter((rule) => rule.id !== 'UI-HEROUI'),
    scopedFiles,
    { requireCompleteScope: true },
  );
  assert(
    errors.some(
      (error) => error.ruleId === 'SEMANTIC-RULE-REGISTRY' && error.message.includes('UI-HEROUI'),
    ),
  );
});

void test('rejects duplicate semantic rule ids', () => {
  const errors = evaluateRules([...rules, { ...rules[0] }], scopedFiles, {
    requireCompleteScope: true,
  });
  assert(
    errors.some(
      (error) => error.ruleId === 'SEMANTIC-RULE-REGISTRY' && /duplicate/.test(error.message),
    ),
  );
});

void test('returns focused errors for malformed semantic registries without throwing', () => {
  const malformedRegistries = [
    undefined,
    rules.map((rule, index) => (index === 0 ? null : rule)),
    rules.map((rule, index) => (index === 0 ? { ...rule, id: '' } : rule)),
    rules.map((rule, index) => (index === 0 ? { ...rule, files: [] } : rule)),
    rules.map((rule, index) => (index === 0 ? { ...rule, files: ['../AGENTS.md'] } : rule)),
    rules.map((rule, index) => (index === 0 ? { ...rule, require: 'claim' } : rule)),
    rules.map((rule, index) => (index === 0 ? { ...rule, forbid: null } : rule)),
  ];

  for (const registry of malformedRegistries) {
    let errors;
    assert.doesNotThrow(() => {
      errors = evaluateRules(registry, scopedFiles, { requireCompleteScope: true });
    });
    assert(errors.some((error) => error.ruleId === 'SEMANTIC-RULE-REGISTRY'));
  }
});

void test('double-star directory globs match zero or more directories without escaping scope', () => {
  const pattern = globToRegExp('.agents/**/*.md');
  assert(pattern.test('.agents/policy.md'));
  assert(pattern.test('.agents/skills/policy.md'));
  assert(!pattern.test('.claude/policy.md'));
  assert(!pattern.test('../.agents/policy.md'));
});

for (const fixture of cases) {
  void test(`reports ${fixture.name}`, () => {
    const errors = evaluateRules(rules, fixture.files, { requireCompleteScope: false });
    assert(errors.some((error) => error.ruleId === fixture.expectedRule));
  });
}
