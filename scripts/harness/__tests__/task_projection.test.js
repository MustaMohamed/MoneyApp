const assert = require('node:assert/strict');
const test = require('node:test');

const { finalizeHashedObject } = require('../lib/workflow/canonical');
const { createLegacyBootstrapBridgeArtifact } = require('../lib/tasks/bootstrap');
const { replayTaskEvents } = require('../lib/tasks/projection');

const ID = '2026-07-25-example';
const BRANCH = 'refactor/example';
const HEAD = 'a'.repeat(40);
const HEAD_ONE = '1'.repeat(40);
const HEAD_TWO = '2'.repeat(40);
const PACKET = 'b'.repeat(64);
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-example.md',
  sha256: 'c'.repeat(64),
};
const TASK_GRAPH = {
  path: 'docs/superpowers/task-graphs/2026-07-25-example.json',
  sha256: 'd'.repeat(64),
};
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-example-design.md',
  sha256: 'e'.repeat(64),
};
const CHECKS = [{ command: ['node', '--test', 'focused.test.js'], passed: true, summary: 'pass' }];

function task(id, dependsOn, writePath) {
  return {
    id,
    title: id,
    kind: 'mutation',
    ownerRole: 'dev',
    objective: `Complete ${id}.`,
    dependsOn,
    readPaths: [],
    writePaths: [writePath],
    acceptanceCriteria: [`${id} is complete.`],
    verificationCommands: [['node', '--test', 'focused.test.js']],
    recommendedCommitMessage: `feat: complete ${id}`,
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
      task('task-03', ['task-01'], 'generated/three.js'),
      task('task-04', ['task-02', 'task-03'], 'generated/four.js'),
    ],
  },
  'graphHash',
);

const initiativeProjection = {
  phase: 'execution',
  sequence: 6,
  latestEvent: { eventHash: '1'.repeat(64) },
  initiative: { id: ID, branch: BRANCH, baseSha: HEAD },
  spec: { current: SPEC, signed: true },
  plan: { current: PLAN, taskGraph: TASK_GRAPH, approved: true },
  openBlockers: {},
};

function bootstrapCompletion(taskId, startHead, endHead, changedPath, overrides = {}) {
  return {
    taskId,
    startHead,
    endHead,
    changedPaths: [changedPath],
    summary: `Imported ${taskId}.`,
    checks: CHECKS,
    ...overrides,
  };
}

function ledger(bootstrapCompletions = []) {
  const events = [];
  function append(type, payload, role = type.startsWith('task_graph.') ? 'tariq' : 'sarah') {
    const sequence = events.length + 1;
    const draft = {
      schemaVersion: 1,
      initiativeId: ID,
      sequence,
      type,
      recordedAt: `2026-07-25T00:00:${String(sequence).padStart(2, '0')}.000Z`,
      recordedBy: { role },
      ...(sequence === 1
        ? {}
        : { parent: { sequence: sequence - 1, eventHash: events.at(-1).eventHash } }),
      payload,
    };
    const value = finalizeHashedObject(draft, 'eventHash');
    events.push(value);
    return value;
  }
  append('task_graph.activated', {
    initiative: { sequence: 6, eventHash: '1'.repeat(64) },
    spec: SPEC,
    plan: PLAN,
    taskGraph: TASK_GRAPH,
    branch: BRANCH,
    baseSha: HEAD,
    graphHash: graph.graphHash,
    bootstrapCompletions,
  });
  return { events, append };
}

function claimPayload(taskId) {
  return {
    taskId,
    packetHash: PACKET,
    mode: 'inline',
    assigneeRole: 'dev',
    branch: BRANCH,
    startHead: HEAD,
    basis: 'Execute the current packet.',
  };
}

function completePayload(taskId, claim) {
  return {
    taskId,
    packetHash: PACKET,
    claimEventHash: claim.eventHash,
    startHead: HEAD,
    endHead: 'f'.repeat(40),
    changedPaths: [`generated/${taskId}.js`],
    summary: `Completed ${taskId}.`,
    checks: CHECKS,
  };
}

