const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  REQUIRED_CHECK_IDS,
  validateDependencyFacts,
  validateIntegrationContract,
  validateRepositoryPaths,
  validateVerificationContract,
} = require('../lib/repository_facts');

const cleanPackage = { dependencies: { zustand: '^5.0.12' }, devDependencies: {} };
const cleanLock = { packages: { 'node_modules/zustand': {} } };
const zustandSource = "import { create } from 'zustand';";
const rollbackGuidance =
  '@preact/signals-react and its Babel transform are not installed. ' +
  'Reintroducing Signals requires a new approved plan. Do not use Preact Signals.';

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
    live: '',
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
    live: '',
    source: zustandSource,
    babel: '',
  },
  {
    name: 'Babel config',
    pkg: cleanPackage,
    lock: cleanLock,
    live: '',
    source: zustandSource,
    babel: "plugins: ['@preact/signals-react-transform']",
  },
  {
    name: 'source import',
    pkg: cleanPackage,
    lock: cleanLock,
    live: '',
    source: `${zustandSource}\nimport { signal } from '@preact/signals-react';`,
    babel: '',
  },
  {
    name: 'stale live guidance',
    pkg: cleanPackage,
    lock: cleanLock,
    live: 'Signals migration shape: use signal refs.',
    source: zustandSource,
    babel: '',
  },
  ...[
    'Use @preact/signals-react for migrated state.',
    'Prefer Preact Signals for shared state.',
    'Enforce @preact/signals-react as the state model.',
    'Migrate shared state to Preact Signals.',
    'State stack: @preact/signals-react.',
    'The signals transform is installed.',
  ].map((live, index) => ({
    name: `positive live guidance ${index + 1}`,
    pkg: cleanPackage,
    lock: cleanLock,
    live,
    source: zustandSource,
    babel: '',
  })),
]) {
  void test(`rejects Signals reappearance in ${fixture.name}`, () => {
    const errors = validateDependencyFacts(
      fixture.pkg,
      fixture.lock,
      fixture.live,
      fixture.source,
      fixture.babel,
    );
    assert(errors.some((error) => error.ruleId === 'STACK-NO-SIGNALS'));
  });
}

void test('accepts the installed Zustand stack with no Signals evidence', () => {
  assert.deepEqual(
    validateDependencyFacts(cleanPackage, cleanLock, rollbackGuidance, zustandSource, ''),
    [],
  );
});

for (const [name, liveText] of [
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
  void test(`rejects positive Signals repository guidance in ${name}`, () => {
    const errors = validateDependencyFacts(cleanPackage, cleanLock, liveText, zustandSource, '');
    assert(errors.some((error) => error.ruleId === 'STACK-NO-SIGNALS'));
  });
}

void test('accepts unrelated repository uses of the word signals', () => {
  assert.deepEqual(
    validateDependencyFacts(
      cleanPackage,
      cleanLock,
      'Traffic signals coordinate vehicles at the intersection.',
      zustandSource,
      '',
    ),
    [],
  );
});

for (const [name, liveText] of [
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
  void test(`accepts negative Signals repository policy for ${name}`, () => {
    assert.deepEqual(
      validateDependencyFacts(cleanPackage, cleanLock, liveText, zustandSource, ''),
      [],
    );
  });
}

void test('rejects Zustand guidance without dependency, lockfile, and source evidence', () => {
  for (const [pkg, lock, source] of [
    [{ dependencies: {} }, cleanLock, zustandSource],
    [cleanPackage, { packages: {} }, zustandSource],
    [cleanPackage, cleanLock, ''],
  ]) {
    const errors = validateDependencyFacts(pkg, lock, '', source, '');
    assert(errors.some((error) => error.ruleId === 'STACK-ZUSTAND'));
  }
});

// The node:test runner owns these registration promises and reports their failures.
void test('rejects missing canonical paths and persona surfaces', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-harness-facts-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const errors = validateRepositoryPaths(root, {
    personas: [{ id: 'dev' }],
    targets: [],
  });
  assert(errors.some((error) => error.ruleId === 'PATH-SRC-CANONICAL'));
  assert(errors.some((error) => error.ruleId === 'PERSONA-SURFACE-REGISTRATION'));
});

void test('accepts six registered CI checks with their exact job commands', () => {
  const root = path.resolve(__dirname, '../../..');
  const checks = JSON.parse(fs.readFileSync(path.join(root, 'harness/manifest.json'), 'utf8'))
    .verification.checks;
  const workflow = checks
    .map((check) => `  ${check.ci.job}:\n    steps:\n      - run: ${check.ci.run}\n`)
    .join('');

  assert.deepEqual(
    checks.map((check) => check.id),
    REQUIRED_CHECK_IDS,
  );
  assert.deepEqual(validateVerificationContract(checks, workflow), []);
});

void test('rejects reordered verification identities', () => {
  const root = path.resolve(__dirname, '../../..');
  const checks = structuredClone(
    JSON.parse(fs.readFileSync(path.join(root, 'harness/manifest.json'), 'utf8')).verification
      .checks,
  );
  [checks[0], checks[1]] = [checks[1], checks[0]];
  const workflow = checks
    .map((check) => `  ${check.ci.job}:\n    steps:\n      - run: ${check.ci.run}\n`)
    .join('');

  const errors = validateVerificationContract(checks, workflow);
  assert(errors.some((error) => error.ruleId === 'VERIFY-SIX-CHECKS'));
});

void test('rejects a workflow missing the registered doctor job', () => {
  const root = path.resolve(__dirname, '../../..');
  const checks = JSON.parse(fs.readFileSync(path.join(root, 'harness/manifest.json'), 'utf8'))
    .verification.checks;
  const workflow = checks
    .filter((check) => check.id !== 'doctor')
    .map((check) => `  ${check.ci.job}:\n    steps:\n      - run: ${check.ci.run}\n`)
    .join('');

  const errors = validateVerificationContract(checks, workflow);
  assert(errors.some((error) => error.ruleId === 'VERIFY-SIX-CHECKS'));
});

void test('rejects malformed verification registry entries', () => {
  const checks = REQUIRED_CHECK_IDS.map((id) => ({
    id,
    local: id === 'lint' ? [] : ['command'],
    ci: { job: id, run: 'command' },
    ...(id === 'prebuild' ? { assertDirectory: 'android' } : {}),
  }));
  const workflow = checks
    .map((check) => `  ${check.ci.job}:\n    steps:\n      - run: ${check.ci.run}\n`)
    .join('');

  const errors = validateVerificationContract(checks, workflow);
  assert(errors.some((error) => error.message === 'invalid registry entry for lint'));
});

void test('accepts the canonical package script and pre-push delegation', () => {
  assert.deepEqual(
    validateIntegrationContract(
      { scripts: { 'verify:pr': 'node scripts/harness/verify_pr.js' } },
      'npm run verify:pr\n',
    ),
    [],
  );
});

void test('rejects a pre-push hook that duplicates verification commands', () => {
  const errors = validateIntegrationContract(
    { scripts: { 'verify:pr': 'node scripts/harness/verify_pr.js' } },
    'npm test && npm run typecheck\n',
  );

  assert(errors.some((error) => error.ruleId === 'VERIFY-SIX-CHECKS'));
});
