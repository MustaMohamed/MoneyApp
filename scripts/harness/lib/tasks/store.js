const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const { resolveInside } = require('../paths');
const {
  canonicalStringify,
  finalizeHashedObject,
  parseCanonicalJson,
  verifyCanonicalHashedObject,
} = require('../workflow/canonical');
const {
  validateBootstrapChain,
  validateLegacyBootstrapBridgeArtifact,
  verifyBootstrapAttestation,
} = require('./bootstrap');
const { attestBootstrapChain, attestLegacyBootstrapBridge } = require('./git_scope');
const { replayTaskEvents } = require('./projection');
const { validateTaskEventEnvelope, validateTaskEventPayload } = require('./schema');

const EVENT_FILENAME = /^(\d{6})-([a-f0-9]{64})\.json$/;
const TEMP_FILENAME = /^\.tasks-([a-f0-9]{32})\.tmp$/;
const TOKEN = /^[a-f0-9]{32}$/;
const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const LOCK_NAME = '.tasks.lock';
const HEX_40 = /^[a-f0-9]{40}$/u;
const EMPTY_BOOTSTRAP_CONTEXT = Object.freeze({
  transparentBridges: Object.freeze([]),
});

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

function runReadOnlyGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function defaultBootstrapGit() {
  return {
    classifyAvailability(root, { branch, validatedHead, commits }) {
      const currentBranch = runReadOnlyGit(root, ['rev-parse', '--abbrev-ref', 'HEAD'])
        .toString('utf8')
        .trim();
      const currentHead = runReadOnlyGit(root, ['rev-parse', '--verify', 'HEAD'])
        .toString('utf8')
        .trim();
      if (currentBranch !== branch || currentHead !== validatedHead) return 'missing';
      const available = commits.map((commit) => {
        try {
          runReadOnlyGit(root, ['cat-file', '-e', `${commit}^{commit}`]);
          return true;
        } catch (error) {
          if (error.status === 128) return false;
          throw error;
        }
      });
      if (available.every(Boolean)) return 'complete';
      if (available.every((value) => !value)) return 'missing';
      return 'partial';
    },
    classifyCommitAvailability(root, { commits }) {
      const available = commits.map((commit) => {
        try {
          runReadOnlyGit(root, ['cat-file', '-e', `${commit}^{commit}`]);
          return true;
        } catch (error) {
          if (error.status === 128) return false;
          throw error;
        }
      });
      if (available.every(Boolean)) return 'complete';
      if (available.every((value) => !value)) return 'missing';
      return 'partial';
    },
    attestBootstrapChain,
    attestLegacyBootstrapBridge,
    readFileAtCommit(root, commit, relativePath) {
      return runReadOnlyGit(root, ['show', `${commit}:${relativePath}`]);
    },
  };
}

function projectionCompletionChain(projection) {
  return (projection?.completionOrder ?? []).map((taskId) => projection.completions[taskId]);
}

function bootstrapValidationContext(event, graph, previousProjection, transparentBridges = []) {
  const payload = event.payload;
  const previousChain = projectionCompletionChain(previousProjection);
  const previousAccountedHead = previousProjection?.accountedHead ?? payload.baseSha;
  const replacement = event.type === 'task_graph.replaced';
  const validation = validateBootstrapChain({
    graph,
    completions: payload.bootstrapCompletions,
    baseSha: payload.baseSha,
    previousChain,
    previousAccountedHead,
    transparentBridges,
    replacement,
  });
  return {
    validation,
    previousAccountedHead,
    checkpoint:
      validation.mode === 'activation' || validation.mode === 'snapshot'
        ? payload.baseSha
        : previousAccountedHead,
  };
}

function loadLegacyBootstrapBridges(root, reference, migrationAnchor, fsImpl = fs) {
  if (
    !reference ||
    typeof reference.path !== 'string' ||
    !/^[a-f0-9]{64}$/u.test(reference.sha256 ?? '')
  ) {
    throw new Error('Legacy bootstrap bridge artifact reference is invalid');
  }
  const target = resolveInside(root, reference.path);
  const { bytes } = readExactFile(target, 'Legacy bootstrap bridge artifact', fsImpl);
  const digest = crypto.createHash('sha256').update(bytes).digest('hex');
  if (digest !== reference.sha256) {
    throw new Error('Legacy bootstrap bridge artifact SHA-256 mismatch');
  }
  return validateLegacyBootstrapBridgeArtifact({
    artifact: verifyCanonicalHashedObject(
      bytes,
      'artifactHash',
      'Legacy bootstrap bridge artifact',
    ),
    migrationAnchor,
  });
}

