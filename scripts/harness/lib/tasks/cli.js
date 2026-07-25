const { canonicalStringify, parseCanonicalJson } = require('../workflow/canonical');
const {
  validateArtifactReference: validateArtifactReferenceDefault,
} = require('../workflow/evidence');
const { loadEventHistory: loadEventHistoryDefault } = require('../workflow/store');
const {
  collectTaskCompletionRevision: collectTaskCompletionRevisionDefault,
  collectTaskStartRevision: collectTaskStartRevisionDefault,
} = require('./git_scope');
const { loadTaskGraph: loadTaskGraphDefault } = require('./graph');
const { createTaskPacket: createTaskPacketDefault } = require('./packet');
const {
  appendTaskEvent: appendTaskEventDefault,
  loadTaskHistory: loadTaskHistoryDefault,
  recoverTaskRuntimeFiles: recoverTaskRuntimeFilesDefault,
} = require('./store');
const {
  formatTaskStatus: formatTaskStatusDefault,
  getNextTasks: getNextTasksDefault,
  getTaskStatus: getTaskStatusDefault,
} = require('./status');

const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const TASK_ID = /^task-(?:0[1-9]|[1-9]\d|[1-9]\d{2})$/u;
const HEX_64 = /^[a-f0-9]{64}$/u;
const RECOVERY_TOKEN = /^[a-f0-9]{32}$/u;
const ASSIGNEE_ROLES = new Set(['sarah', 'marcus', 'layla', 'tariq', 'dev']);
const BLOCKER_OWNERS = new Set(['user', 'sarah', 'tariq', 'dev']);

class TaskUsageError extends Error {}

function usage(message) {
  throw new TaskUsageError(message);
}

function parseFlags(tokens, { allowed, booleans = new Set() }) {
  const flags = Object.create(null);
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (typeof token !== 'string' || !token.startsWith('--') || token.length === 2) {
      usage(`Unexpected positional argument: ${String(token)}`);
    }
    if (token.includes('=')) usage(`Flags must use a separate value: ${token}`);
    const name = token.slice(2);
    if (!allowed.has(name)) usage(`Unknown flag: --${name}`);
    if (Object.hasOwn(flags, name)) usage(`Duplicate flag: --${name}`);
    if (booleans.has(name)) {
      flags[name] = true;
      continue;
    }
    const value = tokens[index + 1];
    if (value === undefined || value === '' || value.startsWith('--')) {
      usage(`Missing or empty value for --${name}`);
    }
    flags[name] = value;
    index += 1;
  }
  return flags;
}

function requireFlags(flags, names) {
  for (const name of names) {
    if (typeof flags[name] !== 'string' || flags[name].trim().length === 0) {
      usage(`--${name} must be a nonempty value`);
    }
  }
}

function requireInitiativeId(value) {
  const match = typeof value === 'string' ? value.match(INITIATIVE_ID) : undefined;
  if (!match) usage('Initiative ID must be a lowercase YYYY-MM-DD slug');
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    usage('Initiative ID must start with a valid calendar date');
  }
  return value;
}

function requireTaskId(value) {
  if (typeof value !== 'string' || !TASK_ID.test(value)) {
    usage('--task must be task-01 through task-999');
  }
  return value;
}

function requireSequence(value, label) {
  if (!/^(?:0|[1-9]\d*)$/u.test(value ?? '')) {
    usage(`${label} must be a nonnegative safe integer`);
  }
  const sequence = Number(value);
  if (!Number.isSafeInteger(sequence)) usage(`${label} must be a nonnegative safe integer`);
  return sequence;
}

function requireHash(value, label) {
  if (typeof value !== 'string' || !HEX_64.test(value)) {
    usage(`${label} must be 64-character lowercase hexadecimal`);
  }
  return value;
}

function requireBoolean(value, label) {
  if (value !== 'true' && value !== 'false') usage(`${label} must be true or false`);
  return value === 'true';
}