void test('projects deterministic pending, ready, claimed, and completed states', () => {
  const value = ledger();
  const initial = replayTaskEvents({ graph, events: value.events, initiativeProjection });
  assert.deepEqual(initial.readyTaskIds, ['task-01']);
  assert.equal(initial.tasks['task-01'].state, 'ready');
  assert.equal(initial.tasks['task-02'].state, 'pending');
  assert.equal(initial.accountedHead, HEAD);

  const claim = value.append('task.claimed', claimPayload('task-01'));
  const claimed = replayTaskEvents({ graph, events: value.events, initiativeProjection });
  assert.equal(claimed.tasks['task-01'].state, 'claimed');
  assert.equal(claimed.activeClaim.eventHash, claim.eventHash);
  assert.equal(claimed.accountedHead, HEAD);

  value.append('task.completed', completePayload('task-01', claim));
  const completed = replayTaskEvents({ graph, events: value.events, initiativeProjection });
  assert.equal(completed.tasks['task-01'].state, 'completed');
  assert.deepEqual(completed.readyTaskIds, ['task-02', 'task-03']);
  assert.deepEqual(completed.parallelReadyGroups, [['task-02', 'task-03']]);
  assert.equal(completed.implementationReadyAllowed, false);
  assert.equal(completed.accountedHead, 'f'.repeat(40));
});

void test('replays historical activation after the initiative advances to validation', () => {
  const value = ledger();
  const validationProjection = {
    ...initiativeProjection,
    phase: 'validation',
    sequence: 7,
    latestEvent: { eventHash: '2'.repeat(64) },
  };

  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection: validationProjection,
    initiativeSnapshots: new Map([
      [initiativeProjection.latestEvent.eventHash, initiativeProjection],
    ]),
  });

  assert.deepEqual(projection.readyTaskIds, ['task-01']);
  assert.equal(projection.tasks['task-01'].state, 'ready');
});

void test('projects block, unblock, fail, and release without inferring success', () => {
  const value = ledger();
  value.append('task.blocked', {
    taskId: 'task-01',
    owner: 'tariq',
    reason: 'Architecture review required.',
    criticalTrigger: false,
  });
  assert.equal(
    replayTaskEvents({ graph, events: value.events, initiativeProjection }).tasks['task-01'].state,
    'blocked',
  );
  value.append('task.unblocked', {
    taskId: 'task-01',
    resolution: 'Tariq approved the architecture.',
    basis: 'The approved plan already covers the decision.',
  });
  assert.equal(
    replayTaskEvents({ graph, events: value.events, initiativeProjection }).tasks['task-01'].state,
    'ready',
  );

  const firstClaim = value.append('task.claimed', claimPayload('task-01'));
  value.append('task.failed', {
    taskId: 'task-01',
    packetHash: PACKET,
    claimEventHash: firstClaim.eventHash,
    summary: 'Focused test failed.',
    changesRemain: false,
  });
  assert.equal(
    replayTaskEvents({ graph, events: value.events, initiativeProjection }).tasks['task-01'].state,
    'ready',
  );

  const secondClaim = value.append('task.claimed', claimPayload('task-01'));
  value.append('task.released', {
    taskId: 'task-01',
    packetHash: PACKET,
    claimEventHash: secondClaim.eventHash,
    reason: 'Session stopped before changes.',
  });
  assert.equal(
    replayTaskEvents({ graph, events: value.events, initiativeProjection }).tasks['task-01'].state,
    'ready',
  );
});

void test('rejects a second claim and any completion not bound to the active claim', () => {
  const value = ledger();
  const claim = value.append('task.claimed', claimPayload('task-01'));
  value.append('task.claimed', claimPayload('task-01'));
  assert.throws(
    () => replayTaskEvents({ graph, events: value.events, initiativeProjection }),
    /active claim already exists/i,
  );

  const mismatch = ledger();
  mismatch.append('task.claimed', claimPayload('task-01'));
  mismatch.append('task.completed', {
    ...completePayload('task-01', claim),
    claimEventHash: '9'.repeat(64),
  });
  assert.throws(
    () => replayTaskEvents({ graph, events: mismatch.events, initiativeProjection }),
    /claim event hash/i,
  );
});

