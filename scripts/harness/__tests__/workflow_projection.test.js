const assert = require('node:assert/strict');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../lib/manifest');
const { finalizeEvent } = require('../lib/workflow/canonical');
const { loadWorkflowMachine } = require('../lib/workflow/machine');
const { replayEvents } = require('../lib/workflow/projection');

const root = path.resolve(__dirname, '../../..');
const machine = loadWorkflowMachine(root, loadManifest(root));
const INITIATIVE_ID = '2026-07-25-example';
const BRANCH = 'refactor/example';
const BASE_SHA = 'a'.repeat(40);
const HEAD_SHA = 'b'.repeat(40);
const CONTENT_DIGEST = 'c'.repeat(64);
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-example-design.md',
  sha256: 'd'.repeat(64),
};
const REVISED_SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-example-design.md',
  sha256: 'e'.repeat(64),
};
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-example.md',
  sha256: 'f'.repeat(64),
};
const REVISED_PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-example.md',
  sha256: '1'.repeat(64),
};
const REVIEW = {
  path: 'docs/superpowers/reviews/2026-07-25-example-review.md',
  sha256: '2'.repeat(64),
};
const QA = {
  path: 'docs/superpowers/qa/2026-07-25-example-qa.md',
  sha256: '3'.repeat(64),
};
const USER_AUTHORITY = {
  decisionBy: 'user',
  recordedBy: 'sarah',
  basis: 'The product owner explicitly approved this evidence.',
};
const SARAH_AUTHORITY = {
  decisionBy: 'sarah',
  recordedBy: 'sarah',
  basis: 'Sarah approved the implementation plan.',
};
const TARIQ_AUTHORITY = {
  decisionBy: 'tariq',
  recordedBy: 'tariq',
  basis: 'Tariq reviewed this validation cycle.',
};

function createLedger({ deviceQaMode = 'not_applicable' } = {}) {
  const events = [];

  function append(type, payload, role = machine.events[type].roles[0]) {
    const sequence = events.length + 1;
    const event = finalizeEvent({
      schemaVersion: 1,
      initiativeId: INITIATIVE_ID,
      sequence,
      type,
      recordedAt: `2026-07-25T00:00:${String(sequence).padStart(2, '0')}.000Z`,
      recordedBy: { role },
      ...(sequence === 1
        ? {}
        : {
            parent: {
              sequence: events.at(-1).sequence,
              eventHash: events.at(-1).eventHash,
            },
          }),
      payload,
    });
    events.push(event);
    return event;
  }

  append('initiative.created', {
    title: 'Example',
    branch: BRANCH,
    baseSha: BASE_SHA,
  });

  return {
    events,
    append,
    submitSpec(spec = SPEC, mode = deviceQaMode) {
      return append('spec.submitted', {
        spec,
        deviceQa: {
          mode,
          rationale:
            mode === 'required' ? 'Application behavior changed.' : 'Repository tooling only.',
        },
      });
    },
    signSpec(spec = SPEC) {
      return append('spec.signed', { spec, authority: USER_AUTHORITY }, 'sarah');
    },
    submitPlan(plan = PLAN) {
      return append('plan.submitted', { plan }, 'tariq');
    },
    approvePlan(plan = PLAN) {
      return append('plan.approved', { plan, authority: SARAH_AUTHORITY }, 'sarah');
    },
    ready(delivery = deliverySeed()) {
      return append('implementation.ready', { delivery }, 'dev');
    },
  };
}

function deliverySeed(overrides = {}) {
  return {
    branch: BRANCH,
    headSha: HEAD_SHA,
    contentDigest: CONTENT_DIGEST,
    ...overrides,
  };
}

function cycleDelivery(ready, overrides = {}) {
  return {
    ...deliverySeed(),
    validationCycleId: ready.eventHash,
    ...overrides,
  };
}

function bootstrap(options) {
  const ledger = createLedger(options);
  ledger.submitSpec();
  ledger.signSpec();
  ledger.submitPlan();
  ledger.approvePlan();
  return ledger;
}

function appendReviewApproved(ledger, ready, overrides = {}) {
  return ledger.append(
    'review.approved',
    {
      verdict: 'approved',
      review: REVIEW,
      delivery: cycleDelivery(ready, overrides),
      authority: TARIQ_AUTHORITY,
    },
    'tariq',
  );
}

