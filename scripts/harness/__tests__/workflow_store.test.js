const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../lib/manifest');
const { canonicalStringify, finalizeEvent } = require('../lib/workflow/canonical');
const { loadWorkflowMachine } = require('../lib/workflow/machine');

let store;
try {
  store = require('../lib/workflow/store');
} catch (error) {
  if (error.code !== 'MODULE_NOT_FOUND') throw error;
  const notImplemented = () => {
    throw new Error('workflow store is not implemented');
  };
  store = {
    appendEvent: notImplemented,
    loadEventHistory: notImplemented,
    recoverRuntimeFiles: notImplemented,
  };
}

const { appendEvent, loadEventHistory, recoverRuntimeFiles } = store;
const repositoryRoot = path.resolve(__dirname, '../../..');
const machine = loadWorkflowMachine(repositoryRoot, loadManifest(repositoryRoot));
const INITIATIVE_ID = '2026-07-25-store-test';
const TOKEN = 'a'.repeat(32);
const OTHER_TOKEN = 'b'.repeat(32);
const HOST = 'moneyapp-test-host';
const NOW = '2026-07-25T12:34:56.789Z';

function makeRoot(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-workflow-store-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function eventsPath(root) {
  return path.join(root, 'docs/superpowers/initiatives', INITIATIVE_ID, 'events');
}

function eventPath(root, event, sequence = event.sequence, hash = event.eventHash) {
  return path.join(eventsPath(root), `${String(sequence).padStart(6, '0')}-${hash}.json`);
}

function createdEvent(overrides = {}) {
  return finalizeEvent({
    schemaVersion: 1,
    initiativeId: INITIATIVE_ID,
    sequence: 1,
    type: 'initiative.created',
    recordedAt: '2026-07-25T00:00:01.000Z',
    recordedBy: { role: 'sarah' },
    payload: {
      title: 'Store test',
      branch: 'refactor/store-test',
      baseSha: '1'.repeat(40),
    },
    ...overrides,
  });
}

function submittedEvent(parent, overrides = {}) {
  return finalizeEvent({
    schemaVersion: 1,
    initiativeId: INITIATIVE_ID,
    sequence: 2,
    type: 'spec.submitted',
    recordedAt: '2026-07-25T00:00:02.000Z',
    recordedBy: { role: 'sarah' },
    parent: { sequence: parent.sequence, eventHash: parent.eventHash },
    payload: {
      spec: {
        path: 'docs/superpowers/specs/2026-07-25-store-test-design.md',
        sha256: '2'.repeat(64),
      },
      deviceQa: {
        mode: 'not_applicable',
        rationale: 'Repository tooling only.',
      },
    },
    ...overrides,
  });
}

function createdDraft(overrides = {}) {
  return {
    type: 'initiative.created',
    recordedAt: NOW,
    recordedBy: { role: 'sarah' },
    payload: {
      title: 'Store test',
      branch: 'refactor/store-test',
      baseSha: '1'.repeat(40),
    },
    ...overrides,
  };
}

function submittedDraft() {
  return {
    type: 'spec.submitted',
    recordedAt: '2026-07-25T12:34:57.789Z',
    recordedBy: { role: 'sarah' },
    payload: {
      spec: {
        path: 'docs/superpowers/specs/2026-07-25-store-test-design.md',
        sha256: '2'.repeat(64),
      },
      deviceQa: {
        mode: 'not_applicable',
        rationale: 'Repository tooling only.',
      },
    },
  };
}

function writeEvent(root, event, options = {}) {
  fs.mkdirSync(eventsPath(root), { recursive: true });
  const target = options.target ?? eventPath(root, event);
  fs.writeFileSync(target, options.source ?? canonicalStringify(event));
  return target;
}

function dependencies(overrides = {}) {
  return {
    clock: () => NOW,
    hostname: () => HOST,
    pid: 4242,
    token: () => TOKEN,
    ...overrides,
  };
}

function runtimePath(root, name) {
  return path.join(eventsPath(root), name);
}

function executeAdvertisedRecovery(root, error) {
  assert.equal(
    error.recovery.command,
    `npm run workflow -- recover --id ${INITIATIVE_ID} --token ${error.recovery.token}`,
  );
  const report = recoverRuntimeFiles({
    root,
    initiativeId: INITIATIVE_ID,
    token: error.recovery.token,
    machine,
    hostname: () => HOST,
    isProcessAlive: () => false,
  });
  assert.equal(report.status, 'recovered');
  return report;
}

function writeLock(root, overrides = {}) {
  fs.mkdirSync(eventsPath(root), { recursive: true });
  const metadata = {
    host: HOST,
    pid: 4242,
    recordedAt: NOW,
    token: TOKEN,
    ...overrides,
  };
  fs.writeFileSync(runtimePath(root, '.workflow.lock'), canonicalStringify(metadata));
  return metadata;
}

function createFsProxy(overrides = {}) {
  return new Proxy(fs, {
    get(target, property) {
      return Object.hasOwn(overrides, property) ? overrides[property] : target[property];
    },
  });
}

void test('discovers exact event names in numeric order and replays a projection', (t) => {
  const root = makeRoot(t);
  const created = createdEvent();
  const submitted = submittedEvent(created);
  writeEvent(root, submitted);
  writeEvent(root, created);
  fs.writeFileSync(runtimePath(root, '.workflow.lock'), 'runtime');
  fs.writeFileSync(runtimePath(root, `.workflow-${TOKEN}.tmp`), 'runtime');

  const actualReaddir = fs.readdirSync;
  const fsImpl = createFsProxy({
    readdirSync(target, options) {
      const entries = actualReaddir(target, options);
      return target === eventsPath(root) ? [...entries].reverse() : entries;
    },
  });
  const history = loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine, fsImpl });

  assert.deepEqual(
    history.events.map((event) => event.sequence),
    [1, 2],
  );
  assert.equal(history.projection.phase, 'awaiting_spec_signoff');
  assert.equal(history.projection.latestEvent.eventHash, submitted.eventHash);
  assert.deepEqual(history.paths, [eventPath(root, created), eventPath(root, submitted)]);
});