void test('suppresses ready work while an initiative blocker is open', () => {
  const value = ledger();
  const blockedInitiative = {
    ...initiativeProjection,
    openBlockers: { dependency: { owner: 'sarah' } },
  };
  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection: blockedInitiative,
  });
  assert.deepEqual(projection.readyTaskIds, []);
  assert.equal(projection.implementationReadyAllowed, false);
});

void test('suppresses all independent work while a critical task blocker is open', () => {
  const value = ledger();
  const claim = value.append('task.claimed', claimPayload('task-01'));
  value.append('task.completed', completePayload('task-01', claim));
  value.append('task.blocked', {
    taskId: 'task-02',
    owner: 'tariq',
    reason: 'A critical architecture decision is unresolved.',
    criticalTrigger: true,
  });

  const projection = replayTaskEvents({ graph, events: value.events, initiativeProjection });
  assert.deepEqual(projection.readyTaskIds, []);
  assert.equal(projection.tasks['task-02'].state, 'blocked');
  assert.equal(projection.tasks['task-03'].state, 'pending');
  assert.equal(projection.implementationReadyAllowed, false);
});

void test('validates task graph bundles against the exact historical initiative snapshot', () => {
  const value = ledger();
  const revisedSpec = { ...SPEC, sha256: '9'.repeat(64) };
  const currentProjection = {
    ...initiativeProjection,
    sequence: 7,
    latestEvent: { eventHash: '2'.repeat(64) },
    spec: { current: revisedSpec, signed: true },
  };
  const historicalSnapshot = {
    ...initiativeProjection,
    sequence: 6,
    latestEvent: { eventHash: '1'.repeat(64) },
  };
  const initiativeSnapshots = new Map([
    [historicalSnapshot.latestEvent.eventHash, historicalSnapshot],
  ]);

  assert.doesNotThrow(() =>
    replayTaskEvents({
      graph,
      events: value.events,
      initiativeProjection: currentProjection,
      initiativeSnapshots,
    }),
  );

  const forged = ledger();
  forged.events[0] = finalizeHashedObject(
    {
      ...forged.events[0],
      payload: {
        ...forged.events[0].payload,
        initiative: { sequence: 6, eventHash: '9'.repeat(64) },
      },
    },
    'eventHash',
  );
  assert.throws(
    () =>
      replayTaskEvents({
        graph,
        events: forged.events,
        initiativeProjection: currentProjection,
        initiativeSnapshots,
      }),
    /initiative reference.*unknown|exact historical initiative event/i,
  );
});

