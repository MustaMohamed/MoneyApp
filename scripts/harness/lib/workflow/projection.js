const { canonicalStringify, verifyCanonicalEvent } = require('./canonical');
const { assertAllowedOrigin, getEventDefinition } = require('./machine');
const { validateEventEnvelope, validateEventPayload } = require('./schema');

const OWNERS = {
  brainstorming: 'sarah',
  awaiting_spec_signoff: 'user',
  planning: 'tariq',
  awaiting_plan_approval: 'sarah',
  execution: 'dev',
  validation: 'tariq',
  awaiting_device_qa: 'user',
  integration_ready: 'user',
  cancelled: 'none',
};

const CRITICAL_BLOCKER_EVENT_ALLOWLIST = new Set([
  'blocker.opened',
  'blocker.resolved',
  'initiative.cancelled',
  'plan.revised',
  'spec.revised',
  'work.reopened',
]);

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function toPlainValue(value) {
  if (Array.isArray(value)) return value.map(toPlainValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, toPlainValue(child)]),
    );
  }
  return value;
}

function sameArtifact(left, right) {
  return left?.path === right?.path && left?.sha256 === right?.sha256;
}

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function clearDeliveryCycle(state) {
  state.delivery = undefined;
  state.validationCycleId = undefined;
  state.review = undefined;
  state.verification = undefined;
  state.qa = undefined;
}

function requireCurrentArtifact(actual, expected, label) {
  if (!sameArtifact(actual, expected)) {
    throw new Error(`${label} does not match the current submitted artifact`);
  }
}

function requireCurrentDelivery(state, delivery) {
  if (!state.delivery || !state.validationCycleId) {
    throw new Error('No current implementation delivery exists');
  }
  if (delivery.validationCycleId !== state.validationCycleId) {
    throw new Error(
      'Delivery validation cycle does not match the current implementation validation cycle',
    );
  }
  if (delivery.contentDigest !== state.delivery.contentDigest) {
    throw new Error(
      'Delivery content digest does not match the current implementation content digest',
    );
  }
  if (delivery.branch !== state.delivery.branch) {
    throw new Error('Delivery branch does not match the current implementation branch');
  }
  if (delivery.headSha !== state.delivery.headSha) {
    throw new Error('Delivery head SHA does not match the current implementation head SHA');
  }
}

function hasOpenCriticalBlocker(state) {
  return state.openBlockers.size > 0;
}

function assertAllowedWhileBlocked(state, type) {
  if (hasOpenCriticalBlocker(state) && !CRITICAL_BLOCKER_EVENT_ALLOWLIST.has(type)) {
    const blockerIds = [...state.openBlockers.keys()].sort(compareCodeUnits).join(', ');
    throw new Error(`${type} cannot be recorded while critical blockers are open: ${blockerIds}`);
  }
}

function deriveForwardPhase(state) {
  if (
    state.phase === 'validation' &&
    !hasOpenCriticalBlocker(state) &&
    state.review?.status === 'approved' &&
    state.verification?.status === 'passed'
  ) {
    state.phase =
      state.spec?.deviceQaMode === 'required' ? 'awaiting_device_qa' : 'integration_ready';
  }
}

function sortedBlockers(openBlockers) {
  return Object.fromEntries(
    [...openBlockers.entries()]
      .sort(([left], [right]) => compareCodeUnits(left, right))
      .map(([blockerId, blocker]) => [blockerId, blocker]),
  );
}

function legalNextEvents(machine, state) {
  if (state.phase === 'cancelled') return [];

  const blocked = hasOpenCriticalBlocker(state);
  return Object.entries(machine.events)
    .filter(([, definition]) => definition.origins.includes(state.phase))
    .map(([type]) => type)
    .filter((type) => {
      if (type === 'blocker.resolved' && state.openBlockers.size === 0) return false;
      if (type === 'spec.revised' && !state.spec) return false;
      if (type === 'plan.revised' && !state.plan) return false;
      if (blocked && !CRITICAL_BLOCKER_EVENT_ALLOWLIST.has(type)) return false;
      return true;
    })
    .sort(compareCodeUnits);
}