void test('returns an empty history for a safe initiative with no events directory', (t) => {
  const root = makeRoot(t);

  const history = loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine });

  assert.deepEqual(history, { events: [], paths: [], projection: undefined });
});

void test('rejects sequence gaps, duplicate sequences, duplicate hashes, and forks', async (t) => {
  await t.test('gap', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    const submitted = submittedEvent(created);
    writeEvent(root, submitted);

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /contiguous.*expected sequence 1/i,
    );
  });

  await t.test('duplicate sequence and fork', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    const firstChild = submittedEvent(created);
    const secondChild = submittedEvent(created, {
      recordedAt: '2026-07-25T00:00:03.000Z',
    });
    writeEvent(root, created);
    writeEvent(root, firstChild);
    writeEvent(root, secondChild);

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /duplicate sequence|multiple children|fork/i,
    );
  });

  await t.test('duplicate hash', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    writeEvent(root, created);
    writeEvent(root, created, { target: eventPath(root, created, 2) });

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /duplicate event hash/i,
    );
  });
});

void test('rejects filename/envelope mismatches and broken parent chains', async (t) => {
  await t.test('filename sequence mismatch', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    writeEvent(root, created, { target: eventPath(root, created, 2) });

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /filename sequence.*envelope sequence/i,
    );
  });

  await t.test('filename hash mismatch', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    writeEvent(root, created, { target: eventPath(root, created, 1, 'f'.repeat(64)) });

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /filename hash.*event hash/i,
    );
  });

  await t.test('parent hash mismatch', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    const submitted = submittedEvent(created, {
      parent: { sequence: 1, eventHash: 'f'.repeat(64) },
    });
    writeEvent(root, created);
    writeEvent(root, submitted);

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /parent hash.*sequence 1/i,
    );
  });

  await t.test('parent sequence mismatch', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    const submitted = submittedEvent(created, {
      parent: { sequence: 0, eventHash: created.eventHash },
    });
    writeEvent(root, created);
    writeEvent(root, submitted);

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /parent sequence.*event sequence minus one/i,
    );
  });
});

void test('rejects edited or partial final events', async (t) => {
  await t.test('edited self-hashed leaf', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    const edited = canonicalStringify({
      ...created,
      payload: { ...created.payload, title: 'Edited after finalization' },
    });
    writeEvent(root, created, { source: edited });

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /event hash mismatch/i,
    );
  });

  await t.test('truncated final JSON', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    writeEvent(root, created, { source: canonicalStringify(created).slice(0, -12) });

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /JSON|unterminated|invalid/i,
    );
  });
});

void test('rejects symlinks, directories, unsupported names, and malformed runtime names', async (t) => {
  await t.test('symlink event', () => {
    const root = makeRoot(t);
    const created = createdEvent();
    fs.mkdirSync(eventsPath(root), { recursive: true });
    const outside = path.join(root, 'outside.json');
    fs.writeFileSync(outside, canonicalStringify(created));
    fs.symlinkSync(outside, eventPath(root, created));

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /symbolic link|symlink/i,
    );
  });

  await t.test('directory in events', () => {
    const root = makeRoot(t);
    fs.mkdirSync(runtimePath(root, 'nested'), { recursive: true });

    assert.throws(
      () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
      /unsupported.*nested|regular file/i,
    );
  });

  for (const name of [
    'notes.md',
    '.workflow.lock.tmp',
    '.workflow-ABC.tmp',
    `.workflow-${TOKEN}.tmp.extra`,
    '000001-not-a-hash.json',
  ]) {
    await t.test(name, () => {
      const root = makeRoot(t);
      fs.mkdirSync(eventsPath(root), { recursive: true });
      fs.writeFileSync(runtimePath(root, name), 'unsupported');

      assert.throws(
        () => loadEventHistory({ root, initiativeId: INITIATIVE_ID, machine }),
        /unsupported.*events|event filename/i,
      );
    });
  }
});

void test('appends a finalized event through fsynced temp and no-replace install', (t) => {
  const root = makeRoot(t);
  const operations = [];
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualWrite = fs.writeFileSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  const actualLink = fs.linkSync;
  const actualUnlink = fs.unlinkSync;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      descriptors.set(descriptor, { target, flags });
      operations.push(['open', target, flags]);
      return descriptor;
    },
    writeFileSync(target, data, options) {
      operations.push([
        'write',
        descriptors.get(target)?.target ?? target,
        Buffer.byteLength(data),
      ]);
      return actualWrite(target, data, options);
    },
    fsyncSync(descriptor) {
      operations.push(['fsync', descriptors.get(descriptor)?.target]);
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      operations.push(['close', descriptors.get(descriptor)?.target]);
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
    linkSync(source, target) {
      operations.push(['link', source, target]);
      return actualLink(source, target);
    },
    unlinkSync(target) {
      operations.push(['unlink', target]);
      return actualUnlink(target);
    },
  });

  const event = appendEvent({
    root,
    initiativeId: INITIATIVE_ID,
    expectedSequence: 1,
    draft: createdDraft(),
    machine,
    fsImpl,
    ...dependencies(),
  });

  const temp = runtimePath(root, `.workflow-${TOKEN}.tmp`);
  const final = eventPath(root, event);
  assert.deepEqual(
    event,
    finalizeEvent({
      schemaVersion: 1,
      initiativeId: INITIATIVE_ID,
      sequence: 1,
      ...createdDraft(),
    }),
  );
  assert.equal(fs.readFileSync(final, 'utf8'), canonicalStringify(event));
  assert.equal(fs.existsSync(temp), false);
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
  const tempWrite = operations.findIndex(
    ([operation, target]) => operation === 'write' && target === temp,
  );
  const lockClose = operations.findIndex(
    ([operation, target]) =>
      operation === 'close' && target === runtimePath(root, '.workflow.lock'),
  );
  const lockDirectoryFsync = operations.findIndex(
    ([operation, target]) => operation === 'fsync' && target === eventsPath(root),
  );
  const tempOpen = operations.findIndex(
    ([operation, target]) => operation === 'open' && target === temp,
  );
  const tempFsync = operations.findIndex(
    ([operation, target]) => operation === 'fsync' && target === temp,
  );
  const tempClose = operations.findIndex(
    ([operation, target]) => operation === 'close' && target === temp,
  );
  const install = operations.findIndex(([operation]) => operation === 'link');
  const commitDirectoryFsync = operations.findIndex(
    ([operation, target], index) =>
      index > lockDirectoryFsync && operation === 'fsync' && target === eventsPath(root),
  );
  const tempUnlink = operations.findIndex(
    ([operation, target]) => operation === 'unlink' && target === temp,
  );
  assert.ok(lockClose >= 0);
  assert.ok(lockDirectoryFsync >= 0);
  assert.ok(tempOpen >= 0);
  assert.ok(tempWrite >= 0);
  assert.ok(commitDirectoryFsync >= 0);
  assert.ok(tempUnlink >= 0);
  assert.ok(lockClose < lockDirectoryFsync);
  assert.ok(lockDirectoryFsync < tempOpen);
  assert.ok(tempWrite < tempFsync);
  assert.ok(tempFsync < tempClose);
  assert.ok(tempClose < install);
  assert.ok(install < commitDirectoryFsync);
  assert.ok(commitDirectoryFsync < tempUnlink);
});