void test('replays multiple resolved replacements only without an active claim', () => {
  const replacement = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: { ...PLAN, sha256: '7'.repeat(64) },
      tasks: [task('task-10', [], 'generated/ten.js')],
    },
    'graphHash',
  );
  const replacementTaskGraph = { ...TASK_GRAPH, sha256: '9'.repeat(64) };
  const finalReplacement = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: { ...PLAN, sha256: 'a'.repeat(64) },
      tasks: [task('task-20', [], 'generated/twenty.js')],
    },
    'graphHash',
  );
  const finalTaskGraph = { ...TASK_GRAPH, sha256: 'b'.repeat(64) };
  const currentInitiativeProjection = {
    ...initiativeProjection,
    sequence: 8,
    latestEvent: { eventHash: 'a'.repeat(64) },
    plan: {
      current: finalReplacement.plan,
      taskGraph: finalTaskGraph,
      approved: true,
    },
  };
  const value = ledger();
  value.append('task_graph.replaced', {
    initiative: { sequence: 7, eventHash: '8'.repeat(64) },
    spec: SPEC,
    plan: replacement.plan,
    taskGraph: replacementTaskGraph,
    branch: BRANCH,
    baseSha: HEAD,
    graphHash: replacement.graphHash,
    previousGraphHash: graph.graphHash,
    reason: 'The approved plan changed.',
    bootstrapCompletions: [],
  });
  value.append('task_graph.replaced', {
    initiative: { sequence: 8, eventHash: 'a'.repeat(64) },
    spec: SPEC,
    plan: finalReplacement.plan,
    taskGraph: finalTaskGraph,
    branch: BRANCH,
    baseSha: HEAD,
    graphHash: finalReplacement.graphHash,
    previousGraphHash: replacement.graphHash,
    reason: 'The approved plan changed again.',
    bootstrapCompletions: [],
  });
  const resolveGraph = (hash, graphReference, planReference) => {
    if (
      hash === replacement.graphHash &&
      graphReference.sha256 === replacementTaskGraph.sha256 &&
      planReference.sha256 === replacement.plan.sha256
    ) {
      return replacement;
    }
    if (
      hash === finalReplacement.graphHash &&
      graphReference.sha256 === finalTaskGraph.sha256 &&
      planReference.sha256 === finalReplacement.plan.sha256
    ) {
      return finalReplacement;
    }
    return undefined;
  };
  const initiativeSnapshots = new Map([
    [initiativeProjection.latestEvent.eventHash, initiativeProjection],
    [
      '8'.repeat(64),
      {
        ...initiativeProjection,
        sequence: 7,
        latestEvent: { eventHash: '8'.repeat(64) },
        plan: {
          current: replacement.plan,
          taskGraph: replacementTaskGraph,
          approved: true,
        },
      },
    ],
  ]);
  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection: currentInitiativeProjection,
    initiativeSnapshots,
    resolveGraph,
  });
  assert.equal(projection.tasks['task-01'].state, 'superseded');
  assert.equal(projection.tasks['task-10'].state, 'superseded');
  assert.equal(projection.tasks['task-20'].state, 'ready');

  const mismatched = ledger();
  mismatched.append('task_graph.replaced', {
    ...value.events[1].payload,
    taskGraph: { ...replacementTaskGraph, sha256: '6'.repeat(64) },
  });
  assert.throws(
    () =>
      replayTaskEvents({
        graph,
        events: mismatched.events,
        initiativeProjection: currentInitiativeProjection,
        initiativeSnapshots,
        resolveGraph,
      }),
    /Cannot resolve replacement graph/i,
  );

  const claimed = ledger();
  claimed.append('task.claimed', claimPayload('task-01'));
  claimed.append('task_graph.replaced', value.events[1].payload);
  assert.throws(
    () =>
      replayTaskEvents({
        graph,
        events: claimed.events,
        initiativeProjection,
        resolveGraph: () => replacement,
      }),
    /active claim/i,
  );
});

void test('projects activation bootstrap completions in their accounted order', () => {
  const first = bootstrapCompletion('task-01', HEAD, HEAD_ONE, 'generated/one.js');
  const second = bootstrapCompletion('task-02', HEAD_ONE, HEAD_TWO, 'generated/two.js');
  const value = ledger([first, second]);
  const projection = replayTaskEvents({ graph, events: value.events, initiativeProjection });

  assert.deepEqual(projection.completionOrder, ['task-01', 'task-02']);
  assert.equal(projection.completedCount, 2);
  assert.equal(projection.tasks['task-01'].state, 'completed');
  assert.equal(projection.tasks['task-02'].state, 'completed');
  assert.equal(projection.accountedHead, HEAD_TWO);
});