function createInitialState() {
  return {
    initiative: undefined,
    phase: undefined,
    spec: undefined,
    proposedDeviceQa: undefined,
    plan: undefined,
    delivery: undefined,
    validationCycleId: undefined,
    review: undefined,
    verification: undefined,
    qa: undefined,
    openBlockers: new Map(),
    cancelled: undefined,
    sequence: 0,
    latestEvent: undefined,
  };
}

function applyEvent(state, event, definition) {
  const payload = event.payload;
  switch (event.type) {
    case 'initiative.created':
      state.initiative = {
        id: event.initiativeId,
        title: payload.title,
        branch: payload.branch,
        baseSha: payload.baseSha,
        createdAt: event.recordedAt,
        recordedBy: event.recordedBy.role,
      };
      break;
    case 'spec.submitted':
      state.spec = {
        current: payload.spec,
        signed: false,
        submittedAt: event.recordedAt,
        submittedEventHash: event.eventHash,
        deviceQaMode: undefined,
      };
      state.proposedDeviceQa = payload.deviceQa;
      break;
    case 'spec.signed':
      requireCurrentArtifact(state.spec?.current, payload.spec, 'Signed spec');
      state.spec = {
        ...state.spec,
        signed: true,
        signedAt: event.recordedAt,
        signedEventHash: event.eventHash,
        deviceQaMode: state.proposedDeviceQa.mode,
        deviceQaRationale: state.proposedDeviceQa.rationale,
      };
      break;
    case 'spec.revised':
      state.spec = {
        current: payload.spec,
        signed: false,
        submittedAt: event.recordedAt,
        submittedEventHash: event.eventHash,
        deviceQaMode: undefined,
        revisionReason: payload.reason,
      };
      state.proposedDeviceQa = payload.deviceQa;
      state.plan = undefined;
      clearDeliveryCycle(state);
      break;
    case 'plan.submitted':
      state.plan = {
        current: payload.plan,
        approved: false,
        submittedAt: event.recordedAt,
        submittedEventHash: event.eventHash,
      };
      break;
    case 'plan.approved':
      requireCurrentArtifact(state.plan?.current, payload.plan, 'Approved plan');
      state.plan = {
        ...state.plan,
        approved: true,
        approvedAt: event.recordedAt,
        approvedEventHash: event.eventHash,
      };
      break;
    case 'plan.revised':
      state.plan = {
        current: payload.plan,
        approved: false,
        submittedAt: event.recordedAt,
        submittedEventHash: event.eventHash,
        revisionReason: payload.reason,
      };
      clearDeliveryCycle(state);
      break;
    case 'implementation.ready':
      state.delivery = payload.delivery;
      state.validationCycleId = event.eventHash;
      state.review = undefined;
      state.verification = undefined;
      state.qa = undefined;
      break;
    case 'review.approved':
      requireCurrentDelivery(state, payload.delivery);
      state.review = {
        status: 'approved',
        artifact: payload.review,
        delivery: payload.delivery,
        authority: payload.authority,
        eventHash: event.eventHash,
        recordedAt: event.recordedAt,
      };
      break;
    case 'review.changes_requested':
      requireCurrentDelivery(state, payload.delivery);
      clearDeliveryCycle(state);
      break;
    case 'verification.passed':
      requireCurrentDelivery(state, payload.delivery);
      state.verification = {
        status: 'passed',
        delivery: payload.delivery,
        checks: payload.checks,
        eventHash: event.eventHash,
        recordedAt: event.recordedAt,
      };
      break;
    case 'verification.failed':
      requireCurrentDelivery(state, payload.delivery);
      state.verification = {
        status: 'failed',
        delivery: payload.delivery,
        checks: payload.checks,
        failedCheck: payload.failedCheck,
        eventHash: event.eventHash,
        recordedAt: event.recordedAt,
      };
      break;
    case 'device_qa.passed':
      requireCurrentDelivery(state, payload.delivery);
      state.qa = {
        status: 'passed',
        artifact: payload.qa,
        delivery: payload.delivery,
        device: payload.device,
        os: payload.os,
        authority: payload.authority,
        eventHash: event.eventHash,
        recordedAt: event.recordedAt,
      };
      break;
    case 'device_qa.failed':
      requireCurrentDelivery(state, payload.delivery);
      clearDeliveryCycle(state);
      break;
    case 'work.reopened':
      requireCurrentDelivery(state, payload.delivery);
      clearDeliveryCycle(state);
      break;
    case 'blocker.opened':
      if (state.openBlockers.has(payload.blockerId)) {
        throw new Error(`Blocker ${payload.blockerId} is already open`);
      }
      state.openBlockers.set(payload.blockerId, {
        blockerId: payload.blockerId,
        trigger: payload.trigger,
        risk: payload.risk,
        owner: payload.owner,
        requiredResolver: payload.requiredResolver,
        openedAt: event.recordedAt,
        openedEventHash: event.eventHash,
      });
      break;
    case 'blocker.resolved':
      if (!state.openBlockers.has(payload.blockerId)) {
        throw new Error(`Blocker ${payload.blockerId} is not open`);
      }
      state.openBlockers.delete(payload.blockerId);
      break;
    case 'initiative.cancelled':
      state.cancelled = {
        reason: payload.reason,
        authority: payload.authority,
        eventHash: event.eventHash,
        recordedAt: event.recordedAt,
      };
      break;
    default:
      throw new Error(`Unknown workflow event type: ${event.type}`);
  }

  state.phase = definition.destination === 'same' ? state.phase : definition.destination;
  state.sequence = event.sequence;
  state.latestEvent = event;
  deriveForwardPhase(state);
}