void test('derives parent fields under lock and never opens an existing event write-capable', (t) => {
  const root = makeRoot(t);
  const created = createdEvent();
  const existingPath = writeEvent(root, created);
  const opens = [];
  const actualOpen = fs.openSync;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      opens.push([target, flags]);
      return actualOpen(target, flags, mode);
    },
  });

  const event = appendEvent({
    root,
    initiativeId: INITIATIVE_ID,
    expectedSequence: 2,
    draft: submittedDraft(),
    machine,
    fsImpl,
    ...dependencies(),
  });

  assert.equal(event.parent.sequence, 1);
  assert.equal(event.parent.eventHash, created.eventHash);
  const existingOpens = opens.filter(([target]) => target === existingPath);
  assert.ok(existingOpens.length > 0);
  for (const [, flags] of existingOpens) {
    assert.equal(flags & fs.constants.O_WRONLY, 0);
    assert.equal(flags & fs.constants.O_RDWR, 0);
    assert.equal(flags & fs.constants.O_APPEND, 0);
    assert.equal(flags & fs.constants.O_TRUNC, 0);
    assert.equal(flags & fs.constants.O_CREAT, 0);
  }
});

void test('rejects stale writers, unsafe IDs, and draft overrides without a committed event', async (t) => {
  await t.test('stale expected sequence', () => {
    const root = makeRoot(t);
    writeEvent(root, createdEvent());

    assert.throws(
      () =>
        appendEvent({
          root,
          initiativeId: INITIATIVE_ID,
          expectedSequence: 1,
          draft: submittedDraft(),
          machine,
          ...dependencies(),
        }),
      /stale expected sequence.*expected 2.*received 1/i,
    );
    assert.equal(
      fs.readdirSync(eventsPath(root)).filter((name) => name.endsWith('.json')).length,
      1,
    );
    assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
  });

  await t.test('unsafe initiative ID', () => {
    const root = makeRoot(t);
    assert.throws(
      () =>
        appendEvent({
          root,
          initiativeId: '../escape',
          expectedSequence: 1,
          draft: createdDraft(),
          machine,
          ...dependencies(),
        }),
      /initiative ID/i,
    );
  });

  for (const [field, value] of [
    ['initiativeId', INITIATIVE_ID],
    ['sequence', 1],
    ['parent', { sequence: 1, eventHash: 'f'.repeat(64) }],
    ['eventHash', 'f'.repeat(64)],
  ]) {
    await t.test(`draft ${field}`, () => {
      const root = makeRoot(t);
      assert.throws(
        () =>
          appendEvent({
            root,
            initiativeId: INITIATIVE_ID,
            expectedSequence: 1,
            draft: createdDraft({ [field]: value }),
            machine,
            ...dependencies(),
          }),
        new RegExp(`draft.*${field}`, 'i'),
      );
      assert.equal(
        fs.existsSync(eventsPath(root)) &&
          fs.readdirSync(eventsPath(root)).some((name) => name.endsWith('.json')),
        false,
      );
    });
  }
});

void test('rejects invalid roles, payloads, and transitions before creating temp or final events', async (t) => {
  async function expectPreInstallFailure(name, root, draft, expectedSequence, message) {
    await t.test(name, () => {
      assert.throws(
        () =>
          appendEvent({
            root,
            initiativeId: INITIATIVE_ID,
            expectedSequence,
            draft,
            machine,
            ...dependencies(),
          }),
        message,
      );
      const entries = fs.readdirSync(eventsPath(root));
      assert.equal(
        entries.some((entry) => entry.endsWith('.tmp')),
        false,
      );
      assert.equal(entries.includes('.workflow.lock'), false);
      assert.equal(entries.filter((entry) => entry.endsWith('.json')).length, expectedSequence - 1);
    });
  }

  await expectPreInstallFailure(
    'invalid recorder role',
    makeRoot(t),
    createdDraft({ recordedBy: { role: 'dev' } }),
    1,
    /recorder role dev is not authorized/i,
  );
  await expectPreInstallFailure(
    'invalid payload',
    makeRoot(t),
    createdDraft({
      payload: {
        branch: 'refactor/store-test',
        baseSha: '1'.repeat(40),
      },
    }),
    1,
    /initiative\.created payload fields.*missing title/i,
  );

  const transitionRoot = makeRoot(t);
  writeEvent(transitionRoot, createdEvent());
  await expectPreInstallFailure(
    'illegal transition',
    transitionRoot,
    {
      type: 'plan.submitted',
      recordedAt: '2026-07-25T12:34:57.789Z',
      recordedBy: { role: 'tariq' },
      payload: {
        plan: {
          path: 'docs/superpowers/plans/2026-07-25-store-test.md',
          sha256: '3'.repeat(64),
        },
      },
    },
    2,
    /cannot be recorded from brainstorming/i,
  );
});