function verifyLegacyBootstrapBridges(root, bridges, git) {
  for (const bridge of bridges) {
    const availability = git.classifyCommitAvailability(root, {
      commits: [bridge.beforeHead, bridge.afterHead],
    });
    if (availability === 'partial') {
      throw new Error('Legacy bootstrap bridge Git evidence is partially available');
    }
    if (availability === 'missing') continue;
    if (availability !== 'complete') {
      throw new Error(`Legacy bootstrap bridge availability is invalid: ${availability}`);
    }
    const observed = (git.attestLegacyBootstrapBridge ?? attestLegacyBootstrapBridge)(root, bridge);
    if (canonicalStringify(observed) !== canonicalStringify(bridge)) {
      throw new Error('Live legacy bootstrap bridge does not match portable evidence');
    }
  }
}

function verifiedBootstrapContext(transparentBridges = []) {
  return Object.freeze({
    transparentBridges: Object.freeze([...transparentBridges]),
  });
}

function normalizeVerifiedBootstrapContext(value) {
  if (value === undefined || value === true) return EMPTY_BOOTSTRAP_CONTEXT;
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).length !== 1 ||
    !Array.isArray(value.transparentBridges)
  ) {
    throw new Error('Bootstrap verifier returned an invalid replay context');
  }
  return verifiedBootstrapContext(value.transparentBridges);
}

