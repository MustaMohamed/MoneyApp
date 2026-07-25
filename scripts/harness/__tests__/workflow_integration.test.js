const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { collectWorkflowValidationErrors } = require('../lib/workflow/check');

const root = path.resolve(__dirname, '../../..');
const ID = '2026-07-25-integration-test';
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-integration-test-design.md',
  sha256: 'a'.repeat(64),
};
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-integration-test.md',
  sha256: 'b'.repeat(64),
};
const REVIEW = {
  path: 'docs/superpowers/reviews/2026-07-25-integration-test.md',
  sha256: 'c'.repeat(64),
};
const QA = {
  path: 'docs/superpowers/qa/2026-07-25-integration-test.md',
  sha256: 'd'.repeat(64),
};

void test('read-only harness validation replays every ledger and validates latest active artifacts', () => {
  const calls = [];
  const errors = collectWorkflowValidationErrors({
    root: '/repo',
    manifest: {},
    machine: {},
    discoverInitiativeIds: () => [ID],
    loadEventHistory: () => ({
      projection: {
        spec: { current: SPEC },
        plan: { current: PLAN },
        review: { artifact: REVIEW },
        qa: { artifact: QA },
      },
    }),
    validateArtifactReference: (_root, artifact) => {
      calls.push(artifact);
      return artifact;
    },
  });

  assert.deepEqual(errors, []);
  assert.deepEqual(calls, [SPEC, PLAN, REVIEW, QA]);
});

void test('ledger and latest-artifact failures become deterministic harness errors', () => {
  const errors = collectWorkflowValidationErrors({
    root: '/repo',
    manifest: {},
    machine: {},
    discoverInitiativeIds: () => [`${ID}-bad-ledger`, `${ID}-stale-spec`],
    loadEventHistory: ({ initiativeId }) => {
      if (initiativeId.endsWith('bad-ledger')) throw new Error('event chain forked');
      return { projection: { spec: { current: SPEC } } };
    },
    validateArtifactReference: () => {
      throw new Error('artifact digest is stale');
    },
  });

  assert.equal(errors.length, 2);
  assert.match(errors[0].message, /event chain forked/);
  assert.match(errors[1].message, /artifact digest is stale/);
  assert(errors.every((error) => error.ruleId === 'WORKFLOW-STATE'));
});

void test('canonical workflow policy makes the initiative ledger authoritative without integration authority', () => {
  const policy = fs.readFileSync(path.join(root, 'harness/policy/workflow.md'), 'utf8');
  assert.match(policy, /ledger[\s\S]*workflow\s+authority/i);
  assert.match(policy, /npm run workflow -- status/);
  assert.match(policy, /initiative-level events/i);
  assert.match(
    policy,
    /explicit user[\s\S]*request[\s\S]*push|push[\s\S]*explicit user[\s\S]*request/i,
  );
  assert.doesNotMatch(policy, /global active-state authority/i);
});

void test('canonical check imports read-only workflow validation and CI remains six jobs', () => {
  const check = fs.readFileSync(path.join(root, 'scripts/harness/check.js'), 'utf8');
  const workflow = fs.readFileSync(path.join(root, '.github/workflows/pr-checks.yml'), 'utf8');
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'harness/manifest.json'), 'utf8'));

  assert.match(check, /collectWorkflowValidationErrors/);
  assert.equal(manifest.targets.length, 16);
  assert.equal(manifest.verification.checks.length, 6);
  const jobs = workflow.slice(workflow.indexOf('\njobs:\n'));
  assert.deepEqual(
    (jobs.match(/^  ([a-z][a-z-]*):\s*$/gmu) ?? []).map((line) => line.trim().slice(0, -1)),
    ['install', 'typecheck', 'lint', 'format', 'doctor', 'test', 'prebuild-check'],
  );
});
