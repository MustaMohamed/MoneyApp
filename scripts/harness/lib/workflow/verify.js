const { runVerification: runVerificationDefault } = require('../verification');
const { collectDeliveryRevision: collectDeliveryRevisionDefault } = require('./git_revision');
const {
  appendEvent: appendEventDefault,
  loadEventHistory: loadEventHistoryDefault,
  withWorkflowLock: withWorkflowLockDefault,
} = require('./store');

function requireActiveCycle(projection, expectedSequence) {
  if (!projection) throw new Error('Workflow initiative has no ledger');
  if (projection.sequence !== expectedSequence) {
    throw new Error(
      `Stale expected sequence: observed ${projection.sequence}; received ${expectedSequence}`,
    );
  }
  if (
    projection.phase !== 'validation' ||
    !projection.validationCycleId ||
    !projection.delivery ||
    !projection.initiative
  ) {
    throw new Error('Workflow verification requires an active validation cycle');
  }
}

function captureFacts({
  root,
  initiativeId,
  expectedSequence,
  machine,
  loadEventHistory,
  collectDeliveryRevision,
  runGit,
}) {
  const history = loadEventHistory({ root, initiativeId, machine });
  requireActiveCycle(history.projection, expectedSequence);
  const projection = history.projection;
  const revision = collectDeliveryRevision(
    root,
    projection.initiative,
    runGit ? { runGit } : undefined,
  );
  if (revision.branch !== projection.delivery.branch) {
    throw new Error(
      `Current branch does not match active validation delivery: expected ${projection.delivery.branch}; observed ${revision.branch}`,
    );
  }
  if (revision.contentDigest !== projection.delivery.contentDigest) {
    throw new Error(
      `Current contentDigest does not match active validation delivery: expected ${projection.delivery.contentDigest}; observed ${revision.contentDigest}`,
    );
  }
  return {
    sequence: projection.sequence,
    validationCycleId: projection.validationCycleId,
    branch: revision.branch,
    headSha: revision.headSha,
    contentDigest: revision.contentDigest,
  };
}

function changedFact(before, after) {
  for (const field of ['sequence', 'validationCycleId', 'branch', 'contentDigest']) {
    if (before[field] !== after[field]) return field;
  }
  return undefined;
}

function assertFactsUnchanged(expected, actual, suffix) {
  const field = changedFact(expected, actual);
  if (field) {
    throw new Error(
      `${field} changed ${suffix}: expected ${expected[field]}; observed ${actual[field]}`,
    );
  }
}

function verifyWorkflow(options) {
  const {
    root,
    initiativeId,
    expectedSequence,
    machine,
    checks,
    clock = () => new Date(),
    runGit,
    withWorkflowLock = withWorkflowLockDefault,
    loadEventHistory = loadEventHistoryDefault,
    collectDeliveryRevision = collectDeliveryRevisionDefault,
    runVerification = runVerificationDefault,
    appendEvent = appendEventDefault,
  } = options;

  const lockedCapture = () =>
    withWorkflowLock({
      root,
      initiativeId,
      machine,
      callback: () =>
        captureFacts({
          root,
          initiativeId,
          expectedSequence,
          machine,
          loadEventHistory,
          collectDeliveryRevision,
          runGit,
        }),
    });

  const before = lockedCapture();
  const verification = runVerification(root, checks);

  let after;
  try {
    after = lockedCapture();
  } catch (error) {
    return {
      ok: false,
      recorded: false,
      reason: `cleanliness or workflow facts changed while verification checks ran: ${error.message}`,
      verification,
    };
  }
  const staleField = changedFact(before, after);
  if (staleField) {
    return {
      ok: false,
      recorded: false,
      reason: `${staleField} changed while verification checks ran`,
      changedField: staleField,
      verification,
    };
  }

  const recordedAtValue = clock();
  const recordedAt =
    recordedAtValue instanceof Date
      ? recordedAtValue.toISOString()
      : new Date(recordedAtValue).toISOString();
  const eventType = verification.ok ? 'verification.passed' : 'verification.failed';
  const delivery = {
    branch: after.branch,
    headSha: after.headSha,
    contentDigest: after.contentDigest,
    validationCycleId: after.validationCycleId,
  };
  const payload = {
    delivery,
    checks: verification.checks,
    ...(verification.ok ? {} : { failedCheck: verification.failedCheck }),
  };

  const event = appendEvent({
    root,
    initiativeId,
    expectedSequence: expectedSequence + 1,
    machine,
    clock: () => recordedAt,
    validateCurrent({ history }) {
      requireActiveCycle(history.projection, expectedSequence);
      const currentRevision = collectDeliveryRevision(
        root,
        history.projection.initiative,
        runGit ? { runGit } : undefined,
      );
      assertFactsUnchanged(
        after,
        {
          sequence: history.projection.sequence,
          validationCycleId: history.projection.validationCycleId,
          branch: currentRevision.branch,
          headSha: currentRevision.headSha,
          contentDigest: currentRevision.contentDigest,
        },
        'before verification receipt append',
      );
    },
    draft: {
      type: eventType,
      recordedAt,
      recordedBy: { role: 'system' },
      payload,
    },
  });

  return {
    ok: verification.ok,
    recorded: true,
    event: event.event ?? event,
    verification,
  };
}

module.exports = {
  captureFacts,
  verifyWorkflow,
};
