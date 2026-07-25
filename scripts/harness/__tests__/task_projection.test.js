const assert = require('node:assert/strict');
const test = require('node:test');

const { finalizeHashedObject } = require('../lib/workflow/canonical');
const { replayTaskEvents } = require('../lib/tasks/projection');

const ID = '2026-07-25-example';
const BRANCH = 'refactor/example';
const HEAD = 'a'.repeat(40);
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

function ledger() {
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
    bootstrapCompletions: [],
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

  const claim = value.append('task.claimed', claimPayload('task-01'));
  const claimed = replayTaskEvents({ graph, events: value.events, initiativeProjection });
  assert.equal(claimed.tasks['task-01'].state, 'claimed');
  assert.equal(claimed.activeClaim.eventHash, claim.eventHash);

  value.append('task.completed', completePayload('task-01', claim));
  const completed = replayTaskEvents({ graph, events: value.events, initiativeProjection });
  assert.equal(completed.tasks['task-01'].state, 'completed');
  assert.deepEqual(completed.readyTaskIds, ['task-02', 'task-03']);
  assert.deepEqual(completed.parallelReadyGroups, [['task-02', 'task-03']]);
  assert.equal(completed.implementationReadyAllowed, false);
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
  const projection = replayTaskEvents({
    graph,
    events: value.events,
    initiativeProjection: currentInitiativeProjection,
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
