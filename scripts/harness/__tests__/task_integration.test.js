const assert = require('node:assert/strict');
const test = require('node:test');

const { runCli } = require('../lib/workflow/cli');
const { collectWorkflowValidationErrors } = require('../lib/workflow/check');
const { getWorkflowStatus } = require('../lib/workflow/status');

const ID = '2026-07-25-task-integration';
const BRANCH = 'refactor/task-integration';
const SPEC = { path: 'docs/superpowers/specs/task-integration.md', sha256: '1'.repeat(64) };
const PLAN = { path: 'docs/superpowers/plans/task-integration.md', sha256: '2'.repeat(64) };
const TASK_GRAPH = {
  path: 'docs/superpowers/task-graphs/task-integration.json',
  sha256: '3'.repeat(64),
};

function writable() {
  let value = '';
  return {
    write(chunk) {
      value += String(chunk);
    },
    value() {
      return value;
    },
  };
}

function initiativeProjection(overrides = {}) {
  return {
    initiative: { id: ID, title: 'Task integration', branch: BRANCH, baseSha: '4'.repeat(40) },
    phase: 'execution',
    owner: 'dev',
    sequence: 8,
    latestEvent: {
      type: 'plan.approved',
      eventHash: '5'.repeat(64),
      recordedAt: '2026-07-25T12:00:00.000Z',
    },
    spec: { current: SPEC, signed: true, deviceQaMode: 'not_applicable' },
    plan: { current: PLAN, taskGraph: TASK_GRAPH, approved: true },
    delivery: undefined,
    validationCycleId: undefined,
    review: undefined,
    verification: undefined,
    qa: undefined,
    openBlockers: {},
    ...overrides,
  };
}

function projectedTasks(overrides = {}) {
  return {
    initiativeId: ID,
    graphHash: '6'.repeat(64),
    sequence: 7,
    latestEvent: { type: 'task.completed', eventHash: '7'.repeat(64) },
    completedCount: 3,
    totalCount: 5,
    readyTaskIds: ['task-04'],
    parallelReadyGroups: [],
    blockers: { 'task-05': { owner: 'tariq', reason: 'Review dependency.' } },
    activeClaim: undefined,
    implementationReadyAllowed: false,
    ...overrides,
  };
}

void test('initiative status attaches current task progress and suppresses implementation ready', () => {
  const status = getWorkflowStatus({
    root: '/repo',
    initiativeId: ID,
    machine: {},
    manifest: { workflow: { tasks: { limits: { maxPacketBytes: 24576 } } } },
    loadEventHistory: () => ({
      events: Array.from({ length: 8 }, () => ({})),
      projection: initiativeProjection(),
    }),
    validateArtifactReference: (_root, reference) => reference,
    collectDeliveryRevision: () => {
      throw new Error('Delivery collection must not run before implementation.ready');
    },
    loadTaskState: () => projectedTasks(),
  });

  assert.equal(status.tasks.completed, 3);
  assert.equal(status.tasks.total, 5);
  assert.equal(status.tasks.implementationReadyAllowed, false);
  assert.deepEqual(status.tasks.readyTaskIds, ['task-04']);
  assert.deepEqual(status.tasks.blockedTasks, [
    { taskId: 'task-05', owner: 'tariq', reason: 'Review dependency.' },
  ]);
  assert.match(status.nextActions[0], /workflow -- tasks/);
  assert.doesNotMatch(status.nextActions.join('\n'), /implementation\.ready/);
});

void test('implementation.ready rejects incomplete task state but preserves historical no-graph behavior', async () => {
  const machine = {
    events: { 'implementation.ready': { roles: ['dev'] } },
  };
  const manifest = {
    workflow: { tasks: { limits: { maxPacketBytes: 24576 } } },
    verification: { checks: [] },
  };
  const baseOptions = {
    root: '/repo',
    machine,
    manifest,
    argv: [
      'record',
      'implementation.ready',
      '--id',
      ID,
      '--expected-sequence',
      '8',
      '--recorded-by',
      'dev',
    ],
    stdout: writable(),
    stderr: writable(),
    loadManifest: () => manifest,
    loadWorkflowMachine: () => machine,
    collectDeliveryRevision: () => ({
      branch: BRANCH,
      headSha: '8'.repeat(40),
      contentDigest: '9'.repeat(64),
    }),
  };

  const appended = [];
  const incomplete = {
    ...baseOptions,
    appendEvent: (request) => appended.push(request),
    loadEventHistory: () => ({ events: [{}], projection: initiativeProjection() }),
    loadTaskContext: () => ({ taskProjection: projectedTasks() }),
  };
  assert.equal(await runCli(incomplete), 1);
  assert.match(incomplete.stderr.value(), /current task graph has incomplete tasks/i);
  assert.equal(appended.length, 0);

  const historicalAppends = [];
  const historical = {
    ...baseOptions,
    stdout: writable(),
    stderr: writable(),
    appendEvent: (request) => {
      historicalAppends.push(request);
      return {
        event: {
          sequence: 9,
          type: request.draft.type,
          eventHash: 'a'.repeat(64),
        },
      };
    },
    loadEventHistory: () => ({
      events: [{}],
      projection: initiativeProjection({
        plan: { current: PLAN, approved: true },
      }),
    }),
    loadTaskContext: () => {
      throw new Error('Historical initiative must not load task state');
    },
  };
  assert.equal(await runCli(historical), 0, historical.stderr.value());
  assert.equal(historicalAppends.length, 1);
});

void test('read-only harness validation checks the task graph and task ledger', () => {
  const calls = [];
  const errors = collectWorkflowValidationErrors({
    root: '/repo',
    manifest: { workflow: { tasks: { limits: { maxPacketBytes: 24576 } } } },
    machine: {},
    discoverInitiativeIds: () => [ID],
    loadEventHistory: () => ({ projection: initiativeProjection() }),
    validateArtifactReference: (_root, reference) => {
      calls.push(['artifact', reference.path]);
      return reference;
    },
    loadTaskContext: () => {
      calls.push(['task-ledger', ID]);
      return { taskProjection: projectedTasks() };
    },
  });

  assert.deepEqual(errors, []);
  assert(calls.some((entry) => entry[1] === TASK_GRAPH.path));
  assert(calls.some((entry) => entry[0] === 'task-ledger'));
});

void test('task graph or task-ledger corruption becomes deterministic harness errors', () => {
  const errors = collectWorkflowValidationErrors({
    root: '/repo',
    manifest: { workflow: { tasks: { limits: { maxPacketBytes: 24576 } } } },
    machine: {},
    discoverInitiativeIds: () => [ID],
    loadEventHistory: () => ({ projection: initiativeProjection() }),
    validateArtifactReference: (_root, reference) => reference,
    loadTaskContext: () => {
      throw new Error('task event parent chain is invalid');
    },
  });

  assert.equal(errors.length, 1);
  assert.equal(errors[0].file, `docs/superpowers/initiatives/${ID}/task-events`);
  assert.match(errors[0].message, /task event parent chain/i);
});
