function taskMap(graph) {
  if (!graph || !Array.isArray(graph.tasks)) {
    throw new Error('Bootstrap validation requires an approved task graph');
  }
  return new Map(graph.tasks.map((task) => [task.id, task]));
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
}

function inferMode({ completions, baseSha, previousChain, previousAccountedHead, replacement }) {
  if (!replacement) return { mode: 'activation', checkpoint: baseSha };
  if (completions.length === 0) {
    return { mode: 'extension', checkpoint: previousAccountedHead };
  }
  const first = completions[0];
  const snapshot =
    previousChain.length > 0 &&
    first.taskId === previousChain[0].taskId &&
    first.startHead === baseSha;
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
  replacement = false,
}) {
  if (!Array.isArray(completions) || !Array.isArray(previousChain)) {
    throw new Error('Bootstrap completions and previous chain must be arrays');
  }
  const byId = taskMap(graph);
  const { mode, checkpoint } = inferMode({
    completions,
    baseSha,
    previousChain,
    previousAccountedHead,
    replacement,
  });
  if (mode === 'snapshot') requireSnapshotPrefix(completions, previousChain);

  const imported = completions;
  const chain = mode === 'extension' ? [...previousChain, ...imported] : [...imported];
  const completed = new Set(mode === 'extension' ? previousChain.map((item) => item.taskId) : []);
  const importedIds = new Set();
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
      const label = expectedHead === checkpoint ? 'checkpoint' : 'contiguous chain';
      throw new Error(`Bootstrap ${label} mismatch for ${task.id}`);
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
    accountedHead: chain.at(-1)?.endHead ?? previousAccountedHead,
  });
}

module.exports = {
  validateBootstrapChain,
};