function appendReviewChanges(ledger, ready) {
  return ledger.append(
    'review.changes_requested',
    {
      verdict: 'changes_requested',
      review: REVIEW,
      delivery: cycleDelivery(ready),
      authority: TARIQ_AUTHORITY,
    },
    'tariq',
  );
}

function appendVerificationPassed(ledger, ready, overrides = {}) {
  return ledger.append(
    'verification.passed',
    {
      delivery: cycleDelivery(ready, overrides),
      checks: [
        { id: 'format', status: 'passed' },
        { id: 'lint', status: 'passed' },
      ],
    },
    'system',
  );
}

function appendVerificationFailed(ledger, ready) {
  return ledger.append(
    'verification.failed',
    {
      delivery: cycleDelivery(ready),
      checks: [
        { id: 'format', status: 'passed' },
        { id: 'lint', status: 'failed' },
      ],
      failedCheck: 'lint',
    },
    'system',
  );
}

void test('replays a valid ledger in numeric sequence order and projects validation ownership', () => {
  const ledger = bootstrap();
  const implementationReady = ledger.ready();

  const ordered = replayEvents(machine, ledger.events);
  const shuffled = replayEvents(machine, [...ledger.events].reverse());

  assert.deepEqual(shuffled, ordered);
  assert.equal(ordered.phase, 'validation');
  assert.equal(ordered.owner, 'tariq');
  assert.equal(ordered.validationCycleId, implementationReady.eventHash);
  assert.deepEqual(ordered.delivery, deliverySeed());
  assert.deepEqual(ordered.initiative, {
    id: INITIATIVE_ID,
    title: 'Example',
    branch: BRANCH,
    baseSha: BASE_SHA,
    createdAt: '2026-07-25T00:00:01.000Z',
    recordedBy: 'sarah',
  });
  assert.deepEqual(ordered.spec.current, SPEC);
  assert.equal(ordered.spec.signed, true);
  assert.equal(ordered.spec.deviceQaMode, 'not_applicable');
  assert.deepEqual(ordered.plan.current, PLAN);
  assert.equal(ordered.plan.approved, true);
  assert.deepEqual(ordered.openBlockers, {});
});

void test('rejects gaps, duplicate sequences and hashes, broken parents, and mixed initiatives', () => {
  const ledger = bootstrap();
  ledger.ready();
  const [created, submitted, signed] = ledger.events;

  assert.throws(() => replayEvents(machine, [created, signed]), /contiguous.*expected sequence 2/i);
  assert.throws(() => replayEvents(machine, [created, created]), /duplicate sequence 1/i);
  assert.throws(
    () => replayEvents(machine, [created, { ...submitted, eventHash: created.eventHash }]),
    /duplicate event hash/i,
  );

  const brokenParent = finalizeEvent({
    ...submitted,
    parent: { sequence: 1, eventHash: '9'.repeat(64) },
  });
  assert.throws(() => replayEvents(machine, [created, brokenParent]), /parent hash.*sequence 1/i);

  const otherInitiative = finalizeEvent({
    ...submitted,
    initiativeId: '2026-07-25-other',
  });
  assert.throws(
    () => replayEvents(machine, [created, otherInitiative]),
    /initiative ID.*does not match/i,
  );
});

void test('requires initiative.created as the only root event and verifies event self-hashes', () => {
  const ledger = createLedger();
  const created = ledger.events[0];
  const invalidRoot = finalizeEvent({
    ...created,
    type: 'spec.submitted',
    payload: {
      spec: SPEC,
      deviceQa: { mode: 'not_applicable', rationale: 'Repository tooling only.' },
    },
    recordedBy: { role: 'sarah' },
  });

  assert.throws(() => replayEvents(machine, [invalidRoot]), /first event.*initiative\.created/i);
  assert.throws(
    () => replayEvents(machine, [{ ...created, payload: { ...created.payload, title: 'Edited' } }]),
    /event hash mismatch/i,
  );
});

void test('projects exact stable legal event types without authorizing integration', () => {
  const ledger = createLedger();
  let projection = replayEvents(machine, ledger.events);
  assert.deepEqual(projection.legalNextEvents, [
    'blocker.opened',
    'initiative.cancelled',
    'spec.submitted',
  ]);

  ledger.submitSpec();
  ledger.signSpec();
  ledger.submitPlan();
  ledger.approvePlan();
  ledger.ready();
  projection = replayEvents(machine, ledger.events);
  assert.deepEqual(projection.legalNextEvents, [
    'blocker.opened',
    'initiative.cancelled',
    'plan.revised',
    'review.approved',
    'review.changes_requested',
    'spec.revised',
    'verification.failed',
    'verification.passed',
    'work.reopened',
  ]);
  assert.equal(projection.legalNextEvents.includes('push'), false);
  assert.equal(projection.legalNextEvents.includes('merge'), false);
});