void test('reports active lock metadata and never removes another writer lock', (t) => {
  const root = makeRoot(t);
  const metadata = writeLock(root);

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        ...dependencies({ token: () => OTHER_TOKEN }),
      }),
    (error) => {
      assert.match(error.message, /locked/i);
      assert.deepEqual(error.lock, metadata);
      assert.equal(error.lock.token, TOKEN);
      assert.equal(error.recovery, undefined);
      assert.doesNotMatch(error.message, new RegExp(OTHER_TOKEN));
      return true;
    },
  );
  assert.equal(
    fs.readFileSync(runtimePath(root, '.workflow.lock'), 'utf8'),
    canonicalStringify(metadata),
  );
});

void test('cleans only owned runtime files after pre-install filesystem failures', async (t) => {
  const failureCases = [
    {
      name: 'lock metadata write',
      fail({ target }) {
        return target.endsWith('.workflow.lock') ? 'write' : undefined;
      },
    },
    {
      name: 'lock fsync',
      fail({ target }) {
        return target.endsWith('.workflow.lock') ? 'fsync' : undefined;
      },
    },
    {
      name: 'temp open',
      fail({ target }) {
        return target.endsWith('.tmp') ? 'open' : undefined;
      },
    },
    {
      name: 'temp write',
      fail({ target }) {
        return target.endsWith('.tmp') ? 'write' : undefined;
      },
    },
    {
      name: 'temp fsync',
      fail({ target }) {
        return target.endsWith('.tmp') ? 'fsync' : undefined;
      },
    },
    {
      name: 'install link',
      fail() {
        return 'link';
      },
    },
  ];

  for (const failureCase of failureCases) {
    await t.test(failureCase.name, () => {
      const root = makeRoot(t);
      const descriptors = new Map();
      const actualOpen = fs.openSync;
      const actualWrite = fs.writeFileSync;
      const actualFsync = fs.fsyncSync;
      const actualClose = fs.closeSync;
      const actualLink = fs.linkSync;
      const fsImpl = createFsProxy({
        openSync(target, flags, mode) {
          if (failureCase.fail({ operation: 'open', target }) === 'open') {
            const error = new Error('simulated open failure');
            error.code = 'EIO';
            throw error;
          }
          const descriptor = actualOpen(target, flags, mode);
          descriptors.set(descriptor, target);
          return descriptor;
        },
        writeFileSync(target, data, options) {
          const file = descriptors.get(target) ?? target;
          if (failureCase.fail({ operation: 'write', target: file }) === 'write') {
            throw new Error('simulated write failure');
          }
          return actualWrite(target, data, options);
        },
        fsyncSync(descriptor) {
          const target = descriptors.get(descriptor);
          if (failureCase.fail({ operation: 'fsync', target }) === 'fsync') {
            throw new Error('simulated fsync failure');
          }
          return actualFsync(descriptor);
        },
        closeSync(descriptor) {
          descriptors.delete(descriptor);
          return actualClose(descriptor);
        },
        linkSync(source, target) {
          if (failureCase.fail({ operation: 'link', target }) === 'link') {
            throw new Error('simulated link failure');
          }
          return actualLink(source, target);
        },
      });

      assert.throws(
        () =>
          appendEvent({
            root,
            initiativeId: INITIATIVE_ID,
            expectedSequence: 1,
            draft: createdDraft(),
            machine,
            fsImpl,
            ...dependencies(),
          }),
        /simulated/i,
      );
      const entries = fs.existsSync(eventsPath(root)) ? fs.readdirSync(eventsPath(root)) : [];
      assert.deepEqual(entries, []);
    });
  }
});

void test('leaves fstat failures safely tokenized and recoverable without deleting replaced paths', async (t) => {
  for (const targetKind of ['lock', 'temp']) {
    await t.test(`${targetKind} fstat failure`, () => {
      const root = makeRoot(t);
      const descriptors = new Map();
      const actualOpen = fs.openSync;
      const actualFstat = fs.fstatSync;
      const actualClose = fs.closeSync;
      let failed = false;
      const fsImpl = createFsProxy({
        openSync(target, flags, mode) {
          const descriptor = actualOpen(target, flags, mode);
          descriptors.set(descriptor, target);
          return descriptor;
        },
        fstatSync(descriptor) {
          const target = descriptors.get(descriptor);
          const shouldFail =
            !failed &&
            ((targetKind === 'lock' && target?.endsWith('.workflow.lock')) ||
              (targetKind === 'temp' && target?.endsWith('.tmp')));
          if (shouldFail) {
            failed = true;
            throw new Error(`simulated ${targetKind} fstat failure`);
          }
          return actualFstat(descriptor);
        },
        closeSync(descriptor) {
          descriptors.delete(descriptor);
          return actualClose(descriptor);
        },
      });

      let observed;
      assert.throws(
        () =>
          appendEvent({
            root,
            initiativeId: INITIATIVE_ID,
            expectedSequence: 1,
            draft: createdDraft(),
            machine,
            fsImpl,
            ...dependencies(),
          }),
        (error) => {
          observed = error;
          assert.match(error.message, new RegExp(`simulated ${targetKind} fstat failure`, 'i'));
          assert.equal(error.recovery.token, TOKEN);
          assert.equal(
            error.recovery.lockPath,
            path.posix.join('docs/superpowers/initiatives', INITIATIVE_ID, 'events/.workflow.lock'),
          );
          assert.equal(
            error.recovery.tempPath,
            path.posix.join(
              'docs/superpowers/initiatives',
              INITIATIVE_ID,
              `events/.workflow-${TOKEN}.tmp`,
            ),
          );
          assert.match(error.recovery.command, new RegExp(`recover --id ${INITIATIVE_ID}`));
          assert.match(error.recovery.command, new RegExp(`--token ${TOKEN}`));
          return true;
        },
      );

      const residue = fs.readdirSync(eventsPath(root));
      assert.ok(residue.includes('.workflow.lock'));
      if (targetKind === 'temp') {
        assert.ok(residue.includes(`.workflow-${TOKEN}.tmp`));
      }
      executeAdvertisedRecovery(root, observed);
      assert.deepEqual(fs.readdirSync(eventsPath(root)), []);
    });
  }
});

