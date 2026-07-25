const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { canonicalStringify, finalizeHashedObject } = require('../lib/workflow/canonical');
const { appendTaskEvent, loadTaskHistory, recoverTaskRuntimeFiles } = require('../lib/tasks/store');

const ID = '2026-07-25-store-test';
const EVENT_NAME = /^\d{6}-[a-f0-9]{64}\.json$/;
const BRANCH = 'refactor/store-test';
const HEAD = 'a'.repeat(40);
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-store-test.md',
  sha256: 'b'.repeat(64),
};
const TASK_GRAPH = {
  path: 'docs/superpowers/task-graphs/2026-07-25-store-test.json',
  sha256: 'c'.repeat(64),
};
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-store-test-design.md',
  sha256: 'd'.repeat(64),
};
const graph = finalizeHashedObject(
  {
    schemaVersion: 1,
    initiativeId: ID,
    plan: PLAN,
    tasks: [
      {
        id: 'task-01',
        title: 'Persist events',
        kind: 'mutation',
        ownerRole: 'dev',
        objective: 'Persist immutable task events.',
        dependsOn: [],
        readPaths: [],
        writePaths: ['scripts/harness/lib/tasks/store.js'],
        acceptanceCriteria: ['Events are durable.'],
        verificationCommands: [['node', '--test', 'task_store.test.js']],
        recommendedCommitMessage: 'feat: persist task events',
        escalationNotes: [],
      },
    ],
  },
  'graphHash',
);
const initiativeProjection = {
  phase: 'execution',
  sequence: 8,
  latestEvent: { eventHash: 'e'.repeat(64) },
  initiative: { id: ID, branch: BRANCH, baseSha: HEAD },
  spec: { current: SPEC, signed: true },
  plan: { current: PLAN, taskGraph: TASK_GRAPH, approved: true },
  openBlockers: {},
};

function rootFixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-task-store-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, '.git'));
  return root;
}

function activationDraft() {
  return {
    type: 'task_graph.activated',
    recordedAt: '2026-07-25T00:00:00.000Z',
    recordedBy: { role: 'tariq' },
    payload: {
      initiative: { sequence: 8, eventHash: 'e'.repeat(64) },
      spec: SPEC,
      plan: PLAN,
      taskGraph: TASK_GRAPH,
      branch: BRANCH,
      baseSha: HEAD,
      graphHash: graph.graphHash,
      bootstrapCompletions: [],
    },
  };
}

function appendActivation(root, overrides = {}) {
  return appendTaskEvent({
    root,
    initiativeId: ID,
    expectedSequence: 1,
    draft: activationDraft(),
    graph,
    initiativeProjection,
    token: () => '1'.repeat(32),
    hostname: () => 'test-host',
    pid: 1234,
    ...overrides,
  });
}

void test('atomically appends and reloads a canonical projected task event', (t) => {
  const root = rootFixture(t);
  const appended = appendActivation(root);
  const history = loadTaskHistory({ root, initiativeId: ID, graph, initiativeProjection });

  assert.match(appended.path, /task-events\/000001-[a-f0-9]{64}\.json$/);
  assert.equal(history.events.length, 1);
  assert.equal(history.projection.sequence, 1);
  assert.deepEqual(history.projection.readyTaskIds, ['task-01']);
  assert.equal(fs.readFileSync(appended.path, 'utf8'), canonicalStringify(history.events[0]));
  assert.equal(fs.existsSync(path.join(path.dirname(appended.path), '.tasks.lock')), false);
});

void test('uses expected sequence compare-and-swap and reports lock contention', (t) => {
  const root = rootFixture(t);
  appendActivation(root);
  assert.throws(() => appendActivation(root), /stale expected sequence/i);

  const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
  fs.writeFileSync(
    path.join(events, '.tasks.lock'),
    canonicalStringify({
      host: 'other-host',
      pid: 999,
      recordedAt: '2026-07-25T00:00:00.000Z',
      token: '2'.repeat(32),
    }),
  );
  assert.throws(
    () =>
      appendTaskEvent({
        root,
        initiativeId: ID,
        expectedSequence: 2,
        draft: {
          type: 'task.claimed',
          recordedAt: '2026-07-25T00:01:00.000Z',
          recordedBy: { role: 'sarah' },
          payload: {
            taskId: 'task-01',
            packetHash: 'f'.repeat(64),
            mode: 'inline',
            assigneeRole: 'dev',
            branch: BRANCH,
            startHead: HEAD,
            basis: 'Test claim.',
          },
        },
        graph,
        initiativeProjection,
        token: () => '3'.repeat(32),
      }),
    /locked by PID 999.*other-host/i,
  );
});

