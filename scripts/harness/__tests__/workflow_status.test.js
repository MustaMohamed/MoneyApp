const assert = require('node:assert/strict');
const test = require('node:test');

const {
  checkWorkflowStatus,
  formatWorkflowStatus,
  getWorkflowStatus,
  listWorkflowStatuses,
  selectInitiativeId,
} = require('../lib/workflow/status');

const ID = '2026-07-25-status-test';
const OTHER_ID = '2026-07-25-status-other';
const BRANCH = 'refactor/status-test';
const HEAD_SHA = 'a'.repeat(40);
const DIGEST = 'b'.repeat(64);
const CYCLE = 'c'.repeat(64);
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-status-test-design.md',
  sha256: 'd'.repeat(64),
};
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-status-test.md',
  sha256: 'e'.repeat(64),
};

function validationProjection(overrides = {}) {
  return {
    initiative: {
      id: ID,
      title: 'Status test',
      branch: BRANCH,
      baseSha: 'f'.repeat(40),
    },
    phase: 'validation',
    owner: 'tariq',
    sequence: 6,
    latestEvent: {
      type: 'implementation.ready',
      eventHash: CYCLE,
      recordedAt: '2026-07-25T10:00:00.000Z',
    },
    spec: {
      current: SPEC,
      signed: true,
      deviceQaMode: 'not_applicable',
    },
    plan: {
      current: PLAN,
      approved: true,
    },
    delivery: {
      branch: BRANCH,
      headSha: HEAD_SHA,
      contentDigest: DIGEST,
    },
    validationCycleId: CYCLE,
    review: undefined,
    verification: undefined,
    qa: undefined,
    openBlockers: {},
    legalNextEvents: [
      'blocker.opened',
      'initiative.cancelled',
      'plan.revised',
      'review.approved',
      'review.changes_requested',
      'spec.revised',
      'verification.failed',
      'verification.passed',
      'work.reopened',
    ],
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  return {
    discoverInitiativeIds: () => [ID],
    readCurrentBranch: () => BRANCH,
    loadEventHistory: () => ({
      events: [{}],
      paths: ['event.json'],
      projection: validationProjection(),
    }),
    validateArtifactReference: (_root, artifact) => artifact,
    collectDeliveryRevision: () => ({
      branch: BRANCH,
      headSha: HEAD_SHA,
      contentDigest: DIGEST,
    }),
    ...overrides,
  };
}

void test('reports stable JSON evidence and two independent validation actions', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    ...dependencies(),
  });

  assert.deepEqual(Object.keys(status), [
    'schemaVersion',
    'initiativeId',
    'phase',
    'owner',
    'sequence',
    'evidence',
    'blockers',
    'nextActions',
  ]);
  assert.equal(status.schemaVersion, 1);
  assert.equal(status.phase, 'validation');
  assert.equal(status.owner, 'tariq');
  assert.equal(status.sequence, 6);
  assert.deepEqual(status.evidence.latestEvent, {
    type: 'implementation.ready',
    eventHash: CYCLE,
    recordedAt: '2026-07-25T10:00:00.000Z',
  });
  assert.equal(status.evidence.artifacts.spec.status, 'valid');
  assert.equal(status.evidence.artifacts.plan.status, 'valid');
  assert.deepEqual(status.evidence.delivery, {
    status: 'valid',
    branch: BRANCH,
    headSha: HEAD_SHA,
    contentDigest: DIGEST,
    clean: true,
    stale: false,
    errors: [],
  });
  assert.equal(status.evidence.validationCycleId, CYCLE);
  assert.equal(status.evidence.review.status, 'pending');
  assert.equal(status.evidence.verification.status, 'pending');
  assert.equal(status.evidence.qa.status, 'not_applicable');
  assert.deepEqual(status.blockers, []);
  assert.deepEqual(status.nextActions, [
    `npm run workflow -- record review.approved --id ${ID} --expected-sequence 6 --recorded-by tariq --review <review-path> --decision-by tariq --basis <basis>`,
    `npm run workflow -- verify --id ${ID} --expected-sequence 6`,
  ]);

  const human = formatWorkflowStatus(status);
  for (const expected of [
    'Phase: validation',
    'Owner: tariq',
    'Sequence: 6',
    'Latest event: implementation.ready',
    `Branch: ${BRANCH}`,
    `HEAD: ${HEAD_SHA}`,
    `Delivery digest: ${DIGEST}`,
    `Validation cycle: ${CYCLE}`,
    'Review: pending',
    'Verification: pending',
    'QA: not_applicable',
    'Blockers: none',
    'Next actions:',
  ]) {
    assert.match(human, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
});

void test('reports an untracked initiative without inventing workflow state', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    ...dependencies({
      loadEventHistory: () => ({ events: [], paths: [], projection: undefined }),
    }),
  });

  assert.equal(status.phase, 'untracked');
  assert.equal(status.owner, 'none');
  assert.equal(status.sequence, 0);
  assert.equal(status.evidence.ledger.status, 'untracked');
  assert.deepEqual(status.nextActions, [
    `npm run workflow -- init --id ${ID} --title <title> --branch <non-main-branch> --base-sha <40-char-sha>`,
  ]);
  assert.match(formatWorkflowStatus(status), /untracked initiative/i);
  assert.equal(checkWorkflowStatus(status).ok, false);
});