function verifyStoredBootstrapEvent({
  root,
  event,
  eventBytes,
  eventRelativePath,
  graph,
  previousProjection,
  legacyBootstrapAnchor,
  legacyBootstrapBridgeReference,
  legacyBootstrapBridges,
  git = defaultBootstrapGit(),
}) {
  const completions = event.payload.bootstrapCompletions;
  if (completions.length === 0) return EMPTY_BOOTSTRAP_CONTEXT;
  const attestation = event.payload.bootstrapAttestation;
  if (attestation === undefined) {
    if (!HEX_40.test(legacyBootstrapAnchor ?? '')) {
      throw new Error('Receipt-less legacy bootstrap requires a manifest migration anchor');
    }
    const anchored = git.readFileAtCommit(root, legacyBootstrapAnchor, eventRelativePath);
    if (!Buffer.from(anchored).equals(Buffer.from(eventBytes))) {
      throw new Error('Legacy bootstrap event does not match exact bytes at the migration anchor');
    }
    let context;
    try {
      context = bootstrapValidationContext(event, graph, previousProjection);
    } catch (strictError) {
      const artifact =
        legacyBootstrapBridges ??
        loadLegacyBootstrapBridges(root, legacyBootstrapBridgeReference, legacyBootstrapAnchor);
      const validated = validateLegacyBootstrapBridgeArtifact({
        artifact,
        migrationAnchor: legacyBootstrapAnchor,
      });
      try {
        context = bootstrapValidationContext(event, graph, previousProjection, validated.bridges);
      } catch (bridgeError) {
        throw new Error(
          `Legacy bootstrap evidence bridge validation failed: ${bridgeError.message}`,
          {
            cause: strictError,
          },
        );
      }
      verifyLegacyBootstrapBridges(root, context.validation.transparentBridges, git);
    }
    return verifiedBootstrapContext(context.validation.transparentBridges);
  }
  const { checkpoint, previousAccountedHead } = bootstrapValidationContext(
    event,
    graph,
    previousProjection,
  );

  const context = {
    graphHash: graph.graphHash,
    branch: event.payload.branch,
    checkpoint,
    validatedHead: attestation.validatedHead,
    completions,
  };
  verifyBootstrapAttestation({ attestation, ...context });
  const commits = [...new Set(completions.map((completion) => completion.endHead))];
  const availability =
    typeof git.classifyAvailability === 'function'
      ? git.classifyAvailability(root, {
          branch: event.payload.branch,
          validatedHead: attestation.validatedHead,
          commits,
        })
      : (() => {
          if (typeof git.hasCommit !== 'function') {
            throw new Error('Bootstrap Git adapter must classify commit availability');
          }
          const available = commits.map((commit) => git.hasCommit(root, commit));
          if (available.every(Boolean)) return 'complete';
          if (available.every((value) => !value)) return 'missing';
          return 'partial';
        })();
  if (availability === 'missing') return EMPTY_BOOTSTRAP_CONTEXT;
  if (availability !== 'complete') {
    throw new Error('Bootstrap Git evidence is partially available');
  }
  try {
    const observed = (git.attestBootstrapChain ?? attestBootstrapChain)(root, {
      branch: event.payload.branch,
      graph,
      checkpoint,
      ...(event.type === 'task_graph.replaced' ? { previousAccountedHead } : {}),
      completions,
    });
    verifyBootstrapAttestation({ attestation: observed.attestation, ...context });
    verifyBootstrapAttestation({ attestation, ...context });
  } catch (error) {
    throw new Error(`Live bootstrap attestation failed: ${error.message}`, { cause: error });
  }
  return EMPTY_BOOTSTRAP_CONTEXT;
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
  initiativeSnapshots,
  resolveGraph,
  verifyBootstrapEvent,
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
      verifiedBootstrapContexts: new Map(),
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
    return { ...entry, bytes, event };
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
  const verifiedBootstrapContexts = new Map();
  for (const [index, record] of records.entries()) {
    const event = record.event;
    if (
      (event.type === 'task_graph.activated' || event.type === 'task_graph.replaced') &&
      event.payload.bootstrapCompletions.length > 0
    ) {
      if (typeof verifyBootstrapEvent !== 'function') {
        throw new Error('Nonempty bootstrap replay requires repository evidence verification');
      }
      const eventGraph =
        event.type === 'task_graph.activated'
          ? activationGraph
          : resolveGraph?.(event.payload.graphHash, event.payload.taskGraph, event.payload.plan);
      if (!eventGraph) {
        throw new Error(`Cannot resolve bootstrap task graph ${event.payload.graphHash}`);
      }
      const previousProjection =
        index === 0
          ? undefined
          : replayTaskEvents({
              graph: activationGraph,
              events: events.slice(0, index),
              initiativeProjection,
              initiativeSnapshots,
              resolveGraph,
              verifiedBootstrapContexts,
            });
      verifiedBootstrapContexts.set(
        event.eventHash,
        normalizeVerifiedBootstrapContext(
          verifyBootstrapEvent({
            root,
            event,
            eventBytes: record.bytes,
            eventRelativePath: path.posix.join(paths.eventsRelative, record.name),
            graph: eventGraph,
            previousProjection,
          }),
        ),
      );
    }
  }
  const projection =
    events.length === 0
      ? undefined
      : replayTaskEvents({
          graph: activationGraph,
          events,
          initiativeProjection,
          initiativeSnapshots,
          resolveGraph,
          verifiedBootstrapContexts,
        });
  return {
    activationGraph,
    events,
    paths: records.map((record) => record.path),
    projection,
    runtimeEntries: classified.runtime,
    verifiedBootstrapContexts,
  };
}

