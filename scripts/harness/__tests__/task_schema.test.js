const assert = require('node:assert/strict');
const test = require('node:test');

const { finalizeHashedObject } = require('../lib/workflow/canonical');
const {
  TASK_EVENT_TYPES,
  validateTaskEventEnvelope,
  validateTaskEventPayload,
} = require('../lib/tasks/schema');

const ID = '2026-07-25-example';
const HASH = 'a'.repeat(64);
const SHA = 'b'.repeat(40);
const SPEC = { path: 'docs/superpowers/specs/2026-07-25-example-design.md', sha256: HASH };
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-example.md',
  sha256: 'c'.repeat(64),
};
const TASK_GRAPH = {
  path: 'docs/superpowers/task-graphs/2026-07-25-example.json',
  sha256: 'd'.repeat(64),
};
const CHECKS = [
  {
    command: ['node', '--test', 'scripts/harness/__tests__/task_schema.test.js'],
    passed: true,
    summary: 'Task schema tests passed.',
  },
];

const PAYLOADS = {
  'task_graph.activated': {
    initiative: { sequence: 6, eventHash: '1'.repeat(64) },
    spec: SPEC,
    plan: PLAN,
    taskGraph: TASK_GRAPH,
    branch: 'refactor/example',
    baseSha: SHA,
    graphHash: '2'.repeat(64),
    bootstrapCompletions: [],
  },
  'task.claimed': {
    taskId: 'task-01',
    packetHash: '3'.repeat(64),
    mode: 'inline',
    assigneeRole: 'dev',
    branch: 'refactor/example',
    startHead: SHA,
    basis: 'Execute the exact current packet inline.',
  },
  'task.completed': {
    taskId: 'task-01',
    packetHash: '3'.repeat(64),
    claimEventHash: '4'.repeat(64),
    startHead: SHA,
    endHead: 'c'.repeat(40),
    changedPaths: ['scripts/harness/lib/tasks/schema.js'],
    summary: 'Added strict task event validation.',
    checks: CHECKS,
  },
  'task.failed': {
    taskId: 'task-01',
    packetHash: '3'.repeat(64),
    claimEventHash: '4'.repeat(64),
    summary: 'The focused test failed.',
    changesRemain: false,
  },
  'task.blocked': {
    taskId: 'task-01',
    owner: 'tariq',
    reason: 'The approved graph needs a plan revision.',
    criticalTrigger: false,
  },
  'task.unblocked': {
    taskId: 'task-01',
    resolution: 'The graph and plan were revised and approved.',
    basis: 'Sarah verified the new approval bundle.',
  },
  'task.released': {
    taskId: 'task-01',
    packetHash: '3'.repeat(64),
    claimEventHash: '4'.repeat(64),
    reason: 'The inline session was interrupted before changes.',
  },
  'task_graph.replaced': {
    initiative: { sequence: 9, eventHash: '5'.repeat(64) },
    spec: SPEC,
    plan: { ...PLAN, sha256: '6'.repeat(64) },
    taskGraph: { ...TASK_GRAPH, sha256: '7'.repeat(64) },
    branch: 'refactor/example',
    baseSha: SHA,
    graphHash: '8'.repeat(64),
    previousGraphHash: '2'.repeat(64),
    reason: 'The approved plan was revised.',
    bootstrapCompletions: [],
  },
};

function roleFor(type) {
  return type.startsWith('task_graph.') ? 'tariq' : 'sarah';
}

function event(type, overrides = {}) {
  const value = {
    schemaVersion: 1,
    initiativeId: ID,
    sequence: 2,
    type,
    recordedAt: '2026-07-25T12:34:56.789Z',
    recordedBy: { role: roleFor(type) },
    parent: { sequence: 1, eventHash: '9'.repeat(64) },
    payload: PAYLOADS[type],
    ...overrides,
  };
  if (Object.hasOwn(overrides, 'parent') && overrides.parent === undefined) delete value.parent;
  return finalizeHashedObject(value, 'eventHash');
}

void test('defines and accepts every exact task event type', () => {
  assert.deepEqual(TASK_EVENT_TYPES, [
    'task_graph.activated',
    'task.claimed',
    'task.completed',
    'task.failed',
    'task.blocked',
    'task.unblocked',
    'task.released',
    'task_graph.replaced',
  ]);
  for (const type of TASK_EVENT_TYPES) {
    const value = event(type);
    assert.equal(validateTaskEventEnvelope(value), value);
    assert.equal(validateTaskEventPayload(value, { initiativeId: ID }), value.payload);
  }
});

void test('accepts an activation root without a parent and rejects any second root shape', () => {
  const root = event('task_graph.activated', { sequence: 1, parent: undefined });
  assert.doesNotThrow(() => validateTaskEventEnvelope(root));
  assert.throws(
    () => validateTaskEventEnvelope(event('task.claimed', { sequence: 1, parent: undefined })),
    /first task event.*activated root/i,
  );
});

void test('rejects unknown fields, malformed evidence, and unauthorized recorders', () => {
  assert.throws(
    () => validateTaskEventEnvelope({ ...event('task.claimed'), unexpected: true }),
    /task event fields.*unexpected/i,
  );
  assert.throws(
    () =>
      validateTaskEventPayload({
        ...event('task.claimed'),
        payload: { ...PAYLOADS['task.claimed'], unexpected: true },
      }),
    /task\.claimed payload.*unexpected/i,
  );
  assert.throws(
    () => validateTaskEventEnvelope({ ...event('task.claimed'), recordedBy: { role: 'dev' } }),
    /not authorized/i,
  );
  assert.throws(
    () =>
      validateTaskEventPayload({
        ...event('task.completed'),
        payload: { ...PAYLOADS['task.completed'], checks: [{ ...CHECKS[0], passed: false }] },
      }),
    /completed.*passed checks/i,
  );
  assert.throws(
    () =>
      validateTaskEventPayload({
        ...event('task.claimed'),
        payload: { ...PAYLOADS['task.claimed'], mode: 'automatic' },
      }),
    /mode.*inline.*dispatched/i,
  );
});

void test('accepts generic bootstrap completions and validates portable attestations', () => {
  const completion = {
    taskId: 'task-01',
    startHead: SHA,
    endHead: 'c'.repeat(40),
    changedPaths: ['scripts/harness/lib/tasks/schema.js'],
    summary: 'Validated an actual committed task range.',
    checks: CHECKS,
  };
  assert.doesNotThrow(() =>
    validateTaskEventPayload({
      ...event('task_graph.activated'),
      payload: {
        ...PAYLOADS['task_graph.activated'],
        bootstrapCompletions: [completion],
      },
    }),
  );
  const bootstrapAttestation = {
    schemaVersion: 1,
    validatedHead: 'c'.repeat(40),
    ranges: [{ taskId: 'task-01', digest: 'e'.repeat(64) }],
    chainDigest: 'f'.repeat(64),
  };
  assert.doesNotThrow(() =>
    validateTaskEventPayload({
      ...event('task_graph.activated'),
      payload: {
        ...PAYLOADS['task_graph.activated'],
        bootstrapCompletions: [completion],
        bootstrapAttestation,
      },
    }),
  );
  assert.throws(
    () =>
      validateTaskEventPayload({
        ...event('task_graph.activated'),
        payload: {
          ...PAYLOADS['task_graph.activated'],
          bootstrapCompletions: [completion],
          bootstrapAttestation: {
            ...bootstrapAttestation,
            ranges: [{ taskId: 'task-01', digest: 'not-a-digest' }],
          },
        },
      }),
    /attestation.*digest/i,
  );
});
