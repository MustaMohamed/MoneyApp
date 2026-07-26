const { hashCanonicalObject } = require('../workflow/canonical');
const { validateBootstrapChain } = require('./bootstrap');
const { validateTaskEventEnvelope, validateTaskEventPayload } = require('./schema');

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameArtifact(left, right) {
  return left?.path === right?.path && left?.sha256 === right?.sha256;
}

function hasInitiativeBlockers(projection) {
  if (projection.openBlockers instanceof Map) return projection.openBlockers.size > 0;
  return Object.keys(projection.openBlockers ?? {}).length > 0;
}

function requireGraphBundle(graph, payload, initiativeSnapshot, label) {
  if (payload.graphHash !== graph.graphHash) {
    throw new Error(`${label} graph hash does not match the resolved graph`);
  }
  if (!sameArtifact(payload.plan, graph.plan)) {
    throw new Error(`${label} plan does not match the graph plan reference`);
  }
  if (payload.branch !== initiativeSnapshot.initiative.branch) {
    throw new Error(`${label} branch does not match the initiative branch`);
  }
  if (payload.baseSha !== initiativeSnapshot.initiative.baseSha) {
    throw new Error(`${label} base SHA does not match the initiative base SHA`);
  }
  if (!sameArtifact(payload.spec, initiativeSnapshot.spec.current)) {
    throw new Error(`${label} spec does not match the signed initiative spec`);
  }
  if (!initiativeSnapshot.spec.signed) {
    throw new Error(`${label} initiative spec is not signed`);
  }
  if (
    !initiativeSnapshot.plan?.approved ||
    !sameArtifact(payload.plan, initiativeSnapshot.plan.current) ||
    !sameArtifact(payload.taskGraph, initiativeSnapshot.plan.taskGraph)
  ) {
    throw new Error(`${label} does not match the approved initiative plan bundle`);
  }
}

function requireInitiativeReference(payload, initiativeProjection, initiativeSnapshots, label) {
  const current = initiativeProjection.latestEvent;
  if (
    payload.initiative.sequence === initiativeProjection.sequence &&
    payload.initiative.eventHash === current.eventHash
  ) {
    return initiativeProjection;
  }
  const snapshot = initiativeSnapshots?.get(payload.initiative.eventHash);
  if (
    !snapshot ||
    snapshot.sequence !== payload.initiative.sequence ||
    snapshot.latestEvent?.eventHash !== payload.initiative.eventHash
  ) {
    throw new Error(
      `${label} initiative reference does not match an exact historical initiative event`,
    );
  }
  return snapshot;
}

function prepareEvents(events, initiativeId) {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error('Task ledger must contain an activation event');
  }
  const ordered = [...events].sort((left, right) => left.sequence - right.sequence);
  const hashes = new Set();
  for (const [index, event] of ordered.entries()) {
    validateTaskEventEnvelope(event);
    validateTaskEventPayload(event, { initiativeId });
    if (event.eventHash !== hashCanonicalObject(event, 'eventHash')) {
      throw new Error(`Task event ${event.sequence} hash mismatch`);
    }
    if (event.sequence !== index + 1) {
      throw new Error(
        `Task ledger must be contiguous: expected sequence ${index + 1}, received ${event.sequence}`,
      );
    }
    if (hashes.has(event.eventHash)) {
      throw new Error(`Task ledger has duplicate event hash ${event.eventHash}`);
    }
    hashes.add(event.eventHash);
    if (index > 0) {
      const parent = ordered[index - 1];
      if (
        event.parent.sequence !== parent.sequence ||
        event.parent.eventHash !== parent.eventHash
      ) {
        throw new Error(`Task event ${event.sequence} parent does not match the prior event`);
      }
    }
  }
  return ordered;
}

function taskMap(graph) {
  return new Map(graph.tasks.map((task) => [task.id, task]));
}

function dependencyComplete(task, completed) {
  return task.dependsOn.every((dependency) => completed.has(dependency));
}

function deriveReadyTaskIds(graph, completed, blockers, activeClaim, suppressReady = false) {
  if (suppressReady || activeClaim) return [];
  return graph.tasks
    .filter(
      (task) =>
        !completed.has(task.id) && !blockers.has(task.id) && dependencyComplete(task, completed),
    )
    .map((task) => task.id)
    .sort(compareCodeUnits);
}

function deriveParallelReadyGroups(readyTaskIds) {
  return readyTaskIds.length > 1 ? [readyTaskIds] : [];
}

function requireCurrentTask(byId, taskId) {
  const task = byId.get(taskId);
  if (!task) throw new Error(`Task event references unknown current task ${taskId}`);
  return task;
}

function requireClaim(activeClaim, payload) {
  if (!activeClaim) throw new Error(`No active claim exists for ${payload.taskId}`);
  if (activeClaim.taskId !== payload.taskId) {
    throw new Error(`Active claim belongs to ${activeClaim.taskId}, not ${payload.taskId}`);
  }
  if (activeClaim.packetHash !== payload.packetHash) {
    throw new Error('Task outcome packet hash does not match the active claim');
  }
  if (activeClaim.eventHash !== payload.claimEventHash) {
    throw new Error('Task outcome claim event hash does not match the active claim');
  }
}