void test('keeps blocker events as overlays and blocks derived forward movement until resolution', () => {
  const ledger = bootstrap();
  const ready = ledger.ready();
  ledger.append(
    'blocker.opened',
    {
      blockerId: 'native-dependency',
      trigger: 'new_dependency',
      risk: 'The proposed dependency includes native code.',
      owner: 'sarah',
      requiredResolver: 'user',
    },
    'sarah',
  );

  appendReviewApproved(ledger, ready);
  assert.throws(
    () => replayEvents(machine, ledger.events),
    /review\.approved cannot be recorded while critical blockers are open: native-dependency/i,
  );
  ledger.events.pop();

  appendVerificationPassed(ledger, ready);
  assert.throws(
    () => replayEvents(machine, ledger.events),
    /verification\.passed cannot be recorded while critical blockers are open: native-dependency/i,
  );
  ledger.events.pop();

  let projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'validation');
  assert.equal(projection.owner, 'tariq');
  assert.deepEqual(Object.keys(projection.openBlockers), ['native-dependency']);
  assert.deepEqual(projection.legalNextEvents, [
    'blocker.opened',
    'blocker.resolved',
    'initiative.cancelled',
    'plan.revised',
    'spec.revised',
    'work.reopened',
  ]);

  ledger.append(
    'blocker.resolved',
    {
      blockerId: 'native-dependency',
      resolution: 'The product owner rejected the dependency.',
      authority: USER_AUTHORITY,
    },
    'sarah',
  );
  appendReviewApproved(ledger, ready);
  appendVerificationPassed(ledger, ready);
  projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'integration_ready');
  assert.deepEqual(projection.openBlockers, {});
});

void test('enforces blocker gates during replay and resumes forward events after nested resolution', () => {
  const ledger = createLedger();
  ledger.append(
    'blocker.opened',
    {
      blockerId: 'dependency',
      trigger: 'new_dependency',
      risk: 'The dependency requires approval.',
      owner: 'sarah',
      requiredResolver: 'user',
    },
    'sarah',
  );
  ledger.submitSpec();
  assert.throws(
    () => replayEvents(machine, ledger.events),
    /spec\.submitted cannot be recorded while critical blockers are open: dependency/i,
  );
  ledger.events.pop();

  ledger.append(
    'blocker.opened',
    {
      blockerId: 'scope',
      trigger: 'scope_balloon',
      risk: 'The scope expanded beyond the signed brief.',
      owner: 'sarah',
      requiredResolver: 'user',
    },
    'sarah',
  );
  let projection = replayEvents(machine, ledger.events);
  assert.deepEqual(Object.keys(projection.openBlockers), ['dependency', 'scope']);

  ledger.append(
    'blocker.resolved',
    {
      blockerId: 'dependency',
      resolution: 'The dependency was removed.',
      authority: USER_AUTHORITY,
    },
    'sarah',
  );
  ledger.submitSpec();
  assert.throws(
    () => replayEvents(machine, ledger.events),
    /spec\.submitted cannot be recorded while critical blockers are open: scope/i,
  );
  ledger.events.pop();

  ledger.append(
    'blocker.resolved',
    {
      blockerId: 'scope',
      resolution: 'The scope returned to the approved boundary.',
      authority: USER_AUTHORITY,
    },
    'sarah',
  );
  ledger.submitSpec();
  projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'awaiting_spec_signoff');
  assert.deepEqual(projection.openBlockers, {});

  const cancelled = createLedger();
  cancelled.append(
    'blocker.opened',
    {
      blockerId: 'security',
      trigger: 'auth_risk',
      risk: 'The initiative touches authentication.',
      owner: 'sarah',
      requiredResolver: 'user',
    },
    'sarah',
  );
  cancelled.append(
    'initiative.cancelled',
    {
      reason: 'The product owner stopped the initiative.',
      authority: USER_AUTHORITY,
    },
    'sarah',
  );
  assert.equal(replayEvents(machine, cancelled.events).phase, 'cancelled');
});