void test('compound fstat and fallback-write failures leave only clean or recoverable state', async (t) => {
  for (const targetKind of ['lock', 'temp']) {
    await t.test(`${targetKind} fstat and fallback write`, () => {
      const root = makeRoot(t);
      const descriptors = new Map();
      const actualOpen = fs.openSync;
      const actualFstat = fs.fstatSync;
      const actualWrite = fs.writeFileSync;
      const actualClose = fs.closeSync;
      let failedFstat = false;
      let failedWrite = false;
      const matchesTarget = (target) =>
        targetKind === 'lock' ? target?.endsWith('.workflow.lock') : target?.endsWith('.tmp');
      const fsImpl = createFsProxy({
        openSync(target, flags, mode) {
          const descriptor = actualOpen(target, flags, mode);
          descriptors.set(descriptor, target);
          return descriptor;
        },
        fstatSync(descriptor) {
          if (!failedFstat && matchesTarget(descriptors.get(descriptor))) {
            failedFstat = true;
            throw new Error(`simulated ${targetKind} fstat failure`);
          }
          return actualFstat(descriptor);
        },
        writeFileSync(target, data, options) {
          if (!failedWrite && matchesTarget(descriptors.get(target) ?? target)) {
            failedWrite = true;
            throw new Error(`simulated ${targetKind} fallback write failure`);
          }
          return actualWrite(target, data, options);
        },
        closeSync(descriptor) {
          descriptors.delete(descriptor);
          return actualClose(descriptor);
        },
      });

      let observed;
      assert.throws(
        () =>
          appendEvent({
            root,
            initiativeId: INITIATIVE_ID,
            expectedSequence: 1,
            draft: createdDraft(),
            machine,
            fsImpl,
            ...dependencies(),
          }),
        (error) => {
          observed = error;
          const failures =
            error instanceof AggregateError ? error.errors.map((entry) => entry.message) : [];
          assert.ok(
            failures.some((message) => message.includes(`simulated ${targetKind} fstat failure`)),
          );
          assert.ok(
            failures.some((message) =>
              message.includes(`simulated ${targetKind} fallback write failure`),
            ),
          );
          return true;
        },
      );

      const residue = fs.readdirSync(eventsPath(root));
      if (observed.recovery) {
        assert.equal(observed.recovery.token, TOKEN);
        executeAdvertisedRecovery(root, observed);
        assert.deepEqual(fs.readdirSync(eventsPath(root)), []);
      } else {
        assert.deepEqual(residue, []);
      }
    });
  }
});

void test('requires manual intervention when persistent lock identity and fallback persistence fail', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualWrite = fs.writeFileSync;
  const actualClose = fs.closeSync;
  const lockRelative = path.posix.join(
    'docs/superpowers/initiatives',
    INITIATIVE_ID,
    'events/.workflow.lock',
  );
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      descriptors.set(descriptor, target);
      return descriptor;
    },
    fstatSync(descriptor) {
      if (descriptors.get(descriptor)?.endsWith('.workflow.lock')) {
        throw new Error('simulated persistent lock fstat failure');
      }
      return fs.fstatSync(descriptor);
    },
    writeFileSync(target, data, options) {
      if (descriptors.get(target)?.endsWith('.workflow.lock')) {
        throw new Error('simulated fallback lock write failure');
      }
      return actualWrite(target, data, options);
    },
    closeSync(descriptor) {
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      assert.ok(error instanceof AggregateError);
      assert.equal(error.recovery, undefined);
      assert.deepEqual(error.manualIntervention, {
        status: 'manual_intervention_required',
        residuePaths: [lockRelative],
        causes: [
          'simulated persistent lock fstat failure',
          'simulated fallback lock write failure',
          'simulated persistent lock fstat failure',
        ],
      });
      return true;
    },
  );
  assert.equal(fs.readFileSync(runtimePath(root, '.workflow.lock'), 'utf8'), '');
});

void test('aggregates primary and cleanup failures with actionable recovery details', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      descriptors.set(descriptor, target);
      return descriptor;
    },
    fsyncSync(descriptor) {
      if (descriptors.get(descriptor)?.endsWith('.tmp')) {
        throw new Error('simulated temp fsync primary failure');
      }
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
    unlinkSync(target) {
      if (target.endsWith('.tmp')) throw new Error('simulated temp unlink cleanup failure');
      if (target.endsWith('.workflow.lock')) {
        throw new Error('simulated lock unlink cleanup failure');
      }
      return fs.unlinkSync(target);
    },
  });

  let observed;
  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      observed = error;
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(
        error.errors.map((entry) => entry.message),
        [
          'simulated temp fsync primary failure',
          'simulated temp unlink cleanup failure',
          `Workflow lock cleanup was skipped to preserve recovery for ${path.posix.join(
            'docs/superpowers/initiatives',
            INITIATIVE_ID,
            `events/.workflow-${TOKEN}.tmp`,
          )}`,
        ],
      );
      assert.equal(error.recovery.token, TOKEN);
      assert.deepEqual(error.recovery.residuePaths, [
        path.posix.join(
          'docs/superpowers/initiatives',
          INITIATIVE_ID,
          `events/.workflow-${TOKEN}.tmp`,
        ),
        path.posix.join('docs/superpowers/initiatives', INITIATIVE_ID, 'events/.workflow.lock'),
      ]);
      assert.equal(
        error.recovery.command,
        `npm run workflow -- recover --id ${INITIATIVE_ID} --token ${TOKEN}`,
      );
      return true;
    },
  );
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);
  assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), true);
  executeAdvertisedRecovery(root, observed);
  assert.deepEqual(fs.readdirSync(eventsPath(root)), []);
});

