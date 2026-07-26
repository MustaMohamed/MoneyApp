const assert = require('node:assert/strict');
const test = require('node:test');

const { canonicalStringify, finalizeHashedObject } = require('../lib/workflow/canonical');
const { createBootstrapAttestation } = require('../lib/tasks/bootstrap');
const { createTaskPacket } = require('../lib/tasks/packet');
const { loadCurrentInitiativeContext, runTaskCli } = require('../lib/tasks/cli');

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
    accountedHead: initiativeProjection.initiative.baseSha,
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
      request.validateCurrent?.({
        history: { events: [], projection: context.taskProjection },
        nextSequence: request.expectedSequence,
      });
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
    attestBootstrapChain(root, request) {
      return {
        observedCompletions: request.completions,
        attestation: createBootstrapAttestation({
          graphHash: request.graph.graphHash,
          branch: request.branch,
          checkpoint: request.checkpoint,
          validatedHead: request.completions.at(-1).endHead,
          completions: request.completions,
        }),
      };
    },
    recoverTaskRuntimeFiles: () => ({ status: 'recovered', removed: ['lock'] }),
    ...overrides,
  };
  return { appended, context, options, stderr, stdout };
}

void test('shared initiative loading binds the manifest legacy bridge reference', () => {
  const legacyBootstrapBridges = {
    path: 'harness/legacy_bootstrap_bridges.json',
    sha256: '9'.repeat(64),
  };
  let observed;
  loadCurrentInitiativeContext(
    {
      root: '/repo',
      machine: {},
      manifest: {
        workflow: {
          tasks: {
            legacyBootstrapAnchor: 'a'.repeat(40),
            legacyBootstrapBridges,
            limits: LIMITS,
          },
        },
      },
      loadEventHistory: () => ({ events: [], projection: initiativeProjection }),
      validateArtifactReference: (_root, reference) => reference,
      loadTaskGraph: () => graph,
      loadTaskHistory({ verifyBootstrapEvent }) {
        verifyBootstrapEvent({ marker: 'stored bootstrap' });
        return { events: [], projection: undefined };
      },
      verifyStoredBootstrapEvent(context) {
        observed = context;
        return { transparentBridges: [] };
      },
    },
    ID,
  );

  assert.equal(observed.marker, 'stored bootstrap');
  assert.equal(observed.legacyBootstrapAnchor, 'a'.repeat(40));
  assert.deepEqual(observed.legacyBootstrapBridgeReference, legacyBootstrapBridges);
});

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
  assert.equal(Object.hasOwn(fixture.appended[0].draft.payload, 'bootstrapAttestation'), false);
});

void test('activates a generic bootstrap chain with the exact stable Git attestation', async () => {
  const completion = {
    taskId: 'task-01',
    startHead: initiativeProjection.initiative.baseSha,
    endHead: END,
    changedPaths: ['scripts/harness/lib/tasks/cli.js'],
    summary: 'Implemented task CLI.',
    checks: [
      {
        command: task.verificationCommands[0],
        passed: true,
        summary: 'Focused task CLI test passed.',
      },
    ],
  };
  let attestations = 0;
  const fixture = harness({
    attestBootstrapChain(root, request) {
      attestations += 1;
      return harness().options.attestBootstrapChain(root, request);
    },
  });
  assert.equal(
    await execute(fixture, [
      'activate',
      '--id',
      ID,
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--bootstrap-completions',
      canonicalStringify([completion]),
    ]),
    0,
  );

  assert.equal(attestations, 2);
  assert.deepEqual(
    fixture.appended[0].draft.payload.bootstrapAttestation,
    createBootstrapAttestation({
      graphHash: graph.graphHash,
      branch: BRANCH,
      checkpoint: initiativeProjection.initiative.baseSha,
      validatedHead: END,
      completions: [completion],
    }),
  );
});

