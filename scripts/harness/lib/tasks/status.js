function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function getTaskStatus(taskProjection) {
  if (!taskProjection) throw new Error('Task status requires an activated task ledger');
  const blockedTasks = Object.entries(taskProjection.blockers ?? {})
    .map(([taskId, blocker]) => ({
      taskId,
      owner: blocker.owner,
      reason: blocker.reason,
    }))
    .sort((left, right) => compareCodeUnits(left.taskId, right.taskId));
  return {
    schemaVersion: 1,
    initiativeId: taskProjection.initiativeId,
    graphHash: taskProjection.graphHash,
    sequence: taskProjection.sequence,
    latestEventType: taskProjection.latestEvent.type,
    completed: taskProjection.completedCount,
    total: taskProjection.totalCount,
    readyTaskIds: [...taskProjection.readyTaskIds],
    parallelReadyGroups: taskProjection.parallelReadyGroups.map((group) => [...group]),
    blockedTasks,
    activeClaim: taskProjection.activeClaim
      ? {
          taskId: taskProjection.activeClaim.taskId,
          assigneeRole: taskProjection.activeClaim.assigneeRole,
          mode: taskProjection.activeClaim.mode,
          packetHash: taskProjection.activeClaim.packetHash,
        }
      : null,
    implementationReadyAllowed: taskProjection.implementationReadyAllowed,
  };
}

function formatTaskStatus(status) {
  const ready = status.readyTaskIds.length > 0 ? status.readyTaskIds.join(', ') : 'none';
  const blocked =
    status.blockedTasks.length > 0
      ? status.blockedTasks.map((entry) => `${entry.taskId}:${entry.owner}`).join(', ')
      : 'none';
  return [
    `Task graph: ${status.completed}/${status.total} completed`,
    `Task ledger sequence: ${status.sequence}`,
    `Active claim: ${status.activeClaim?.taskId ?? 'none'}`,
    `Ready: ${ready}`,
    `Blocked: ${blocked}`,
    `Implementation ready: ${status.implementationReadyAllowed ? 'yes' : 'no'}`,
    '',
  ].join('\n');
}

function getNextTasks(taskProjection) {
  if (!taskProjection) throw new Error('Task next requires an activated task ledger');
  return {
    schemaVersion: 1,
    initiativeId: taskProjection.initiativeId,
    taskLedgerSequence: taskProjection.sequence,
    readyTaskIds: [...taskProjection.readyTaskIds],
    parallelReadyGroups: taskProjection.parallelReadyGroups.map((group) => [...group]),
  };
}

module.exports = {
  formatTaskStatus,
  getNextTasks,
  getTaskStatus,
};