void test('orders blocker IDs by locale-independent UTF-16 code units', () => {
  const ledger = createLedger();
  for (const blockerId of ['中文', 'ångstrom', 'zulu', 'Ωmega', 'Alpha']) {
    ledger.append(
      'blocker.opened',
      {
        blockerId,
        trigger: 'critical_trigger',
        risk: `Critical risk for ${blockerId}.`,
        owner: 'sarah',
        requiredResolver: 'user',
      },
      'sarah',
    );
  }

  const projection = replayEvents(machine, ledger.events);
  assert.deepEqual(Object.keys(projection.openBlockers), [
    'Alpha',
    'zulu',
    'ångstrom',
    'Ωmega',
    '中文',
  ]);
});

void test('rejects resolution of a blocker that is not open', () => {
  const ledger = createLedger();
  ledger.append(
    'blocker.resolved',
    {
      blockerId: 'missing',
      resolution: 'Nothing to resolve.',
      authority: USER_AUTHORITY,
    },
    'sarah',
  );

  assert.throws(() => replayEvents(machine, ledger.events), /blocker missing is not open/i);
});

void test('derives integration_ready only from matching current-cycle review and verification', () => {
  for (const order of ['review-first', 'verification-first']) {
    const ledger = bootstrap();
    const ready = ledger.ready();
    if (order === 'review-first') {
      appendReviewApproved(ledger, ready);
      appendVerificationPassed(ledger, ready);
    } else {
      appendVerificationPassed(ledger, ready);
      appendReviewApproved(ledger, ready);
    }

    const projection = replayEvents(machine, ledger.events);
    assert.equal(projection.phase, 'integration_ready');
    assert.equal(projection.owner, 'user');
    assert.equal(projection.review.delivery.validationCycleId, ready.eventHash);
    assert.equal(projection.verification.delivery.contentDigest, CONTENT_DIGEST);
    assert.deepEqual(projection.legalNextEvents, [
      'blocker.opened',
      'plan.revised',
      'spec.revised',
      'work.reopened',
    ]);
  }
});

void test('derives awaiting_device_qa from the currently signed required declaration', () => {
  const ledger = bootstrap({ deviceQaMode: 'required' });
  const ready = ledger.ready();
  appendReviewApproved(ledger, ready);
  appendVerificationPassed(ledger, ready);

  const projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'awaiting_device_qa');
  assert.equal(projection.owner, 'user');
  assert.equal(projection.spec.deviceQaMode, 'required');
});

void test('requires review and verification delivery to match current cycle and digest', () => {
  for (const [label, append] of [
    [
      'review cycle',
      (ledger, ready) => appendReviewApproved(ledger, ready, { validationCycleId: '4'.repeat(64) }),
    ],
    [
      'review digest',
      (ledger, ready) => appendReviewApproved(ledger, ready, { contentDigest: '5'.repeat(64) }),
    ],
    [
      'verification cycle',
      (ledger, ready) =>
        appendVerificationPassed(ledger, ready, { validationCycleId: '6'.repeat(64) }),
    ],
    [
      'verification digest',
      (ledger, ready) => appendVerificationPassed(ledger, ready, { contentDigest: '7'.repeat(64) }),
    ],
  ]) {
    const ledger = bootstrap();
    const ready = ledger.ready();
    append(ledger, ready);

    assert.throws(
      () => replayEvents(machine, ledger.events),
      /delivery (validation cycle|content digest).*current implementation/i,
      label,
    );
  }
});

void test('a failed verification remains validation and never counts as green evidence', () => {
  const ledger = bootstrap();
  const ready = ledger.ready();
  appendReviewApproved(ledger, ready);
  appendVerificationFailed(ledger, ready);

  const projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'validation');
  assert.equal(projection.verification.status, 'failed');
  assert.equal(projection.legalNextEvents.includes('verification.passed'), true);
});

void test('review changes requested invalidates the active delivery cycle and receipts', () => {
  const ledger = bootstrap();
  const ready = ledger.ready();
  appendVerificationPassed(ledger, ready);
  appendReviewChanges(ledger, ready);

  const projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'execution');
  assert.equal(projection.owner, 'dev');
  assert.equal(projection.delivery, undefined);
  assert.equal(projection.validationCycleId, undefined);
  assert.equal(projection.review, undefined);
  assert.equal(projection.verification, undefined);
  assert.equal(projection.qa, undefined);
});

