const { assertSafeRelativePath } = require('../paths');

const MACHINE_KEYS = new Set(['version', 'internalGuards', 'states', 'roles', 'events']);
const MACHINE_EVENT_KEYS = new Set(['origins', 'destination', 'roles', 'guard']);
const EVENT_KEYS = new Set([
  'schemaVersion',
  'initiativeId',
  'sequence',
  'type',
  'recordedAt',
  'recordedBy',
  'parent',
  'payload',
  'eventHash',
]);
const REQUIRED_EVENT_KEYS = new Set([
  'schemaVersion',
  'initiativeId',
  'sequence',
  'type',
  'recordedAt',
  'recordedBy',
  'payload',
  'eventHash',
]);
const HEX_40 = /^[a-f0-9]{40}$/;
const HEX_64 = /^[a-f0-9]{64}$/;
const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CANONICAL_TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FORBIDDEN_BRANCH_CHARACTERS = new Set(['~', '^', ':', '?', '*', '[', '\\']);
const BLOCKER_OWNERS = new Set(['sarah', 'tariq', 'dev']);
const BLOCKER_RESOLVERS = new Set(['user', 'sarah', 'tariq']);

function requireObject(value, label) {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
  return value;
}

function requireOwnDataProperties(value, label) {
  requireObject(value, label);
  const ownKeys = Reflect.ownKeys(value);
  for (const key of ownKeys) {
    if (typeof key !== 'string') {
      throw new Error(`${label} must contain only own enumerable string data properties`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new Error(`${label} must contain only own enumerable string data properties`);
    }
  }
  return ownKeys;
}

function requireExactKeys(value, allowed, required, label) {
  const keys = requireOwnDataProperties(value, label);
  const unknown = keys.filter((key) => !allowed.has(key));
  const missing = [...required].filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0 || missing.length > 0) {
    const details = [
      unknown.length > 0 && `unexpected ${unknown.join(', ')}`,
      missing.length > 0 && `missing ${missing.join(', ')}`,
    ].filter(Boolean);
    throw new Error(`${label} fields are invalid: ${details.join('; ')}`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function requireOneOf(value, allowed, label) {
  if (typeof value !== 'string' || !allowed.has(value)) {
    throw new Error(`${label} must be one of: ${[...allowed].join(', ')}`);
  }
  return value;
}

function requireStringArray(value, label) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`${label} must be a nonempty array`);
  }
  const seen = new Set();
  for (const entry of value) {
    requireString(entry, `${label} entry`);
    if (seen.has(entry)) throw new Error(`${label} contains duplicate ${entry}`);
    seen.add(entry);
  }
  return value;
}

function requireHex(value, length, label) {
  const expression = length === 40 ? HEX_40 : HEX_64;
  if (typeof value !== 'string' || !expression.test(value)) {
    throw new Error(`${label} must be ${length}-character lowercase hexadecimal`);
  }
  return value;
}

function requireBranch(value, label) {
  const components = typeof value === 'string' ? value.split('/') : [];
  const hasForbiddenCharacter =
    typeof value === 'string' &&
    Array.from(value).some((character) => {
      const code = character.codePointAt(0);
      return code <= 0x20 || code === 0x7f || FORBIDDEN_BRANCH_CHARACTERS.has(character);
    });
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value === 'main' ||
    value === 'master' ||
    value === 'HEAD' ||
    value.startsWith('-') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('..') ||
    value.includes('@{') ||
    value.includes('//') ||
    hasForbiddenCharacter ||
    components.some(
      (component) =>
        component.length === 0 ||
        component === '.' ||
        component.startsWith('.') ||
        component.endsWith('.lock'),
    )
  ) {
    throw new Error(`${label} must be a safe non-main branch`);
  }
  return value;
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

