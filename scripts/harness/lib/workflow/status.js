const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { resolveInside } = require('../paths');
const { validateArtifactReference: validateArtifactReferenceDefault } = require('./evidence');
const { collectDeliveryRevision: collectDeliveryRevisionDefault } = require('./git_revision');
const { loadEventHistory: loadEventHistoryDefault } = require('./store');

const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireInitiativeId(value) {
  const match = typeof value === 'string' ? value.match(INITIATIVE_ID) : undefined;
  if (!match) throw new Error('Initiative ID must be a lowercase YYYY-MM-DD slug');
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Initiative ID must start with a valid calendar date');
  }
  return value;
}

function defaultReadCurrentBranch(root) {
  return execFileSync('git', ['-C', root, 'rev-parse', '--abbrev-ref', 'HEAD'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).replace(/\n$/, '');
}

function discoverInitiativeIdsDefault(root, fsImpl = fs) {
  const relativePath = 'docs/superpowers/initiatives';
  const initiativesPath = resolveInside(root, relativePath);
  let entries;
  try {
    entries = fsImpl.readdirSync(initiativesPath, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return [];
    throw error;
  }

  const ids = [];
  for (const entry of entries) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Initiative directory must not be a symbolic link: ${entry.name}`);
    }
    if (!entry.isDirectory()) {
      throw new Error(`Unsupported entry in initiatives directory: ${entry.name}`);
    }
    requireInitiativeId(entry.name);
    const target = path.join(initiativesPath, entry.name);
    const stats = fsImpl.lstatSync(target);
    if (stats.isSymbolicLink() || !stats.isDirectory()) {
      throw new Error(`Initiative path must be a real directory: ${entry.name}`);
    }
    ids.push(entry.name);
  }
  return ids.sort(compareCodeUnits);
}

function selectInitiativeId({
  root,
  initiativeId,
  machine,
  discoverInitiativeIds = () => discoverInitiativeIdsDefault(root),
  readCurrentBranch = () => defaultReadCurrentBranch(root),
  loadEventHistory = loadEventHistoryDefault,
}) {
  if (initiativeId !== undefined) return requireInitiativeId(initiativeId);

  const branch = readCurrentBranch();
  if (!branch || branch === 'HEAD') {
    throw new Error(
      'Current Git branch does not identify an active workflow initiative; pass --id',
    );
  }

  const matches = [];
  for (const candidate of discoverInitiativeIds()) {
    requireInitiativeId(candidate);
    try {
      const history = loadEventHistory({ root, initiativeId: candidate, machine });
      if (
        history.projection &&
        history.projection.phase !== 'cancelled' &&
        history.projection.initiative?.branch === branch
      ) {
        matches.push(candidate);
      }
    } catch {
      // An invalid ledger cannot be selected implicitly. Explicit --id still reports its error.
    }
  }
  matches.sort(compareCodeUnits);

  if (matches.length === 0) {
    throw new Error(`No active workflow initiative matches current branch ${branch}; pass --id`);
  }
  if (matches.length > 1) {
    throw new Error(
      `Multiple initiatives match current branch ${branch}: ${matches.join(', ')}; pass --id`,
    );
  }
  return matches[0];
}

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error);
}

function artifactStatus(root, reference, validateArtifactReference) {
  if (!reference) return { status: 'not_applicable' };
  try {
    validateArtifactReference(root, reference);
    return {
      path: reference.path,
      sha256: reference.sha256,
      status: 'valid',
      errors: [],
    };
  } catch (error) {
    const message = errorMessage(error);
    return {
      path: reference.path,
      sha256: reference.sha256,
      status: /stale/i.test(message) ? 'stale' : 'error',
      errors: [message],
    };
  }
}

function deliveryStatus(root, projection, collectDeliveryRevision) {
  if (!projection.delivery) {
    return {
      status: 'not_applicable',
      branch: undefined,
      headSha: undefined,
      contentDigest: undefined,
      clean: undefined,
      stale: false,
      errors: [],
    };
  }
  try {
    const observed = collectDeliveryRevision(root, projection.initiative);
    const errors = [];
    if (observed.branch !== projection.delivery.branch) {
      errors.push(
        `Stale delivery branch: expected ${projection.delivery.branch}; observed ${observed.branch}`,
      );
    }
    if (observed.contentDigest !== projection.delivery.contentDigest) {
      errors.push(
        `Stale delivery content digest: expected ${projection.delivery.contentDigest}; observed ${observed.contentDigest}`,
      );
    }
    const stale = errors.length > 0;
    return {
      status: stale ? 'stale' : 'valid',
      branch: observed.branch,
      headSha: observed.headSha,
      contentDigest: observed.contentDigest,
      clean: true,
      stale,
      errors,
    };
  } catch (error) {
    const message = errorMessage(error);
    return {
      status: 'error',
      branch: projection.delivery.branch,
      headSha: projection.delivery.headSha,
      contentDigest: projection.delivery.contentDigest,
      clean: !/dirty/i.test(message),
      stale: true,
      errors: [message],
    };
  }
}

function receiptStatus(receipt, pendingStatus = 'pending') {
  if (!receipt) return { status: pendingStatus };
  return {
    status: receipt.status,
    ...(receipt.eventHash ? { eventHash: receipt.eventHash } : {}),
    ...(receipt.recordedAt ? { recordedAt: receipt.recordedAt } : {}),
  };
}

function currentCycleDelivery(projection) {
  if (!projection.delivery || !projection.validationCycleId) return undefined;
  return {
    ...projection.delivery,
    validationCycleId: projection.validationCycleId,
  };
}

function nextActionsFor(projection, initiativeId) {
  const sequence = projection.sequence;
  const prefix = `npm run workflow -- record`;
  if (Object.keys(projection.openBlockers ?? {}).length > 0) {
    const blockerId = Object.keys(projection.openBlockers).sort(compareCodeUnits)[0];
    return [
      `${prefix} blocker.resolved --id ${initiativeId} --expected-sequence ${sequence} --recorded-by sarah --blocker-id ${blockerId} --decision-by user --basis <basis> --resolution <resolution>`,
    ];
  }

  switch (projection.phase) {
    case 'brainstorming':
      return [
        `${prefix} spec.submitted --id ${initiativeId} --expected-sequence ${sequence} --recorded-by sarah --spec <spec-path> --device-qa-mode <required|not_applicable> --device-qa-rationale <rationale>`,
      ];
    case 'awaiting_spec_signoff':
      return [
        `${prefix} spec.signed --id ${initiativeId} --expected-sequence ${sequence} --recorded-by sarah --decision-by user --basis <basis>`,
      ];
    case 'planning':
      return [
        `${prefix} plan.submitted --id ${initiativeId} --expected-sequence ${sequence} --recorded-by tariq --plan <plan-path>`,
      ];
    case 'awaiting_plan_approval':
      return [
        `${prefix} plan.approved --id ${initiativeId} --expected-sequence ${sequence} --recorded-by sarah --decision-by sarah --basis <basis>`,
      ];
    case 'execution':
      return [
        `${prefix} implementation.ready --id ${initiativeId} --expected-sequence ${sequence} --recorded-by dev`,
      ];
    case 'validation': {
      const actions = [];
      if (projection.review?.status !== 'approved') {
        actions.push(
          `${prefix} review.approved --id ${initiativeId} --expected-sequence ${sequence} --recorded-by tariq --review <review-path> --decision-by tariq --basis <basis>`,
        );
      }
      if (projection.verification?.status !== 'passed') {
        actions.push(
          `npm run workflow -- verify --id ${initiativeId} --expected-sequence ${sequence}`,
        );
      }
      return actions;
    }
    case 'awaiting_device_qa':
      return [
        `${prefix} device_qa.passed --id ${initiativeId} --expected-sequence ${sequence} --recorded-by sarah --qa <qa-path> --decision-by user --basis <basis> --device <device> --os <os>`,
      ];
    case 'integration_ready':
      return [
        'Explicit user request required for push, PR, merge, or other repository integration.',
      ];
    case 'cancelled':
      return [];
    default:
      throw new Error(`Unknown projected workflow phase: ${String(projection.phase)}`);
  }
}

function evidenceRepairActions({
  projection,
  initiativeId,
  artifacts,
  delivery,
  staleReceiptArtifact,
}) {
  const sequence = projection.sequence;
  const prefix = 'npm run workflow -- record';
  if (artifacts.spec && artifacts.spec.status !== 'valid') {
    const deviceQaMode = projection.spec?.deviceQaMode ?? '<required|not_applicable>';
    return [
      `${prefix} spec.revised --id ${initiativeId} --expected-sequence ${sequence} --recorded-by tariq --spec ${artifacts.spec.path} --device-qa-mode ${deviceQaMode} --device-qa-rationale <rationale> --reason <reason>`,
    ];
  }
  if (artifacts.plan && artifacts.plan.status !== 'valid') {
    return [
      `${prefix} plan.revised --id ${initiativeId} --expected-sequence ${sequence} --recorded-by tariq --plan ${artifacts.plan.path} --reason <reason>`,
    ];
  }
  if (projection.validationCycleId && (delivery.status !== 'valid' || staleReceiptArtifact)) {
    return [
      `${prefix} work.reopened --id ${initiativeId} --expected-sequence ${sequence} --recorded-by sarah --reason <reason>`,
    ];
  }
  return nextActionsFor(projection, initiativeId);
}

function untrackedStatus(initiativeId) {
  return {
    schemaVersion: 1,
    initiativeId,
    phase: 'untracked',
    owner: 'none',
    sequence: 0,
    evidence: {
      ledger: { status: 'untracked', errors: ['untracked initiative'] },
      latestEvent: undefined,
      artifacts: {},
      delivery: {
        status: 'not_applicable',
        branch: undefined,
        headSha: undefined,
        contentDigest: undefined,
        clean: undefined,
        stale: false,
        errors: [],
      },
      validationCycleId: undefined,
      validationCycleStatus: 'not_applicable',
      review: { status: 'not_applicable' },
      verification: { status: 'not_applicable' },
      qa: { status: 'not_applicable' },
      explicitUserAction: false,
    },
    blockers: [],
    nextActions: [
      `npm run workflow -- init --id ${initiativeId} --title <title> --branch <non-main-branch> --base-sha <40-char-sha>`,
    ],
  };
}

function invalidStatus(initiativeId, error) {
  const message = errorMessage(error);
  return {
    schemaVersion: 1,
    initiativeId,
    phase: 'invalid',
    owner: 'none',
    sequence: 0,
    evidence: {
      ledger: { status: 'invalid', errors: [message] },
      latestEvent: undefined,
      artifacts: {},
      delivery: {
        status: 'error',
        branch: undefined,
        headSha: undefined,
        contentDigest: undefined,
        clean: undefined,
        stale: true,
        errors: [],
      },
      validationCycleId: undefined,
      validationCycleStatus: 'unknown',
      review: { status: 'unknown' },
      verification: { status: 'unknown' },
      qa: { status: 'unknown' },
      explicitUserAction: false,
    },
    blockers: [],
    nextActions: [],
  };
}

function getWorkflowStatus({
  root,
  initiativeId,
  machine,
  loadEventHistory = loadEventHistoryDefault,
  validateArtifactReference = validateArtifactReferenceDefault,
  collectDeliveryRevision = collectDeliveryRevisionDefault,
  runGit,
}) {
  requireInitiativeId(initiativeId);
  let history;
  try {
    history = loadEventHistory({ root, initiativeId, machine });
  } catch (error) {
    return invalidStatus(initiativeId, error);
  }
  if (!history.projection) return untrackedStatus(initiativeId);

  const projection = history.projection;
  const validateArtifact = (repositoryRoot, reference) =>
    validateArtifactReference(
      repositoryRoot,
      reference,
      runGit === undefined ? undefined : { runGit },
    );
  const artifacts = {
    ...(projection.spec?.current
      ? {
          spec: artifactStatus(root, projection.spec.current, validateArtifact),
        }
      : {}),
    ...(projection.plan?.current
      ? {
          plan: artifactStatus(root, projection.plan.current, validateArtifact),
        }
      : {}),
    ...(projection.review?.artifact
      ? {
          review: artifactStatus(root, projection.review.artifact, validateArtifact),
        }
      : {}),
    ...(projection.qa?.artifact
      ? {
          qa: artifactStatus(root, projection.qa.artifact, validateArtifact),
        }
      : {}),
  };
  const blockers = Object.values(projection.openBlockers ?? {}).sort((left, right) =>
    compareCodeUnits(left.blockerId, right.blockerId),
  );
  const hasValidationCycle = projection.validationCycleId !== undefined;
  const delivery = deliveryStatus(root, projection, (repositoryRoot, initiative) =>
    collectDeliveryRevision(
      repositoryRoot,
      initiative,
      runGit === undefined ? undefined : { runGit },
    ),
  );
  const staleDelivery = hasValidationCycle && delivery.status !== 'valid';
  const receiptArtifactPhase = ['validation', 'awaiting_device_qa', 'integration_ready'].includes(
    projection.phase,
  );
  const staleReviewArtifact =
    receiptArtifactPhase &&
    projection.review?.artifact !== undefined &&
    artifacts.review?.status !== 'valid';
  const staleQaArtifact =
    receiptArtifactPhase &&
    projection.qa?.artifact !== undefined &&
    artifacts.qa?.status !== 'valid';
  const staleReceiptArtifact = staleReviewArtifact || staleQaArtifact;
  const staleCycle = staleDelivery || (hasValidationCycle && staleReceiptArtifact);
  const reviewStatus =
    staleDelivery || staleReviewArtifact
      ? { status: 'stale' }
      : hasValidationCycle
        ? receiptStatus(projection.review)
        : { status: 'not_applicable' };
  const verificationStatus = staleDelivery
    ? { status: 'stale' }
    : hasValidationCycle
      ? receiptStatus(projection.verification)
      : { status: 'not_applicable' };
  const qaStatus = projection.qa
    ? staleDelivery || staleQaArtifact
      ? { status: 'stale' }
      : receiptStatus(projection.qa)
    : projection.phase === 'awaiting_device_qa'
      ? staleDelivery
        ? { status: 'stale' }
        : { status: 'pending' }
      : { status: 'not_applicable' };
  const hasInvalidArtifact = Object.values(artifacts).some(
    (artifact) => artifact.status !== 'valid',
  );
  const evidenceBlocksAction = hasInvalidArtifact || staleCycle;

  return {
    schemaVersion: 1,
    initiativeId,
    phase: projection.phase,
    owner: staleCycle
      ? 'sarah'
      : blockers.length > 0
        ? (blockers[0].requiredResolver ?? projection.owner)
        : projection.owner,
    sequence: projection.sequence,
    evidence: {
      ledger: { status: 'valid', eventCount: history.events.length, errors: [] },
      latestEvent: projection.latestEvent
        ? {
            type: projection.latestEvent.type,
            eventHash: projection.latestEvent.eventHash,
            recordedAt: projection.latestEvent.recordedAt,
          }
        : undefined,
      artifacts,
      delivery,
      validationCycleId: projection.validationCycleId,
      validationCycleStatus: hasValidationCycle
        ? staleCycle
          ? 'stale'
          : 'valid'
        : 'not_applicable',
      review: reviewStatus,
      verification: verificationStatus,
      qa: qaStatus,
      explicitUserAction:
        !evidenceBlocksAction &&
        (projection.phase === 'awaiting_spec_signoff' ||
          projection.phase === 'awaiting_device_qa' ||
          projection.phase === 'integration_ready' ||
          blockers.some((blocker) => blocker.requiredResolver === 'user')),
      ...(currentCycleDelivery(projection)
        ? { cycleDelivery: currentCycleDelivery(projection) }
        : {}),
    },
    blockers,
    nextActions: evidenceRepairActions({
      projection,
      initiativeId,
      artifacts,
      delivery,
      staleReceiptArtifact,
    }),
  };
}

function listWorkflowStatuses({
  root,
  machine,
  discoverInitiativeIds = () => discoverInitiativeIdsDefault(root),
  ...dependencies
}) {
  return [...discoverInitiativeIds()].sort(compareCodeUnits).map((initiativeId) =>
    getWorkflowStatus({
      root,
      initiativeId,
      machine,
      ...dependencies,
    }),
  );
}

function collectStatusErrors(status) {
  const errors = [];
  if (status.evidence.ledger.status !== 'valid') {
    errors.push(
      ...(status.evidence.ledger.errors ?? [`Ledger is ${status.evidence.ledger.status}`]),
    );
  }
  for (const [name, artifact] of Object.entries(status.evidence.artifacts ?? {})) {
    if (artifact.status !== 'valid') {
      errors.push(...(artifact.errors ?? [`${name} artifact is ${artifact.status}`]));
    }
  }
  if (!['valid', 'not_applicable'].includes(status.evidence.delivery.status)) {
    errors.push(
      ...(status.evidence.delivery.errors ?? [
        `Delivery evidence is ${status.evidence.delivery.status}`,
      ]),
    );
  }
  return [...new Set(errors)];
}

function checkWorkflowStatus(status) {
  const errors = collectStatusErrors(status);
  return { ok: errors.length === 0, errors, status };
}

function display(value) {
  return value === undefined ? 'none' : String(value);
}

function formatWorkflowStatus(status) {
  const artifactLines = Object.entries(status.evidence.artifacts ?? {})
    .sort(([left], [right]) => compareCodeUnits(left, right))
    .map(
      ([name, artifact]) =>
        `  ${name}: ${artifact.status}${
          artifact.path ? ` (${artifact.path} @ ${artifact.sha256})` : ''
        }${artifact.errors?.length ? ` — ${artifact.errors.join('; ')}` : ''}`,
    );
  const actionLines =
    status.nextActions.length === 0
      ? ['  none']
      : status.nextActions.map((action) => `  ${action}`);
  const blockerLines =
    status.blockers.length === 0
      ? ['Blockers: none']
      : [
          'Blockers:',
          ...status.blockers.map(
            (blocker) =>
              `  ${blocker.blockerId}: ${blocker.trigger} (owner ${blocker.owner}; resolver ${blocker.requiredResolver})`,
          ),
        ];
  const ledgerDetail =
    status.evidence.ledger.status === 'untracked'
      ? 'untracked initiative'
      : status.evidence.ledger.status;

  return [
    `Initiative: ${status.initiativeId}`,
    `Phase: ${status.phase}`,
    `Owner: ${status.owner}`,
    `Sequence: ${status.sequence}`,
    `Ledger: ${ledgerDetail}`,
    ...(status.evidence.ledger.errors?.length
      ? [`Ledger errors: ${status.evidence.ledger.errors.join('; ')}`]
      : []),
    `Latest event: ${display(status.evidence.latestEvent?.type)}`,
    `Artifacts:${artifactLines.length > 0 ? '' : ' none'}`,
    ...artifactLines,
    `Delivery: ${status.evidence.delivery.status}`,
    ...(status.evidence.delivery.errors?.length
      ? [`Delivery errors: ${status.evidence.delivery.errors.join('; ')}`]
      : []),
    `Branch: ${display(status.evidence.delivery.branch)}`,
    `HEAD: ${display(status.evidence.delivery.headSha)}`,
    `Delivery digest: ${display(status.evidence.delivery.contentDigest)}`,
    `Validation cycle: ${display(status.evidence.validationCycleId)}`,
    `Validation cycle status: ${status.evidence.validationCycleStatus}`,
    `Review: ${status.evidence.review.status}`,
    `Verification: ${status.evidence.verification.status}`,
    `QA: ${status.evidence.qa.status}`,
    ...blockerLines,
    `Explicit user action: ${status.evidence.explicitUserAction ? 'required' : 'not required'}`,
    'Next actions:',
    ...actionLines,
    '',
  ].join('\n');
}

module.exports = {
  checkWorkflowStatus,
  discoverInitiativeIds: discoverInitiativeIdsDefault,
  formatWorkflowStatus,
  getWorkflowStatus,
  listWorkflowStatuses,
  selectInitiativeId,
};
