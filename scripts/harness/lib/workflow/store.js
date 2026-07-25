const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const { resolveInside } = require('../paths');
const { canonicalStringify, finalizeEvent, verifyCanonicalEvent } = require('./canonical');
const { replayEvents } = require('./projection');
const { validateEventEnvelope, validateEventPayload, validateMachine } = require('./schema');

const EVENT_FILENAME = /^(\d{6})-([a-f0-9]{64})\.json$/;
const TEMP_FILENAME = /^\.workflow-([a-f0-9]{32})\.tmp$/;
const RECOVERY_TOKEN = /^[a-f0-9]{32}$/;
const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOCK_NAME = '.workflow.lock';
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

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
  return value;
}

function requireRecoveryToken(value) {
  if (typeof value !== 'string' || !RECOVERY_TOKEN.test(value)) {
    throw new Error('Recovery token must be 32-character lowercase hexadecimal');
  }
  return value;
}

function assertRepositoryRoot(root, fsImpl) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root) {
    throw new Error('Repository root must be a normalized absolute path');
  }
  const stats = fsImpl.lstatSync(root);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Repository root must be a real directory, not a symbolic link');
  }
  if (fsImpl.realpathSync(root) !== root) {
    throw new Error('Repository root must be its canonical physical path');
  }
  return root;
}

