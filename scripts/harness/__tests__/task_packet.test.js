const assert = require('node:assert/strict');
const test = require('node:test');

const {
  canonicalStringify,
  finalizeHashedObject,
  hashCanonicalObject,
} = require('../lib/workflow/canonical');
const { createTaskPacket, verifyTaskPacket } = require('../lib/tasks/packet');

const ID = '2026-07-25-example';
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-example.md',
  sha256: 'a'.repeat(64),
};
const TASK_GRAPH = {
  path: 'docs/superpowers/task-graphs/2026-07-25-example.json',
  sha256: 'b'.repeat(64),
};
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-example-design.md',
  sha256: 'c'.repeat(64),
};

function task(id, dependsOn, writePath) {
  return {
    id,
    title: `Implement ${id}`,
    kind: 'mutation',
    ownerRole: 'dev',
    objective: `Implement the exact ${id} contract.`,
    dependsOn,
    readPaths: ['docs/superpowers/specs/2026-07-25-example-design.md'],
    writePaths: [writePath],
    acceptanceCriteria: [`${id} is tested and complete.`],
    verificationCommands: [['node', '--test', `${id}.test.js`]],
    recommendedCommitMessage: `feat: implement ${id}`,
    escalationNotes: [],
  };
}

const graph = finalizeHashedObject(
  {
    schemaVersion: 1,
    initiativeId: ID,
    plan: PLAN,
    tasks: [
      task('task-01', [], 'generated/one.js'),
      task('task-02', ['task-01'], 'generated/two.js'),
    ],
  },
  'graphHash',
);

function context(overrides = {}) {
  const completion = {
    taskId: 'task-01',
    eventHash: 'd'.repeat(64),
    endHead: '1'.repeat(40),
  };
  return {
    graph,
    taskProjection: {
      graphHash: graph.graphHash,
      sequence: 3,
      readyTaskIds: ['task-02'],
      completions: { 'task-01': completion },
    },
    initiativeProjection: {
      sequence: 8,
      initiative: { id: ID, branch: 'refactor/example' },
      spec: { current: SPEC, signed: true, deviceQaMode: 'not_applicable' },
      plan: { current: PLAN, taskGraph: TASK_GRAPH, approved: true },
    },
    limits: { maxPacketBytes: 24576 },
    ...overrides,
  };
}

void test('creates the exact deterministic bounded packet for one ready task', () => {
  const packet = createTaskPacket(context(), 'task-02');
  const second = createTaskPacket(context(), 'task-02');

  assert.deepEqual(Object.keys(packet).sort(), [
    'acceptanceCriteria',
    'branch',
    'constraints',
    'dependencyEvidence',
    'dependsOn',
    'escalationNotes',
    'graphHash',
    'initiativeId',
    'initiativeSequence',
    'kind',
    'objective',
    'ownerRole',
    'packetHash',
    'plan',
    'readPaths',
    'recommendedCommitMessage',
    'schemaVersion',
    'spec',
    'taskGraph',
    'taskId',
    'taskLedgerSequence',
    'title',
    'verificationCommands',
    'writePaths',
  ]);
  assert.equal(packet.packetHash, hashCanonicalObject(packet, 'packetHash'));
  assert.equal(canonicalStringify(packet), canonicalStringify(second));
  assert.deepEqual(
    packet.dependencyEvidence.map((entry) => ({ ...entry })),
    [
      {
        taskId: 'task-01',
        completionEventHash: 'd'.repeat(64),
        endHead: '1'.repeat(40),
      },
    ],
  );
  assert.deepEqual(verifyTaskPacket(canonicalStringify(packet), context().limits), packet);
  assert(Object.isFrozen(packet));
});

void test('changes packetHash when any binding input changes', () => {
  const baseline = createTaskPacket(context(), 'task-02').packetHash;
  const mutations = [
    (value) => {
      value.initiativeProjection = { ...value.initiativeProjection, sequence: 9 };
    },
    (value) => {
      value.taskProjection = { ...value.taskProjection, sequence: 4 };
    },
    (value) => {
      value.initiativeProjection = {
        ...value.initiativeProjection,
        initiative: { ...value.initiativeProjection.initiative, branch: 'refactor/other' },
      };
    },
    (value) => {
      value.initiativeProjection = {
        ...value.initiativeProjection,
        spec: {
          ...value.initiativeProjection.spec,
          current: { ...SPEC, sha256: 'e'.repeat(64) },
        },
      };
    },
    (value) => {
      value.graph = finalizeHashedObject(
        {
          ...graph,
          tasks: graph.tasks.map((entry) =>
            entry.id === 'task-02' ? { ...entry, objective: 'Changed objective.' } : entry,
          ),
        },
        'graphHash',
      );
      value.taskProjection = {
        ...value.taskProjection,
        graphHash: value.graph.graphHash,
      };
    },
    (value) => {
      value.taskProjection = {
        ...value.taskProjection,
        completions: {
          'task-01': {
            ...value.taskProjection.completions['task-01'],
            eventHash: 'f'.repeat(64),
          },
        },
      };
    },
  ];

  for (const mutate of mutations) {
    const value = context();
    mutate(value);
    assert.notEqual(createTaskPacket(value, 'task-02').packetHash, baseline);
  }
});

void test('rejects non-ready tasks, stale graph projection, and missing dependency evidence', () => {
  assert.throws(() => createTaskPacket(context(), 'task-01'), /not ready/i);
  assert.throws(
    () =>
      createTaskPacket(
        context({
          taskProjection: {
            ...context().taskProjection,
            graphHash: 'f'.repeat(64),
          },
        }),
        'task-02',
      ),
    /graph hash.*stale/i,
  );
  assert.throws(
    () =>
      createTaskPacket(
        context({
          taskProjection: { ...context().taskProjection, completions: {} },
        }),
        'task-02',
      ),
    /dependency completion evidence/i,
  );
});

void test('enforces the canonical packet byte budget', () => {
  const observed = Buffer.byteLength(canonicalStringify(createTaskPacket(context(), 'task-02')));
  assert.throws(
    () => createTaskPacket(context({ limits: { maxPacketBytes: observed - 1 } }), 'task-02'),
    /packet.*byte limit/i,
  );
});

void test('contains no transcript, source body, environment, or integration grant', () => {
  const source = canonicalStringify(createTaskPacket(context(), 'task-02'));
  for (const forbidden of [
    'chat transcript',
    'session summary',
    'process.env',
    'sourceContents',
    'push authorized',
    'merge authorized',
  ]) {
    assert.equal(source.includes(forbidden), false);
  }
  assert.deepEqual(
    { ...createTaskPacket(context(), 'task-02').constraints },
    {
      commandExecution: 'worker-reported-not-automatic',
      criticalTriggers: 'initiative-blocker-required',
      deviceQa: 'not_applicable',
      integrationAuthority: 'explicit-user-request-required',
      writeScope: 'strict',
    },
  );
});