function validateMachine(machine) {
  requireExactKeys(machine, MACHINE_KEYS, MACHINE_KEYS, 'workflow machine');
  if (machine.version !== 1) throw new Error('Workflow machine version must be 1');
  requireStringArray(machine.internalGuards, 'workflow machine internalGuards');
  const states = new Set(requireStringArray(machine.states, 'workflow machine states'));
  const roles = new Set(requireStringArray(machine.roles, 'workflow machine roles'));
  requireOwnDataProperties(machine.events, 'workflow machine events');
  if (Object.keys(machine.events).length === 0)
    throw new Error('Workflow machine events are empty');
  for (const [type, definition] of Object.entries(machine.events)) {
    requireString(type, 'workflow event type');
    requireExactKeys(definition, MACHINE_EVENT_KEYS, MACHINE_EVENT_KEYS, `workflow event ${type}`);
    for (const origin of requireStringArray(definition.origins, `${type} origins`)) {
      if (origin !== 'none' && !states.has(origin)) {
        throw new Error(`${type} has unknown origin ${origin}`);
      }
    }
    if (definition.destination !== 'same' && !states.has(definition.destination)) {
      throw new Error(`${type} has unknown destination ${definition.destination}`);
    }
    for (const role of requireStringArray(definition.roles, `${type} roles`)) {
      if (!roles.has(role)) throw new Error(`${type} has unknown role ${role}`);
    }
    requireString(definition.guard, `${type} guard`);
  }
  return machine;
}

function validateEventEnvelope(event, machine) {
  validateMachine(machine);
  requireExactKeys(event, EVENT_KEYS, REQUIRED_EVENT_KEYS, 'event');
  if (event.schemaVersion !== 1) throw new Error('Event schemaVersion must be 1');
  requireInitiativeId(event.initiativeId);
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) {
    throw new Error('Event sequence must be a positive safe integer');
  }
  if (
    typeof event.recordedAt !== 'string' ||
    !CANONICAL_TIMESTAMP.test(event.recordedAt) ||
    Number.isNaN(Date.parse(event.recordedAt)) ||
    new Date(event.recordedAt).toISOString() !== event.recordedAt
  ) {
    throw new Error('recordedAt must be a canonical ISO timestamp with UTC milliseconds');
  }
  const definition = machine.events[event.type];
  if (!definition) throw new Error(`Unknown event type: ${String(event.type)}`);
  requireExactKeys(event.recordedBy, new Set(['role']), new Set(['role']), 'recordedBy');
  const role = event.recordedBy.role;
  if (!machine.roles.includes(role)) throw new Error(`Unknown recorder role: ${String(role)}`);
  if (!definition.roles.includes(role)) {
    throw new Error(`Recorder role ${role} is not authorized for ${event.type}`);
  }
  requireObject(event.payload, `${event.type} payload`);
  requireHex(event.eventHash, 64, 'eventHash');

  if (event.sequence === 1) {
    if (Object.hasOwn(event, 'parent')) throw new Error('The first event must not have a parent');
  } else {
    requireExactKeys(
      event.parent,
      new Set(['sequence', 'eventHash']),
      new Set(['sequence', 'eventHash']),
      'parent',
    );
    if (event.parent.sequence !== event.sequence - 1) {
      throw new Error('Parent sequence must equal event sequence minus one');
    }
    requireHex(event.parent.eventHash, 64, 'parent eventHash');
  }
  return event;
}

function validateArtifact(value, label) {
  requireExactKeys(
    value,
    new Set(['path', 'sha256']),
    new Set(['path', 'sha256']),
    `${label} artifact`,
  );
  try {
    assertSafeRelativePath(value.path);
  } catch (error) {
    throw new Error(`${label} artifact path is invalid: ${error.message}`);
  }
  requireHex(value.sha256, 64, `${label} artifact sha256`);
}

function validateDeliverySeed(value) {
  requireExactKeys(
    value,
    new Set(['branch', 'headSha', 'contentDigest']),
    new Set(['branch', 'headSha', 'contentDigest']),
    'delivery seed',
  );
  requireBranch(value.branch, 'delivery branch');
  requireHex(value.headSha, 40, 'delivery headSha');
  requireHex(value.contentDigest, 64, 'delivery contentDigest');
  return value;
}

function validateCycleBoundDelivery(value) {
  requireExactKeys(
    value,
    new Set(['branch', 'headSha', 'contentDigest', 'validationCycleId']),
    new Set(['branch', 'headSha', 'contentDigest', 'validationCycleId']),
    'cycle-bound delivery',
  );
  requireBranch(value.branch, 'delivery branch');
  requireHex(value.headSha, 40, 'delivery headSha');
  requireHex(value.contentDigest, 64, 'delivery contentDigest');
  requireHex(value.validationCycleId, 64, 'delivery validationCycleId');
  return value;
}

