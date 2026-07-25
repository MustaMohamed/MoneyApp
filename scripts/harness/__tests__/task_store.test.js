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
const REPLACEMENT_PLAN = { ...PLAN, sha256: '1'.repeat(64) };
const REPLACEMENT_TASK_GRAPH = { ...TASK_GRAPH, sha256: '2'.repeat(64) };
const replacementGraph = finalizeHashedObject(
  {
    schemaVersion: 1,
    initiativeId: ID,
    plan: REPLACEMENT_PLAN,
    tasks: graph.tasks,
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

function fsProxy(overrides) {
  return new Proxy(fs, {
    get(target, property) {
      const override = overrides[property];
      if (override) return override;
      const value = Reflect.get(target, property);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  });
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

void test('cleans owned task runtime files after pre-install write and fsync failures', async (t) => {
  for (const failure of ['lock-write', 'lock-fsync', 'temp-write', 'temp-fsync']) {
    await t.test(failure, () => {
      const root = rootFixture(t);
      const descriptors = new Map();
      const actualOpen = fs.openSync;
      const actualWrite = fs.writeFileSync;
      const actualFsync = fs.fsyncSync;
      const actualClose = fs.closeSync;
      let injected = false;
      const fsImpl = fsProxy({
        openSync(target, flags, mode) {
          const descriptor = actualOpen(target, flags, mode);
          descriptors.set(descriptor, String(target));
          return descriptor;
        },
        writeFileSync(target, data, options) {
          const file = descriptors.get(target) ?? String(target);
          if (
            !injected &&
            ((failure === 'lock-write' && file.endsWith('.tasks.lock')) ||
              (failure === 'temp-write' && file.endsWith('.tmp')))
          ) {
            injected = true;
            throw new Error(`simulated ${failure}`);
          }
          return actualWrite(target, data, options);
        },
        fsyncSync(descriptor) {
          const file = descriptors.get(descriptor);
          if (
            !injected &&
            ((failure === 'lock-fsync' && file?.endsWith('.tasks.lock')) ||
              (failure === 'temp-fsync' && file?.endsWith('.tmp')))
          ) {
            injected = true;
            throw new Error(`simulated ${failure}`);
          }
          return actualFsync(descriptor);
        },
        closeSync(descriptor) {
          descriptors.delete(descriptor);
          return actualClose(descriptor);
        },
      });

      assert.throws(() => appendActivation(root, { fsImpl }), new RegExp(failure, 'i'));
      const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
      assert.deepEqual(fs.existsSync(events) ? fs.readdirSync(events) : [], []);
      assert.doesNotThrow(() =>
        appendActivation(root, {
          token: () => '3'.repeat(32),
        }),
      );
    });
  }
});

void test('does not overwrite a task event installed by a racing writer', (t) => {
  const root = rootFixture(t);
  const actualLink = fs.linkSync;
  const fsImpl = fsProxy({
    linkSync(source, target) {
      fs.writeFileSync(target, 'racing writer bytes');
      return actualLink(source, target);
    },
  });

  assert.throws(() => appendActivation(root, { fsImpl }), /exist|install|overwrite/i);
  const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
  const final = fs.readdirSync(events).find((name) => name.endsWith('.json'));
  assert.equal(fs.readFileSync(path.join(events, final), 'utf8'), 'racing writer bytes');
  assert.equal(fs.existsSync(path.join(events, '.tasks.lock')), false);
  assert.equal(fs.existsSync(path.join(events, `.tasks-${'1'.repeat(32)}.tmp`)), false);
});

void test('reports durability uncertainty after an installed task event directory fsync fails', (t) => {
  const root = rootFixture(t);
  const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  let directoryOpenCount = 0;
  const fsImpl = fsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      const directoryPhase =
        target === events ? (directoryOpenCount++ === 0 ? 'lock' : 'commit') : undefined;
      descriptors.set(descriptor, { target, directoryPhase });
      return descriptor;
    },
    fsyncSync(descriptor) {
      if (descriptors.get(descriptor)?.directoryPhase === 'commit') {
        throw new Error('simulated final task commit directory fsync failure');
      }
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
  });

  assert.throws(
    () => appendActivation(root, { fsImpl }),
    (error) => {
      assert.match(error.message, /durability is uncertain/i);
      assert.equal(error.durableUncertain, true);
      assert.match(error.committedPath, /000001-[a-f0-9]{64}\.json$/);
      return true;
    },
  );
  assert.equal(fs.readdirSync(events).filter((name) => name.endsWith('.json')).length, 1);
  assert.equal(fs.existsSync(path.join(events, '.tasks.lock')), false);
});

void test('preserves foreign runtime inodes that replace captured task files', async (t) => {
  await t.test('foreign temporary file', () => {
    const root = rootFixture(t);
    const token = '1'.repeat(32);
    const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
    const temp = path.join(events, `.tasks-${token}.tmp`);
    const actualLink = fs.linkSync;
    const actualLstat = fs.lstatSync;
    const actualUnlink = fs.unlinkSync;
    let linked = false;
    let replaced = false;
    const replaceTemp = (target) => {
      if (target === temp && linked && !replaced) {
        actualUnlink(target);
        fs.writeFileSync(target, 'foreign temporary file');
        replaced = true;
      }
    };
    const fsImpl = fsProxy({
      linkSync(source, target) {
        const result = actualLink(source, target);
        linked = true;
        return result;
      },
      lstatSync(target) {
        replaceTemp(target);
        return actualLstat(target);
      },
      unlinkSync(target) {
        replaceTemp(target);
        return actualUnlink(target);
      },
    });

    assert.throws(
      () => appendActivation(root, { fsImpl }),
      (error) => {
        assert.match(error.message, /temporary file changed before cleanup/i);
        assert.match(path.basename(error.committedPath), EVENT_NAME);
        assert.equal(error.recovery, undefined);
        return true;
      },
    );
    assert.equal(fs.readFileSync(temp, 'utf8'), 'foreign temporary file');
    assert.equal(fs.existsSync(path.join(events, '.tasks.lock')), false);
  });

  await t.test('foreign lock file', () => {
    const root = rootFixture(t);
    const token = '1'.repeat(32);
    const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
    const temp = path.join(events, `.tasks-${token}.tmp`);
    const lock = path.join(events, '.tasks.lock');
    const actualUnlink = fs.unlinkSync;
    let replaced = false;
    const fsImpl = fsProxy({
      unlinkSync(target) {
        const result = actualUnlink(target);
        if (target === temp && !replaced) {
          actualUnlink(lock);
          fs.writeFileSync(lock, 'foreign lock file');
          replaced = true;
        }
        return result;
      },
    });

    assert.throws(
      () => appendActivation(root, { fsImpl }),
      (error) => {
        assert.match(error.message, /lock changed before cleanup/i);
        assert.match(path.basename(error.committedPath), EVENT_NAME);
        assert.equal(error.recovery, undefined);
        return true;
      },
    );
    assert.equal(fs.readFileSync(lock, 'utf8'), 'foreign lock file');
    assert.equal(fs.existsSync(temp), false);
  });
});

void test('appends candidate events from the resolved activation graph after replacement', (t) => {
  const root = rootFixture(t);
  appendActivation(root);
  const revisedProjection = {
    ...initiativeProjection,
    sequence: 9,
    latestEvent: { eventHash: '9'.repeat(64) },
    plan: {
      current: REPLACEMENT_PLAN,
      taskGraph: REPLACEMENT_TASK_GRAPH,
      approved: true,
    },
  };
  const resolveGraph = (graphHash) => (graphHash === graph.graphHash ? graph : replacementGraph);
  const initiativeSnapshots = new Map([
    [initiativeProjection.latestEvent.eventHash, initiativeProjection],
  ]);

  appendTaskEvent({
    root,
    initiativeId: ID,
    expectedSequence: 2,
    draft: {
      type: 'task_graph.replaced',
      recordedAt: '2026-07-25T00:01:00.000Z',
      recordedBy: { role: 'tariq' },
      payload: {
        initiative: { sequence: 9, eventHash: '9'.repeat(64) },
        spec: SPEC,
        plan: REPLACEMENT_PLAN,
        taskGraph: REPLACEMENT_TASK_GRAPH,
        branch: BRANCH,
        baseSha: HEAD,
        graphHash: replacementGraph.graphHash,
        previousGraphHash: graph.graphHash,
        reason: 'The approved graph changed.',
        bootstrapCompletions: [],
      },
    },
    graph,
    initiativeProjection: revisedProjection,
    initiativeSnapshots,
    resolveGraph,
    token: () => '8'.repeat(32),
    hostname: () => 'test-host',
    pid: 1234,
  });

  assert.doesNotThrow(() =>
    appendTaskEvent({
      root,
      initiativeId: ID,
      expectedSequence: 3,
      draft: {
        type: 'task.claimed',
        recordedAt: '2026-07-25T00:02:00.000Z',
        recordedBy: { role: 'sarah' },
        payload: {
          taskId: 'task-01',
          packetHash: 'f'.repeat(64),
          mode: 'inline',
          assigneeRole: 'dev',
          branch: BRANCH,
          startHead: HEAD,
          basis: 'Test the first post-replacement mutation.',
        },
      },
      graph: replacementGraph,
      initiativeProjection: revisedProjection,
      initiativeSnapshots,
      resolveGraph,
      token: () => '9'.repeat(32),
      hostname: () => 'test-host',
      pid: 1234,
    }),
  );
  const history = loadTaskHistory({
    root,
    initiativeId: ID,
    graph: replacementGraph,
    initiativeProjection: revisedProjection,
    initiativeSnapshots,
    resolveGraph,
  });
  assert.equal(history.projection.activeClaim.taskId, 'task-01');
  assert.equal(history.projection.sequence, 3);
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

  let observed;
  assert.throws(
    () => appendActivation(root, { token: () => token, fsImpl }),
    (error) => {
      observed = error;
      assert.match(error.message, /injected task temp cleanup failure/i);
      return true;
    },
  );
  const events = path.join(root, 'docs/superpowers/initiatives', ID, 'task-events');
  assert.equal(fs.existsSync(path.join(events, '.tasks.lock')), true);
  assert.equal(fs.existsSync(path.join(events, `.tasks-${token}.tmp`)), true);
  assert.equal(fs.readdirSync(events).filter((entry) => EVENT_NAME.test(entry)).length, 1);
  assert.deepEqual(observed.recovery, {
    initiativeId: ID,
    token,
    lockPath: path.posix.join('docs/superpowers/initiatives', ID, 'task-events/.tasks.lock'),
    tempPath: path.posix.join(
      'docs/superpowers/initiatives',
      ID,
      `task-events/.tasks-${token}.tmp`,
    ),
    residuePaths: [
      path.posix.join('docs/superpowers/initiatives', ID, `task-events/.tasks-${token}.tmp`),
      path.posix.join('docs/superpowers/initiatives', ID, 'task-events/.tasks.lock'),
    ],
    command: `npm run workflow -- tasks recover --id ${ID} --token ${token}`,
  });
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