void test('aggregates a primary failure with lock unlink failure and reports lock residue', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      descriptors.set(descriptor, target);
      return descriptor;
    },
    fsyncSync(descriptor) {
      if (descriptors.get(descriptor)?.endsWith('.tmp')) {
        throw new Error('simulated temp fsync primary failure');
      }
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
    unlinkSync(target) {
      if (target.endsWith('.workflow.lock')) {
        throw new Error('simulated lock unlink cleanup failure');
      }
      return fs.unlinkSync(target);
    },
  });

  let observed;
  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      observed = error;
      assert.ok(error instanceof AggregateError);
      assert.deepEqual(
        error.errors.map((entry) => entry.message),
        ['simulated temp fsync primary failure', 'simulated lock unlink cleanup failure'],
      );
      assert.deepEqual(error.recovery.residuePaths, [
        path.posix.join('docs/superpowers/initiatives', INITIATIVE_ID, 'events/.workflow.lock'),
      ]);
      assert.equal(
        error.recovery.command,
        `npm run workflow -- recover --id ${INITIATIVE_ID} --token ${TOKEN}`,
      );
      return true;
    },
  );
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);
  assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), false);
  executeAdvertisedRecovery(root, observed);
  assert.deepEqual(fs.readdirSync(eventsPath(root)), []);
});

void test('does not overwrite a final event installed by a racing writer', (t) => {
  const root = makeRoot(t);
  const actualLink = fs.linkSync;
  const fsImpl = createFsProxy({
    linkSync(source, target) {
      fs.writeFileSync(target, 'racing writer bytes');
      return actualLink(source, target);
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    /exist|install|overwrite/i,
  );
  const final = fs.readdirSync(eventsPath(root)).find((name) => name.endsWith('.json'));
  assert.equal(fs.readFileSync(path.join(eventsPath(root), final), 'utf8'), 'racing writer bytes');
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
  assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), false);
});

void test('cleans safely when the lock-directory fsync fails before temp creation', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  let directoryFsyncCount = 0;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      descriptors.set(descriptor, target);
      return descriptor;
    },
    fsyncSync(descriptor) {
      if (descriptors.get(descriptor) === eventsPath(root)) {
        directoryFsyncCount += 1;
        if (directoryFsyncCount === 1) {
          throw new Error('simulated lock directory fsync failure');
        }
      }
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      assert.match(error.message, /lock directory fsync failure/i);
      assert.equal(error.durableUncertain, undefined);
      assert.equal(error.committedPath, undefined);
      return true;
    },
  );
  assert.deepEqual(fs.readdirSync(eventsPath(root)), []);
});

void test('reports durable uncertainty and preserves the installed event after directory fsync fails', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  let directoryOpenCount = 0;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      const directoryPhase =
        target === eventsPath(root) ? (directoryOpenCount++ === 0 ? 'lock' : 'commit') : undefined;
      descriptors.set(descriptor, { target, directoryPhase });
      return descriptor;
    },
    fsyncSync(descriptor) {
      if (descriptors.get(descriptor)?.directoryPhase === 'commit') {
        throw new Error('simulated final commit directory fsync failure');
      }
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      descriptors.delete(descriptor);
      return actualClose(descriptor);
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      assert.match(error.message, /durability is uncertain/i);
      assert.equal(error.durableUncertain, true);
      assert.match(error.committedPath, /000001-[a-f0-9]{64}\.json$/);
      return true;
    },
  );
  assert.equal(fs.readdirSync(eventsPath(root)).filter((name) => name.endsWith('.json')).length, 1);
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
});

void test('reports a durable committed path when later lock cleanup fails', (t) => {
  const root = makeRoot(t);
  const fsImpl = createFsProxy({
    unlinkSync(target) {
      if (target.endsWith('.workflow.lock')) {
        throw new Error('simulated post-commit lock cleanup failure');
      }
      return fs.unlinkSync(target);
    },
  });

  let observed;
  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      observed = error;
      assert.equal(error.durableUncertain, undefined);
      assert.match(error.committedPath, /000001-[a-f0-9]{64}\.json$/);
      assert.match(error.message, /post-commit lock cleanup failure/i);
      assert.equal(error.recovery.token, TOKEN);
      return true;
    },
  );
  assert.equal(fs.existsSync(observed.committedPath), true);
  executeAdvertisedRecovery(root, observed);
});

void test('does not advertise recovery when committed history references runtime residue', async (t) => {
  const lockRelative = path.posix.join(
    'docs/superpowers/initiatives',
    INITIATIVE_ID,
    'events/.workflow.lock',
  );
  const tempRelative = path.posix.join(
    'docs/superpowers/initiatives',
    INITIATIVE_ID,
    `events/.workflow-${TOKEN}.tmp`,
  );

  for (const [targetKind, runtimeReference] of [
    ['lock', lockRelative],
    ['temp', tempRelative],
  ]) {
    await t.test(targetKind, () => {
      const root = makeRoot(t);
      const fsImpl = createFsProxy({
        unlinkSync(target) {
          if (target.endsWith('.workflow.lock')) {
            throw new Error('simulated referenced lock cleanup failure');
          }
          return fs.unlinkSync(target);
        },
      });
      const baseDraft = createdDraft();

      let observed;
      assert.throws(
        () =>
          appendEvent({
            root,
            initiativeId: INITIATIVE_ID,
            expectedSequence: 1,
            draft: createdDraft({
              payload: {
                ...baseDraft.payload,
                title: `Embedded runtime reference: ${runtimeReference}`,
              },
            }),
            machine,
            fsImpl,
            ...dependencies(),
          }),
        (error) => {
          observed = error;
          assert.equal(error.durableUncertain, undefined);
          assert.match(error.committedPath, /000001-[a-f0-9]{64}\.json$/);
          assert.equal(error.recovery, undefined);
          assert.deepEqual(error.manualIntervention, {
            status: 'manual_intervention_required',
            residuePaths: [lockRelative],
            causes: [
              'simulated referenced lock cleanup failure',
              'A committed event references a workflow runtime path; recovery refused',
            ],
          });
          return true;
        },
      );

      assert.equal(fs.existsSync(observed.committedPath), true);
      assert.throws(
        () =>
          recoverRuntimeFiles({
            root,
            initiativeId: INITIATIVE_ID,
            token: TOKEN,
            machine,
            hostname: () => HOST,
            isProcessAlive: () => false,
          }),
        /committed event references.*recovery refused/i,
      );
      assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);
    });
  }
});

