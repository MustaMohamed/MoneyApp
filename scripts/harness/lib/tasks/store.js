const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { resolveInside } = require('../paths');
const {
  canonicalStringify,
  finalizeHashedObject,
  parseCanonicalJson,
  verifyCanonicalHashedObject,
} = require('../workflow/canonical');
const { replayTaskEvents } = require('./projection');
const { validateTaskEventEnvelope, validateTaskEventPayload } = require('./schema');

const EVENT_FILENAME = /^(\d{6})-([a-f0-9]{64})\.json$/;
const TEMP_FILENAME = /^\.tasks-([a-f0-9]{32})\.tmp$/;
const TOKEN = /^[a-f0-9]{32}$/;
const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOCK_NAME = '.tasks.lock';

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireInitiativeId(value) {
  const match = typeof value === 'string' ? value.match(INITIATIVE_ID) : undefined;
  if (!match) throw new Error('Initiative ID must be a lowercase YYYY-MM-DD slug');
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Initiative ID must start with a valid calendar date');
  }
}

function requireToken(value) {
  if (typeof value !== 'string' || !TOKEN.test(value)) {
    throw new Error('Task recovery token must be 32-character lowercase hexadecimal');
  }
  return value;
}

function assertRoot(root, fsImpl) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root) {
    throw new Error('Repository root must be a normalized absolute path');
  }
  const stats = fsImpl.lstatSync(root);
  if (stats.isSymbolicLink() || !stats.isDirectory() || fsImpl.realpathSync(root) !== root) {
    throw new Error('Repository root must be a canonical physical directory');
  }
}

function taskPaths(root, initiativeId, token) {
  const eventsRelative = path.posix.join(
    'docs/superpowers/initiatives',
    initiativeId,
    'task-events',
  );
  const lockRelative = path.posix.join(eventsRelative, LOCK_NAME);
  const tempName = token === undefined ? undefined : `.tasks-${token}.tmp`;
  const tempRelative =
    tempName === undefined ? undefined : path.posix.join(eventsRelative, tempName);
  return {
    eventsRelative,
    eventsPath: resolveInside(root, eventsRelative),
    lockRelative,
    lockPath: resolveInside(root, lockRelative),
    tempName,
    tempRelative,
    tempPath: tempRelative === undefined ? undefined : resolveInside(root, tempRelative),
  };
}