void test('fails closed on corrupt, forked, symlinked, and unsupported ledger entries', (t) => {
  const cases = [
    ['unsupported.txt', 'value', /unsupported entry/i],
    ['000002-bad.json', '{}\n', /unsupported event filename/i],
  ];
  for (const [name, content, error] of cases) {
    const root = rootFixture(t);
    const appended = appendActivation(root);
    fs.writeFileSync(path.join(path.dirname(appended.path), name), content);
    assert.throws(
      () => loadTaskHistory({ root, initiativeId: ID, graph, initiativeProjection }),
      error,
    );
  }

  const corruptRoot = rootFixture(t);
  const corrupt = appendActivation(corruptRoot);
  fs.writeFileSync(corrupt.path, '{"eventHash":"bad"}\n');
  assert.throws(
    () => loadTaskHistory({ root: corruptRoot, initiativeId: ID, graph, initiativeProjection }),
    /hash|fields|canonical/i,
  );

  const symlinkRoot = rootFixture(t);
  const symlinked = appendActivation(symlinkRoot);
  fs.symlinkSync(symlinked.path, path.join(path.dirname(symlinked.path), 'unsupported-link'));
  assert.throws(
    () => loadTaskHistory({ root: symlinkRoot, initiativeId: ID, graph, initiativeProjection }),
    /symbolic.?link/i,
  );
});

void test('recovers only the exact stale task token and leaves workflow runtime files untouched', (t) => {
  const root = rootFixture(t);
  const appended = appendActivation(root);
  const taskEvents = path.dirname(appended.path);
  const initiativeEvents = path.join(path.dirname(taskEvents), 'events');
  fs.mkdirSync(initiativeEvents);
  fs.writeFileSync(path.join(initiativeEvents, '.workflow.lock'), 'workflow');

  const token = '4'.repeat(32);
  fs.writeFileSync(
    path.join(taskEvents, '.tasks.lock'),
    canonicalStringify({
      host: 'stale-host',
      pid: 998,
      recordedAt: '2026-07-25T00:00:00.000Z',
      token,
    }),
  );
  fs.writeFileSync(path.join(taskEvents, `.tasks-${token}.tmp`), 'partial');

  const dryRun = recoverTaskRuntimeFiles({
    root,
    initiativeId: ID,
    token,
    graph,
    initiativeProjection,
    hostname: () => 'test-host',
    isProcessAlive: () => false,
    dryRun: true,
  });
  assert.equal(dryRun.status, 'dry_run');
  assert.equal(dryRun.removed.length, 0);

  const recovered = recoverTaskRuntimeFiles({
    root,
    initiativeId: ID,
    token,
    graph,
    initiativeProjection,
    hostname: () => 'test-host',
    isProcessAlive: () => false,
  });
  assert.equal(recovered.status, 'recovered');
  assert.equal(fs.existsSync(path.join(taskEvents, '.tasks.lock')), false);
  assert.equal(fs.existsSync(path.join(taskEvents, `.tasks-${token}.tmp`)), false);
  assert.equal(fs.readFileSync(path.join(initiativeEvents, '.workflow.lock'), 'utf8'), 'workflow');
});

void test('preserves the matching lock when post-install temp cleanup fails', (t) => {
  const root = rootFixture(t);
  const token = '7'.repeat(32);
  const fsImpl = new Proxy(fs, {
    get(target, property) {
      if (property === 'unlinkSync') {
        return (file) => {
          if (String(file).endsWith(`.tasks-${token}.tmp`)) {
            const error = new Error('injected task temp cleanup failure');
            error.code = 'EIO';
            throw error;
          }
          return target.unlinkSync(file);
        };
      }
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });

  assert.throws(
    () => appendActivation(root, { token: () => token, fsImpl }),
    /injected task temp cleanup failure/i,
  );
  const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
  assert.equal(fs.existsSync(path.join(events, '.tasks.lock')), true);
  assert.equal(fs.existsSync(path.join(events, `.tasks-${token}.tmp`)), true);
  assert.equal(fs.readdirSync(events).filter((entry) => EVENT_NAME.test(entry)).length, 1);
});

void test('refuses recovery for a live local lock or the wrong token', (t) => {
  const root = rootFixture(t);
  const appended = appendActivation(root);
  const events = path.dirname(appended.path);
  const token = '5'.repeat(32);
  fs.writeFileSync(
    path.join(events, '.tasks.lock'),
    canonicalStringify({
      host: 'test-host',
      pid: 777,
      recordedAt: '2026-07-25T00:00:00.000Z',
      token,
    }),
  );
  assert.throws(
    () =>
      recoverTaskRuntimeFiles({
        root,
        initiativeId: ID,
        token,
        graph,
        initiativeProjection,
        hostname: () => 'test-host',
        isProcessAlive: () => true,
      }),
    /still alive/i,
  );
  assert.throws(
    () =>
      recoverTaskRuntimeFiles({
        root,
        initiativeId: ID,
        token: '6'.repeat(32),
        graph,
        initiativeProjection,
        hostname: () => 'test-host',
        isProcessAlive: () => false,
      }),
    /does not match.*token/i,
  );
});