function parseCanonicalArgument(value, label) {
  try {
    const source = value.endsWith('\n') ? value : `${value}\n`;
    return parseCanonicalJson(source, label);
  } catch (error) {
    usage(`${label} must be canonical JSON: ${error.message}`);
  }
}

function timestamp(clock) {
  const date = clock();
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) throw new Error('Task clock returned an invalid date');
  return value.toISOString();
}

function findTask(graph, taskId) {
  const task = graph.tasks.find((entry) => entry.id === taskId);
  if (!task) throw new Error(`Unknown task ${taskId}`);
  return task;
}

function validateRequiredChecks(task, checks) {
  if (!Array.isArray(checks) || checks.length === 0) {
    usage('--checks must contain at least one check');
  }
  for (const command of task.verificationCommands) {
    const match = checks.find(
      (check) => JSON.stringify(check?.command) === JSON.stringify(command),
    );
    if (!match) {
      usage(`--checks is missing required command ${JSON.stringify(command)}`);
    }
    if (match.passed !== true) {
      usage(`--checks required command did not pass: ${JSON.stringify(command)}`);
    }
  }
  return checks;
}

function requireObservedSequence(taskProjection, value) {
  const observed = requireSequence(value, '--expected-sequence');
  if (observed < 1) usage('--expected-sequence must be at least 1');
  if (observed !== taskProjection.sequence) {
    throw new Error(
      `Stale expected sequence: observed ${taskProjection.sequence}; received ${observed}`,
    );
  }
  return observed;
}

function validateInitiative(projection, initiativeId) {
  if (!projection) throw new Error(`Workflow initiative ${initiativeId} has no ledger`);
  if (projection.initiative?.id !== initiativeId) {
    throw new Error('Initiative projection ID does not match the requested task ledger');
  }
  if (!projection.spec?.signed || !projection.plan?.approved || !projection.plan?.taskGraph) {
    throw new Error('Task commands require a signed spec and approved plan/task-graph bundle');
  }
}

function defaultContextLoaders(options) {
  const {
    root,
    machine,
    manifest,
    loadEventHistory = loadEventHistoryDefault,
    validateArtifactReference = validateArtifactReferenceDefault,
    loadTaskGraph = loadTaskGraphDefault,
    loadTaskHistory = loadTaskHistoryDefault,
  } = options;
  const limits = manifest.workflow.tasks.limits;

  function loadGraphReference(initiativeId, plan, reference) {
    const validatedReference = validateArtifactReference(root, reference);
    return loadTaskGraph({
      root,
      relativePath: validatedReference.path,
      limits,
      expectedInitiativeId: initiativeId,
      expectedPlan: plan,
    });
  }

  function loadInitiativeProjection(initiativeId) {
    const history = loadEventHistory({ root, initiativeId, machine });
    validateInitiative(history.projection, initiativeId);
    validateArtifactReference(root, history.projection.spec.current);
    validateArtifactReference(root, history.projection.plan.current);
    return history.projection;
  }

  function resolveGraph(initiativeId) {
    return (graphHash, graphReference, planReference) => {
      const graph = loadGraphReference(initiativeId, planReference, graphReference);
      if (graph.graphHash !== graphHash) {
        throw new Error(`Resolved task graph hash does not match ${graphHash}`);
      }
      return graph;
    };
  }

  function loadInitiativeContext(initiativeId, relativeGraphPath) {
    const initiativeProjection = loadInitiativeProjection(initiativeId);
    if (
      relativeGraphPath !== undefined &&
      relativeGraphPath !== initiativeProjection.plan.taskGraph.path
    ) {
      throw new Error('Requested task graph is not the approved task-graph artifact');
    }
    const graph = loadGraphReference(
      initiativeId,
      initiativeProjection.plan.current,
      initiativeProjection.plan.taskGraph,
    );
    const graphResolver = resolveGraph(initiativeId);
    const taskHistory = loadTaskHistory({
      root,
      initiativeId,
      graph,
      initiativeProjection,
      resolveGraph: graphResolver,
    });
    return {
      graph,
      initiativeProjection,
      taskHistory,
      limits,
      resolveGraph: graphResolver,
    };
  }

  function loadTaskContext(initiativeId) {
    const context = loadInitiativeContext(initiativeId);
    if (!context.taskHistory.projection) {
      throw new Error(`Task graph for ${initiativeId} is not activated`);
    }
    return {
      ...context,
      graph: context.taskHistory.projection.graph,
      taskProjection: context.taskHistory.projection,
    };
  }

  return { loadInitiativeContext, loadTaskContext };
}

