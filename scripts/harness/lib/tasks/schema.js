const { assertSafeRelativePath } = require('../paths');

const TASK_EVENT_TYPES = Object.freeze([
  'task_graph.activated',
  'task.claimed',
  'task.completed',
  'task.failed',
  'task.blocked',
  'task.unblocked',
  'task.released',
  'task_graph.replaced',
]);
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
const REQUIRED_EVENT_KEYS = new Set([...EVENT_KEYS].filter((key) => key !== 'parent'));
const EVENT_ROLES = Object.freeze({
  'task_graph.activated': new Set(['tariq']),
  'task.claimed': new Set(['sarah']),
  'task.completed': new Set(['sarah']),
  'task.failed': new Set(['sarah']),
  'task.blocked': new Set(['sarah']),
  'task.unblocked': new Set(['sarah']),
  'task.released': new Set(['sarah']),
  'task_graph.replaced': new Set(['tariq']),
});
const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TASK_ID = /^task-(?:0[1-9]|[1-9]\d|[1-9]\d{2})$/;
const HEX_40 = /^[a-f0-9]{40}$/;
const HEX_64 = /^[a-f0-9]{64}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const BRANCH_FORBIDDEN = /[\u0000-\u0020\u007f~^:?*[\]\\]/u;
const ASSIGNEE_ROLES = new Set(['sarah', 'marcus', 'layla', 'tariq', 'dev']);
const BLOCKER_OWNERS = new Set(['user', 'sarah', 'tariq', 'dev']);

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

function requireExactKeys(value, allowed, required, label) {
  requireObject(value, label);
  const keys = Reflect.ownKeys(value);
  for (const key of keys) {
    const descriptor = typeof key === 'string' && Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new Error(`${label} fields must be enumerable string data properties`);
    }
  }
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

function strictPayload(event, keys) {
  const exact = new Set(keys);
  requireExactKeys(event.payload, exact, exact, `${event.type} payload`);
  return event.payload;
}

function requireString(value, label, maximumBytes = 4096) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  if (Buffer.byteLength(value, 'utf8') > maximumBytes) {
    throw new Error(`${label} exceeds ${maximumBytes} UTF-8 bytes`);
  }
  return value;
}

function requireHex(value, expression, label) {
  if (typeof value !== 'string' || !expression.test(value)) {
    throw new Error(`${label} must be lowercase hexadecimal`);
  }
  return value;
}

function requireTaskId(value, label = 'task ID') {
  if (typeof value !== 'string' || !TASK_ID.test(value)) {
    throw new Error(`${label} must be task-01 through task-999`);
  }
  return value;
}

function requireInitiativeId(value) {
  const match = typeof value === 'string' ? value.match(INITIATIVE_ID) : undefined;
  if (!match) throw new Error('Task event initiative ID must be a lowercase YYYY-MM-DD slug');
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Task event initiative ID must start with a valid calendar date');
  }
  return value;
}

function validateArtifact(value, label) {
  const keys = new Set(['path', 'sha256']);
  requireExactKeys(value, keys, keys, `${label} artifact`);
  assertSafeRelativePath(value.path);
  requireHex(value.sha256, HEX_64, `${label} artifact sha256`);
}

function validateInitiativeReference(value) {
  const keys = new Set(['sequence', 'eventHash']);
  requireExactKeys(value, keys, keys, 'initiative reference');
  if (!Number.isSafeInteger(value.sequence) || value.sequence < 1) {
    throw new Error('initiative reference sequence must be a positive safe integer');
  }
  requireHex(value.eventHash, HEX_64, 'initiative reference eventHash');
}

function requireBranch(value) {
  const components = typeof value === 'string' ? value.split('/') : [];
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
    BRANCH_FORBIDDEN.test(value) ||
    components.some(
      (component) =>
        component.length === 0 ||
        component === '.' ||
        component.startsWith('.') ||
        component.endsWith('.lock'),
    )
  ) {
    throw new Error('task branch must be a safe non-main Git branch');
  }
}

function validateChangedPaths(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  const seen = new Set();
  for (const relativePath of value) {
    assertSafeRelativePath(relativePath);
    if (seen.has(relativePath)) throw new Error(`${label} contains duplicate ${relativePath}`);
    seen.add(relativePath);
  }
}