void test('claims only the exact current packet and records start revision', async () => {
  let observedExpectedHead;
  const fixture = harness({
    collectTaskStartRevision(root, branch, options) {
      observedExpectedHead = options?.expectedHead;
      return { branch: BRANCH, startHead: START };
    },
  });
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
  assert.equal(observedExpectedHead, initiativeProjection.initiative.baseSha);
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
        'false',
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

void test('requires an initiative blocker before recording a critical task blocker', async () => {
  const fixture = harness();
  assert.equal(
    await execute(fixture, [
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
      'Critical architecture decision required.',
      '--critical-trigger',
      'true',
    ]),
    1,
  );
  assert.equal(fixture.appended.length, 0);
  assert.match(fixture.stderr.value(), /initiative blocker.*critical task blocker/i);
});

void test('rejects task graph replacement outside execution and rejects the active graph', async () => {
  const outsideExecution = harness();
  outsideExecution.options.loadTaskContext = () => ({
    ...outsideExecution.context,
    initiativeProjection: { ...initiativeProjection, phase: 'integration_ready' },
  });
  outsideExecution.options.loadInitiativeContext = () => ({
    graph,
    initiativeProjection: { ...initiativeProjection, phase: 'integration_ready' },
    taskHistory: { events: [], projection: undefined },
    limits: LIMITS,
  });
  assert.equal(
    await execute(outsideExecution, [
      'replace',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--reason',
      'Attempt to reopen an accepted delivery.',
    ]),
    1,
  );
  assert.match(outsideExecution.stderr.value(), /replacement requires initiative execution phase/i);
  assert.equal(outsideExecution.appended.length, 0);

  const sameGraph = harness();
  assert.equal(
    await execute(sameGraph, [
      'replace',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--reason',
      'Attempt to reset the same graph.',
    ]),
    1,
  );
  assert.match(sameGraph.stderr.value(), /replacement graph must differ/i);
  assert.equal(sameGraph.appended.length, 0);
});

void test('validates replacement bootstrap completions before appending', async () => {
  const completion = {
    taskId: 'task-01',
    startHead: initiativeProjection.initiative.baseSha,
    endHead: END,
    changedPaths: ['scripts/harness/lib/tasks/cli.js'],
    summary: 'Implemented task CLI.',
    checks: [],
  };
  const previousGraph = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: PLAN,
      tasks: [{ ...task, title: 'Previous task CLI graph' }],
    },
    'graphHash',
  );
  const fixture = harness();
  fixture.options.loadTaskContext = () => ({
    ...fixture.context,
    graph: previousGraph,
    resolveGraph: (graphHash) =>
      graphHash === previousGraph.graphHash ? previousGraph : undefined,
  });
  assert.equal(
    await execute(fixture, [
      'replace',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--reason',
      'The approved graph changed.',
      '--bootstrap-completions',
      canonicalStringify([completion]),
    ]),
    1,
  );
  assert.equal(fixture.appended.length, 0);
  assert.match(fixture.stderr.value(), /checks|required/i);

  const validCompletion = {
    ...completion,
    checks: [
      {
        command: task.verificationCommands[0],
        passed: true,
        summary: 'Focused task CLI test passed.',
      },
    ],
  };
  const valid = harness();
  valid.options.loadTaskContext = () => ({
    ...valid.context,
    graph: previousGraph,
    resolveGraph: (graphHash) =>
      graphHash === previousGraph.graphHash ? previousGraph : undefined,
  });
  assert.equal(
    await execute(valid, [
      'replace',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--reason',
      'The approved graph changed.',
      '--bootstrap-completions',
      canonicalStringify([validCompletion]),
    ]),
    0,
  );
  assert.equal(valid.appended.length, 1);
  assert.equal(valid.appended[0].draft.type, 'task_graph.replaced');
  assert.equal(valid.appended[0].draft.recordedBy.role, 'tariq');
  assert.equal(
    valid.appended[0].resolveGraph(previousGraph.graphHash, GRAPH_REF, PLAN),
    previousGraph,
  );
  assert.equal(valid.appended[0].resolveGraph(graph.graphHash, GRAPH_REF, PLAN), graph);
  assert.deepEqual(
    JSON.parse(JSON.stringify(valid.appended[0].draft.payload.bootstrapCompletions)),
    [validCompletion],
  );
  assert.deepEqual(
    valid.appended[0].draft.payload.bootstrapAttestation,
    createBootstrapAttestation({
      graphHash: graph.graphHash,
      branch: BRANCH,
      checkpoint: initiativeProjection.initiative.baseSha,
      validatedHead: END,
      completions: [validCompletion],
    }),
  );
});

void test('rejects a Git race and a replacement that would hide completed work', async () => {
  const completion = {
    taskId: 'task-01',
    startHead: initiativeProjection.initiative.baseSha,
    endHead: END,
    changedPaths: ['scripts/harness/lib/tasks/cli.js'],
    summary: 'Implemented task CLI.',
    checks: [
      {
        command: task.verificationCommands[0],
        passed: true,
        summary: 'Focused task CLI test passed.',
      },
    ],
  };
  let calls = 0;
  const raced = harness({
    attestBootstrapChain(root, request) {
      calls += 1;
      if (calls === 2) throw new Error('Repository HEAD changed during bootstrap attestation');
      return harness().options.attestBootstrapChain(root, request);
    },
  });
  assert.equal(
    await execute(raced, [
      'activate',
      '--id',
      ID,
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--bootstrap-completions',
      canonicalStringify([completion]),
    ]),
    1,
  );
  assert.equal(raced.appended.length, 0);
  assert.match(raced.stderr.value(), /HEAD changed/i);

  const previousGraph = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: PLAN,
      tasks: [{ ...task, title: 'Previous task CLI graph' }],
    },
    'graphHash',
  );
  const hidden = harness();
  hidden.options.loadTaskContext = () => ({
    ...hidden.context,
    graph: previousGraph,
    taskProjection: taskProjection({
      completionOrder: ['task-01'],
      completions: { 'task-01': completion },
      completedCount: 1,
      accountedHead: END,
      tasks: { 'task-01': { ...task, state: 'completed', completion } },
      readyTaskIds: [],
    }),
    resolveGraph: () => previousGraph,
  });
  assert.equal(
    await execute(hidden, [
      'replace',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--reason',
      'Attempt to hide completed work.',
      '--bootstrap-completions',
      canonicalStringify([]),
    ]),
    0,
  );
  assert.equal(hidden.appended.length, 1);

  const omittedGraph = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: PLAN,
      tasks: [],
    },
    'graphHash',
  );
  const omitted = harness();
  omitted.options.loadTaskContext = hidden.options.loadTaskContext;
  omitted.options.loadInitiativeContext = () => ({
    graph: omittedGraph,
    initiativeProjection,
    taskHistory: { events: [], projection: undefined },
    limits: LIMITS,
  });
  assert.equal(
    await execute(omitted, [
      'replace',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--expected-initiative-sequence',
      '8',
      '--task-graph',
      GRAPH_REF.path,
      '--reason',
      'Remove the completed task.',
    ]),
    1,
  );
  assert.equal(omitted.appended.length, 0);
  assert.match(omitted.stderr.value(), /omits completed task/i);
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