function prepareEvents(machine, events) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Workflow replay requires at least one event');
  }

  const sequences = new Set();
  const hashes = new Set();
  for (const event of events) {
    validateEventEnvelope(event, machine);
    if (sequences.has(event.sequence)) {
      throw new Error(`Workflow ledger has duplicate sequence ${event.sequence}`);
    }
    if (hashes.has(event.eventHash)) {
      throw new Error(`Workflow ledger has duplicate event hash ${event.eventHash}`);
    }
    sequences.add(event.sequence);
    hashes.add(event.eventHash);
  }

  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  for (const [index, event] of ordered.entries()) {
    const expectedSequence = index + 1;
    if (event.sequence !== expectedSequence) {
      throw new Error(
        `Workflow ledger must be contiguous: expected sequence ${expectedSequence}, received ${event.sequence}`,
      );
    }
    verifyCanonicalEvent(canonicalStringify(event));
    validateEventPayload(event);
  }
  return ordered;
}

function replayEvents(machine, events) {
  const ordered = prepareEvents(machine, events);
  if (ordered[0].type !== 'initiative.created') {
    throw new Error('The first event must be initiative.created');
  }

  const initiativeId = ordered[0].initiativeId;
  const state = createInitialState();
  for (const [index, event] of ordered.entries()) {
    if (event.initiativeId !== initiativeId) {
      throw new Error(
        `Event initiative ID ${event.initiativeId} does not match ledger initiative ID ${initiativeId}`,
      );
    }
    if (index > 0) {
      const parent = ordered[index - 1];
      if (event.parent.sequence !== parent.sequence) {
        throw new Error(
          `Event sequence ${event.sequence} parent sequence does not match sequence ${parent.sequence}`,
        );
      }
      if (event.parent.eventHash !== parent.eventHash) {
        throw new Error(
          `Event sequence ${event.sequence} parent hash does not match sequence ${parent.sequence}`,
        );
      }
    }

    const definition = getEventDefinition(machine, event.type);
    assertAllowedOrigin(definition, state.phase);
    assertAllowedWhileBlocked(state, event.type);
    applyEvent(state, event, definition);
  }

  const projection = {
    initiative: state.initiative,
    phase: state.phase,
    owner: OWNERS[state.phase],
    sequence: state.sequence,
    latestEvent: state.latestEvent,
    spec: state.spec,
    plan: state.plan,
    delivery: state.delivery,
    validationCycleId: state.validationCycleId,
    review: state.review,
    verification: state.verification,
    qa: state.qa,
    openBlockers: sortedBlockers(state.openBlockers),
    cancelled: state.cancelled,
    legalNextEvents: legalNextEvents(machine, state),
  };
  return deepFreeze(toPlainValue(projection));
}

module.exports = {
  replayEvents,
  legalNextEvents,
};