function loadTaskHistory({
  root,
  initiativeId,
  graph,
  initiativeProjection,
  initiativeSnapshots,
  resolveGraph,
  verifyBootstrapEvent,
  fsImpl = fs,
}) {
  assertRoot(root, fsImpl);
  requireInitiativeId(initiativeId);
  return inspectTaskFiles({
    root,
    initiativeId,
    graph,
    initiativeProjection,
    initiativeSnapshots,
    resolveGraph,
    verifyBootstrapEvent,
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

function unlinkOwned(target, identity, fsImpl) {
  if (!identity || !exists(target, fsImpl)) return false;
  const current = fsImpl.lstatSync(target);
  if (current.isSymbolicLink() || !current.isFile() || !sameInode(identity, current)) {
    return false;
  }
  fsImpl.unlinkSync(target);
  return true;
}

function fileIdentity(stats) {
  return {
    dev: stats.dev,
    ino: stats.ino,
    size: stats.size,
    mtimeMs: stats.mtimeMs,
  };
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

function syncDirectory(directory, fsImpl, phase = 'operation') {
  let descriptor;
  try {
    descriptor = fsImpl.openSync(directory, fsImpl.constants.O_RDONLY);
  } catch (error) {
    const wrapped = new Error(`Task ${phase} directory open failed: ${error.message}`, {
      cause: error,
    });
    wrapped.directorySynced = false;
    throw wrapped;
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
      `Task ${phase} directory fsync and close failed: ${syncFailure.message}; ${closeFailure.message}`,
    );
    combined.directorySynced = false;
    throw combined;
  }
  if (syncFailure) {
    const wrapped = new Error(`Task ${phase} directory fsync failed: ${syncFailure.message}`, {
      cause: syncFailure,
    });
    wrapped.directorySynced = false;
    throw wrapped;
  }
  if (closeFailure) {
    const wrapped = new Error(`Task ${phase} directory close failed: ${closeFailure.message}`, {
      cause: closeFailure,
    });
    wrapped.directorySynced = true;
    throw wrapped;
  }
}

function appendFailure(primary, cleanupFailures, installed, commitDurable, finalPath) {
  const failures = [primary, ...cleanupFailures].filter(Boolean);
  let failure;
  if (failures.length > 1) {
    failure = new AggregateError(
      failures,
      `Task append failed with ${failures.length} errors: ${failures
        .map((error) => error.message)
        .join('; ')}`,
    );
  } else {
    [failure] = failures;
  }
  if (installed && !commitDurable) {
    const uncertain = new Error(
      `Task event was installed but durability is uncertain: ${failure.message}`,
      { cause: failure },
    );
    uncertain.durableUncertain = true;
    uncertain.committedPath = finalPath;
    if (failure instanceof AggregateError) uncertain.errors = failure.errors;
    return uncertain;
  }
  if (commitDurable) failure.committedPath = finalPath;
  return failure;
}

function recoveryDetails(initiativeId, token, paths, residuePaths) {
  return {
    initiativeId,
    token,
    lockPath: paths.lockRelative,
    tempPath: paths.tempRelative,
    residuePaths,
    command: `npm run workflow -- tasks recover --id ${initiativeId} --token ${token}`,
  };
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
  initiativeSnapshots,
  resolveGraph,
  validateCurrent,
  verifyBootstrapEvent,
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
  let commitDurable = false;
  let finalPath;
  let result;
  let failure;
  const cleanupFailures = [];

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
    lockIdentity = fileIdentity(fsImpl.fstatSync(lockDescriptor));
    fsImpl.writeFileSync(lockDescriptor, lockBytes);
    fsImpl.fsyncSync(lockDescriptor);
    fsImpl.closeSync(lockDescriptor);
    lockDescriptor = undefined;
    syncDirectory(paths.eventsPath, fsImpl, 'lock persistence');

    const history = inspectTaskFiles({
      root,
      initiativeId,
      graph,
      initiativeProjection,
      initiativeSnapshots,
      resolveGraph,
      verifyBootstrapEvent,
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
    const eventName = `${String(event.sequence).padStart(6, '0')}-${event.eventHash}.json`;
    if (
      (event.type === 'task_graph.activated' || event.type === 'task_graph.replaced') &&
      event.payload.bootstrapCompletions.length > 0
    ) {
      if (typeof verifyBootstrapEvent !== 'function') {
        throw new Error('Nonempty bootstrap append requires repository evidence verification');
      }
      const eventGraph =
        event.type === 'task_graph.activated'
          ? history.activationGraph
          : resolveGraph?.(event.payload.graphHash, event.payload.taskGraph, event.payload.plan);
      if (!eventGraph) {
        throw new Error(`Cannot resolve bootstrap task graph ${event.payload.graphHash}`);
      }
      verifyBootstrapEvent({
        root,
        event,
        eventBytes: Buffer.from(canonicalStringify(event)),
        eventRelativePath: path.posix.join(paths.eventsRelative, eventName),
        graph: eventGraph,
        previousProjection: history.projection,
      });
    }
    replayTaskEvents({
      graph: history.activationGraph,
      events: [...history.events, event],
      initiativeProjection,
      initiativeSnapshots,
      resolveGraph,
      verifiedBootstrapContexts: history.verifiedBootstrapContexts,
    });

    const bytes = canonicalStringify(event);
    finalPath = path.join(paths.eventsPath, eventName);
    tempDescriptor = fsImpl.openSync(runtime.tempPath, 'wx');
    ownsTemp = true;
    tempIdentity = fileIdentity(fsImpl.fstatSync(tempDescriptor));
    fsImpl.writeFileSync(tempDescriptor, bytes);
    fsImpl.fsyncSync(tempDescriptor);
    fsImpl.closeSync(tempDescriptor);
    tempDescriptor = undefined;
    fsImpl.linkSync(runtime.tempPath, finalPath);
    installed = true;
    if (!sameInode(tempIdentity, fsImpl.lstatSync(finalPath))) {
      throw new Error('Installed task event does not match the temporary file identity');
    }
    try {
      syncDirectory(paths.eventsPath, fsImpl, 'final commit');
      commitDurable = true;
    } catch (error) {
      if (error.directorySynced) commitDurable = true;
      throw error;
    }
    if (!unlinkOwned(runtime.tempPath, tempIdentity, fsImpl)) {
      ownsTemp = false;
      throw new Error('Task temporary file changed before cleanup');
    }
    ownsTemp = false;
    syncDirectory(paths.eventsPath, fsImpl, 'temporary cleanup');
    result = { event, path: finalPath };
  } catch (error) {
    failure = error;
  } finally {
    if (ownsTemp && !tempIdentity && tempDescriptor !== undefined) {
      try {
        tempIdentity = fileIdentity(fsImpl.fstatSync(tempDescriptor));
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    const tempCloseFailure = closeBestEffort(tempDescriptor, fsImpl);
    if (tempCloseFailure) cleanupFailures.push(tempCloseFailure);
    tempDescriptor = undefined;
    if (ownsTemp && tempIdentity) {
      try {
        const removed = unlinkOwned(runtime.tempPath, tempIdentity, fsImpl);
        if (removed || !exists(runtime.tempPath, fsImpl)) {
          ownsTemp = false;
        } else {
          ownsTemp = false;
          cleanupFailures.push(new Error('Task temporary file changed before cleanup'));
        }
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    if (ownsLock && !lockIdentity && lockDescriptor !== undefined) {
      try {
        lockIdentity = fileIdentity(fsImpl.fstatSync(lockDescriptor));
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
    const lockCloseFailure = closeBestEffort(lockDescriptor, fsImpl);
    if (lockCloseFailure) cleanupFailures.push(lockCloseFailure);
    lockDescriptor = undefined;
    if (ownsLock && lockIdentity && !ownsTemp) {
      try {
        const removed = unlinkOwned(paths.lockPath, lockIdentity, fsImpl);
        if (removed || !exists(paths.lockPath, fsImpl)) {
          ownsLock = false;
          syncDirectory(paths.eventsPath, fsImpl, 'lock cleanup');
        } else {
          ownsLock = false;
          cleanupFailures.push(new Error('Task lock changed before cleanup'));
        }
      } catch (error) {
        cleanupFailures.push(error);
      }
    }
  }
  if (failure || cleanupFailures.length > 0) {
    const residuePaths = [
      ...(ownsTemp && exists(runtime.tempPath, fsImpl) ? [runtime.tempRelative] : []),
      ...(ownsLock && exists(paths.lockPath, fsImpl) ? [paths.lockRelative] : []),
    ];
    const combined = appendFailure(failure, cleanupFailures, installed, commitDurable, finalPath);
    if (residuePaths.length > 0) {
      try {
        const preflight = recoverTaskRuntimeFiles({
          root,
          initiativeId,
          token: recoveryToken,
          graph,
          initiativeProjection,
          initiativeSnapshots,
          resolveGraph,
          verifyBootstrapEvent,
          fsImpl,
          hostname: () => undefined,
          isProcessAlive: () => false,
          dryRun: true,
        });
        if (
          preflight.status !== 'dry_run' ||
          preflight.wouldRemove.length !== residuePaths.length ||
          preflight.wouldRemove.some((entry, index) => entry !== residuePaths[index])
        ) {
          throw new Error('Task recovery preflight does not match owned runtime residue');
        }
        combined.recovery = recoveryDetails(initiativeId, recoveryToken, runtime, residuePaths);
      } catch (error) {
        combined.manualIntervention = {
          status: 'manual_intervention_required',
          residuePaths,
          causes: [combined.message, error.message],
        };
      }
    }
    throw combined;
  }
  return result;
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
  initiativeSnapshots,
  resolveGraph,
  verifyBootstrapEvent,
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
    initiativeSnapshots,
    resolveGraph,
    verifyBootstrapEvent,
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
  verifyStoredBootstrapEvent,
};