function taskContext(options, initiativeId) {
  const loaders = defaultContextLoaders(options);
  return (options.loadTaskContext ?? loaders.loadTaskContext)(initiativeId);
}

function initiativeContext(options, initiativeId, graphPath) {
  const loaders = defaultContextLoaders(options);
  return (options.loadInitiativeContext ?? loaders.loadInitiativeContext)(initiativeId, graphPath);
}

function appendResult(options, context, observedSequence, draft) {
  const result = (options.appendTaskEvent ?? appendTaskEventDefault)({
    root: options.root,
    initiativeId: context.initiativeProjection.initiative.id,
    expectedSequence: observedSequence + 1,
    draft,
    graph: context.graph,
    initiativeProjection: context.initiativeProjection,
    resolveGraph: context.resolveGraph,
  });
  const event = result.event ?? result;
  options.stdout.write(
    canonicalStringify({
      status: 'recorded',
      initiativeId: event.initiativeId ?? context.initiativeProjection.initiative.id,
      sequence: event.sequence,
      eventType: event.type,
      eventHash: event.eventHash,
      ...(result.path ? { path: result.path } : {}),
    }),
  );
  return 0;
}

function claimedPacket(context) {
  const claim = context.taskProjection.activeClaim;
  if (!claim) throw new Error('No active task claim exists');
  const beforeClaim = {
    ...context.taskProjection,
    sequence: claim.sequence - 1,
    readyTaskIds: [claim.taskId],
    activeClaim: undefined,
  };
  return createTaskPacketDefault({ ...context, taskProjection: beforeClaim }, claim.taskId);
}

function requireMatchingClaim(context, taskId, packetHash) {
  const claim = context.taskProjection.activeClaim;
  if (!claim || claim.taskId !== taskId) {
    throw new Error(`No active matching claim exists for ${taskId}`);
  }
  if (claim.packetHash !== packetHash) throw new Error('Packet hash does not match active claim');
  const packet = claimedPacket(context);
  if (packet.packetHash !== packetHash) {
    throw new Error('Packet hash is stale for the current initiative and task state');
  }
  return claim;
}

function commonMutation(options, command, fields, buildPayload) {
  const flags = parseFlags(options.argv.slice(1), {
    allowed: new Set(['id', 'task', 'expected-sequence', ...fields]),
  });
  requireFlags(flags, ['id', 'task', 'expected-sequence', ...fields]);
  const initiativeId = requireInitiativeId(flags.id);
  const taskId = requireTaskId(flags.task);
  const context = taskContext(options, initiativeId);
  const observed = requireObservedSequence(context.taskProjection, flags['expected-sequence']);
  findTask(context.graph, taskId);
  return appendResult(options, context, observed, {
    type: command,
    recordedAt: timestamp(options.clock),
    recordedBy: { role: 'sarah' },
    payload: buildPayload(flags, context),
  });
}