function validateAuthority(event, value, allowedDecisionBy) {
  requireExactKeys(
    value,
    new Set(['decisionBy', 'recordedBy', 'basis']),
    new Set(['decisionBy', 'recordedBy', 'basis']),
    `${event.type} authority`,
  );
  if (!allowedDecisionBy.includes(value.decisionBy)) {
    throw new Error(`${event.type} authority decisionBy must be ${allowedDecisionBy.join(' or ')}`);
  }
  if (!['sarah', 'tariq'].includes(value.recordedBy)) {
    throw new Error(`${event.type} authority recordedBy must be sarah or tariq`);
  }
  if (value.recordedBy !== event.recordedBy?.role) {
    throw new Error(`${event.type} authority recordedBy must match the event recorder`);
  }
  requireString(value.basis, `${event.type} authority basis`);
}

function validateDeviceQa(value) {
  requireExactKeys(
    value,
    new Set(['mode', 'rationale']),
    new Set(['mode', 'rationale']),
    'deviceQa',
  );
  if (!['required', 'not_applicable'].includes(value.mode)) {
    throw new Error('deviceQa mode must be required or not_applicable');
  }
  requireString(value.rationale, 'deviceQa rationale');
}

function validateChecks(event, checks) {
  if (!Array.isArray(checks) || checks.length === 0) {
    throw new Error(`${event.type} checks must be a nonempty array`);
  }
  const ids = new Set();
  for (const check of checks) {
    requireExactKeys(
      check,
      new Set(['id', 'status']),
      new Set(['id', 'status']),
      `${event.type} check`,
    );
    requireString(check.id, `${event.type} check id`);
    if (ids.has(check.id)) throw new Error(`${event.type} has duplicate check ${check.id}`);
    ids.add(check.id);
    if (!['passed', 'failed'].includes(check.status)) {
      throw new Error(`${event.type} check status must be passed or failed`);
    }
  }
}

function strictPayload(event, keys) {
  const allowed = new Set(keys);
  requireExactKeys(event.payload, allowed, allowed, `${event.type} payload`);
  return event.payload;
}