function validateChecks(value, label, { requirePassed }) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 8) {
    throw new Error(`${label} checks must contain one through eight entries`);
  }
  const commands = new Set();
  for (const check of value) {
    const keys = new Set(['command', 'passed', 'summary']);
    requireExactKeys(check, keys, keys, `${label} check`);
    if (
      !Array.isArray(check.command) ||
      check.command.length === 0 ||
      check.command.some((argument) => typeof argument !== 'string' || argument.length === 0)
    ) {
      throw new Error(`${label} check command must be a nonempty argument array`);
    }
    const commandKey = JSON.stringify(check.command);
    if (commands.has(commandKey)) throw new Error(`${label} has a duplicate check command`);
    commands.add(commandKey);
    if (typeof check.passed !== 'boolean') {
      throw new Error(`${label} check passed must be boolean`);
    }
    if (requirePassed && !check.passed) {
      throw new Error(`${label} requires passed checks`);
    }
    requireString(check.summary, `${label} check summary`, 1024);
  }
}

function validateCompletion(value, label) {
  const keys = new Set(['taskId', 'startHead', 'endHead', 'changedPaths', 'summary', 'checks']);
  requireExactKeys(value, keys, keys, label);
  requireTaskId(value.taskId, `${label} taskId`);
  requireHex(value.startHead, HEX_40, `${label} startHead`);
  requireHex(value.endHead, HEX_40, `${label} endHead`);
  validateChangedPaths(value.changedPaths, `${label} changedPaths`);
  requireString(value.summary, `${label} summary`);
  validateChecks(value.checks, label, { requirePassed: true });
}

function validateBootstrap(event, completions) {
  if (!Array.isArray(completions)) {
    throw new Error(`${event.type} bootstrapCompletions must be an array`);
  }
  if (completions.length > 0 && event.initiativeId !== '2026-07-25-harness-phase-3') {
    throw new Error('Bootstrap completions are restricted to the approved Phase 3 initiative');
  }
  const ids = new Set();
  for (const completion of completions) {
    validateCompletion(completion, 'bootstrap completion');
    if (ids.has(completion.taskId)) {
      throw new Error(`bootstrap completions contain duplicate ${completion.taskId}`);
    }
    ids.add(completion.taskId);
  }
}

function validateGraphBinding(event, payload, { replacement }) {
  validateInitiativeReference(payload.initiative);
  validateArtifact(payload.spec, 'spec');
  validateArtifact(payload.plan, 'plan');
  validateArtifact(payload.taskGraph, 'task graph');
  requireBranch(payload.branch);
  requireHex(payload.baseSha, HEX_40, 'task graph baseSha');
  requireHex(payload.graphHash, HEX_64, 'task graph graphHash');
  validateBootstrap(event, payload.bootstrapCompletions);
  if (replacement) {
    requireHex(payload.previousGraphHash, HEX_64, 'previousGraphHash');
    requireString(payload.reason, 'task graph replacement reason');
  }
}

function validateTaskEventEnvelope(event) {
  requireExactKeys(event, EVENT_KEYS, REQUIRED_EVENT_KEYS, 'task event');
  if (event.schemaVersion !== 1) throw new Error('Task event schemaVersion must be 1');
  requireInitiativeId(event.initiativeId);
  if (!Number.isSafeInteger(event.sequence) || event.sequence < 1) {
    throw new Error('Task event sequence must be a positive safe integer');
  }
  if (
    typeof event.recordedAt !== 'string' ||
    !TIMESTAMP.test(event.recordedAt) ||
    Number.isNaN(Date.parse(event.recordedAt)) ||
    new Date(event.recordedAt).toISOString() !== event.recordedAt
  ) {
    throw new Error('Task event recordedAt must be a canonical UTC timestamp');
  }
  if (!TASK_EVENT_TYPES.includes(event.type)) {
    throw new Error(`Unknown task event type: ${String(event.type)}`);
  }
  const recorderKeys = new Set(['role']);
  requireExactKeys(event.recordedBy, recorderKeys, recorderKeys, 'task event recordedBy');
  if (!EVENT_ROLES[event.type].has(event.recordedBy.role)) {
    throw new Error(
      `Recorder role ${String(event.recordedBy.role)} is not authorized for ${event.type}`,
    );
  }
  requireObject(event.payload, `${event.type} payload`);
  requireHex(event.eventHash, HEX_64, 'task event eventHash');

  if (event.sequence === 1) {
    if (event.type !== 'task_graph.activated' || Object.hasOwn(event, 'parent')) {
      throw new Error('The first task event must be an activated root without a parent');
    }
  } else {
    const parentKeys = new Set(['sequence', 'eventHash']);
    requireExactKeys(event.parent, parentKeys, parentKeys, 'task event parent');
    if (event.parent.sequence !== event.sequence - 1) {
      throw new Error('Task event parent sequence must equal sequence minus one');
    }
    requireHex(event.parent.eventHash, HEX_64, 'task event parent eventHash');
  }
  return event;
}