void test('projects only exact repository-verified transparent bridges', () => {
  const bridgedStart = 'b'.repeat(40);
  const completion = bootstrapCompletion('task-01', bridgedStart, HEAD_ONE, 'generated/one.js');
  const value = ledger([completion]);
  const bridge = createLegacyBootstrapBridgeArtifact({
    migrationAnchor: '9'.repeat(40),
    bridges: [
      {
        beforeHead: HEAD,
        afterHead: bridgedStart,
        changedPaths: ['docs/superpowers/specs/legacy-design.md'],
      },
    ],
  }).bridges[0];

  assert.throws(
    () => replayTaskEvents({ graph, events: value.events, initiativeProjection }),
    /checkpoint.*bridge missing/i,
  );

  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection,
    verifiedBootstrapContexts: new Map([
      [value.events[0].eventHash, { transparentBridges: [bridge] }],
    ]),
  });

  assert.equal(projection.tasks['task-01'].state, 'completed');
  assert.equal(projection.accountedHead, HEAD_ONE);
});

void test('preserves completed tasks through repeated replacements and supersedes only unfinished work', () => {
  const first = bootstrapCompletion('task-01', HEAD, HEAD_ONE, 'generated/one.js');
  const second = bootstrapCompletion('task-02', HEAD_ONE, HEAD_TWO, 'generated/two.js');
  const value = ledger([first]);
  const replacementPlan = { ...PLAN, sha256: '4'.repeat(64) };
  const replacementTaskGraph = { ...TASK_GRAPH, sha256: '5'.repeat(64) };
  const replacement = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: replacementPlan,
      tasks: [
        task('task-01', [], 'generated/one.js'),
        task('task-02', ['task-01'], 'generated/two.js'),
        task('task-05', ['task-02'], 'generated/five.js'),
      ],
    },
    'graphHash',
  );
  const finalPlan = { ...PLAN, sha256: '6'.repeat(64) };
  const finalTaskGraph = { ...TASK_GRAPH, sha256: '7'.repeat(64) };
  const finalGraph = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: finalPlan,
      tasks: [
        task('task-01', [], 'generated/one.js'),
        task('task-02', ['task-01'], 'generated/two.js'),
        task('task-06', ['task-02'], 'generated/six.js'),
      ],
    },
    'graphHash',
  );
  value.append('task_graph.replaced', {
    initiative: { sequence: 7, eventHash: '8'.repeat(64) },
    spec: SPEC,
    plan: replacementPlan,
    taskGraph: replacementTaskGraph,
    branch: BRANCH,
    baseSha: HEAD,
    graphHash: replacement.graphHash,
    previousGraphHash: graph.graphHash,
    reason: 'Import the second completed task.',
    bootstrapCompletions: [second],
  });
  value.append('task_graph.replaced', {
    initiative: { sequence: 8, eventHash: '9'.repeat(64) },
    spec: SPEC,
    plan: finalPlan,
    taskGraph: finalTaskGraph,
    branch: BRANCH,
    baseSha: HEAD,
    graphHash: finalGraph.graphHash,
    previousGraphHash: replacement.graphHash,
    reason: 'Replace the remaining unfinished task.',
    bootstrapCompletions: [],
  });
  const snapshots = new Map([
    ['1'.repeat(64), initiativeProjection],
    [
      '8'.repeat(64),
      {
        ...initiativeProjection,
        sequence: 7,
        latestEvent: { eventHash: '8'.repeat(64) },
        plan: { current: replacementPlan, taskGraph: replacementTaskGraph, approved: true },
      },
    ],
  ]);
  const current = {
    ...initiativeProjection,
    sequence: 8,
    latestEvent: { eventHash: '9'.repeat(64) },
    plan: { current: finalPlan, taskGraph: finalTaskGraph, approved: true },
  };
  const graphs = new Map([
    [replacement.graphHash, replacement],
    [finalGraph.graphHash, finalGraph],
  ]);
  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection: current,
    initiativeSnapshots: snapshots,
    resolveGraph: (hash) => graphs.get(hash),
  });

  assert.deepEqual(projection.completionOrder, ['task-01', 'task-02']);
  assert.equal(projection.completedCount, 2);
  assert.equal(projection.accountedHead, HEAD_TWO);
  assert.equal(projection.tasks['task-01'].state, 'completed');
  assert.equal(projection.tasks['task-02'].state, 'completed');
  assert.equal(projection.tasks['task-03'].state, 'superseded');
  assert.equal(projection.tasks['task-04'].state, 'superseded');
  assert.equal(projection.tasks['task-05'].state, 'superseded');
  assert.equal(projection.tasks['task-06'].state, 'ready');
});