const PAYLOAD_VALIDATORS = {
  'initiative.created': (event) => {
    const payload = strictPayload(event, ['title', 'branch', 'baseSha']);
    requireString(payload.title, 'initiative title');
    requireBranch(payload.branch, 'initiative branch');
    requireHex(payload.baseSha, 40, 'initiative baseSha');
  },
  'spec.submitted': (event) => {
    const payload = strictPayload(event, ['spec', 'deviceQa']);
    validateArtifact(payload.spec, 'spec');
    validateDeviceQa(payload.deviceQa);
  },
  'spec.signed': (event) => {
    const payload = strictPayload(event, ['spec', 'authority']);
    validateArtifact(payload.spec, 'spec');
    validateAuthority(event, payload.authority, ['user']);
  },
  'spec.revised': (event) => {
    const payload = strictPayload(event, ['spec', 'deviceQa', 'reason']);
    validateArtifact(payload.spec, 'spec');
    validateDeviceQa(payload.deviceQa);
    requireString(payload.reason, 'spec revision reason');
  },
  'plan.submitted': (event) => {
    validateArtifact(strictPayload(event, ['plan']).plan, 'plan');
  },
  'plan.approved': (event) => {
    const payload = strictPayload(event, ['plan', 'authority']);
    validateArtifact(payload.plan, 'plan');
    validateAuthority(event, payload.authority, ['sarah']);
  },
  'plan.revised': (event) => {
    const payload = strictPayload(event, ['plan', 'reason']);
    validateArtifact(payload.plan, 'plan');
    requireString(payload.reason, 'plan revision reason');
  },
  'implementation.ready': (event) => {
    validateDeliverySeed(strictPayload(event, ['delivery']).delivery);
  },
  'review.approved': (event) => {
    const payload = strictPayload(event, ['verdict', 'review', 'delivery', 'authority']);
    if (payload.verdict !== 'approved') {
      throw new Error('review.approved verdict must be approved');
    }
    validateArtifact(payload.review, 'review');
    validateCycleBoundDelivery(payload.delivery);
    validateAuthority(event, payload.authority, ['tariq']);
  },
  'review.changes_requested': (event) => {
    const payload = strictPayload(event, ['verdict', 'review', 'delivery', 'authority']);
    if (payload.verdict !== 'changes_requested') {
      throw new Error('review.changes_requested verdict must be changes_requested');
    }
    validateArtifact(payload.review, 'review');
    validateCycleBoundDelivery(payload.delivery);
    validateAuthority(event, payload.authority, ['tariq']);
  },
  'verification.passed': (event) => {
    const payload = strictPayload(event, ['delivery', 'checks']);
    validateCycleBoundDelivery(payload.delivery);
    validateChecks(event, payload.checks);
    if (payload.checks.some((check) => check.status !== 'passed')) {
      throw new Error('verification.passed requires every check status to be passed');
    }
  },
  'verification.failed': (event) => {
    const payload = strictPayload(event, ['delivery', 'checks', 'failedCheck']);
    validateCycleBoundDelivery(payload.delivery);
    validateChecks(event, payload.checks);
    requireString(payload.failedCheck, 'verification failedCheck');
    if (
      !payload.checks.some((check) => check.id === payload.failedCheck && check.status === 'failed')
    ) {
      throw new Error('verification failedCheck must identify a failed result');
    }
  },
  'device_qa.passed': (event) => {
    const payload = strictPayload(event, ['authority', 'qa', 'device', 'os', 'delivery']);
    validateAuthority(event, payload.authority, ['user']);
    validateArtifact(payload.qa, 'QA');
    requireString(payload.device, 'device');
    requireString(payload.os, 'operating system');
    validateCycleBoundDelivery(payload.delivery);
  },
  'device_qa.failed': (event) => {
    const payload = strictPayload(event, [
      'authority',
      'qa',
      'device',
      'os',
      'failedCases',
      'delivery',
    ]);
    validateAuthority(event, payload.authority, ['user']);
    validateArtifact(payload.qa, 'QA');
    requireString(payload.device, 'device');
    requireString(payload.os, 'operating system');
    requireStringArray(payload.failedCases, 'failedCases');
    validateCycleBoundDelivery(payload.delivery);
  },
  'work.reopened': (event) => {
    const payload = strictPayload(event, ['reason', 'delivery']);
    requireString(payload.reason, 'work reopen reason');
    validateCycleBoundDelivery(payload.delivery);
  },
  'blocker.opened': (event) => {
    const payload = strictPayload(event, [
      'blockerId',
      'trigger',
      'risk',
      'owner',
      'requiredResolver',
    ]);
    requireString(payload.blockerId, 'blocker ID');
    requireString(payload.trigger, 'blocker trigger');
    requireString(payload.risk, 'blocker risk');
    requireOneOf(payload.owner, BLOCKER_OWNERS, 'blocker owner');
    requireOneOf(payload.requiredResolver, BLOCKER_RESOLVERS, 'blocker requiredResolver');
  },
  'blocker.resolved': (event) => {
    const payload = strictPayload(event, ['blockerId', 'resolution', 'authority']);
    requireString(payload.blockerId, 'blocker ID');
    requireString(payload.resolution, 'blocker resolution');
    validateAuthority(event, payload.authority, ['user']);
  },
  'initiative.cancelled': (event) => {
    const payload = strictPayload(event, ['reason', 'authority']);
    requireString(payload.reason, 'initiative cancellation reason');
    validateAuthority(event, payload.authority, ['user', 'sarah']);
  },
};

function validateEventPayload(event, context = {}) {
  requireObject(event, 'event');
  requireInitiativeId(event.initiativeId);
  if (context.initiativeId !== undefined && event.initiativeId !== context.initiativeId) {
    throw new Error(
      `Event initiative ID ${event.initiativeId} does not match directory initiative ID ${context.initiativeId}`,
    );
  }
  const validator = PAYLOAD_VALIDATORS[event.type];
  if (!validator) throw new Error(`Unknown event type: ${String(event.type)}`);
  requireObject(event.recordedBy, 'recordedBy');
  requireObject(event.payload, `${event.type} payload`);
  validator(event);
  return event.payload;
}

module.exports = {
  validateMachine,
  validateEventEnvelope,
  validateEventPayload,
  validateDeliverySeed,
  validateCycleBoundDelivery,
};
