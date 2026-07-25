const assert = require('node:assert/strict');
const test = require('node:test');

const { finalizeHashedObject } = require('../lib/workflow/canonical');
const { createTaskPacket } = require('../lib/tasks/packet');
const { runTaskCli } = require('../lib/tasks/cli');

const ID = '2026-07-25-task-cli';
const BRANCH = 'refactor/task-cli';
const START = '1'.repeat(40);
const END = '2'.repeat(40);
const EVENT_HASH = '3'.repeat(64);
const SPEC = { path: 'docs/superpowers/specs/task-cli.md', sha256: '4'.repeat(64) };
const PLAN = { path: 'docs/superpowers/plans/task-cli.md', sha256: '5'.repeat(64) };
const GRAPH_REF = {
  path: 'docs/superpowers/task-graphs/task-cli.json',
  sha256: '6'.repeat(64),
};
const LIMITS = { maxPacketBytes: 24576 };

const task = {
  id: 'task-01',
  title: 'Implement task CLI',
  kind: 'mutation',
  ownerRole: 'dev',
  objective: 'Implement the exact task CLI.',
  dependsOn: [],
  readPaths: ['docs/superpowers/specs/**'],
  writePaths: ['scripts/harness/**'],
  acceptanceCriteria: ['The task CLI is tested.'],
  verificationCommands: [['node', '--test', 'scripts/harness/__tests__/task_cli.test.js']],
  recommendedCommitMessage: 'feat: add task cli',
  escalationNotes: [],
};
const graph = finalizeHashedObject(
  { schemaVersion: 1, initiativeId: ID, plan: PLAN, tasks: [task] },
  'graphHash',
);
const initiativeProjection = {
  sequence: 8,
  latestEvent: { eventHash: '7'.repeat(64) },
  phase: 'execution',
  initiative: { id: ID, branch: BRANCH, baseSha: '8'.repeat(40) },
  spec: { current: SPEC, signed: true, deviceQaMode: 'not_applicable' },
  plan: { current: PLAN, taskGraph: GRAPH_REF, approved: true },
  openBlockers: {},
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

function taskProjection(overrides = {}) {
  return {
    initiativeId: ID,
    graphHash: graph.graphHash,
    sequence: 1,
    latestEvent: { type: 'task_graph.activated', eventHash: EVENT_HASH },
    readyTaskIds: ['task-01'],
    parallelReadyGroups: [],
    activeClaim: undefined,
    blockers: {},
    completions: {},
    completedCount: 0,
    totalCount: 1,
    implementationReadyAllowed: false,
    tasks: { 'task-01': { ...task, state: 'ready' } },
    ...overrides,
  };
}

function harness(overrides = {}) {
  const stdout = writable();
  const stderr = writable();
  const appended = [];
  const context = {
    graph,
    initiativeProjection,
    taskProjection: taskProjection(),
    limits: LIMITS,
  };
  const options = {
    root: '/repo',
    argv: [],
    stdout,
    stderr,
    clock: () => new Date('2026-07-25T12:00:00.000Z'),
    manifest: { workflow: { tasks: { limits: LIMITS } } },
    loadTaskContext: () => context,
    loadInitiativeContext: () => ({
      graph,
      initiativeProjection,
      taskHistory: { events: [], projection: undefined },
      limits: LIMITS,
    }),
    appendTaskEvent(request) {
      appended.push(request);
      return {
        event: {
          sequence: request.expectedSequence,
          type: request.draft.type,
          eventHash: EVENT_HASH,
        },
        path: 'task-event.json',
      };
    },
    collectTaskStartRevision: () => ({ branch: BRANCH, startHead: START }),
    collectTaskCompletionRevision: () => ({
      branch: BRANCH,
      startHead: START,
      endHead: END,
      changedPaths: ['scripts/harness/lib/tasks/cli.js'],
    }),
    recoverTaskRuntimeFiles: () => ({ status: 'recovered', removed: ['lock'] }),
    ...overrides,
  };
  return { appended, context, options, stderr, stdout };
}

async function execute(fixture, argv) {
  return runTaskCli({ ...fixture.options, argv });
}

void test('status, next, and packet are deterministic and append nothing', async () => {
  for (const [argv, expected] of [
    [['status', '--id', ID, '--json'], '"completed": 0'],
    [['next', '--id', ID, '--json'], '"task-01"'],
    [['packet', '--id', ID, '--task', 'task-01', '--json'], '"packetHash"'],
  ]) {
    const fixture = harness();
    assert.equal(await execute(fixture, argv), 0);
    assert.match(fixture.stdout.value(), new RegExp(expected));
    assert.equal(fixture.appended.length, 0);
  }
});

void test('activates the approved graph with one Tariq root event', async () => {
  const fixture = harness();
  assert.equal(
    await execute(fixture, [
      'activate',
      '--id',
      ID,
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
    ]),
    0,
  );
  assert.equal(fixture.appended.length, 1);
  assert.equal(fixture.appended[0].expectedSequence, 1);
  assert.equal(fixture.appended[0].draft.type, 'task_graph.activated');
  assert.equal(fixture.appended[0].draft.recordedBy.role, 'tariq');
});

void test('claims only the exact current packet and records start revision', async () => {
  const fixture = harness();
  const packet = createTaskPacket(fixture.context, 'task-01');
  assert.equal(
    await execute(fixture, [
      'claim',
      '--id',
      ID,
      '--task',
      'task-01',
      '--packet-hash',
      packet.packetHash,
      '--expected-sequence',
      '1',
      '--mode',
      'inline',
      '--assignee-role',
      'dev',
      '--basis',
      'Inline execution.',
    ]),
    0,
  );
  assert.equal(fixture.appended.length, 1);
  assert.deepEqual(fixture.appended[0].draft.payload, {
    taskId: 'task-01',
    packetHash: packet.packetHash,
    mode: 'inline',
    assigneeRole: 'dev',
    branch: BRANCH,
    startHead: START,
    basis: 'Inline execution.',
  });

  const stale = harness();
  assert.equal(
    await execute(stale, [
      'claim',
      '--id',
      ID,
      '--task',
      'task-01',
      '--packet-hash',
      'f'.repeat(64),
      '--expected-sequence',
      '1',
      '--mode',
      'inline',
      '--assignee-role',
      'dev',
      '--basis',
      'Stale.',
    ]),
    1,
  );
  assert.equal(stale.appended.length, 0);
  assert.match(stale.stderr.value(), /packet hash/i);
});

void test('completes a matching claim only with canonical passed required checks', async () => {
  const base = harness();
  const packet = createTaskPacket(base.context, 'task-01');
  const claim = {
    taskId: 'task-01',
    packetHash: packet.packetHash,
    eventHash: '9'.repeat(64),
    sequence: 2,
    branch: BRANCH,
    startHead: START,
  };
  const claimedProjection = taskProjection({
    sequence: 2,
    readyTaskIds: [],
    activeClaim: claim,
    tasks: { 'task-01': { ...task, state: 'claimed' } },
  });
  const checks = `${JSON.stringify(
    [
      {
        command: task.verificationCommands[0],
        passed: true,
        summary: '1 file passed',
      },
    ],
    null,
    2,
  )}\n`;
  const fixture = harness({
    loadTaskContext: () => ({
      graph,
      initiativeProjection,
      taskProjection: claimedProjection,
      limits: LIMITS,
    }),
  });
  assert.equal(
    await execute(fixture, [
      'complete',
      '--id',
      ID,
      '--task',
      'task-01',
      '--packet-hash',
      packet.packetHash,
      '--expected-sequence',
      '2',
      '--summary',
      'Implemented and verified.',
      '--checks',
      checks,
    ]),
    0,
  );
  assert.equal(fixture.appended[0].draft.type, 'task.completed');
  assert.equal(fixture.appended[0].draft.payload.claimEventHash, claim.eventHash);
  assert.deepEqual(fixture.appended[0].draft.payload.changedPaths, [
    'scripts/harness/lib/tasks/cli.js',
  ]);

  const invalid = harness({
    loadTaskContext: () => ({
      graph,
      initiativeProjection,
      taskProjection: claimedProjection,
      limits: LIMITS,
    }),
  });
  assert.equal(
    await execute(invalid, [
      'complete',
      '--id',
      ID,
      '--task',
      'task-01',
      '--packet-hash',
      packet.packetHash,
      '--expected-sequence',
      '2',
      '--summary',
      'No check.',
      '--checks',
      '[]',
    ]),
    2,
  );
  assert.equal(invalid.appended.length, 0);
  assert.match(invalid.stderr.value(), /canonical|checks|required/i);
});

void test('records fail, block, unblock, and release as Sarah events', async () => {
  const packetHash = createTaskPacket(harness().context, 'task-01').packetHash;
  const claim = {
    taskId: 'task-01',
    packetHash,
    eventHash: 'b'.repeat(64),
    sequence: 2,
    branch: BRANCH,
    startHead: START,
  };
  const cases = [
    [
      [
        'fail',
        '--id',
        ID,
        '--task',
        'task-01',
        '--packet-hash',
        packetHash,
        '--expected-sequence',
        '2',
        '--summary',
        'Focused check failed.',
        '--changes-remain',
        'false',
      ],
      'task.failed',
      taskProjection({ sequence: 2, readyTaskIds: [], activeClaim: claim }),
    ],
    [
      [
        'block',
        '--id',
        ID,
        '--task',
        'task-01',
        '--expected-sequence',
        '1',
        '--owner',
        'tariq',
        '--reason',
        'Architecture decision required.',
        '--critical-trigger',
        'true',
      ],
      'task.blocked',
      taskProjection(),
    ],
    [
      [
        'unblock',
        '--id',
        ID,
        '--task',
        'task-01',
        '--expected-sequence',
        '2',
        '--resolution',
        'Decision recorded.',
        '--basis',
        'Tariq approved.',
      ],
      'task.unblocked',
      taskProjection({
        sequence: 2,
        readyTaskIds: [],
        blockers: { 'task-01': { owner: 'tariq' } },
      }),
    ],
    [
      [
        'release',
        '--id',
        ID,
        '--task',
        'task-01',
        '--packet-hash',
        packetHash,
        '--expected-sequence',
        '2',
        '--reason',
        'Session interrupted.',
      ],
      'task.released',
      taskProjection({ sequence: 2, readyTaskIds: [], activeClaim: claim }),
    ],
  ];
  for (const [argv, eventType, projection] of cases) {
    const fixture = harness({
      loadTaskContext: () => ({
        graph,
        initiativeProjection,
        taskProjection: projection,
        limits: LIMITS,
      }),
    });
    assert.equal(await execute(fixture, argv), 0);
    assert.equal(fixture.appended.length, 1);
    assert.equal(fixture.appended[0].draft.type, eventType);
    assert.equal(fixture.appended[0].draft.recordedBy.role, 'sarah');
  }
});

void test('rejects stale sequences, duplicate flags, positional arguments, and unknown commands', async () => {
  for (const argv of [
    ['status', '--id', ID, '--id', ID],
    ['next', ID],
    ['claim', '--id', ID, '--expected-sequence', '0'],
    ['dispatch', '--id', ID],
  ]) {
    const fixture = harness();
    const result = await execute(fixture, argv);
    assert.notEqual(result, 0);
    assert.equal(fixture.appended.length, 0);
  }

  const stale = harness();
  const packet = createTaskPacket(stale.context, 'task-01');
  assert.equal(
    await execute(stale, [
      'claim',
      '--id',
      ID,
      '--task',
      'task-01',
      '--packet-hash',
      packet.packetHash,
      '--expected-sequence',
      '2',
      '--mode',
      'inline',
      '--assignee-role',
      'dev',
      '--basis',
      'Stale.',
    ]),
    1,
  );
  assert.match(stale.stderr.value(), /stale expected sequence/i);
});

void test('recovers task runtime files without appending', async () => {
  const fixture = harness();
  assert.equal(
    await execute(fixture, ['recover', '--id', ID, '--token', 'c'.repeat(32), '--dry-run']),
    0,
  );
  assert.match(fixture.stdout.value(), /recovered/);
  assert.equal(fixture.appended.length, 0);
});