void test('contains invalid ledger errors instead of throwing from status', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    ...dependencies({
      loadEventHistory: () => {
        throw new Error('parent hash mismatch');
      },
    }),
  });

  assert.equal(status.phase, 'invalid');
  assert.equal(status.evidence.ledger.status, 'invalid');
  assert.deepEqual(status.evidence.ledger.errors, ['parent hash mismatch']);
  assert.deepEqual(status.nextActions, []);
  assert.match(formatWorkflowStatus(status), /Ledger errors: parent hash mismatch/);
  assert.deepEqual(checkWorkflowStatus(status), {
    ok: false,
    errors: ['parent hash mismatch'],
    status,
  });
});

void test('reports stale artifacts without rewriting their recorded references', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    ...dependencies({
      validateArtifactReference: (_root, artifact) => {
        if (artifact.path === SPEC.path) throw new Error('Stale artifact: digest changed');
        return artifact;
      },
    }),
  });

  assert.deepEqual(status.evidence.artifacts.spec, {
    path: SPEC.path,
    sha256: SPEC.sha256,
    status: 'stale',
    errors: ['Stale artifact: digest changed'],
  });
  assert.equal(checkWorkflowStatus(status).ok, false);
});

void test('reports dirty delivery and branch mismatch as invalid evidence', async (t) => {
  for (const message of [
    'Delivery is dirty outside evidence paths: ["src/file.js"]',
    'Branch mismatch: expected refactor/status-test; observed refactor/other',
  ]) {
    await t.test(message, () => {
      const status = getWorkflowStatus({
        root: '/repo',
        initiativeId: ID,
        machine: {},
        ...dependencies({
          collectDeliveryRevision: () => {
            throw new Error(message);
          },
        }),
      });

      assert.equal(status.evidence.delivery.status, 'error');
      assert.equal(status.evidence.delivery.clean, !/dirty/i.test(message));
      assert.equal(status.evidence.delivery.stale, true);
      assert.deepEqual(status.evidence.delivery.errors, [message]);
      assert.match(
        formatWorkflowStatus(status),
        new RegExp(message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
      );
      assert.equal(checkWorkflowStatus(status).ok, false);
    });
  }
});

void test('requires an explicit id when current branch maps to multiple initiatives', () => {
  const projectionFor = (id) =>
    validationProjection({
      initiative: { ...validationProjection().initiative, id },
    });
  assert.throws(
    () =>
      selectInitiativeId({
        root: '/repo',
        machine: {},
        discoverInitiativeIds: () => [ID, OTHER_ID],
        readCurrentBranch: () => BRANCH,
        loadEventHistory: (_options) => ({
          events: [{}],
          projection: projectionFor(_options.initiativeId),
        }),
      }),
    /multiple initiatives.*--id/i,
  );
});

void test('selects the unique active ledger for the current branch', () => {
  const selected = selectInitiativeId({
    root: '/repo',
    machine: {},
    discoverInitiativeIds: () => [ID, OTHER_ID],
    readCurrentBranch: () => BRANCH,
    loadEventHistory: ({ initiativeId }) => ({
      events: [{}],
      projection: validationProjection({
        initiative: {
          ...validationProjection().initiative,
          id: initiativeId,
          branch: initiativeId === ID ? BRANCH : 'refactor/other',
        },
      }),
    }),
  });

  assert.equal(selected, ID);
});

void test('list is deterministic and contains one invalid ledger without aborting others', () => {
  const result = listWorkflowStatuses({
    root: '/repo',
    machine: {},
    discoverInitiativeIds: () => [OTHER_ID, ID],
    loadEventHistory: ({ initiativeId }) => {
      if (initiativeId === OTHER_ID) throw new Error('corrupt ledger');
      return {
        events: [{}],
        projection: validationProjection(),
      };
    },
    validateArtifactReference: (_root, artifact) => artifact,
    collectDeliveryRevision: () => ({
      branch: BRANCH,
      headSha: HEAD_SHA,
      contentDigest: DIGEST,
    }),
  });

  assert.deepEqual(
    result.map((status) => status.initiativeId),
    [OTHER_ID, ID],
  );
  assert.equal(result[0].phase, 'invalid');
  assert.equal(result[1].phase, 'validation');
});

void test('integration-ready status exposes user authority without an integration command', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    ...dependencies({
      loadEventHistory: () => ({
        events: [{}],
        projection: validationProjection({
          phase: 'integration_ready',
          owner: 'user',
          review: { status: 'approved' },
          verification: { status: 'passed' },
          legalNextEvents: ['blocker.opened', 'plan.revised', 'spec.revised', 'work.reopened'],
        }),
      }),
    }),
  });

  assert.equal(status.evidence.explicitUserAction, true);
  assert.deepEqual(status.nextActions, [
    'Explicit user request required for push, PR, merge, or other repository integration.',
  ]);
  assert.doesNotMatch(status.nextActions.join('\n'), /git (push|merge)|gh pr/);
});

void test('does not report validation receipts as pending before a validation cycle exists', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    ...dependencies({
      loadEventHistory: () => ({
        events: [{}],
        projection: validationProjection({
          phase: 'execution',
          owner: 'dev',
          sequence: 5,
          delivery: undefined,
          validationCycleId: undefined,
          review: undefined,
          verification: undefined,
          qa: undefined,
          legalNextEvents: ['implementation.ready'],
        }),
      }),
    }),
  });

  assert.equal(status.evidence.review.status, 'not_applicable');
  assert.equal(status.evidence.verification.status, 'not_applicable');
  assert.equal(status.evidence.qa.status, 'not_applicable');
});
