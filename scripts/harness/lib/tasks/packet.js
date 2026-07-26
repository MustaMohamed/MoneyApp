const {
  canonicalStringify,
  finalizeHashedObject,
  verifyCanonicalHashedObject,
} = require('../workflow/canonical');

const PACKET_KEYS = new Set([
  'schemaVersion',
  'packetHash',
  'initiativeId',
  'branch',
  'initiativeSequence',
  'taskLedgerSequence',
  'spec',
  'plan',
  'taskGraph',
  'graphHash',
  'taskId',
  'title',
  'kind',
  'ownerRole',
  'objective',
  'dependsOn',
  'readPaths',
  'writePaths',
  'acceptanceCriteria',
  'verificationCommands',
  'recommendedCommitMessage',
  'escalationNotes',
  'dependencyEvidence',
  'constraints',
]);

function requireContext(context) {
  if (!context?.graph || !context.taskProjection || !context.initiativeProjection) {
    throw new Error('Task packet context is incomplete');
  }
  if (!Number.isSafeInteger(context.limits?.maxPacketBytes) || context.limits.maxPacketBytes < 1) {
    throw new Error('Task packet maxPacketBytes must be a positive safe integer');
  }
  if (context.taskProjection.graphHash !== context.graph.graphHash) {
    throw new Error('Task projection graph hash is stale');
  }
  if (context.graph.initiativeId !== context.initiativeProjection.initiative.id) {
    throw new Error('Task graph initiative does not match initiative projection');
  }
  if (!context.initiativeProjection.spec?.signed) {
    throw new Error('Task packet requires a signed specification');
  }
  if (!context.initiativeProjection.plan?.approved) {
    throw new Error('Task packet requires an approved plan bundle');
  }
}

function findTask(graph, taskId) {
  const task = graph.tasks.find((entry) => entry.id === taskId);
  if (!task) throw new Error(`Unknown task ${taskId}`);
  return task;
}

function dependencyEvidence(task, taskProjection) {
  return [...task.dependsOn]
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
    .map((taskId) => {
      const completion = taskProjection.completions?.[taskId];
      if (!completion?.eventHash || !completion.endHead) {
        throw new Error(`Missing dependency completion evidence for ${taskId}`);
      }
      return {
        taskId,
        completionEventHash: completion.eventHash,
        endHead: completion.endHead,
      };
    });
}

function assertPacketBudget(packet, limits) {
  const bytes = Buffer.byteLength(canonicalStringify(packet), 'utf8');
  if (bytes > limits.maxPacketBytes) {
    throw new Error(
      `Task packet exceeds canonical byte limit ${limits.maxPacketBytes}: observed ${bytes}`,
    );
  }
}

function createTaskPacket(context, taskId) {
  requireContext(context);
  const task = findTask(context.graph, taskId);
  if (!context.taskProjection.readyTaskIds.includes(taskId)) {
    throw new Error(`Task ${taskId} is not ready`);
  }
  const initiative = context.initiativeProjection;
  const packet = finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: initiative.initiative.id,
      branch: initiative.initiative.branch,
      initiativeSequence: initiative.sequence,
      taskLedgerSequence: context.taskProjection.sequence,
      spec: initiative.spec.current,
      plan: initiative.plan.current,
      taskGraph: initiative.plan.taskGraph,
      graphHash: context.graph.graphHash,
      taskId: task.id,
      title: task.title,
      kind: task.kind,
      ownerRole: task.ownerRole,
      objective: task.objective,
      dependsOn: task.dependsOn,
      readPaths: task.readPaths,
      writePaths: task.writePaths,
      acceptanceCriteria: task.acceptanceCriteria,
      verificationCommands: task.verificationCommands,
      recommendedCommitMessage: task.recommendedCommitMessage,
      escalationNotes: task.escalationNotes,
      dependencyEvidence: dependencyEvidence(task, context.taskProjection),
      constraints: {
        integrationAuthority: 'explicit-user-request-required',
        criticalTriggers: 'initiative-blocker-required',
        deviceQa: initiative.spec.deviceQaMode,
        commandExecution: 'worker-reported-not-automatic',
        writeScope: 'strict',
      },
    },
    'packetHash',
  );
  assertPacketBudget(packet, context.limits);
  return packet;
}

function verifyTaskPacket(value, limits) {
  const packet = verifyCanonicalHashedObject(value, 'packetHash', 'Task packet');
  const keys = Reflect.ownKeys(packet);
  const unknown = keys.filter((key) => !PACKET_KEYS.has(key));
  const missing = [...PACKET_KEYS].filter((key) => !Object.hasOwn(packet, key));
  if (unknown.length > 0 || missing.length > 0) {
    throw new Error(
      `Task packet fields are invalid: unexpected ${unknown.join(', ')}; missing ${missing.join(', ')}`,
    );
  }
  assertPacketBudget(packet, limits);
  return packet;
}

module.exports = {
  createTaskPacket,
  verifyTaskPacket,
};
