const assert = require('node:assert/strict');
const test = require('node:test');

const { verifyWorkflow } = require('../lib/workflow/verify');

const ID = '2026-07-25-verify-test';
const BRANCH = 'refactor/verify-test';
const DIGEST = 'a'.repeat(64);
const CYCLE = 'b'.repeat(64);
const HEAD = 'c'.repeat(40);
const CHECKS = [
  { id: 'format', local: ['npm', 'run', 'format:check'] },
  { id: 'lint', local: ['npm', 'run', 'lint'] },
];

function projection(overrides = {}) {
  return {
    phase: 'validation',
    sequence: 6,
    validationCycleId: CYCLE,
    initiative: { id: ID, branch: BRANCH },
    delivery: {
      branch: BRANCH,
      headSha: HEAD,
      contentDigest: DIGEST,
    },
    ...overrides,
  };
}

function dependencies(overrides = {}) {
  const calls = [];
  let snapshotCount = 0;
  const projections = overrides.projections ?? [projection(), projection(), projection()];
  const revisions = overrides.revisions ?? [
    { branch: BRANCH, headSha: HEAD, contentDigest: DIGEST },
    { branch: BRANCH, headSha: 'd'.repeat(40), contentDigest: DIGEST },
    { branch: BRANCH, headSha: 'e'.repeat(40), contentDigest: DIGEST },
  ];
  let revisionCount = 0;
  let appended;

  return {
    calls,
    get appended() {
      return appended;
    },
    options: {
      root: '/repo',
      initiativeId: ID,
      expectedSequence: 6,
      machine: { events: {} },
      checks: CHECKS,
      clock: () => new Date('2026-07-25T12:00:00.000Z'),
      withWorkflowLock({ callback }) {
        calls.push('lock');
        const result = callback();
        calls.push('unlock');
        return result;
      },
      loadEventHistory() {
        calls.push(`history:${snapshotCount}`);
        const current = projections[Math.min(snapshotCount, projections.length - 1)];
        snapshotCount += 1;
        return { events: Array.from({ length: current.sequence }), projection: current };
      },
      collectDeliveryRevision() {
        calls.push(`revision:${revisionCount}`);
        const current = revisions[Math.min(revisionCount, revisions.length - 1)];
        revisionCount += 1;
        if (current instanceof Error) throw current;
        return current;
      },
      runVerification() {
        calls.push('checks');
        return (
          overrides.verification ?? {
            ok: true,
            failedCheck: undefined,
            checks: [
              { id: 'format', status: 'passed' },
              { id: 'lint', status: 'passed' },
            ],
          }
        );
      },
      appendEvent(options) {
        calls.push('append');
        options.validateCurrent({
          history: {
            events: Array.from({ length: projections.at(-1).sequence }),
            projection: projections.at(-1),
          },
          nextSequence: projections.at(-1).sequence + 1,
        });
        appended = options;
        return {
          ...options.draft,
          initiativeId: ID,
          sequence: options.expectedSequence,
          eventHash: 'f'.repeat(64),
        };
      },
      ...overrides.dependencies,
    },
  };
}

void test('locks before and after checks and records a fresh passed receipt', () => {
  const fixture = dependencies();
  const result = verifyWorkflow(fixture.options);

  assert.equal(result.recorded, true);
  assert.equal(result.event.type, 'verification.passed');
  assert.deepEqual(result.event.payload, {
    delivery: {
      branch: BRANCH,
      headSha: 'd'.repeat(40),
      contentDigest: DIGEST,
      validationCycleId: CYCLE,
    },
    checks: [
      { id: 'format', status: 'passed' },
      { id: 'lint', status: 'passed' },
    ],
  });
  assert.equal(fixture.appended.expectedSequence, 7);
  assert.deepEqual(fixture.calls.slice(0, 7), [
    'lock',
    'history:0',
    'revision:0',
    'unlock',
    'checks',
    'lock',
    'history:1',
  ]);
  assert(fixture.calls.indexOf('append') > fixture.calls.lastIndexOf('unlock'));
});

void test('records a structured failed receipt only after unchanged post-check facts', () => {
  const fixture = dependencies({
    verification: {
      ok: false,
      failedCheck: 'lint',
      checks: [
        { id: 'format', status: 'passed' },
        { id: 'lint', status: 'failed' },
      ],
    },
  });

  const result = verifyWorkflow(fixture.options);

  assert.equal(result.event.type, 'verification.failed');
  assert.equal(result.event.payload.failedCheck, 'lint');
  assert.deepEqual(result.event.payload.checks.at(-1), { id: 'lint', status: 'failed' });
});

void test('records nothing when sequence, cycle, branch, digest, or cleanliness changes', async (t) => {
  const cases = [
    ['sequence', projection({ sequence: 7 })],
    ['validationCycleId', projection({ validationCycleId: '9'.repeat(64) })],
    [
      'branch',
      projection({
        initiative: { id: ID, branch: 'refactor/other' },
        delivery: { branch: 'refactor/other', headSha: HEAD, contentDigest: DIGEST },
      }),
    ],
    ['contentDigest', projection()],
    ['cleanliness', projection()],
  ];

  for (const [field, postProjection] of cases) {
    await t.test(field, () => {
      const revisions =
        field === 'contentDigest'
          ? [
              { branch: BRANCH, headSha: HEAD, contentDigest: DIGEST },
              { branch: BRANCH, headSha: HEAD, contentDigest: '8'.repeat(64) },
            ]
          : field === 'cleanliness'
            ? [
                { branch: BRANCH, headSha: HEAD, contentDigest: DIGEST },
                new Error('Delivery is dirty outside evidence paths'),
              ]
            : undefined;
      const fixture = dependencies({
        projections: [projection(), postProjection],
        ...(revisions ? { revisions } : {}),
      });

      const result = verifyWorkflow(fixture.options);

      assert.equal(result.recorded, false);
      assert.match(result.reason, new RegExp(field, 'i'));
      assert.equal(fixture.appended, undefined);
    });
  }
});

void test('final locked append precondition rejects facts that change after post-check capture', () => {
  const fixture = dependencies({
    projections: [projection(), projection(), projection({ validationCycleId: '7'.repeat(64) })],
  });

  assert.throws(
    () => verifyWorkflow(fixture.options),
    /validationCycleId changed before verification receipt append/i,
  );
  assert.equal(fixture.appended, undefined);
});

void test('requires the observed sequence and an active validation cycle', () => {
  const stale = dependencies();
  stale.options.expectedSequence = 5;
  assert.throws(() => verifyWorkflow(stale.options), /Stale expected sequence/i);

  const execution = dependencies({
    projections: [projection({ phase: 'execution', validationCycleId: undefined })],
  });
  assert.throws(() => verifyWorkflow(execution.options), /active validation cycle/i);
});