function completionFromPayload(payload, eventHash, { bootstrap = false } = {}) {
  return {
    taskId: payload.taskId,
    startHead: payload.startHead,
    endHead: payload.endHead,
    changedPaths: payload.changedPaths,
    summary: payload.summary,
    checks: payload.checks,
    eventHash,
    bootstrap,
  };
}

function completionEvidence(completion) {
  return {
    taskId: completion.taskId,
    startHead: completion.startHead,
    endHead: completion.endHead,
    changedPaths: completion.changedPaths,
    summary: completion.summary,
    checks: completion.checks,
  };
}

function sameCompletionEvidence(left, right) {
  return (
    hashCanonicalObject(completionEvidence(left), 'digest') ===
    hashCanonicalObject(completionEvidence(right), 'digest')
  );
}

function reconcileCompletionChain(previousChain, validation, eventHash) {
  if (validation.mode === 'snapshot') {
    for (const [index, previous] of previousChain.entries()) {
      if (!sameCompletionEvidence(previous, validation.imported[index])) {
        throw new Error(`Bootstrap snapshot cannot alter completed task ${previous.taskId}`);
      }
    }
    return [
      ...previousChain,
      ...validation.imported
        .slice(previousChain.length)
        .map((completion) => completionFromPayload(completion, eventHash, { bootstrap: true })),
    ];
  }
  if (validation.mode === 'extension') {
    return [
      ...previousChain,
      ...validation.imported.map((completion) =>
        completionFromPayload(completion, eventHash, { bootstrap: true }),
      ),
    ];
  }
  return validation.imported.map((completion) =>
    completionFromPayload(completion, eventHash, { bootstrap: true }),
  );
}

function replaceCompleted(completed, completionChain) {
  completed.clear();
  for (const completion of completionChain) completed.set(completion.taskId, completion);
}

