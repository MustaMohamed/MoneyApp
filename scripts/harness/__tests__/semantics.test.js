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
const valid = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/fixtures/valid/minimal.json'), 'utf8'),
);
const signalsRule = rules.find((rule) => rule.id === 'STACK-NO-SIGNALS');
const dangerousFiles = { 'AGENTS.md': 'Use Preact Signals for all shared state.' };

void test('rejects an empty semantic rule registry', () => {
  const errors = evaluateRules([], dangerousFiles, { requireCompleteScope: true });
  assert(errors.some((error) => error.ruleId === 'SEMANTIC-RULE-REGISTRY'));
});

void test('rejects a semantic registry with a required rule missing', () => {
  const errors = evaluateRules(
    rules.filter((rule) => rule.id !== 'UI-HEROUI'),
    dangerousFiles,
    { requireCompleteScope: true },
  );
  assert(
    errors.some(
      (error) => error.ruleId === 'SEMANTIC-RULE-REGISTRY' && error.message.includes('UI-HEROUI'),
    ),
  );
});

void test('rejects duplicate semantic rule ids', () => {
  const errors = evaluateRules([...rules, { ...rules[0] }], dangerousFiles, {
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
    rules.map((rule) =>
      rule.id === 'STACK-NO-SIGNALS' ? { ...rule, forbidPositiveSignalsGuidance: 'true' } : rule,
    ),
  ];

  for (const registry of malformedRegistries) {
    let errors;
    assert.doesNotThrow(() => {
      errors = evaluateRules(registry, dangerousFiles, { requireCompleteScope: true });
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

void test('accepts rollback and negated Signals guidance', () => {
  assert.deepEqual(evaluateRules([signalsRule], valid), []);
});

for (const [name, text] of [
  ['coordinated technology directive', 'Avoid Zustand and adopt Preact Signals.'],
  [
    'coordinated passive follow-up',
    '@preact/signals-react is not installed and should be enabled.',
  ],
  ['mixed technology directive', 'Do not use Zustand, use @preact/signals-react instead.'],
  [
    'contrastive pronoun directive',
    '@preact/signals-react is not installed yet, but use it after installation.',
  ],
  [
    'semicolon however pronoun directive',
    '@preact/signals-react is not installed; however, enable it after installation.',
  ],
  ['unrelated technology preference', 'Avoid Zustand in favor of Preact Signals.'],
  ['unrelated technology negation', 'Do not use Zustand and choose Preact Signals.'],
  [
    'preferred stack before unrelated negation',
    'Preact Signals is the preferred stack, but do not use Zustand.',
  ],
  [
    'adoption before unrelated negation',
    'Preact Signals should be adopted, but do not use Zustand.',
  ],
  ['passive recommendation follow-up', 'Preact Signals is not installed but is recommended.'],
  [
    'restricted package with enabled transform',
    'Do not use @preact/signals-react while enabling the signals transform.',
  ],
  [
    'restricted package with installed transform',
    'Do not use Preact Signals without installing the signals-react transform.',
  ],
  ['unqualified shared-state directive', 'Use Signals for shared state.'],
  ['lowercase unqualified shared-state directive', 'Use signals for shared state.'],
  ['unqualified required store model', 'Signals stores are the required state model.'],
  ['uppercase unqualified required store model', 'SIGNALS stores are the required state model.'],
  ['implicit positive follow-up', '@preact/signals-react is not installed. Enable when needed.'],
]) {
  void test(`reports positive Signals guidance in ${name}`, () => {
    const errors = evaluateRules([signalsRule], { 'AGENTS.md': text });
    assert(errors.some((error) => error.ruleId === 'STACK-NO-SIGNALS'));
  });
}

void test('accepts unrelated uses of the word signals', () => {
  assert.deepEqual(
    evaluateRules([signalsRule], {
      'AGENTS.md': 'Traffic signals coordinate vehicles at the intersection.',
    }),
    [],
  );
});

for (const [name, text] of [
  ['must not be used', 'Preact Signals must not be used.'],
  ['not allowed', '@preact/signals-react is not allowed in this repository.'],
  ['out of scope', 'Preact Signals remains out of scope.'],
  ['outside supported stack', 'Preact Signals is outside the supported stack.'],
  ['unsupported package', '@preact/signals-react is unsupported in this repository.'],
  ['may not be used', 'Preact Signals may not be used.'],
  ['not permitted', '@preact/signals-react is not permitted in this repository.'],
  ['not part of stack', 'Preact Signals is not part of the current stack.'],
  ['keep disabled', 'Keep Preact Signals disabled.'],
  [
    'canonical rollback',
    '**Signals rollback:** `@preact/signals-react` and its Babel transform are not installed.',
  ],
  [
    'all-negative multi-reference clause',
    '@preact/signals-react is not installed while the signals transform remains disabled.',
  ],
  [
    'coordinated trailing restriction',
    '@preact/signals-react and the signals transform are not installed.',
  ],
  ['coordinated prefix restriction', 'Do not use @preact/signals-react or the signals transform.'],
  [
    'neither nor restriction',
    'Neither @preact/signals-react nor the signals transform is installed.',
  ],
]) {
  void test(`accepts negative Signals policy for ${name}`, () => {
    assert.deepEqual(evaluateRules([signalsRule], { 'AGENTS.md': text }), []);
  });
}
