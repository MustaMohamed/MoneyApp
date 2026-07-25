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

void test('accepts the installed Zustand stack', () => {
  assert.deepEqual(validateDependencyFacts(cleanPackage, cleanLock, zustandSource), []);
});

void test('rejects Zustand guidance without dependency, lockfile, and source evidence', () => {
  for (const [pkg, lock, source] of [
    [{ dependencies: {} }, cleanLock, zustandSource],
    [cleanPackage, { packages: {} }, zustandSource],
    [cleanPackage, cleanLock, ''],
  ]) {
    const errors = validateDependencyFacts(pkg, lock, source);
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