function exists(target, fsImpl) {
  try {
    fsImpl.lstatSync(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function sameInode(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function sameFile(left, right) {
  return sameInode(left, right) && left.size === right.size && left.mtimeMs === right.mtimeMs;
}

function readExactFile(target, label, fsImpl) {
  const before = fsImpl.lstatSync(target);
  if (before.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link`);
  if (!before.isFile()) throw new Error(`${label} must be a regular file`);
  let descriptor;
  try {
    descriptor = fsImpl.openSync(
      target,
      fsImpl.constants.O_RDONLY | (fsImpl.constants.O_NOFOLLOW ?? 0),
    );
    const opened = fsImpl.fstatSync(descriptor);
    if (!sameFile(before, opened)) throw new Error(`${label} changed while opening`);
    const bytes = fsImpl.readFileSync(descriptor);
    const after = fsImpl.fstatSync(descriptor);
    const current = fsImpl.lstatSync(target);
    if (!sameFile(opened, after) || !sameFile(opened, current)) {
      throw new Error(`${label} changed while reading`);
    }
    return { bytes, identity: opened };
  } finally {
    if (descriptor !== undefined) fsImpl.closeSync(descriptor);
  }
}

function ensureEventsDirectory(root, initiativeId, fsImpl) {
  const initial = taskPaths(root, initiativeId);
  fsImpl.mkdirSync(initial.eventsPath, { recursive: true });
  const paths = taskPaths(root, initiativeId);
  const stats = fsImpl.lstatSync(paths.eventsPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Task events path must be a real directory');
  }
  return paths;
}

function classifyEntries(eventsPath, fsImpl) {
  const events = [];
  const runtime = [];
  for (const entry of fsImpl.readdirSync(eventsPath, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) {
      throw new Error(`Task ledger entry must not be a symbolic link: ${entry.name}`);
    }
    if (!entry.isFile()) {
      throw new Error(`Unsupported entry in task events directory: ${entry.name}`);
    }
    const match = entry.name.match(EVENT_FILENAME);
    if (match) {
      events.push({
        name: entry.name,
        path: path.join(eventsPath, entry.name),
        filenameSequence: Number(match[1]),
        filenameHash: match[2],
      });
    } else if (entry.name === LOCK_NAME || TEMP_FILENAME.test(entry.name)) {
      runtime.push({ name: entry.name, path: path.join(eventsPath, entry.name) });
    } else if (/^\d{6}-.*\.json$/u.test(entry.name)) {
      throw new Error(`Unsupported event filename: ${entry.name}`);
    } else {
      throw new Error(`Unsupported entry in task events directory: ${entry.name}`);
    }
  }
  return { events, runtime };
}

function inspectTaskFiles({
  root,
  initiativeId,
  graph,
  initiativeProjection,
  resolveGraph,
  fsImpl,
}) {
  const paths = taskPaths(root, initiativeId);
  if (!exists(paths.eventsPath, fsImpl)) {
    return {
      activationGraph: graph,
      events: [],
      paths: [],
      projection: undefined,
      runtimeEntries: [],
    };
  }
  const stats = fsImpl.lstatSync(paths.eventsPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Task events path must be a real directory');
  }
  const classified = classifyEntries(paths.eventsPath, fsImpl);
  const records = classified.events.map((entry) => {
    const { bytes } = readExactFile(entry.path, 'Task event', fsImpl);
    const event = verifyCanonicalHashedObject(bytes, 'eventHash', 'Task event');
    validateTaskEventEnvelope(event);
    validateTaskEventPayload(event, { initiativeId });
    if (event.sequence !== entry.filenameSequence) {
      throw new Error('Task event filename sequence does not match event sequence');
    }
    if (event.eventHash !== entry.filenameHash) {
      throw new Error('Task event filename hash does not match event hash');
    }
    return { ...entry, event };
  });
  records.sort(
    (left, right) =>
      left.filenameSequence - right.filenameSequence || compareCodeUnits(left.name, right.name),
  );
  const sequences = new Set();
  const hashes = new Set();
  for (const [index, record] of records.entries()) {
    if (sequences.has(record.event.sequence)) {
      throw new Error(`Task ledger has duplicate sequence ${record.event.sequence} (fork)`);
    }
    if (hashes.has(record.event.eventHash)) {
      throw new Error(`Task ledger has duplicate event hash ${record.event.eventHash}`);
    }
    sequences.add(record.event.sequence);
    hashes.add(record.event.eventHash);
    if (record.event.sequence !== index + 1) {
      throw new Error(
        `Task ledger must be contiguous: expected ${index + 1}, received ${record.event.sequence}`,
      );
    }
    if (index > 0) {
      const parent = records[index - 1].event;
      if (
        record.event.parent.sequence !== parent.sequence ||
        record.event.parent.eventHash !== parent.eventHash
      ) {
        throw new Error(`Task event ${record.event.sequence} parent chain is invalid`);
      }
    }
  }
  const events = records.map((record) => record.event);
  let activationGraph = graph;
  if (events.length > 0 && events[0].payload.graphHash !== graph.graphHash) {
    activationGraph = resolveGraph?.(
      events[0].payload.graphHash,
      events[0].payload.taskGraph,
      events[0].payload.plan,
    );
    if (!activationGraph) {
      throw new Error(`Cannot resolve activated task graph ${events[0].payload.graphHash}`);
    }
  }
  const projection =
    events.length === 0
      ? undefined
      : replayTaskEvents({
          graph: activationGraph,
          events,
          initiativeProjection,
          resolveGraph,
        });
  return {
    activationGraph,
    events,
    paths: records.map((record) => record.path),
    projection,
    runtimeEntries: classified.runtime,
  };
}

function loadTaskHistory({
  root,
  initiativeId,
  graph,
  initiativeProjection,
  resolveGraph,
  fsImpl = fs,
}) {
  assertRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  return inspectTaskFiles({
    root,
    initiativeId,
    graph,
    initiativeProjection,
    resolveGraph,
    fsImpl,
  });
}

function parseLock(bytes) {
  const lock = parseCanonicalJson(bytes, 'Task lock');
  const keys = Object.keys(lock).sort(compareCodeUnits);
  if (
    keys.length !== 4 ||
    keys[0] !== 'host' ||
    keys[1] !== 'pid' ||
    keys[2] !== 'recordedAt' ||
    keys[3] !== 'token'
  ) {
    throw new Error('Task lock fields must be exactly host, pid, recordedAt, token');
  }
  if (typeof lock.host !== 'string' || lock.host.trim().length === 0) {
    throw new Error('Task lock host must be nonempty');
  }
  if (!Number.isSafeInteger(lock.pid) || lock.pid < 1) {
    throw new Error('Task lock PID must be a positive safe integer');
  }
  if (
    typeof lock.recordedAt !== 'string' ||
    !TIMESTAMP.test(lock.recordedAt) ||
    Number.isNaN(Date.parse(lock.recordedAt)) ||
    new Date(lock.recordedAt).toISOString() !== lock.recordedAt
  ) {
    throw new Error('Task lock recordedAt must be a canonical UTC timestamp');
  }
  requireToken(lock.token);
  return lock;
}

function syncDirectory(directory, fsImpl) {
  const descriptor = fsImpl.openSync(directory, fsImpl.constants.O_RDONLY);
  try {
    fsImpl.fsyncSync(descriptor);
  } finally {
    fsImpl.closeSync(descriptor);
  }
}

function unlinkOwned(target, identity, fsImpl) {
  if (!identity || !exists(target, fsImpl)) return false;
  const current = fsImpl.lstatSync(target);
  if (current.isSymbolicLink() || !current.isFile() || !sameInode(identity, current)) {
    return false;
  }
  fsImpl.unlinkSync(target);
  return true;
}

function requireDraft(draft) {
  if (
    typeof draft !== 'object' ||
    draft === null ||
    Array.isArray(draft) ||
    Object.getPrototypeOf(draft) !== Object.prototype
  ) {
    throw new Error('Task event draft must be a plain object');
  }
  for (const field of ['schemaVersion', 'initiativeId', 'sequence', 'parent', 'eventHash']) {
    if (Object.hasOwn(draft, field)) {
      throw new Error(`Task event draft must not override ${field}`);
    }
  }
}

function appendTaskEvent({
  root,
  initiativeId,
  expectedSequence,
  draft,
  graph,
  initiativeProjection,
  resolveGraph,
  validateCurrent,
  fsImpl = fs,
  hostname = os.hostname,
  pid = process.pid,
  token = () => crypto.randomBytes(16).toString('hex'),
}) {
  assertRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  requireDraft(draft);
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 1) {
    throw new Error('Expected sequence must be a positive safe integer');
  }
  if (validateCurrent !== undefined && typeof validateCurrent !== 'function') {
    throw new Error('validateCurrent must be a function');
  }
  const recoveryToken = requireToken(token());
  const paths = ensureEventsDirectory(root, initiativeId, fsImpl);
  const runtime = taskPaths(root, initiativeId, recoveryToken);
  let lockDescriptor;
  let lockIdentity;
  let tempDescriptor;
  let tempIdentity;
  let ownsLock = false;
  let ownsTemp = false;
  let installed = false;
  let finalPath;

  try {
    try {
      lockDescriptor = fsImpl.openSync(paths.lockPath, 'wx');
      ownsLock = true;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const lock = parseLock(readExactFile(paths.lockPath, 'Task lock', fsImpl).bytes);
      throw new Error(
        `Task initiative ${initiativeId} is locked by PID ${lock.pid} on ${lock.host} (token ${lock.token})`,
        { cause: error },
      );
    }
    const lock = {
      host: hostname(),
      pid,
      recordedAt: new Date(draft.recordedAt).toISOString(),
      token: recoveryToken,
    };
    const lockBytes = canonicalStringify(lock);
    parseLock(Buffer.from(lockBytes));
    fsImpl.writeFileSync(lockDescriptor, lockBytes);
    fsImpl.fsyncSync(lockDescriptor);
    lockIdentity = fsImpl.fstatSync(lockDescriptor);
    fsImpl.closeSync(lockDescriptor);
    lockDescriptor = undefined;
    syncDirectory(paths.eventsPath, fsImpl);

    const history = inspectTaskFiles({
      root,
      initiativeId,
      graph,
      initiativeProjection,
      resolveGraph,
      fsImpl,
    });
    const nextSequence = history.events.length + 1;
    if (expectedSequence !== nextSequence) {
      throw new Error(
        `Stale expected sequence: expected ${nextSequence}, received ${expectedSequence}`,
      );
    }
    if (validateCurrent) validateCurrent({ history, nextSequence });
    const parent = history.events.at(-1);
    const event = finalizeHashedObject(
      {
        schemaVersion: 1,
        ...draft,
        initiativeId,
        sequence: nextSequence,
        ...(parent ? { parent: { sequence: parent.sequence, eventHash: parent.eventHash } } : {}),
      },
      'eventHash',
    );
    validateTaskEventEnvelope(event);
    validateTaskEventPayload(event, { initiativeId });
    replayTaskEvents({
      graph: history.activationGraph,
      events: [...history.events, event],
      initiativeProjection,
      resolveGraph,
    });

    const bytes = canonicalStringify(event);
    finalPath = path.join(
      paths.eventsPath,
      `${String(event.sequence).padStart(6, '0')}-${event.eventHash}.json`,
    );
    tempDescriptor = fsImpl.openSync(runtime.tempPath, 'wx');
    ownsTemp = true;
    fsImpl.writeFileSync(tempDescriptor, bytes);
    fsImpl.fsyncSync(tempDescriptor);
    tempIdentity = fsImpl.fstatSync(tempDescriptor);
    fsImpl.closeSync(tempDescriptor);
    tempDescriptor = undefined;
    fsImpl.linkSync(runtime.tempPath, finalPath);
    installed = true;
    if (!sameInode(tempIdentity, fsImpl.lstatSync(finalPath))) {
      throw new Error('Installed task event does not match the temporary file identity');
    }
    syncDirectory(paths.eventsPath, fsImpl);
    if (!unlinkOwned(runtime.tempPath, tempIdentity, fsImpl)) {
      throw new Error('Task temporary file changed before cleanup');
    }
    ownsTemp = false;
    syncDirectory(paths.eventsPath, fsImpl);
    return { event, path: finalPath };
  } finally {
    if (lockDescriptor !== undefined) fsImpl.closeSync(lockDescriptor);
    if (tempDescriptor !== undefined) fsImpl.closeSync(tempDescriptor);
    if (ownsTemp && !installed && unlinkOwned(runtime.tempPath, tempIdentity, fsImpl)) {
      ownsTemp = false;
    }
    if (ownsLock && lockIdentity && !ownsTemp) {
      unlinkOwned(paths.lockPath, lockIdentity, fsImpl);
      syncDirectory(paths.eventsPath, fsImpl);
    }
  }
}

function defaultIsProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

function recoverTaskRuntimeFiles({
  root,
  initiativeId,
  token,
  graph,
  initiativeProjection,
  resolveGraph,
  fsImpl = fs,
  hostname = os.hostname,
  isProcessAlive = defaultIsProcessAlive,
  dryRun = false,
}) {
  assertRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  requireToken(token);
  const paths = taskPaths(root, initiativeId, token);
  if (!exists(paths.eventsPath, fsImpl)) {
    return { status: 'not_found', removed: [], wouldRemove: [] };
  }
  inspectTaskFiles({
    root,
    initiativeId,
    graph,
    initiativeProjection,
    resolveGraph,
    fsImpl,
  });
  const lockExists = exists(paths.lockPath, fsImpl);
  const tempExists = exists(paths.tempPath, fsImpl);
  if (!lockExists) {
    if (tempExists)
      throw new Error('Cannot recover an orphan task temporary file without its lock');
    return { status: 'not_found', removed: [], wouldRemove: [] };
  }
  const lockRead = readExactFile(paths.lockPath, 'Task lock', fsImpl);
  const lock = parseLock(lockRead.bytes);
  if (lock.token !== token) {
    throw new Error(`Task lock token ${lock.token} does not match recovery token ${token}`);
  }
  if (lock.host === hostname() && isProcessAlive(lock.pid)) {
    throw new Error(`Task lock process ${lock.pid} is still alive on ${lock.host}`);
  }
  const tempRead = tempExists
    ? readExactFile(paths.tempPath, 'Task temporary file', fsImpl)
    : undefined;
  const wouldRemove = [...(tempExists ? [paths.tempRelative] : []), paths.lockRelative];
  if (dryRun) return { status: 'dry_run', removed: [], wouldRemove };

  const removed = [];
  if (tempRead) {
    if (!unlinkOwned(paths.tempPath, tempRead.identity, fsImpl)) {
      throw new Error('Task temporary file changed before recovery');
    }
    removed.push(paths.tempRelative);
  }
  if (!unlinkOwned(paths.lockPath, lockRead.identity, fsImpl)) {
    throw new Error('Task lock changed before recovery');
  }
  removed.push(paths.lockRelative);
  syncDirectory(paths.eventsPath, fsImpl);
  return { status: 'recovered', removed, wouldRemove };
}

module.exports = {
  appendTaskEvent,
  loadTaskHistory,
  recoverTaskRuntimeFiles,
};