const PAYLOAD_VALIDATORS = {
  'task_graph.activated': (event) => {
    const payload = strictPayload(event, [
      'initiative',
      'spec',
      'plan',
      'taskGraph',
      'branch',
      'baseSha',
      'graphHash',
      'bootstrapCompletions',
    ]);
    validateGraphBinding(event, payload, { replacement: false });
  },
  'task.claimed': (event) => {
    const payload = strictPayload(event, [
      'taskId',
      'packetHash',
      'mode',
      'assigneeRole',
      'branch',
      'startHead',
      'basis',
    ]);
    requireTaskId(payload.taskId);
    requireHex(payload.packetHash, HEX_64, 'packetHash');
    if (!['inline', 'dispatched'].includes(payload.mode)) {
      throw new Error('task.claimed mode must be inline or dispatched');
    }
    if (!ASSIGNEE_ROLES.has(payload.assigneeRole)) {
      throw new Error('task.claimed assigneeRole is invalid');
    }
    requireBranch(payload.branch);
    requireHex(payload.startHead, HEX_40, 'task.claimed startHead');
    requireString(payload.basis, 'task.claimed basis');
  },
  'task.completed': (event) => {
    const payload = strictPayload(event, [
      'taskId',
      'packetHash',
      'claimEventHash',
      'startHead',
      'endHead',
      'changedPaths',
      'summary',
      'checks',
    ]);
    requireTaskId(payload.taskId);
    requireHex(payload.packetHash, HEX_64, 'packetHash');
    requireHex(payload.claimEventHash, HEX_64, 'claimEventHash');
    requireHex(payload.startHead, HEX_40, 'task.completed startHead');
    requireHex(payload.endHead, HEX_40, 'task.completed endHead');
    validateChangedPaths(payload.changedPaths, 'task.completed changedPaths');
    requireString(payload.summary, 'task.completed summary');
    validateChecks(payload.checks, 'task.completed', { requirePassed: true });
  },
  'task.failed': (event) => {
    const payload = strictPayload(event, [
      'taskId',
      'packetHash',
      'claimEventHash',
      'summary',
      'changesRemain',
    ]);
    requireTaskId(payload.taskId);
    requireHex(payload.packetHash, HEX_64, 'packetHash');
    requireHex(payload.claimEventHash, HEX_64, 'claimEventHash');
    requireString(payload.summary, 'task.failed summary');
    if (typeof payload.changesRemain !== 'boolean') {
      throw new Error('task.failed changesRemain must be boolean');
    }
  },
  'task.blocked': (event) => {
    const payload = strictPayload(event, ['taskId', 'owner', 'reason', 'criticalTrigger']);
    requireTaskId(payload.taskId);
    if (!BLOCKER_OWNERS.has(payload.owner)) throw new Error('task.blocked owner is invalid');
    requireString(payload.reason, 'task.blocked reason');
    if (typeof payload.criticalTrigger !== 'boolean') {
      throw new Error('task.blocked criticalTrigger must be boolean');
    }
  },
  'task.unblocked': (event) => {
    const payload = strictPayload(event, ['taskId', 'resolution', 'basis']);
    requireTaskId(payload.taskId);
    requireString(payload.resolution, 'task.unblocked resolution');
    requireString(payload.basis, 'task.unblocked basis');
  },
  'task.released': (event) => {
    const payload = strictPayload(event, ['taskId', 'packetHash', 'claimEventHash', 'reason']);
    requireTaskId(payload.taskId);
    requireHex(payload.packetHash, HEX_64, 'packetHash');
    requireHex(payload.claimEventHash, HEX_64, 'claimEventHash');
    requireString(payload.reason, 'task.released reason');
  },
  'task_graph.replaced': (event) => {
    const payload = strictPayload(event, [
      'initiative',
      'spec',
      'plan',
      'taskGraph',
      'branch',
      'baseSha',
      'graphHash',
      'previousGraphHash',
      'reason',
      'bootstrapCompletions',
    ]);
    validateGraphBinding(event, payload, { replacement: true });
  },
};

function validateTaskEventPayload(event, context = {}) {
  requireObject(event, 'task event');
  requireInitiativeId(event.initiativeId);
  if (context.initiativeId !== undefined && context.initiativeId !== event.initiativeId) {
    throw new Error('Task event initiative ID does not match task ledger directory');
  }
  const validator = PAYLOAD_VALIDATORS[event.type];
  if (!validator) throw new Error(`Unknown task event type: ${String(event.type)}`);
  validator(event);
  return event.payload;
}

module.exports = {
  TASK_EVENT_TYPES,
  validateTaskEventEnvelope,
  validateTaskEventPayload,
};