void test('preserves a foreign temp replacement created between install and cleanup', (t) => {
  const root = makeRoot(t);
  const temp = runtimePath(root, `.workflow-${TOKEN}.tmp`);
  const replacement = 'foreign replacement';
  const actualLstat = fs.lstatSync;
  const actualLink = fs.linkSync;
  const actualUnlink = fs.unlinkSync;
  let linked = false;
  let replaced = false;
  const replaceTemp = (target) => {
    if (target === temp && linked && !replaced) {
      actualUnlink(target);
      fs.writeFileSync(target, replacement);
      replaced = true;
    }
  };
  const fsImpl = createFsProxy({
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
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      assert.equal(error.durableUncertain, undefined);
      assert.match(error.committedPath, /000001-[a-f0-9]{64}\.json$/);
      assert.match(error.message, /temporary file changed before cleanup/i);
      assert.equal(error.recovery, undefined);
      return true;
    },
  );
  assert.equal(fs.readFileSync(temp, 'utf8'), replacement);
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
  assert.equal(fs.readdirSync(eventsPath(root)).filter((name) => name.endsWith('.json')).length, 1);
});

void test('rejects a final install that is not the captured temp inode', (t) => {
  const root = makeRoot(t);
  const fsImpl = createFsProxy({
    linkSync(source, target) {
      fs.copyFileSync(source, target);
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    /same inode|hard link|identity/i,
  );
});

void test('keeps the committed path durable when only final directory close fails', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualClose = fs.closeSync;
  let directoryOpenCount = 0;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      const directoryPhase =
        target === eventsPath(root) ? (directoryOpenCount++ === 0 ? 'lock' : 'commit') : undefined;
      descriptors.set(descriptor, { target, directoryPhase });
      return descriptor;
    },
    closeSync(descriptor) {
      const phase = descriptors.get(descriptor)?.directoryPhase;
      descriptors.delete(descriptor);
      actualClose(descriptor);
      if (phase === 'commit') {
        throw new Error('simulated final directory close failure');
      }
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      assert.equal(error.durableUncertain, undefined);
      assert.match(error.committedPath, /000001-[a-f0-9]{64}\.json$/);
      assert.match(error.message, /final commit directory close failed/i);
      return true;
    },
  );
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
  assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), false);
});

void test('aggregates final directory fsync and close failures', (t) => {
  const root = makeRoot(t);
  const descriptors = new Map();
  const actualOpen = fs.openSync;
  const actualFsync = fs.fsyncSync;
  const actualClose = fs.closeSync;
  let directoryOpenCount = 0;
  const fsImpl = createFsProxy({
    openSync(target, flags, mode) {
      const descriptor = actualOpen(target, flags, mode);
      const directoryPhase =
        target === eventsPath(root) ? (directoryOpenCount++ === 0 ? 'lock' : 'commit') : undefined;
      descriptors.set(descriptor, { target, directoryPhase });
      return descriptor;
    },
    fsyncSync(descriptor) {
      if (descriptors.get(descriptor)?.directoryPhase === 'commit') {
        throw new Error('simulated final directory fsync failure');
      }
      return actualFsync(descriptor);
    },
    closeSync(descriptor) {
      const phase = descriptors.get(descriptor)?.directoryPhase;
      descriptors.delete(descriptor);
      actualClose(descriptor);
      if (phase === 'commit') {
        throw new Error('simulated final directory close failure');
      }
    },
  });

  assert.throws(
    () =>
      appendEvent({
        root,
        initiativeId: INITIATIVE_ID,
        expectedSequence: 1,
        draft: createdDraft(),
        machine,
        fsImpl,
        ...dependencies(),
      }),
    (error) => {
      assert.equal(error.durableUncertain, true);
      assert.ok(error.cause instanceof AggregateError);
      assert.deepEqual(
        error.cause.errors.map((entry) => entry.message),
        ['simulated final directory fsync failure', 'simulated final directory close failure'],
      );
      return true;
    },
  );
});

void test('recovers only the matching stale token and reports exact paths', (t) => {
  const root = makeRoot(t);
  writeEvent(root, createdEvent());
  writeLock(root);
  fs.writeFileSync(runtimePath(root, `.workflow-${TOKEN}.tmp`), 'owned temp');
  fs.writeFileSync(runtimePath(root, `.workflow-${OTHER_TOKEN}.tmp`), 'other temp');
  const expectedLock = path.posix.join(
    'docs/superpowers/initiatives',
    INITIATIVE_ID,
    'events/.workflow.lock',
  );
  const expectedTemp = path.posix.join(
    'docs/superpowers/initiatives',
    INITIATIVE_ID,
    `events/.workflow-${TOKEN}.tmp`,
  );

  const report = recoverRuntimeFiles({
    root,
    initiativeId: INITIATIVE_ID,
    token: TOKEN,
    hostname: () => HOST,
    isProcessAlive: () => false,
  });

  assert.deepEqual(report, {
    initiativeId: INITIATIVE_ID,
    token: TOKEN,
    lockPath: expectedLock,
    tempPath: expectedTemp,
    wouldRemove: [expectedTemp, expectedLock],
    removed: [expectedTemp, expectedLock],
    status: 'recovered',
  });
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), false);
  assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), false);
  assert.equal(
    fs.readFileSync(runtimePath(root, `.workflow-${OTHER_TOKEN}.tmp`), 'utf8'),
    'other temp',
  );
  assert.equal(fs.existsSync(eventPath(root, createdEvent())), true);
});