void test('keeps tasks completed when a full snapshot re-attests their evidence', () => {
  const first = bootstrapCompletion('task-01', HEAD, HEAD_ONE, 'generated/one.js');
  const reattested = {
    ...first,
    endHead: HEAD_TWO,
    summary: 'Re-attested task-01 against the replacement graph.',
  };
  const replacementPlan = { ...PLAN, sha256: '4'.repeat(64) };
  const replacementTaskGraph = { ...TASK_GRAPH, sha256: '5'.repeat(64) };
  const replacement = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: replacementPlan,
      tasks: [task('task-01', [], 'generated/one.js')],
    },
    'graphHash',
  );
  const value = ledger([first]);
  const replacementEvent = value.append('task_graph.replaced', {
    initiative: { sequence: 7, eventHash: '8'.repeat(64) },
    spec: SPEC,
    plan: replacementPlan,
    taskGraph: replacementTaskGraph,
    branch: BRANCH,
    baseSha: HEAD,
    graphHash: replacement.graphHash,
    previousGraphHash: graph.graphHash,
    reason: 'Re-attest the completed task against the replacement graph.',
    bootstrapCompletions: [reattested],
  });
  const current = {
    ...initiativeProjection,
    sequence: 7,
    latestEvent: { eventHash: '8'.repeat(64) },
    plan: { current: replacementPlan, taskGraph: replacementTaskGraph, approved: true },
  };

  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection: current,
    initiativeSnapshots: new Map([['1'.repeat(64), initiativeProjection]]),
    resolveGraph: () => replacement,
  });

  assert.equal(projection.tasks['task-01'].state, 'completed');
  assert.equal(projection.completedCount, 1);
  assert.equal(projection.accountedHead, HEAD_TWO);
  assert.equal(projection.completions['task-01'].eventHash, replacementEvent.eventHash);
});

void test('rejects replacement bootstrap data that hides or reorders completed work', () => {
  const first = bootstrapCompletion('task-01', HEAD, HEAD_ONE, 'generated/one.js');
  const second = bootstrapCompletion('task-02', HEAD_ONE, HEAD_TWO, 'generated/two.js');
  const replacementPlan = { ...PLAN, sha256: '4'.repeat(64) };
  const replacementTaskGraph = { ...TASK_GRAPH, sha256: '5'.repeat(64) };
  const replacement = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: ID,
      plan: replacementPlan,
      tasks: [
        task('task-01', [], 'generated/one.js'),
        task('task-02', ['task-01'], 'generated/two.js'),
      ],
    },
    'graphHash',
  );
  const current = {
    ...initiativeProjection,
    sequence: 7,
    latestEvent: { eventHash: '8'.repeat(64) },
    plan: { current: replacementPlan, taskGraph: replacementTaskGraph, approved: true },
  };
  const snapshots = new Map([['1'.repeat(64), initiativeProjection]]);
  const cases = [[first], [second, first], [first, second, second]];

  for (const bootstrapCompletions of cases) {
    const value = ledger([first, second]);
    value.append('task_graph.replaced', {
      initiative: { sequence: 7, eventHash: '8'.repeat(64) },
      spec: SPEC,
      plan: replacementPlan,
      taskGraph: replacementTaskGraph,
      branch: BRANCH,
      baseSha: HEAD,
      graphHash: replacement.graphHash,
      previousGraphHash: graph.graphHash,
      reason: 'Attempt to rewrite completion history.',
      bootstrapCompletions,
    });
    assert.throws(
      () =>
        replayTaskEvents({
          graph,
          events: value.events,
          initiativeProjection: current,
          initiativeSnapshots: snapshots,
          resolveGraph: () => replacement,
        }),
      /bootstrap|completed|snapshot|duplicate|prefix|reorder|hide|alter/i,
    );
  }
});