void test('device QA pass completes required QA while failure invalidates the cycle', () => {
  const passing = bootstrap({ deviceQaMode: 'required' });
  const passReady = passing.ready();
  appendReviewApproved(passing, passReady);
  appendVerificationPassed(passing, passReady);
  passing.append(
    'device_qa.passed',
    {
      authority: USER_AUTHORITY,
      qa: QA,
      device: 'Pixel 9 Pro',
      os: 'Android 16',
      delivery: cycleDelivery(passReady),
    },
    'sarah',
  );
  let projection = replayEvents(machine, passing.events);
  assert.equal(projection.phase, 'integration_ready');
  assert.equal(projection.qa.status, 'passed');

  const failing = bootstrap({ deviceQaMode: 'required' });
  const failReady = failing.ready();
  appendReviewApproved(failing, failReady);
  appendVerificationPassed(failing, failReady);
  failing.append(
    'device_qa.failed',
    {
      authority: USER_AUTHORITY,
      qa: QA,
      device: 'Pixel 9 Pro',
      os: 'Android 16',
      failedCases: ['The primary CTA did not respond.'],
      delivery: cycleDelivery(failReady),
    },
    'sarah',
  );
  projection = replayEvents(machine, failing.events);
  assert.equal(projection.phase, 'execution');
  assert.equal(projection.validationCycleId, undefined);
  assert.equal(projection.review, undefined);
  assert.equal(projection.verification, undefined);
  assert.equal(projection.qa, undefined);
});

void test('work.reopened invalidates delivery and requires a fresh implementation cycle', () => {
  const ledger = bootstrap();
  const firstReady = ledger.ready();
  appendReviewApproved(ledger, firstReady);
  appendVerificationPassed(ledger, firstReady);
  ledger.append(
    'work.reopened',
    {
      reason: 'A process-only remediation needs a fresh review.',
      delivery: cycleDelivery(firstReady),
    },
    'dev',
  );

  let projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'execution');
  assert.equal(projection.validationCycleId, undefined);

  const secondReady = ledger.ready();
  assert.notEqual(secondReady.eventHash, firstReady.eventHash);
  projection = replayEvents(machine, ledger.events);
  assert.equal(projection.validationCycleId, secondReady.eventHash);

  appendReviewApproved(ledger, firstReady);
  assert.throws(
    () => replayEvents(machine, ledger.events),
    /delivery validation cycle.*current implementation/i,
  );
});

void test('spec revision invalidates signoff, plan, delivery, and all cycle evidence', () => {
  const ledger = bootstrap();
  const ready = ledger.ready();
  appendReviewApproved(ledger, ready);
  ledger.append(
    'spec.revised',
    {
      spec: REVISED_SPEC,
      deviceQa: { mode: 'required', rationale: 'The revised scope changes app behavior.' },
      reason: 'The approved scope changed.',
    },
    'tariq',
  );

  const projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'awaiting_spec_signoff');
  assert.deepEqual(projection.spec.current, REVISED_SPEC);
  assert.equal(projection.spec.signed, false);
  assert.equal(projection.spec.deviceQaMode, undefined);
  assert.equal(projection.plan, undefined);
  assert.equal(projection.delivery, undefined);
  assert.equal(projection.validationCycleId, undefined);
});

void test('plan revision preserves signed spec but invalidates plan approval and delivery', () => {
  const ledger = bootstrap();
  const ready = ledger.ready();
  appendVerificationPassed(ledger, ready);
  ledger.append(
    'plan.revised',
    {
      plan: REVISED_PLAN,
      reason: 'Added a missing failure path.',
    },
    'tariq',
  );

  const projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'awaiting_plan_approval');
  assert.equal(projection.spec.signed, true);
  assert.equal(projection.spec.deviceQaMode, 'not_applicable');
  assert.deepEqual(projection.plan.current, REVISED_PLAN);
  assert.equal(projection.plan.approved, false);
  assert.equal(projection.delivery, undefined);
  assert.equal(projection.validationCycleId, undefined);
});

void test('cancellation ends the ledger with no owner or legal next events', () => {
  const ledger = createLedger();
  ledger.append(
    'initiative.cancelled',
    {
      reason: 'The initiative is no longer needed.',
      authority: USER_AUTHORITY,
    },
    'sarah',
  );

  const projection = replayEvents(machine, ledger.events);
  assert.equal(projection.phase, 'cancelled');
  assert.equal(projection.owner, 'none');
  assert.equal(projection.cancelled.reason, 'The initiative is no longer needed.');
  assert.deepEqual(projection.legalNextEvents, []);
});