async function runTaskCli(options) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const normalized = {
    ...options,
    stdout,
    stderr,
    clock: options.clock ?? (() => new Date()),
  };
  try {
    if (!Array.isArray(normalized.argv) || normalized.argv.length === 0) {
      usage('A task command is required');
    }
    const command = normalized.argv[0];

    if (command === 'status' || command === 'next') {
      const flags = parseFlags(normalized.argv.slice(1), {
        allowed: new Set(['id', 'json']),
        booleans: new Set(['json']),
      });
      requireFlags(flags, ['id']);
      const context = taskContext(normalized, requireInitiativeId(flags.id));
      const value =
        command === 'status'
          ? (normalized.getTaskStatus ?? getTaskStatusDefault)(context.taskProjection)
          : (normalized.getNextTasks ?? getNextTasksDefault)(context.taskProjection);
      if (flags.json) {
        stdout.write(canonicalStringify(value));
      } else if (command === 'status') {
        stdout.write((normalized.formatTaskStatus ?? formatTaskStatusDefault)(value));
      } else {
        stdout.write(
          `${value.readyTaskIds.length > 0 ? value.readyTaskIds.join('\n') : 'No ready tasks.'}\n`,
        );
      }
      return 0;
    }

    if (command === 'packet') {
      const flags = parseFlags(normalized.argv.slice(1), {
        allowed: new Set(['id', 'task', 'json']),
        booleans: new Set(['json']),
      });
      requireFlags(flags, ['id', 'task']);
      if (!flags.json) usage('tasks packet requires --json');
      const context = taskContext(normalized, requireInitiativeId(flags.id));
      const packet = (normalized.createTaskPacket ?? createTaskPacketDefault)(
        context,
        requireTaskId(flags.task),
      );
      stdout.write(canonicalStringify(packet));
      return 0;
    }

    if (command === 'activate') {
      const flags = parseFlags(normalized.argv.slice(1), {
        allowed: new Set([
          'id',
          'expected-initiative-sequence',
          'task-graph',
          'bootstrap-completions',
        ]),
      });
      requireFlags(flags, ['id', 'expected-initiative-sequence', 'task-graph']);
      const initiativeId = requireInitiativeId(flags.id);
      const context = initiativeContext(normalized, initiativeId, flags['task-graph']);
      const expectedInitiative = requireSequence(
        flags['expected-initiative-sequence'],
        '--expected-initiative-sequence',
      );
      if (expectedInitiative !== context.initiativeProjection.sequence) {
        throw new Error(
          `Stale expected initiative sequence: observed ${context.initiativeProjection.sequence}; received ${expectedInitiative}`,
        );
      }
      if (context.initiativeProjection.phase !== 'execution') {
        throw new Error('Task graph activation requires initiative execution phase');
      }
      if (context.taskHistory.events.length !== 0) {
        throw new Error(`Task graph for ${initiativeId} is already activated`);
      }
      const completions = flags['bootstrap-completions']
        ? parseCanonicalArgument(flags['bootstrap-completions'], '--bootstrap-completions')
        : [];
      if (!Array.isArray(completions)) usage('--bootstrap-completions must be an array');
      for (const completion of completions) {
        const task = findTask(context.graph, completion.taskId);
        validateRequiredChecks(task, completion.checks);
        const observed = (
          normalized.collectTaskCompletionRevision ?? collectTaskCompletionRevisionDefault
        )(
          normalized.root,
          {
            branch: context.initiativeProjection.initiative.branch,
            startHead: completion.startHead,
          },
          task,
          { endHead: completion.endHead },
        );
        if (
          observed.startHead !== completion.startHead ||
          observed.endHead !== completion.endHead ||
          JSON.stringify(observed.changedPaths) !== JSON.stringify(completion.changedPaths)
        ) {
          throw new Error(`Bootstrap completion evidence mismatch for ${completion.taskId}`);
        }
      }
      return appendResult(normalized, context, 0, {
        type: 'task_graph.activated',
        recordedAt: timestamp(normalized.clock),
        recordedBy: { role: 'tariq' },
        payload: {
          initiative: {
            sequence: context.initiativeProjection.sequence,
            eventHash: context.initiativeProjection.latestEvent.eventHash,
          },
          spec: context.initiativeProjection.spec.current,
          plan: context.initiativeProjection.plan.current,
          taskGraph: context.initiativeProjection.plan.taskGraph,
          branch: context.initiativeProjection.initiative.branch,
          baseSha: context.initiativeProjection.initiative.baseSha,
          graphHash: context.graph.graphHash,
          bootstrapCompletions: completions,
        },
      });
    }

    if (command === 'claim') {
      const flags = parseFlags(normalized.argv.slice(1), {
        allowed: new Set([
          'id',
          'task',
          'packet-hash',
          'expected-sequence',
          'mode',
          'assignee-role',
          'basis',
        ]),
      });
      requireFlags(flags, [
        'id',
        'task',
        'packet-hash',
        'expected-sequence',
        'mode',
        'assignee-role',
        'basis',
      ]);
      const initiativeId = requireInitiativeId(flags.id);
      const taskId = requireTaskId(flags.task);
      const context = taskContext(normalized, initiativeId);
      const observed = requireObservedSequence(context.taskProjection, flags['expected-sequence']);
      if (!['inline', 'dispatched'].includes(flags.mode)) {
        usage('--mode must be inline or dispatched');
      }
      if (!ASSIGNEE_ROLES.has(flags['assignee-role'])) {
        usage('--assignee-role is invalid');
      }
      const packet = (normalized.createTaskPacket ?? createTaskPacketDefault)(context, taskId);
      requireHash(flags['packet-hash'], '--packet-hash');
      if (packet.packetHash !== flags['packet-hash']) {
        throw new Error('Packet hash does not match the exact current packet');
      }
      const revision = (normalized.collectTaskStartRevision ?? collectTaskStartRevisionDefault)(
        normalized.root,
        context.initiativeProjection.initiative.branch,
      );
      return appendResult(normalized, context, observed, {
        type: 'task.claimed',
        recordedAt: timestamp(normalized.clock),
        recordedBy: { role: 'sarah' },
        payload: {
          taskId,
          packetHash: packet.packetHash,
          mode: flags.mode,
          assigneeRole: flags['assignee-role'],
          branch: revision.branch,
          startHead: revision.startHead,
          basis: flags.basis,
        },
      });
    }

    if (command === 'complete') {
      return commonMutation(
        normalized,
        'task.completed',
        ['packet-hash', 'summary', 'checks'],
        (flags, context) => {
          const taskId = requireTaskId(flags.task);
          const packetHash = requireHash(flags['packet-hash'], '--packet-hash');
          const claim = requireMatchingClaim(context, taskId, packetHash);
          const task = findTask(context.graph, taskId);
          const checks = validateRequiredChecks(
            task,
            parseCanonicalArgument(flags.checks, '--checks'),
          );
          const revision = (
            normalized.collectTaskCompletionRevision ?? collectTaskCompletionRevisionDefault
          )(normalized.root, { branch: claim.branch, startHead: claim.startHead }, task);
          return {
            taskId,
            packetHash,
            claimEventHash: claim.eventHash,
            startHead: revision.startHead,
            endHead: revision.endHead,
            changedPaths: revision.changedPaths,
            summary: flags.summary,
            checks,
          };
        },
      );
    }

    if (command === 'fail') {
      return commonMutation(
        normalized,
        'task.failed',
        ['packet-hash', 'summary', 'changes-remain'],
        (flags, context) => {
          const packetHash = requireHash(flags['packet-hash'], '--packet-hash');
          const claim = requireMatchingClaim(context, flags.task, packetHash);
          return {
            taskId: flags.task,
            packetHash,
            claimEventHash: claim.eventHash,
            summary: flags.summary,
            changesRemain: requireBoolean(flags['changes-remain'], '--changes-remain'),
          };
        },
      );
    }

    if (command === 'block') {
      return commonMutation(
        normalized,
        'task.blocked',
        ['owner', 'reason', 'critical-trigger'],
        (flags) => {
          if (!BLOCKER_OWNERS.has(flags.owner)) usage('--owner is invalid');
          return {
            taskId: flags.task,
            owner: flags.owner,
            reason: flags.reason,
            criticalTrigger: requireBoolean(flags['critical-trigger'], '--critical-trigger'),
          };
        },
      );
    }

    if (command === 'unblock') {
      return commonMutation(normalized, 'task.unblocked', ['resolution', 'basis'], (flags) => ({
        taskId: flags.task,
        resolution: flags.resolution,
        basis: flags.basis,
      }));
    }

    if (command === 'release') {
      return commonMutation(
        normalized,
        'task.released',
        ['packet-hash', 'reason'],
        (flags, context) => {
          const packetHash = requireHash(flags['packet-hash'], '--packet-hash');
          const claim = requireMatchingClaim(context, flags.task, packetHash);
          return {
            taskId: flags.task,
            packetHash,
            claimEventHash: claim.eventHash,
            reason: flags.reason,
          };
        },
      );
    }

    if (command === 'replace') {
      const flags = parseFlags(normalized.argv.slice(1), {
        allowed: new Set([
          'id',
          'expected-sequence',
          'expected-initiative-sequence',
          'task-graph',
          'reason',
          'bootstrap-completions',
        ]),
      });
      requireFlags(flags, [
        'id',
        'expected-sequence',
        'expected-initiative-sequence',
        'task-graph',
        'reason',
      ]);
      const initiativeId = requireInitiativeId(flags.id);
      const previous = taskContext(normalized, initiativeId);
      const observed = requireObservedSequence(previous.taskProjection, flags['expected-sequence']);
      if (previous.taskProjection.activeClaim) {
        throw new Error('Task graph cannot be replaced while an active claim exists');
      }
      const context = initiativeContext(normalized, initiativeId, flags['task-graph']);
      const expectedInitiative = requireSequence(
        flags['expected-initiative-sequence'],
        '--expected-initiative-sequence',
      );
      if (expectedInitiative !== context.initiativeProjection.sequence) {
        throw new Error(
          `Stale expected initiative sequence: observed ${context.initiativeProjection.sequence}; received ${expectedInitiative}`,
        );
      }
      const completions = flags['bootstrap-completions']
        ? parseCanonicalArgument(flags['bootstrap-completions'], '--bootstrap-completions')
        : [];
      return appendResult(
        normalized,
        { ...context, graph: previous.graph, resolveGraph: () => context.graph },
        observed,
        {
          type: 'task_graph.replaced',
          recordedAt: timestamp(normalized.clock),
          recordedBy: { role: 'tariq' },
          payload: {
            initiative: {
              sequence: context.initiativeProjection.sequence,
              eventHash: context.initiativeProjection.latestEvent.eventHash,
            },
            spec: context.initiativeProjection.spec.current,
            plan: context.initiativeProjection.plan.current,
            taskGraph: context.initiativeProjection.plan.taskGraph,
            branch: context.initiativeProjection.initiative.branch,
            baseSha: context.initiativeProjection.initiative.baseSha,
            graphHash: context.graph.graphHash,
            previousGraphHash: previous.graph.graphHash,
            reason: flags.reason,
            bootstrapCompletions: completions,
          },
        },
      );
    }

    if (command === 'recover') {
      const flags = parseFlags(normalized.argv.slice(1), {
        allowed: new Set(['id', 'token', 'dry-run']),
        booleans: new Set(['dry-run']),
      });
      requireFlags(flags, ['id', 'token']);
      const initiativeId = requireInitiativeId(flags.id);
      if (!RECOVERY_TOKEN.test(flags.token)) {
        usage('--token must be 32-character lowercase hexadecimal');
      }
      const context = initiativeContext(normalized, initiativeId);
      const result = (normalized.recoverTaskRuntimeFiles ?? recoverTaskRuntimeFilesDefault)({
        root: normalized.root,
        initiativeId,
        token: flags.token,
        graph: context.graph,
        initiativeProjection: context.initiativeProjection,
        dryRun: flags['dry-run'] === true,
      });
      stdout.write(canonicalStringify(result));
      return 0;
    }

    usage(`Unknown task command: ${command}`);
  } catch (error) {
    stderr.write(
      `${error instanceof TaskUsageError ? 'workflow tasks usage' : 'workflow tasks'}: ${error.message}\n`,
    );
    return error instanceof TaskUsageError ? 2 : 1;
  }
}

module.exports = {
  runTaskCli,
};