function workflowPaths(root, initiativeId, token) {
  const eventsRelative = path.posix.join('docs/superpowers/initiatives', initiativeId, 'events');
  const lockRelative = path.posix.join(eventsRelative, LOCK_NAME);
  const tempName = token === undefined ? undefined : `.workflow-${token}.tmp`;
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

function exists(fsImpl, target) {
  try {
    fsImpl.lstatSync(target);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

function sameFile(left, right) {
  return (
    left.dev === right.dev &&
    left.ino === right.ino &&
    left.size === right.size &&
    left.mtimeMs === right.mtimeMs
  );
}

function sameInode(left, right) {
  return left.dev === right.dev && left.ino === right.ino;
}

function fileIdentity(stats) {
  return {
    dev: stats.dev,
    ino: stats.ino,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
  };
}

function readExactRegularFile(target, label, fsImpl) {
  const before = fsImpl.lstatSync(target);
  if (before.isSymbolicLink()) {
    throw new Error(`${label} must not be a symbolic link: ${target}`);
  }
  if (!before.isFile()) {
    throw new Error(`${label} must be a regular file: ${target}`);
  }

  let descriptor;
  try {
    const noFollow = fsImpl.constants.O_NOFOLLOW ?? 0;
    descriptor = fsImpl.openSync(target, fsImpl.constants.O_RDONLY | noFollow);
    const opened = fsImpl.fstatSync(descriptor);
    if (!opened.isFile() || !sameFile(before, opened)) {
      throw new Error(`${label} changed while opening: ${target}`);
    }
    const bytes = fsImpl.readFileSync(descriptor);
    const after = fsImpl.fstatSync(descriptor);
    const current = fsImpl.lstatSync(target);
    if (!sameFile(opened, after) || !sameFile(opened, current)) {
      throw new Error(`${label} changed while reading: ${target}`);
    }
    return { bytes, identity: fileIdentity(opened) };
  } finally {
    if (descriptor !== undefined) fsImpl.closeSync(descriptor);
  }
}

function ensureEventsDirectory(root, initiativeId, fsImpl) {
  const paths = workflowPaths(root, initiativeId);
  fsImpl.mkdirSync(paths.eventsPath, { recursive: true });
  const checked = workflowPaths(root, initiativeId);
  const stats = fsImpl.lstatSync(checked.eventsPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Workflow events path must be a real directory');
  }
  return checked;
}

function assertEventsDirectory(eventsPath, fsImpl) {
  const stats = fsImpl.lstatSync(eventsPath);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Workflow events path must be a real directory');
  }
}

function classifyEntries(eventsPath, fsImpl) {
  const eventEntries = [];
  const runtimeEntries = [];
  for (const entry of fsImpl.readdirSync(eventsPath, { withFileTypes: true })) {
    const target = path.join(eventsPath, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Workflow events entry must not be a symbolic link: ${entry.name}`);
    }
    if (!entry.isFile()) {
      throw new Error(
        `Unsupported entry in events directory (regular file required): ${entry.name}`,
      );
    }

    const eventMatch = entry.name.match(EVENT_FILENAME);
    if (eventMatch) {
      eventEntries.push({
        name: entry.name,
        path: target,
        filenameSequence: Number(eventMatch[1]),
        filenameHash: eventMatch[2],
      });
      continue;
    }
    if (entry.name === LOCK_NAME || TEMP_FILENAME.test(entry.name)) {
      runtimeEntries.push({ name: entry.name, path: target });
      continue;
    }
    if (/^\d{6}-.*\.json$/.test(entry.name)) {
      throw new Error(`Unsupported event filename: ${entry.name}`);
    }
    throw new Error(`Unsupported entry in events directory: ${entry.name}`);
  }
  return { eventEntries, runtimeEntries };
}

function inspectEventFiles({ root, initiativeId, machine, fsImpl }) {
  assertRepositoryRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  if (machine !== undefined) validateMachine(machine);
  const paths = workflowPaths(root, initiativeId);
  if (!exists(fsImpl, paths.eventsPath)) {
    return { events: [], paths: [], projection: undefined, runtimeEntries: [] };
  }
  assertEventsDirectory(paths.eventsPath, fsImpl);

  const { eventEntries, runtimeEntries } = classifyEntries(paths.eventsPath, fsImpl);
  const records = eventEntries.map((entry) => {
    const { bytes } = readExactRegularFile(entry.path, 'Workflow event', fsImpl);
    const event = verifyCanonicalEvent(bytes);
    if (machine !== undefined) {
      validateEventEnvelope(event, machine);
      validateEventPayload(event, { initiativeId });
    } else if (event.initiativeId !== initiativeId) {
      throw new Error(
        `Event initiative ID ${String(event.initiativeId)} does not match directory initiative ID ${initiativeId}`,
      );
    }
    return { ...entry, event };
  });

  const hashes = new Set();
  for (const record of records) {
    if (hashes.has(record.event.eventHash)) {
      throw new Error(`Workflow ledger has duplicate event hash ${record.event.eventHash}`);
    }
    hashes.add(record.event.eventHash);
  }
  for (const record of records) {
    if (record.filenameSequence !== record.event.sequence) {
      throw new Error(
        `Event filename sequence ${record.filenameSequence} does not match envelope sequence ${record.event.sequence}`,
      );
    }
    if (record.filenameHash !== record.event.eventHash) {
      throw new Error(
        `Event filename hash ${record.filenameHash} does not match event hash ${record.event.eventHash}`,
      );
    }
  }

  records.sort(
    (left, right) =>
      left.filenameSequence - right.filenameSequence || compareCodeUnits(left.name, right.name),
  );
  const seenSequences = new Set();
  for (const [index, record] of records.entries()) {
    if (seenSequences.has(record.event.sequence)) {
      throw new Error(
        `Workflow ledger has duplicate sequence ${record.event.sequence} (multiple children/fork)`,
      );
    }
    seenSequences.add(record.event.sequence);
    const expected = index + 1;
    if (record.event.sequence !== expected) {
      throw new Error(
        `Workflow ledger must be contiguous: expected sequence ${expected}, received ${record.event.sequence}`,
      );
    }
    if (index > 0) {
      const parent = records[index - 1].event;
      if (record.event.parent?.sequence !== parent.sequence) {
        throw new Error(
          `Event sequence ${record.event.sequence} parent sequence does not match sequence ${parent.sequence}`,
        );
      }
      if (record.event.parent?.eventHash !== parent.eventHash) {
        throw new Error(
          `Event sequence ${record.event.sequence} parent hash does not match sequence ${parent.sequence}`,
        );
      }
    }
  }

  const events = records.map(({ event }) => event);
  const projection =
    events.length === 0 || machine === undefined ? undefined : replayEvents(machine, events);
  return {
    events,
    paths: records.map((record) => record.path),
    projection,
    runtimeEntries,
  };
}

function loadEventHistory({ root, initiativeId, machine, fsImpl = fs }) {
  const { events, paths, projection } = inspectEventFiles({
    root,
    initiativeId,
    machine,
    fsImpl,
  });
  return { events, paths, projection };
}

function parseCanonicalLock(bytes) {
  let source;
  try {
    source = UTF8_DECODER.decode(bytes);
  } catch {
    throw new Error('Workflow lock contains invalid UTF-8');
  }
  let metadata;
  try {
    metadata = JSON.parse(source);
  } catch (error) {
    throw new Error(`Workflow lock contains invalid JSON: ${error.message}`);
  }
  if (
    metadata === null ||
    Array.isArray(metadata) ||
    typeof metadata !== 'object' ||
    Object.getPrototypeOf(metadata) !== Object.prototype
  ) {
    throw new Error('Workflow lock metadata must be a plain object');
  }
  const keys = Object.keys(metadata).sort(compareCodeUnits);
  const expectedKeys = ['host', 'pid', 'recordedAt', 'token'];
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key, index) => key !== expectedKeys[index])
  ) {
    throw new Error('Workflow lock metadata fields must be exactly host, pid, recordedAt, token');
  }
  if (typeof metadata.host !== 'string' || metadata.host.trim().length === 0) {
    throw new Error('Workflow lock host must be a nonempty string');
  }
  if (!Number.isSafeInteger(metadata.pid) || metadata.pid <= 0) {
    throw new Error('Workflow lock PID must be a positive safe integer');
  }
  if (
    typeof metadata.recordedAt !== 'string' ||
    !TIMESTAMP.test(metadata.recordedAt) ||
    Number.isNaN(Date.parse(metadata.recordedAt)) ||
    new Date(metadata.recordedAt).toISOString() !== metadata.recordedAt
  ) {
    throw new Error('Workflow lock recordedAt must be a canonical UTC timestamp');
  }
  requireRecoveryToken(metadata.token);
  if (source !== canonicalStringify(metadata)) {
    throw new Error('Workflow lock metadata must use canonical JSON bytes');
  }
  return metadata;
}

function readLock(lockPath, fsImpl) {
  const { bytes, identity } = readExactRegularFile(lockPath, 'Workflow lock', fsImpl);
  return { metadata: parseCanonicalLock(bytes), identity };
}

function unlinkOwnedFile(target, identity, fsImpl) {
  if (!identity) return false;
  let current;
  try {
    current = fsImpl.lstatSync(target);
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
  if (current.isSymbolicLink() || !current.isFile() || !sameInode(identity, current)) {
    return false;
  }
  fsImpl.unlinkSync(target);
  return true;
}

function closeBestEffort(descriptor, fsImpl) {
  if (descriptor === undefined) return undefined;
  try {
    fsImpl.closeSync(descriptor);
    return undefined;
  } catch (error) {
    return error;
  }
}

function directoryOperationError(phase, operation, error, directorySynced) {
  const wrapped = new Error(`Workflow ${phase} directory ${operation} failed: ${error.message}`, {
    cause: error,
  });
  wrapped.directoryPhase = phase;
  wrapped.directoryOperation = operation;
  wrapped.directorySynced = directorySynced;
  return wrapped;
}

function syncDirectory(target, phase, fsImpl) {
  let descriptor;
  try {
    descriptor = fsImpl.openSync(target, fsImpl.constants.O_RDONLY);
  } catch (error) {
    throw directoryOperationError(phase, 'open', error, false);
  }

  let syncFailure;
  try {
    fsImpl.fsyncSync(descriptor);
  } catch (error) {
    syncFailure = error;
  }
  const closeFailure = closeBestEffort(descriptor, fsImpl);
  if (syncFailure && closeFailure) {
    const combined = new AggregateError(
      [syncFailure, closeFailure],
      `Workflow ${phase} directory fsync and close failed: ${syncFailure.message}; ${closeFailure.message}`,
    );
    combined.directoryPhase = phase;
    combined.directorySynced = false;
    throw combined;
  }
  if (syncFailure) {
    throw directoryOperationError(phase, 'fsync', syncFailure, false);
  }
  if (closeFailure) {
    throw directoryOperationError(phase, 'close', closeFailure, true);
  }
}

function durabilityError(error, committedPath) {
  const wrapped = new Error(
    `Workflow event was installed but durability is uncertain: ${error.message}`,
    { cause: error },
  );
  wrapped.durableUncertain = true;
  wrapped.committedPath = committedPath;
  return wrapped;
}

function recoveryDetails(initiativeId, token, paths, residuePaths) {
  return {
    initiativeId,
    token,
    lockPath: paths.lockRelative,
    tempPath: paths.tempRelative,
    residuePaths,
    command: `npm run workflow -- recover --id ${initiativeId} --token ${token}`,
  };
}

function errorMessages(error) {
  if (error instanceof AggregateError) {
    return error.errors.flatMap((entry) => errorMessages(entry));
  }
  return [error.message];
}

function manualInterventionDetails(residuePaths, failures) {
  return {
    status: 'manual_intervention_required',
    residuePaths,
    causes: failures.flatMap((error) => errorMessages(error)),
  };
}

function combineAppendFailures({
  primary,
  cleanupFailures,
  installed,
  finalPath,
  initiativeId,
  token,
  paths,
  residuePaths,
  recoveryPreconditionsVerified,
  recoveryPreconditionFailure,
  commitDurable,
}) {
  const failures = [primary, ...cleanupFailures].filter(Boolean);
  let combined;
  if (failures.length > 1) {
    combined = new AggregateError(
      failures,
      `Workflow append failed with ${failures.length} errors: ${failures
        .map((error) => error.message)
        .join('; ')}`,
    );
  } else {
    [combined] = failures;
  }
  if (installed && !commitDurable && !combined.durableUncertain) {
    combined = durabilityError(combined, finalPath);
    if (failures.length > 1) combined.errors = failures;
  } else if (commitDurable) {
    combined.committedPath = finalPath;
  }
  if (residuePaths.length > 0 && recoveryPreconditionsVerified) {
    combined.recovery = recoveryDetails(initiativeId, token, paths, residuePaths);
  } else if (residuePaths.length > 0) {
    combined.manualIntervention = manualInterventionDetails(
      residuePaths,
      [...failures, recoveryPreconditionFailure].filter(Boolean),
    );
  }
  return combined;
}

function requireDraft(draft) {
  if (
    draft === null ||
    Array.isArray(draft) ||
    typeof draft !== 'object' ||
    Object.getPrototypeOf(draft) !== Object.prototype
  ) {
    throw new Error('Event draft must be a plain object');
  }
  for (const field of ['initiativeId', 'sequence', 'parent', 'eventHash']) {
    if (Object.hasOwn(draft, field)) {
      throw new Error(`Event draft must not override ${field}`);
    }
  }
  return draft;
}

function appendEvent({
  root,
  initiativeId,
  expectedSequence,
  draft,
  machine,
  fsImpl = fs,
  clock = () => new Date().toISOString(),
  hostname = os.hostname,
  pid = process.pid,
  token = () => crypto.randomBytes(16).toString('hex'),
}) {
  assertRepositoryRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  validateMachine(machine);
  requireDraft(draft);
  if (!Number.isSafeInteger(expectedSequence) || expectedSequence < 1) {
    throw new Error('Expected sequence must be a positive safe integer');
  }
  const recoveryToken = requireRecoveryToken(token());
  const paths = ensureEventsDirectory(root, initiativeId, fsImpl);
  const tempPaths = workflowPaths(root, initiativeId, recoveryToken);

  let lockDescriptor;
  let lockIdentity;
  let ownsLock = false;
  let lockRecoveryVerified = false;
  let tempDescriptor;
  let tempIdentity;
  let ownsTemp = false;
  const preservation = {
    lock: false,
    temp: false,
  };
  let installed = false;
  let commitDurable = false;
  let finalPath;
  let result;
  let failure;
  let tempCleanupPreventedLockCleanup = false;
  const cleanupFailures = [];

  try {
    try {
      lockDescriptor = fsImpl.openSync(paths.lockPath, 'wx');
      ownsLock = true;
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      const lock = readLock(paths.lockPath, fsImpl).metadata;
      const contention = new Error(
        `Workflow initiative ${initiativeId} is locked by PID ${lock.pid} on ${lock.host} (token ${lock.token})`,
        { cause: error },
      );
      contention.lock = lock;
      throw contention;
    }
    const lock = {
      host: hostname(),
      pid,
      recordedAt: clock(),
      token: recoveryToken,
    };
    const lockBytes = canonicalStringify(lock);
    parseCanonicalLock(Buffer.from(lockBytes, 'utf8'));
    try {
      lockIdentity = fileIdentity(fsImpl.fstatSync(lockDescriptor));
    } catch (error) {
      preservation.lock = true;
      try {
        fsImpl.writeFileSync(lockDescriptor, lockBytes);
        fsImpl.fsyncSync(lockDescriptor);
        lockRecoveryVerified = true;
      } catch (fallbackError) {
        preservation.lock = false;
        throw new AggregateError(
          [error, fallbackError],
          `Workflow lock identity and fallback persistence failed: ${error.message}; ${fallbackError.message}`,
        );
      }
      throw error;
    }
    fsImpl.writeFileSync(lockDescriptor, lockBytes);
    fsImpl.fsyncSync(lockDescriptor);
    lockRecoveryVerified = true;
    fsImpl.closeSync(lockDescriptor);
    lockDescriptor = undefined;
    syncDirectory(paths.eventsPath, 'lock persistence', fsImpl);

    const history = loadEventHistory({ root, initiativeId, machine, fsImpl });
    const nextSequence = history.events.length + 1;
    if (expectedSequence !== nextSequence) {
      throw new Error(
        `Stale expected sequence: expected ${nextSequence}, received ${expectedSequence}`,
      );
    }
    const parent = history.events.at(-1);
    const event = finalizeEvent({
      schemaVersion: 1,
      ...draft,
      initiativeId,
      sequence: nextSequence,
      ...(parent ? { parent: { sequence: parent.sequence, eventHash: parent.eventHash } } : {}),
    });
    validateEventEnvelope(event, machine);
    validateEventPayload(event, { initiativeId });
    replayEvents(machine, [...history.events, event]);

    const bytes = canonicalStringify(event);
    finalPath = path.join(
      paths.eventsPath,
      `${String(event.sequence).padStart(6, '0')}-${event.eventHash}.json`,
    );
    tempDescriptor = fsImpl.openSync(tempPaths.tempPath, 'wx');
    ownsTemp = true;
    try {
      tempIdentity = fileIdentity(fsImpl.fstatSync(tempDescriptor));
    } catch (error) {
      preservation.temp = true;
      try {
        fsImpl.writeFileSync(tempDescriptor, bytes);
        fsImpl.fsyncSync(tempDescriptor);
      } catch (fallbackError) {
        preservation.temp = false;
        throw new AggregateError(
          [error, fallbackError],
          `Workflow temp identity and fallback persistence failed: ${error.message}; ${fallbackError.message}`,
        );
      }
      throw error;
    }
    fsImpl.writeFileSync(tempDescriptor, bytes);
    fsImpl.fsyncSync(tempDescriptor);
    fsImpl.closeSync(tempDescriptor);
    tempDescriptor = undefined;

    fsImpl.linkSync(tempPaths.tempPath, finalPath);
    installed = true;
    const installedStats = fsImpl.lstatSync(finalPath);
    if (
      installedStats.isSymbolicLink() ||
      !installedStats.isFile() ||
      !sameInode(tempIdentity, installedStats)
    ) {
      throw new Error('Workflow final event must be a hard link to the captured temp identity');
    }
    try {
      syncDirectory(paths.eventsPath, 'final commit', fsImpl);
      commitDurable = true;
    } catch (error) {
      if (error.directorySynced) commitDurable = true;
      throw error;
    }

    const removedTemp = unlinkOwnedFile(tempPaths.tempPath, tempIdentity, fsImpl);
    if (removedTemp) {
      ownsTemp = false;
      tempIdentity = undefined;
    } else if (exists(fsImpl, tempPaths.tempPath)) {
      ownsTemp = false;
      throw new Error(`Workflow temporary file changed before cleanup: ${tempPaths.tempRelative}`);
    } else {
      ownsTemp = false;
      tempIdentity = undefined;
    }
    result = event;
  } catch (error) {
    failure = error;
  } finally {
    if (ownsTemp && !tempIdentity && !preservation.temp && tempDescriptor !== undefined) {
      try {
        tempIdentity = fileIdentity(fsImpl.fstatSync(tempDescriptor));
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    const tempCloseError = closeBestEffort(tempDescriptor, fsImpl);
    if (tempCloseError) cleanupFailures.push(tempCloseError);
    if (ownsTemp && !preservation.temp) {
      try {
        const removed = unlinkOwnedFile(tempPaths.tempPath, tempIdentity, fsImpl);
        if (removed) {
          ownsTemp = false;
        } else if (tempIdentity && exists(fsImpl, tempPaths.tempPath)) {
          cleanupFailures.push(
            new Error(`Workflow temporary file changed before cleanup: ${tempPaths.tempRelative}`),
          );
          ownsTemp = false;
        } else if (tempIdentity) {
          ownsTemp = false;
        }
      } catch (error) {
        cleanupFailures.push(error);
        if (exists(fsImpl, tempPaths.tempPath)) {
          tempCleanupPreventedLockCleanup = true;
        } else {
          ownsTemp = false;
        }
      }
    }

    if (ownsLock && !lockIdentity && !preservation.lock && lockDescriptor !== undefined) {
      try {
        lockIdentity = fileIdentity(fsImpl.fstatSync(lockDescriptor));
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    const lockCloseError = closeBestEffort(lockDescriptor, fsImpl);
    if (lockCloseError) cleanupFailures.push(lockCloseError);
    if (tempCleanupPreventedLockCleanup) {
      cleanupFailures.push(
        new Error(
          `Workflow lock cleanup was skipped to preserve recovery for ${tempPaths.tempRelative}`,
        ),
      );
    }
    if (ownsLock && !preservation.lock && !ownsTemp) {
      try {
        const removed = unlinkOwnedFile(paths.lockPath, lockIdentity, fsImpl);
        if (removed) {
          ownsLock = false;
        } else if (lockIdentity && exists(fsImpl, paths.lockPath)) {
          cleanupFailures.push(
            new Error(`Workflow lock changed before cleanup: ${paths.lockRelative}`),
          );
          ownsLock = false;
          lockRecoveryVerified = false;
        } else if (lockIdentity) {
          ownsLock = false;
        }
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
  }

  if (failure || cleanupFailures.length > 0) {
    const residuePaths = [
      ...(ownsTemp && exists(fsImpl, tempPaths.tempPath) ? [tempPaths.tempRelative] : []),
      ...(ownsLock && exists(fsImpl, paths.lockPath) ? [paths.lockRelative] : []),
    ];
    let recoveryPreconditionsVerified = false;
    let recoveryPreconditionFailure;
    if (residuePaths.length > 0 && lockRecoveryVerified) {
      try {
        const preflight = recoverRuntimeFiles({
          root,
          initiativeId,
          token: recoveryToken,
          machine,
          fsImpl,
          hostname: () => undefined,
          isProcessAlive: () => false,
          dryRun: true,
        });
        const expectedPaths = [...residuePaths].sort(compareCodeUnits);
        const preflightPaths = [...preflight.wouldRemove].sort(compareCodeUnits);
        if (
          preflight.status !== 'dry_run' ||
          expectedPaths.length !== preflightPaths.length ||
          expectedPaths.some((entry, index) => entry !== preflightPaths[index])
        ) {
          throw new Error(
            `Workflow recovery preflight targets do not match owned residue: expected ${expectedPaths.join(
              ', ',
            )}; received ${preflightPaths.join(', ')}`,
          );
        }
        recoveryPreconditionsVerified = true;
      } catch (error) {
        recoveryPreconditionFailure = error;
      }
    }
    throw combineAppendFailures({
      primary: failure,
      cleanupFailures,
      installed,
      finalPath,
      initiativeId,
      token: recoveryToken,
      paths: tempPaths,
      residuePaths,
      recoveryPreconditionsVerified,
      recoveryPreconditionFailure,
      commitDurable,
    });
  }
  return result;
}

function defaultIsProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error.code === 'ESRCH') return false;
    if (error.code === 'EPERM') return true;
    throw error;
  }
}

function containsRuntimeReference(value, targets) {
  if (typeof value === 'string') {
    return [...targets].some((target) => value.includes(target));
  }
  if (Array.isArray(value)) return value.some((entry) => containsRuntimeReference(entry, targets));
  if (value && typeof value === 'object') {
    return Object.values(value).some((entry) => containsRuntimeReference(entry, targets));
  }
  return false;
}

function recoveryReport(initiativeId, token, paths, values) {
  return {
    initiativeId,
    token,
    lockPath: paths.lockRelative,
    tempPath: paths.tempRelative,
    wouldRemove: values.wouldRemove,
    removed: values.removed,
    status: values.status,
  };
}

function recoverRuntimeFiles({
  root,
  initiativeId,
  token,
  machine,
  fsImpl = fs,
  hostname = os.hostname,
  isProcessAlive = defaultIsProcessAlive,
  dryRun = false,
}) {
  assertRepositoryRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  requireRecoveryToken(token);
  const paths = workflowPaths(root, initiativeId, token);
  if (!exists(fsImpl, paths.eventsPath)) {
    return recoveryReport(initiativeId, token, paths, {
      wouldRemove: [],
      removed: [],
      status: 'not_found',
    });
  }
  assertEventsDirectory(paths.eventsPath, fsImpl);
  const inspected = inspectEventFiles({ root, initiativeId, machine, fsImpl });
  const lockExists = exists(fsImpl, paths.lockPath);
  const tempExists = exists(fsImpl, paths.tempPath);
  if (!lockExists) {
    if (tempExists) {
      throw new Error('Cannot recover an orphan workflow temporary file without its lock');
    }
    return recoveryReport(initiativeId, token, paths, {
      wouldRemove: [],
      removed: [],
      status: 'not_found',
    });
  }

  const { metadata, identity: lockIdentity } = readLock(paths.lockPath, fsImpl);
  if (metadata.token !== token) {
    throw new Error(`Recovery token ${token} does not match workflow lock token ${metadata.token}`);
  }
  if (metadata.host === hostname() && isProcessAlive(metadata.pid)) {
    throw new Error(`Workflow lock process ${metadata.pid} is still alive on ${metadata.host}`);
  }

  let tempIdentity;
  if (tempExists) {
    tempIdentity = readExactRegularFile(paths.tempPath, 'Workflow temporary file', fsImpl).identity;
  }
  const referencedPaths = new Set([
    paths.lockRelative,
    paths.tempRelative,
    LOCK_NAME,
    paths.tempName,
    paths.lockPath,
    paths.tempPath,
  ]);
  if (inspected.events.some((event) => containsRuntimeReference(event, referencedPaths))) {
    throw new Error('A committed event references a workflow runtime path; recovery refused');
  }

  const wouldRemove = [...(tempExists ? [paths.tempRelative] : []), paths.lockRelative];
  if (dryRun) {
    return recoveryReport(initiativeId, token, paths, {
      wouldRemove,
      removed: [],
      status: 'dry_run',
    });
  }

  const removed = [];
  if (tempExists) {
    if (!unlinkOwnedFile(paths.tempPath, tempIdentity, fsImpl)) {
      throw new Error('Workflow temporary file changed before recovery');
    }
    removed.push(paths.tempRelative);
  }
  if (!unlinkOwnedFile(paths.lockPath, lockIdentity, fsImpl)) {
    throw new Error('Workflow lock changed before recovery');
  }
  removed.push(paths.lockRelative);
  return recoveryReport(initiativeId, token, paths, {
    wouldRemove,
    removed,
    status: 'recovered',
  });
}

module.exports = {
  appendEvent,
  loadEventHistory,
  recoverRuntimeFiles,
};