function replayTaskEvents({
  graph,
  events,
  initiativeProjection,
  initiativeSnapshots,
  resolveGraph,
}) {
  if (initiativeProjection.initiative?.id !== graph.initiativeId) {
    throw new Error('Task graph initiative does not match initiative projection');
  }
  const ordered = prepareEvents(events, graph.initiativeId);
  let currentGraph = graph;
  let byId = taskMap(currentGraph);
  let activeClaim;
  let latestFailure;
  const completed = new Map();
  const blockers = new Map();
  const supersededTasks = new Map();
  let accountedHead = initiativeProjection.initiative.baseSha;
  let completionChain = [];

  for (const event of ordered) {
    const payload = event.payload;
    switch (event.type) {
      case 'task_graph.activated': {
        if (event.sequence !== 1) throw new Error('Task graph activation must be the root event');
        // Activation phase is enforced before append. Replay may occur after the
        // initiative has advanced to validation or integration readiness.
        const snapshot = requireInitiativeReference(
          payload,
          initiativeProjection,
          initiativeSnapshots,
          'Task graph activation',
        );
        if (snapshot.phase !== 'execution') {
          throw new Error('Task graph activation requires initiative execution phase');
        }
        requireGraphBundle(currentGraph, payload, snapshot, 'Task graph activation');
        const validation = validateBootstrapChain({
          graph: currentGraph,
          completions: payload.bootstrapCompletions,
          baseSha: payload.baseSha,
          previousChain: [],
          previousAccountedHead: payload.baseSha,
          replacement: false,
        });
        completionChain = reconcileCompletionChain([], validation, event.eventHash);
        replaceCompleted(completed, completionChain);
        accountedHead = validation.accountedHead;
        break;
      }
      case 'task.claimed': {
        requireCurrentTask(byId, payload.taskId);
        if (activeClaim)
          throw new Error(`An active claim already exists for ${activeClaim.taskId}`);
        const ready = deriveReadyTaskIds(
          currentGraph,
          completed,
          blockers,
          undefined,
          hasInitiativeBlockers(initiativeProjection) ||
            [...blockers.values()].some((blocker) => blocker.criticalTrigger),
        );
        if (!ready.includes(payload.taskId)) {
          throw new Error(`Task ${payload.taskId} is not ready to claim`);
        }
        activeClaim = { ...payload, eventHash: event.eventHash, sequence: event.sequence };
        accountedHead = payload.startHead;
        break;
      }
      case 'task.completed': {
        const task = requireCurrentTask(byId, payload.taskId);
        requireClaim(activeClaim, payload);
        if (!dependencyComplete(task, completed)) {
          throw new Error(`Task ${task.id} dependencies are no longer completed`);
        }
        const completion = completionFromPayload(payload, event.eventHash);
        completed.set(task.id, completion);
        completionChain.push(completion);
        accountedHead = payload.endHead;
        activeClaim = undefined;
        latestFailure = undefined;
        break;
      }
      case 'task.failed':
        requireCurrentTask(byId, payload.taskId);
        requireClaim(activeClaim, payload);
        activeClaim = undefined;
        latestFailure = { ...payload, eventHash: event.eventHash };
        break;
      case 'task.blocked':
        requireCurrentTask(byId, payload.taskId);
        if (completed.has(payload.taskId)) {
          throw new Error(`Completed task ${payload.taskId} cannot be blocked`);
        }
        if (activeClaim && activeClaim.taskId === payload.taskId) activeClaim = undefined;
        if (blockers.has(payload.taskId))
          throw new Error(`Task ${payload.taskId} is already blocked`);
        blockers.set(payload.taskId, { ...payload, eventHash: event.eventHash });
        break;
      case 'task.unblocked':
        requireCurrentTask(byId, payload.taskId);
        if (!blockers.has(payload.taskId)) {
          throw new Error(`Task ${payload.taskId} is not blocked`);
        }
        blockers.delete(payload.taskId);
        break;
      case 'task.released':
        requireCurrentTask(byId, payload.taskId);
        requireClaim(activeClaim, payload);
        activeClaim = undefined;
        break;
      case 'task_graph.replaced': {
        if (activeClaim)
          throw new Error('Task graph cannot be replaced while an active claim exists');
        if (payload.previousGraphHash !== currentGraph.graphHash) {
          throw new Error('Task graph replacement previous hash is stale');
        }
        const replacement = resolveGraph?.(payload.graphHash, payload.taskGraph, payload.plan);
        if (!replacement) throw new Error(`Cannot resolve replacement graph ${payload.graphHash}`);
        const snapshot = requireInitiativeReference(
          payload,
          initiativeProjection,
          initiativeSnapshots,
          'Task graph replacement',
        );
        if (snapshot.phase !== 'execution') {
          throw new Error('Task graph replacement requires initiative execution phase');
        }
        requireGraphBundle(replacement, payload, snapshot, 'Task graph replacement');
        const validation = validateBootstrapChain({
          graph: replacement,
          completions: payload.bootstrapCompletions,
          baseSha: payload.baseSha,
          previousChain: completionChain,
          previousAccountedHead: accountedHead,
          replacement: true,
        });
        const reconciled = reconcileCompletionChain(completionChain, validation, event.eventHash);

        for (const task of currentGraph.tasks) {
          if (!completed.has(task.id)) {
            supersededTasks.set(task.id, { ...task, state: 'superseded' });
          }
        }
        currentGraph = replacement;
        byId = taskMap(currentGraph);
        completionChain = reconciled;
        replaceCompleted(completed, completionChain);
        blockers.clear();
        latestFailure = undefined;
        accountedHead =
          validation.mode === 'extension' && validation.imported.length === 0
            ? accountedHead
            : validation.accountedHead;
        break;
      }
      default:
        throw new Error(`Unknown task event type: ${event.type}`);
    }
  }

  const suppressReady =
    hasInitiativeBlockers(initiativeProjection) ||
    [...blockers.values()].some((blocker) => blocker.criticalTrigger);
  const readyTaskIds = deriveReadyTaskIds(
    currentGraph,
    completed,
    blockers,
    activeClaim,
    suppressReady,
  );
  const tasks = Object.create(null);
  for (const [taskId, task] of supersededTasks) tasks[taskId] = task;
  for (const task of currentGraph.tasks) {
    let state;
    if (completed.has(task.id)) state = 'completed';
    else if (blockers.has(task.id)) state = 'blocked';
    else if (activeClaim?.taskId === task.id) state = 'claimed';
    else if (!dependencyComplete(task, completed)) state = 'pending';
    else state = suppressReady || activeClaim ? 'pending' : 'ready';
    tasks[task.id] = {
      ...task,
      state,
      completion: completed.get(task.id),
      blocker: blockers.get(task.id),
    };
  }
  const allCompleted =
    currentGraph.tasks.length > 0 && currentGraph.tasks.every((task) => completed.has(task.id));

  return Object.freeze({
    schemaVersion: 1,
    initiativeId: currentGraph.initiativeId,
    graph: currentGraph,
    graphHash: currentGraph.graphHash,
    sequence: ordered.at(-1).sequence,
    latestEvent: ordered.at(-1),
    tasks,
    readyTaskIds,
    parallelReadyGroups: deriveParallelReadyGroups(readyTaskIds),
    activeClaim,
    blockers: Object.fromEntries(
      [...blockers.entries()].sort(([left], [right]) => compareCodeUnits(left, right)),
    ),
    completions: Object.fromEntries(
      [...completed.entries()].sort(([left], [right]) => compareCodeUnits(left, right)),
    ),
    completionOrder: completionChain.map((completion) => completion.taskId),
    completedCount: completed.size,
    totalCount: currentGraph.tasks.length,
    accountedHead,
    latestFailure,
    implementationReadyAllowed:
      allCompleted && !activeClaim && blockers.size === 0 && !suppressReady,
  });
}

module.exports = {
  deriveParallelReadyGroups,
  deriveReadyTaskIds,
  replayTaskEvents,
};