void test('supports dry-run recovery and idempotent not-found reporting', (t) => {
  const root = makeRoot(t);
  writeLock(root);
  fs.writeFileSync(runtimePath(root, `.workflow-${TOKEN}.tmp`), 'owned temp');

  const dryRun = recoverRuntimeFiles({
    root,
    initiativeId: INITIATIVE_ID,
    token: TOKEN,
    hostname: () => HOST,
    isProcessAlive: () => false,
    dryRun: true,
  });
  assert.deepEqual(dryRun.wouldRemove, [
    path.posix.join('docs/superpowers/initiatives', INITIATIVE_ID, `events/.workflow-${TOKEN}.tmp`),
    path.posix.join('docs/superpowers/initiatives', INITIATIVE_ID, 'events/.workflow.lock'),
  ]);
  assert.deepEqual(dryRun.removed, []);
  assert.equal(dryRun.status, 'dry_run');
  assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);

  recoverRuntimeFiles({
    root,
    initiativeId: INITIATIVE_ID,
    token: TOKEN,
    hostname: () => HOST,
    isProcessAlive: () => false,
  });
  const notFound = recoverRuntimeFiles({
    root,
    initiativeId: INITIATIVE_ID,
    token: TOKEN,
    hostname: () => HOST,
    isProcessAlive: () => false,
  });
  assert.equal(notFound.status, 'not_found');
  assert.deepEqual(notFound.wouldRemove, []);
  assert.deepEqual(notFound.removed, []);
});

void test('recovery rejects a wrong token and a live same-host process without deletion', async (t) => {
  await t.test('wrong token', () => {
    const root = makeRoot(t);
    writeLock(root);
    fs.writeFileSync(runtimePath(root, `.workflow-${TOKEN}.tmp`), 'owned temp');

    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: OTHER_TOKEN,
          hostname: () => HOST,
          isProcessAlive: () => false,
        }),
      /token.*does not match/i,
    );
    assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);
    assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), true);
  });

  await t.test('live local process', () => {
    const root = makeRoot(t);
    writeLock(root);

    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: TOKEN,
          hostname: () => HOST,
          isProcessAlive: (pid) => {
            assert.equal(pid, 4242);
            return true;
          },
        }),
      /process 4242.*alive/i,
    );
    assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);
  });
});

void test('recovery allows a foreign host without probing its PID', (t) => {
  const root = makeRoot(t);
  writeLock(root, { host: 'other-host' });
  let probed = false;

  const report = recoverRuntimeFiles({
    root,
    initiativeId: INITIATIVE_ID,
    token: TOKEN,
    hostname: () => HOST,
    isProcessAlive: () => {
      probed = true;
      return true;
    },
  });

  assert.equal(report.status, 'recovered');
  assert.equal(probed, false);
});

void test('recovery rejects weird tokens, symlinks, unsupported runtime files, and orphan temps', async (t) => {
  await t.test('weird token', () => {
    const root = makeRoot(t);
    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: '../escape',
          hostname: () => HOST,
        }),
      /recovery token/i,
    );
  });

  await t.test('symlink lock', () => {
    const root = makeRoot(t);
    fs.mkdirSync(eventsPath(root), { recursive: true });
    const outside = path.join(root, 'outside-lock');
    fs.writeFileSync(
      outside,
      canonicalStringify({ host: HOST, pid: 4242, recordedAt: NOW, token: TOKEN }),
    );
    fs.symlinkSync(outside, runtimePath(root, '.workflow.lock'));

    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: TOKEN,
          hostname: () => HOST,
        }),
      /symbolic[- ]link|symlink/i,
    );
    assert.equal(fs.existsSync(outside), true);
  });

  await t.test('symlink temp', () => {
    const root = makeRoot(t);
    writeLock(root);
    const outside = path.join(root, 'outside-temp');
    fs.writeFileSync(outside, 'outside');
    fs.symlinkSync(outside, runtimePath(root, `.workflow-${TOKEN}.tmp`));

    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: TOKEN,
          hostname: () => HOST,
          isProcessAlive: () => false,
        }),
      /symbolic[- ]link|symlink/i,
    );
    assert.equal(fs.readFileSync(outside, 'utf8'), 'outside');
  });

  await t.test('unsupported runtime file', () => {
    const root = makeRoot(t);
    writeLock(root);
    fs.writeFileSync(runtimePath(root, '.workflow-evil.tmp.bak'), 'unsupported');

    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: TOKEN,
          hostname: () => HOST,
          isProcessAlive: () => false,
        }),
      /unsupported.*events/i,
    );
  });

  await t.test('orphan matching temp without lock', () => {
    const root = makeRoot(t);
    fs.mkdirSync(eventsPath(root), { recursive: true });
    fs.writeFileSync(runtimePath(root, `.workflow-${TOKEN}.tmp`), 'orphan');

    assert.throws(
      () =>
        recoverRuntimeFiles({
          root,
          initiativeId: INITIATIVE_ID,
          token: TOKEN,
          hostname: () => HOST,
          isProcessAlive: () => false,
        }),
      /orphan.*lock/i,
    );
    assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), true);
  });
});

void test('recovery refuses embedded relative and absolute runtime path references', async (t) => {
  for (const referenceKind of ['relative', 'absolute']) {
    await t.test(referenceKind, () => {
      const root = makeRoot(t);
      const tempRelative = path.posix.join(
        'docs/superpowers/initiatives',
        INITIATIVE_ID,
        `events/.workflow-${TOKEN}.tmp`,
      );
      const referencedPath =
        referenceKind === 'relative' ? tempRelative : path.join(root, tempRelative);
      const event = createdEvent({
        payload: {
          title: `Do not remove the runtime artifact at ${referencedPath} while referenced.`,
          branch: 'refactor/store-test',
          baseSha: '1'.repeat(40),
        },
      });
      writeEvent(root, event);
      writeLock(root);
      fs.writeFileSync(runtimePath(root, `.workflow-${TOKEN}.tmp`), 'owned temp');

      assert.throws(
        () =>
          recoverRuntimeFiles({
            root,
            initiativeId: INITIATIVE_ID,
            token: TOKEN,
            machine,
            hostname: () => HOST,
            isProcessAlive: () => false,
          }),
        /committed event.*runtime path/i,
      );
      assert.equal(fs.existsSync(runtimePath(root, '.workflow.lock')), true);
      assert.equal(fs.existsSync(runtimePath(root, `.workflow-${TOKEN}.tmp`)), true);
      assert.equal(fs.existsSync(eventPath(root, event)), true);
    });
  }
});
