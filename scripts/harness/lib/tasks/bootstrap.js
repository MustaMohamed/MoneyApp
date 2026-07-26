const { assertSafeRelativePath, pathIdentity } = require('../paths');
const { matchesScope } = require('./path_scope');
const {
  canonicalStringify,
  finalizeHashedObject,
  hashCanonicalObject,
} = require('../workflow/canonical');

const HEX_40 = /^[a-f0-9]{40}$/u;
const HEX_64 = /^[a-f0-9]{64}$/u;
const EVIDENCE_PREFIXES = Object.freeze([
  'docs/superpowers/initiatives/',
  'docs/superpowers/plans/',
  'docs/superpowers/reviews/',
  'docs/superpowers/specs/',
  'docs/superpowers/task-graphs/',
  'docs/superpowers/qa/',
]);

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireExactKeys(value, expected, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  const actual = Object.keys(value).sort(compareCodeUnits);
  const ordered = [...expected].sort(compareCodeUnits);
  if (actual.length !== ordered.length || actual.some((key, index) => key !== ordered[index])) {
    throw new Error(`${label} fields are not canonical`);
  }
}

function isWorkflowEvidencePath(relativePath) {
  return EVIDENCE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function bridgeKey(bridge) {
  return `${bridge.beforeHead}:${bridge.afterHead}`;
}

function bridgeDigest(bridge) {
  return hashCanonicalObject(
    {
      beforeHead: bridge.beforeHead,
      afterHead: bridge.afterHead,
      changedPaths: bridge.changedPaths,
    },
    'digest',
  );
}

function normalizeLegacyBootstrapBridge(value) {
  requireExactKeys(
    value,
    value?.digest === undefined
      ? ['beforeHead', 'afterHead', 'changedPaths']
      : ['beforeHead', 'afterHead', 'changedPaths', 'digest'],
    'Legacy bootstrap bridge',
  );
  if (!HEX_40.test(value.beforeHead ?? '') || !HEX_40.test(value.afterHead ?? '')) {
    throw new Error('Legacy bootstrap bridge endpoints must be commit hashes');
  }
  if (value.beforeHead === value.afterHead) {
    throw new Error('Legacy bootstrap bridge must move between different commits');
  }
  if (!Array.isArray(value.changedPaths) || value.changedPaths.length === 0) {
    throw new Error('Legacy bootstrap bridge requires evidence changed paths');
  }
  const changedPaths = [...value.changedPaths];
  const identities = new Set();
  for (const relativePath of changedPaths) {
    assertSafeRelativePath(relativePath);
    if (!isWorkflowEvidencePath(relativePath)) {
      throw new Error(`Legacy bootstrap bridge path is not workflow evidence: ${relativePath}`);
    }
    const identity = pathIdentity(relativePath);
    if (identities.has(identity)) {
      throw new Error(`Legacy bootstrap bridge contains duplicate path: ${relativePath}`);
    }
    identities.add(identity);
  }
  changedPaths.sort(compareCodeUnits);
  if (changedPaths.some((entry, index) => entry !== value.changedPaths[index])) {
    throw new Error('Legacy bootstrap bridge changed paths must be sorted');
  }
  const normalized = {
    beforeHead: value.beforeHead,
    afterHead: value.afterHead,
    changedPaths: Object.freeze(changedPaths),
  };
  const digest = bridgeDigest(normalized);
  if (value.digest !== undefined && value.digest !== digest) {
    throw new Error('Legacy bootstrap bridge digest mismatch');
  }
  return Object.freeze({ ...normalized, digest });
}

function createLegacyBootstrapBridgeArtifact({ migrationAnchor, bridges }) {
  if (!HEX_40.test(migrationAnchor ?? '')) {
    throw new Error('Legacy bootstrap bridge artifact requires a migration anchor');
  }
  if (!Array.isArray(bridges)) {
    throw new Error('Legacy bootstrap bridge artifact bridges must be an array');
  }
  const normalized = bridges
    .map(normalizeLegacyBootstrapBridge)
    .sort((left, right) => compareCodeUnits(bridgeKey(left), bridgeKey(right)));
  const keys = new Set();
  for (const bridge of normalized) {
    const key = bridgeKey(bridge);
    if (keys.has(key)) throw new Error(`Duplicate legacy bootstrap bridge: ${key}`);
    keys.add(key);
  }
  return finalizeHashedObject(
    {
      schemaVersion: 1,
      migrationAnchor,
      bridges: normalized,
    },
    'artifactHash',
  );
}

function validateLegacyBootstrapBridgeArtifact({ artifact, migrationAnchor }) {
  requireExactKeys(
    artifact,
    ['schemaVersion', 'migrationAnchor', 'bridges', 'artifactHash'],
    'Legacy bootstrap bridge artifact',
  );
  if (artifact.schemaVersion !== 1) {
    throw new Error('Legacy bootstrap bridge artifact schemaVersion must be 1');
  }
  if (artifact.migrationAnchor !== migrationAnchor) {
    throw new Error('Legacy bootstrap bridge artifact migration anchor mismatch');
  }
  const expected = createLegacyBootstrapBridgeArtifact({
    migrationAnchor: artifact.migrationAnchor,
    bridges: artifact.bridges,
  });
  if (canonicalStringify(artifact) !== canonicalStringify(expected)) {
    throw new Error('Legacy bootstrap bridge artifact hash or canonical order mismatch');
  }
  return expected;
}

function taskMap(graph) {
  if (!graph || !Array.isArray(graph.tasks)) {
    throw new Error('Bootstrap validation requires an approved task graph');
  }
  return new Map(graph.tasks.map((task) => [task.id, task]));
}

function requireAttestationContext({ graphHash, branch, checkpoint, validatedHead, completions }) {
  if (!HEX_64.test(graphHash ?? '')) {
    throw new Error('Bootstrap attestation graph hash must be lowercase hexadecimal');
  }
  if (typeof branch !== 'string' || branch.length === 0) {
    throw new Error('Bootstrap attestation branch must be nonempty');
  }
  if (!HEX_40.test(checkpoint ?? '') || !HEX_40.test(validatedHead ?? '')) {
    throw new Error('Bootstrap attestation checkpoint and validated HEAD must be commit hashes');
  }
  if (!Array.isArray(completions) || completions.length === 0) {
    throw new Error('Bootstrap attestation requires at least one completion');
  }
  if (completions.at(-1)?.endHead !== validatedHead) {
    throw new Error('Bootstrap attestation validated HEAD must equal the final completion end');
  }
}

function rangeDigest(completion) {
  return hashCanonicalObject(
    {
      taskId: completion.taskId,
      startHead: completion.startHead,
      endHead: completion.endHead,
      changedPaths: completion.changedPaths,
    },
    'digest',
  );
}

function createBootstrapAttestation(context) {
  requireAttestationContext(context);
  const { graphHash, branch, checkpoint, validatedHead, completions } = context;
  const ranges = Object.freeze(
    completions.map((completion) =>
      Object.freeze({
        taskId: completion.taskId,
        digest: rangeDigest(completion),
      }),
    ),
  );
  const chainDigest = hashCanonicalObject(
    {
      schemaVersion: 1,
      graphHash,
      branch,
      checkpoint,
      validatedHead,
      ranges,
    },
    'chainDigest',
  );
  return Object.freeze({
    schemaVersion: 1,
    validatedHead,
    ranges,
    chainDigest,
  });
}

function verifyBootstrapAttestation({ attestation, ...context }) {
  const expected = createBootstrapAttestation(context);
  let actual;
  let canonicalExpected;
  try {
    actual = canonicalStringify(attestation);
    canonicalExpected = canonicalStringify(expected);
  } catch (error) {
    throw new Error('Bootstrap attestation is not canonical JSON data', { cause: error });
  }
  if (actual !== canonicalExpected) {
    throw new Error('Bootstrap attestation does not match its observed chain context');
  }
  return true;
}

function commandKey(command) {
  return JSON.stringify(command);
}

function validateRequiredChecks(task, completion) {
  const checks = Array.isArray(completion.checks) ? completion.checks : [];
  const counts = new Map();
  for (const check of checks) {
    const key = commandKey(check?.command);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const command of task.verificationCommands) {
    const key = commandKey(command);
    const matches = checks.filter((check) => commandKey(check?.command) === key);
    if (counts.get(key) !== 1 || matches[0]?.passed !== true) {
      throw new Error(`Bootstrap task ${task.id} required check must appear once and pass`);
    }
    if (typeof matches[0].summary !== 'string' || matches[0].summary.trim().length === 0) {
      throw new Error(`Bootstrap task ${task.id} required check summary must be nonempty`);
    }
  }
}

function validateTaskRange(task, completion) {
  const changedPaths = Array.isArray(completion.changedPaths) ? completion.changedPaths : [];
  if (task.kind === 'validation') {
    if (completion.startHead !== completion.endHead || changedPaths.length !== 0) {
      throw new Error(`Bootstrap validation task ${task.id} cannot move HEAD or change delivery`);
    }
  } else if (completion.startHead === completion.endHead || changedPaths.length === 0) {
    throw new Error(`Bootstrap mutation task ${task.id} requires a committed delivery range`);
  }
  for (const relativePath of changedPaths) {
    if (!task.writePaths.some((scope) => matchesScope(relativePath, scope))) {
      throw new Error(
        `Bootstrap task ${task.id} changed path outside its write scope: ${relativePath}`,
      );
    }
  }
}

function inferMode({
  completions,
  baseSha,
  previousChain,
  previousAccountedHead,
  transparentBridges,
  replacement,
}) {
  if (!replacement) return { mode: 'activation', checkpoint: baseSha };
  if (completions.length === 0) {
    return { mode: 'extension', checkpoint: previousAccountedHead };
  }
  const first = completions[0];
  const snapshot =
    previousChain.length > 0 &&
    first.taskId === previousChain[0].taskId &&
    (first.startHead === baseSha || transparentBridges.has(`${baseSha}:${first.startHead}`));
  return snapshot
    ? { mode: 'snapshot', checkpoint: baseSha }
    : { mode: 'extension', checkpoint: previousAccountedHead };
}

function requireSnapshotPrefix(completions, previousChain) {
  if (completions.length < previousChain.length) {
    throw new Error('Bootstrap snapshot cannot hide completed tasks or reduce completed count');
  }
  for (const [index, previous] of previousChain.entries()) {
    if (completions[index]?.taskId !== previous.taskId) {
      throw new Error('Bootstrap snapshot must preserve the completed task prefix order');
    }
  }
}

function validateBootstrapChain({
  graph,
  completions,
  baseSha,
  previousChain = [],
  previousAccountedHead = baseSha,
  transparentBridges = [],
  replacement = false,
}) {
  if (
    !Array.isArray(completions) ||
    !Array.isArray(previousChain) ||
    !Array.isArray(transparentBridges)
  ) {
    throw new Error(
      'Bootstrap completions, previous chain, and transparent bridges must be arrays',
    );
  }
  const bridgeMap = new Map(
    transparentBridges.map((bridge) => {
      const normalized = normalizeLegacyBootstrapBridge(bridge);
      return [bridgeKey(normalized), normalized];
    }),
  );
  if (bridgeMap.size !== transparentBridges.length) {
    throw new Error('Bootstrap transparent bridges contain duplicate endpoints');
  }
  const byId = taskMap(graph);
  const { mode, checkpoint } = inferMode({
    completions,
    baseSha,
    previousChain,
    previousAccountedHead,
    transparentBridges: bridgeMap,
    replacement,
  });
  if (mode === 'snapshot') requireSnapshotPrefix(completions, previousChain);

  const imported = completions;
  const chain = mode === 'extension' ? [...previousChain, ...imported] : [...imported];
  const completed = new Set(mode === 'extension' ? previousChain.map((item) => item.taskId) : []);
  const importedIds = new Set();
  const usedBridges = [];
  let expectedHead = checkpoint;

  for (const completion of imported) {
    const task = byId.get(completion.taskId);
    if (!task) throw new Error(`Bootstrap completion references unknown task ${completion.taskId}`);
    if (importedIds.has(task.id)) {
      throw new Error(`Bootstrap completions contain duplicate ${task.id}`);
    }
    if (mode === 'extension' && completed.has(task.id)) {
      throw new Error(`Bootstrap extension repeats already completed task ${task.id}`);
    }
    if (completion.startHead !== expectedHead) {
      const bridge = bridgeMap.get(`${expectedHead}:${completion.startHead}`);
      if (!bridge) {
        const label = expectedHead === checkpoint ? 'checkpoint' : 'contiguous chain';
        throw new Error(`Bootstrap ${label} mismatch for ${task.id}; evidence bridge missing`);
      }
      usedBridges.push(bridge);
    }
    const missing = task.dependsOn.filter((dependency) => !completed.has(dependency));
    if (missing.length > 0) {
      throw new Error(
        `Bootstrap task ${task.id} has incomplete dependencies: ${missing.join(', ')}`,
      );
    }
    validateRequiredChecks(task, completion);
    validateTaskRange(task, completion);
    importedIds.add(task.id);
    completed.add(task.id);
    expectedHead = completion.endHead;
  }

  for (const previous of previousChain) {
    if (!byId.has(previous.taskId)) {
      throw new Error(`Replacement graph omits completed task ${previous.taskId}`);
    }
  }

  return Object.freeze({
    mode,
    chain: Object.freeze(chain),
    imported: Object.freeze([...imported]),
    transparentBridges: Object.freeze(usedBridges),
    accountedHead: chain.at(-1)?.endHead ?? previousAccountedHead,
  });
}

module.exports = {
  createBootstrapAttestation,
  createLegacyBootstrapBridgeArtifact,
  isWorkflowEvidencePath,
  validateBootstrapChain,
  validateLegacyBootstrapBridgeArtifact,
  verifyBootstrapAttestation,
};
