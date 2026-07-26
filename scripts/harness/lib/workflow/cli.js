const { loadManifest: loadManifestDefault } = require('../manifest');
const { assertSafeRelativePath } = require('../paths');
const { loadWorkflowMachine: loadWorkflowMachineDefault } = require('./machine');
const {
  createArtifactReference: createArtifactReferenceDefault,
  validateArtifactReference: validateArtifactReferenceDefault,
} = require('./evidence');
const { collectDeliveryRevision: collectDeliveryRevisionDefault } = require('./git_revision');
const {
  appendEvent: appendEventDefault,
  loadEventHistory: loadEventHistoryDefault,
  recoverRuntimeFiles: recoverRuntimeFilesDefault,
} = require('./store');
const {
  checkWorkflowStatus: checkWorkflowStatusDefault,
  formatWorkflowStatus: formatWorkflowStatusDefault,
  getWorkflowStatus: getWorkflowStatusDefault,
  listWorkflowStatuses: listWorkflowStatusesDefault,
  selectInitiativeId: selectInitiativeIdDefault,
} = require('./status');
const { verifyWorkflow: verifyWorkflowDefault } = require('./verify');
const { loadCurrentTaskContext, runTaskCli: runTaskCliDefault } = require('../tasks/cli');
const { loadTaskGraph: loadTaskGraphDefault } = require('../tasks/graph');

const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const HEX_40 = /^[a-f0-9]{40}$/;
const RECOVERY_TOKEN = /^[a-f0-9]{32}$/;
const FORBIDDEN_BRANCH_CHARACTERS = new Set(['~', '^', ':', '?', '*', '[', '\\']);
const BLOCKER_OWNERS = new Set(['sarah', 'tariq', 'dev']);
const BLOCKER_RESOLVERS = new Set(['user', 'sarah', 'tariq']);
const RECORD_EVENTS = new Set([
  'spec.submitted',
  'spec.signed',
  'spec.revised',
  'plan.submitted',
  'plan.approved',
  'plan.revised',
  'implementation.ready',
  'review.approved',
  'review.changes_requested',
  'device_qa.passed',
  'device_qa.failed',
  'work.reopened',
  'blocker.opened',
  'blocker.resolved',
  'initiative.cancelled',
]);

class UsageError extends Error {}

function usage(message) {
  throw new UsageError(message);
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

function requireBranch(value) {
  const components = typeof value === 'string' ? value.split('/') : [];
  const hasForbiddenCharacter =
    typeof value === 'string' &&
    Array.from(value).some((character) => {
      const code = character.codePointAt(0);
      return code <= 0x20 || code === 0x7f || FORBIDDEN_BRANCH_CHARACTERS.has(character);
    });
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value === 'main' ||
    value === 'master' ||
    value === 'HEAD' ||
    value.startsWith('-') ||
    value.endsWith('/') ||
    value.endsWith('.') ||
    value.includes('..') ||
    value.includes('@{') ||
    value.includes('//') ||
    hasForbiddenCharacter ||
    components.some(
      (component) =>
        component.length === 0 ||
        component === '.' ||
        component.startsWith('.') ||
        component.endsWith('.lock'),
    )
  ) {
    usage('Initiative branch must be a safe non-main branch');
  }
  return value;
}

function requireNonempty(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    usage(`${label} must be a nonempty value`);
  }
  return value;
}

function requireExpectedSequence(value) {
  if (!/^(0|[1-9]\d*)$/.test(value ?? '')) {
    usage('--expected-sequence must be a nonnegative safe integer');
  }
  const sequence = Number(value);
  if (!Number.isSafeInteger(sequence)) {
    usage('--expected-sequence must be a nonnegative safe integer');
  }
  return sequence;
}

function parseFlags(tokens, { allowed, booleans = new Set() }) {
  const result = {};
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (typeof token !== 'string' || !token.startsWith('--') || token.length === 2) {
      usage(`Unexpected positional argument: ${String(token)}`);
    }
    if (token.includes('=')) usage(`Flags must use a separate value: ${token}`);
    const name = token.slice(2);
    if (!allowed.has(name)) usage(`Unknown flag: --${name}`);
    if (Object.hasOwn(result, name)) usage(`Duplicate flag: --${name}`);
    if (booleans.has(name)) {
      result[name] = true;
      continue;
    }
    const value = tokens[index + 1];
    if (value === undefined || value === '' || value.startsWith('--')) {
      usage(`Missing or empty value for --${name}`);
    }
    result[name] = value;
    index += 1;
  }
  return result;
}

function requireFlags(flags, names) {
  for (const name of names) {
    requireNonempty(flags[name], `--${name}`);
  }
}

function timestamp(clock) {
  const value = clock();
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Workflow clock returned an invalid date');
  return date.toISOString();
}

function authority(flags, recordedBy, decisionBy) {
  if (flags['decision-by'] !== decisionBy) {
    usage(`--decision-by must be ${decisionBy}`);
  }
  return {
    decisionBy,
    recordedBy,
    basis: requireNonempty(flags.basis, '--basis'),
  };
}

function cycleDelivery(projection) {
  if (!projection.delivery || !projection.validationCycleId) {
    throw new Error('No current implementation validation cycle exists');
  }
  return {
    branch: projection.delivery.branch,
    headSha: projection.delivery.headSha,
    contentDigest: projection.delivery.contentDigest,
    validationCycleId: projection.validationCycleId,
  };
}

function collectCycleDelivery(root, projection, collectDeliveryRevision, runGit) {
  const active = cycleDelivery(projection);
  const current = collectDeliveryRevision(
    root,
    projection.initiative,
    runGit ? { runGit } : undefined,
  );
  if (current.branch !== active.branch) {
    throw new Error(
      `Current delivery branch does not match active delivery: expected ${active.branch}; observed ${current.branch}`,
    );
  }
  if (current.contentDigest !== active.contentDigest) {
    throw new Error(
      `Current delivery content digest does not match active delivery: expected ${active.contentDigest}; observed ${current.contentDigest}`,
    );
  }
  return {
    branch: current.branch,
    headSha: current.headSha,
    contentDigest: current.contentDigest,
    validationCycleId: active.validationCycleId,
  };
}

function parseFailedCases(value) {
  let values;
  if (value.trim().startsWith('[')) {
    try {
      values = JSON.parse(value);
    } catch (error) {
      usage(`--failed-cases must be a JSON array or comma-separated list: ${error.message}`);
    }
  } else {
    values = value.split(',').map((entry) => entry.trim());
  }
  if (
    !Array.isArray(values) ||
    values.length === 0 ||
    values.some((entry) => typeof entry !== 'string' || entry.trim().length === 0)
  ) {
    usage('--failed-cases must contain at least one nonempty case');
  }
  const normalized = values.map((entry) => entry.trim());
  if (new Set(normalized).size !== normalized.length) {
    usage('--failed-cases must not contain duplicates');
  }
  return normalized;
}

const EVENT_FLAGS = {
  'spec.submitted': ['spec', 'device-qa-mode', 'device-qa-rationale'],
  'spec.signed': ['decision-by', 'basis'],
  'spec.revised': ['spec', 'device-qa-mode', 'device-qa-rationale', 'reason'],
  'plan.submitted': ['plan', 'task-graph'],
  'plan.approved': ['decision-by', 'basis'],
  'plan.revised': ['plan', 'task-graph', 'reason'],
  'implementation.ready': [],
  'review.approved': ['review', 'decision-by', 'basis'],
  'review.changes_requested': ['review', 'decision-by', 'basis'],
  'device_qa.passed': ['qa', 'decision-by', 'basis', 'device', 'os'],
  'device_qa.failed': ['qa', 'decision-by', 'basis', 'device', 'os', 'failed-cases'],
  'work.reopened': ['reason'],
  'blocker.opened': ['blocker-id', 'trigger', 'owner', 'resolver', 'reason'],
  'blocker.resolved': ['blocker-id', 'decision-by', 'basis', 'resolution'],
  'initiative.cancelled': ['decision-by', 'basis', 'reason'],
};

function buildPayload({
  eventType,
  flags,
  recordedBy,
  root,
  projection,
  createArtifactReference,
  validateArtifactReference,
  collectDeliveryRevision,
  loadTaskGraph,
  taskLimits,
  runGit,
}) {
  const artifact = (name) => {
    try {
      assertSafeRelativePath(flags[name]);
    } catch (error) {
      usage(`--${name} must be a safe repository-relative path: ${error.message}`);
    }
    return createArtifactReference(root, flags[name], runGit ? { runGit } : undefined);
  };
  const qaDeclaration = () => {
    if (!['required', 'not_applicable'].includes(flags['device-qa-mode'])) {
      usage('--device-qa-mode must be required or not_applicable');
    }
    return {
      mode: flags['device-qa-mode'],
      rationale: flags['device-qa-rationale'],
    };
  };
  const validatePlanGraph = (plan, taskGraph) => {
    loadTaskGraph({
      root,
      relativePath: taskGraph.path,
      limits: taskLimits,
      expectedInitiativeId: projection.initiative.id,
      expectedPlan: plan,
    });
    return { plan, taskGraph };
  };

  switch (eventType) {
    case 'spec.submitted':
      return { spec: artifact('spec'), deviceQa: qaDeclaration() };
    case 'spec.signed':
      if (!projection.spec?.current) throw new Error('No current submitted spec exists');
      return {
        spec: validateArtifactReference(
          root,
          projection.spec.current,
          runGit ? { runGit } : undefined,
        ),
        authority: authority(flags, recordedBy, 'user'),
      };
    case 'spec.revised':
      return {
        spec: artifact('spec'),
        deviceQa: qaDeclaration(),
        reason: flags.reason,
      };
    case 'plan.submitted':
      return validatePlanGraph(artifact('plan'), artifact('task-graph'));
    case 'plan.approved':
      if (!projection.plan?.current) throw new Error('No current submitted plan exists');
      return {
        ...validatePlanGraph(
          validateArtifactReference(root, projection.plan.current, runGit ? { runGit } : undefined),
          validateArtifactReference(
            root,
            projection.plan.taskGraph,
            runGit ? { runGit } : undefined,
          ),
        ),
        authority: authority(flags, recordedBy, 'sarah'),
      };
    case 'plan.revised':
      return {
        ...validatePlanGraph(artifact('plan'), artifact('task-graph')),
        reason: flags.reason,
      };
    case 'implementation.ready':
      return {
        delivery: collectDeliveryRevision(
          root,
          projection.initiative,
          runGit ? { runGit } : undefined,
        ),
      };
    case 'review.approved':
    case 'review.changes_requested':
      return {
        verdict: eventType === 'review.approved' ? 'approved' : 'changes_requested',
        review: artifact('review'),
        authority: authority(flags, recordedBy, 'tariq'),
        delivery: collectCycleDelivery(root, projection, collectDeliveryRevision, runGit),
      };
    case 'device_qa.passed':
      return {
        authority: authority(flags, recordedBy, 'user'),
        qa: artifact('qa'),
        device: flags.device,
        os: flags.os,
        delivery: collectCycleDelivery(root, projection, collectDeliveryRevision, runGit),
      };
    case 'device_qa.failed':
      return {
        authority: authority(flags, recordedBy, 'user'),
        qa: artifact('qa'),
        device: flags.device,
        os: flags.os,
        failedCases: parseFailedCases(flags['failed-cases']),
        delivery: collectCycleDelivery(root, projection, collectDeliveryRevision, runGit),
      };
    case 'work.reopened':
      return { reason: flags.reason, delivery: cycleDelivery(projection) };
    case 'blocker.opened': {
      if (!BLOCKER_OWNERS.has(flags.owner)) {
        usage('--owner blocker owner must be sarah, tariq, or dev');
      }
      if (!BLOCKER_RESOLVERS.has(flags.resolver)) {
        usage('--resolver blocker resolver must be user, sarah, or tariq');
      }
      return {
        blockerId: flags['blocker-id'],
        trigger: flags.trigger,
        risk: flags.reason,
        owner: flags.owner,
        requiredResolver: flags.resolver,
      };
    }
    case 'blocker.resolved':
      return {
        blockerId: flags['blocker-id'],
        resolution: flags.resolution,
        authority: authority(flags, recordedBy, 'user'),
      };
    case 'initiative.cancelled':
      return {
        reason: flags.reason,
        authority: authority(flags, recordedBy, 'user'),
      };
    default:
      usage(`Unknown typed workflow event: ${eventType}`);
  }
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function writeResult(stream, value) {
  stream.write(typeof value === 'string' ? value : stableJson(value));
}

function workflowDependencies(options) {
  const loadManifest = options.loadManifest ?? loadManifestDefault;
  const loadWorkflowMachine = options.loadWorkflowMachine ?? loadWorkflowMachineDefault;
  const manifest = options.manifest ?? loadManifest(options.root);
  const machine = options.machine ?? loadWorkflowMachine(options.root, manifest);
  return { manifest, machine };
}

async function runCli(options) {
  const {
    root,
    argv,
    stdout = process.stdout,
    stderr = process.stderr,
    clock = () => new Date(),
    appendEvent = appendEventDefault,
    loadEventHistory = loadEventHistoryDefault,
    recoverRuntimeFiles = recoverRuntimeFilesDefault,
    createArtifactReference = createArtifactReferenceDefault,
    validateArtifactReference = validateArtifactReferenceDefault,
    collectDeliveryRevision = collectDeliveryRevisionDefault,
    getWorkflowStatus = getWorkflowStatusDefault,
    listWorkflowStatuses = listWorkflowStatusesDefault,
    formatWorkflowStatus = formatWorkflowStatusDefault,
    checkWorkflowStatus = checkWorkflowStatusDefault,
    selectInitiativeId = selectInitiativeIdDefault,
    verifyWorkflow = verifyWorkflowDefault,
    withWorkflowLock,
    runVerification,
    runGit,
    loadTaskGraph = loadTaskGraphDefault,
    loadTaskContext,
  } = options;

  try {
    if (!Array.isArray(argv) || argv.length === 0) usage('A workflow command is required');
    const command = argv[0];
    const { manifest, machine } = workflowDependencies(options);

    if (command === 'tasks') {
      return (options.runTaskCli ?? runTaskCliDefault)({
        ...options,
        argv: argv.slice(1),
        manifest,
        machine,
        stdout,
        stderr,
        clock,
      });
    }

    if (command === 'init') {
      const flags = parseFlags(argv.slice(1), {
        allowed: new Set(['id', 'title', 'branch', 'base-sha']),
      });
      requireFlags(flags, ['id', 'title', 'branch', 'base-sha']);
      const initiativeId = requireInitiativeId(flags.id);
      const branch = requireBranch(flags.branch);
      if (!HEX_40.test(flags['base-sha'])) {
        usage('--base-sha must be 40-character lowercase hexadecimal');
      }
      const history = loadEventHistory({ root, initiativeId, machine });
      if (history.events.length > 0 || history.projection) {
        throw new Error(`Workflow initiative ${initiativeId} already has a ledger`);
      }
      const recordedAt = timestamp(clock);
      const result = appendEvent({
        root,
        initiativeId,
        expectedSequence: 1,
        machine,
        clock: () => recordedAt,
        draft: {
          type: 'initiative.created',
          recordedAt,
          recordedBy: { role: 'sarah' },
          payload: {
            title: flags.title,
            branch,
            baseSha: flags['base-sha'],
          },
        },
      });
      const event = result.event ?? result;
      writeResult(stdout, {
        status: 'recorded',
        initiativeId,
        sequence: event.sequence,
        eventType: event.type,
        eventHash: event.eventHash,
        ...(result.path ? { path: result.path } : {}),
      });
      return 0;
    }

    if (command === 'record') {
      const eventType = argv[1];
      if (!eventType || eventType.startsWith('--')) usage('record requires a typed event name');
      if (eventType === 'initiative.created') {
        usage('initiative.created can only be recorded through workflow init');
      }
      if (eventType === 'verification.passed' || eventType === 'verification.failed') {
        usage(`${eventType} can only be recorded through workflow verify`);
      }
      if (!RECORD_EVENTS.has(eventType) || !machine.events[eventType]) {
        usage(`Unknown typed workflow event: ${eventType}`);
      }
      const eventFlags = EVENT_FLAGS[eventType];
      const allowed = new Set(['id', 'expected-sequence', 'recorded-by', ...eventFlags]);
      const flags = parseFlags(argv.slice(2), { allowed });
      requireFlags(flags, ['id', 'expected-sequence', 'recorded-by', ...eventFlags]);
      const initiativeId = requireInitiativeId(flags.id);
      const observedSequence = requireExpectedSequence(flags['expected-sequence']);
      if (observedSequence < 1) {
        usage('--expected-sequence must be at least 1 for an existing initiative');
      }
      const recordedBy = flags['recorded-by'];
      if (!machine.events[eventType].roles.includes(recordedBy)) {
        usage(`Recorder role ${recordedBy} is not authorized for ${eventType}`);
      }
      const history = loadEventHistory({ root, initiativeId, machine });
      if (!history.projection) {
        throw new Error(`Workflow initiative ${initiativeId} has no ledger; run workflow init`);
      }
      if (history.projection.sequence !== observedSequence) {
        throw new Error(
          `Stale expected sequence: observed ${history.projection.sequence}; received ${observedSequence}`,
        );
      }
      if (eventType === 'implementation.ready' && history.projection.plan?.taskGraph) {
        const taskContext = (loadTaskContext ?? loadCurrentTaskContext)(
          {
            root,
            manifest,
            machine,
            loadEventHistory,
            validateArtifactReference,
          },
          initiativeId,
        );
        if (!taskContext.taskProjection.implementationReadyAllowed) {
          throw new Error('The current task graph has incomplete tasks');
        }
      }
      const recordedAt = timestamp(clock);
      const payload = buildPayload({
        eventType,
        flags,
        recordedBy,
        root,
        projection: history.projection,
        createArtifactReference,
        validateArtifactReference,
        collectDeliveryRevision,
        loadTaskGraph,
        taskLimits: manifest.workflow.tasks.limits,
        runGit,
      });
      const result = appendEvent({
        root,
        initiativeId,
        expectedSequence: observedSequence + 1,
        machine,
        clock: () => recordedAt,
        draft: {
          type: eventType,
          recordedAt,
          recordedBy: { role: recordedBy },
          payload,
        },
      });
      const event = result.event ?? result;
      writeResult(stdout, {
        status: 'recorded',
        initiativeId,
        sequence: event.sequence,
        eventType: event.type,
        eventHash: event.eventHash,
        ...(result.path ? { path: result.path } : {}),
      });
      return 0;
    }

    if (command === 'verify') {
      const flags = parseFlags(argv.slice(1), {
        allowed: new Set(['id', 'expected-sequence']),
      });
      requireFlags(flags, ['id', 'expected-sequence']);
      const initiativeId = requireInitiativeId(flags.id);
      const expectedSequence = requireExpectedSequence(flags['expected-sequence']);
      if (expectedSequence < 1) {
        usage('--expected-sequence must be at least 1 for an existing initiative');
      }
      const result = verifyWorkflow({
        root,
        initiativeId,
        expectedSequence,
        machine,
        checks: manifest.verification.checks,
        clock,
        appendEvent,
        loadEventHistory,
        collectDeliveryRevision,
        ...(withWorkflowLock ? { withWorkflowLock } : {}),
        ...(runVerification ? { runVerification } : {}),
        ...(runGit ? { runGit } : {}),
      });
      if (!result.recorded) {
        stderr.write(`workflow verify: ${result.reason}\n`);
        return 1;
      }
      writeResult(stdout, {
        status: 'recorded',
        initiativeId,
        sequence: result.event.sequence,
        eventType: result.event.type,
        eventHash: result.event.eventHash,
      });
      return result.ok ? 0 : 1;
    }

    if (command === 'status') {
      const flags = parseFlags(argv.slice(1), {
        allowed: new Set(['id', 'json']),
        booleans: new Set(['json']),
      });
      if (flags.id !== undefined) requireInitiativeId(flags.id);
      const initiativeId = selectInitiativeId({
        root,
        initiativeId: flags.id,
        machine,
        manifest,
        loadEventHistory,
        ...(runGit
          ? {
              readCurrentBranch: () =>
                String(runGit(['rev-parse', '--abbrev-ref', 'HEAD'])).replace(/\n$/, ''),
            }
          : {}),
      });
      const status = getWorkflowStatus({
        root,
        initiativeId,
        machine,
        manifest,
        loadEventHistory,
        validateArtifactReference,
        collectDeliveryRevision,
        runGit,
      });
      writeResult(stdout, flags.json ? stableJson(status) : formatWorkflowStatus(status));
      return checkWorkflowStatus(status).ok ? 0 : 1;
    }

    if (command === 'list') {
      const flags = parseFlags(argv.slice(1), {
        allowed: new Set(['json']),
        booleans: new Set(['json']),
      });
      const statuses = listWorkflowStatuses({
        root,
        machine,
        manifest,
        loadEventHistory,
        validateArtifactReference,
        collectDeliveryRevision,
        runGit,
      });
      if (flags.json) {
        writeResult(stdout, stableJson(statuses));
      } else if (statuses.length === 0) {
        writeResult(stdout, 'No workflow initiatives found.\n');
      } else {
        writeResult(
          stdout,
          `${statuses
            .map(
              (status) =>
                `${status.initiativeId}\t${status.phase}\t${status.owner}\t${status.sequence}`,
            )
            .join('\n')}\n`,
        );
      }
      return 0;
    }

    if (command === 'check') {
      const flags = parseFlags(argv.slice(1), {
        allowed: new Set(['id']),
      });
      if (flags.id !== undefined) requireInitiativeId(flags.id);
      const initiativeId = selectInitiativeId({
        root,
        initiativeId: flags.id,
        machine,
        loadEventHistory,
        ...(runGit
          ? {
              readCurrentBranch: () =>
                String(runGit(['rev-parse', '--abbrev-ref', 'HEAD'])).replace(/\n$/, ''),
            }
          : {}),
      });
      const status = getWorkflowStatus({
        root,
        initiativeId,
        machine,
        manifest,
        loadEventHistory,
        validateArtifactReference,
        collectDeliveryRevision,
        runGit,
      });
      const result = checkWorkflowStatus(status);
      if (!result.ok) {
        for (const message of result.errors) stderr.write(`workflow check: ${message}\n`);
        return 1;
      }
      stdout.write(`Workflow initiative ${initiativeId} is valid.\n`);
      return 0;
    }

    if (command === 'recover') {
      const flags = parseFlags(argv.slice(1), {
        allowed: new Set(['id', 'token', 'dry-run']),
        booleans: new Set(['dry-run']),
      });
      requireFlags(flags, ['id', 'token']);
      const initiativeId = requireInitiativeId(flags.id);
      if (!RECOVERY_TOKEN.test(flags.token)) {
        usage('--token must be 32-character lowercase hexadecimal');
      }
      const result = recoverRuntimeFiles({
        root,
        initiativeId,
        token: flags.token,
        machine,
        dryRun: flags['dry-run'] === true,
      });
      writeResult(stdout, result);
      return 0;
    }

    if (command === 'transition') {
      usage('Generic transition --to is prohibited; use a typed workflow event');
    }
    if (['push', 'merge', 'finish', 'integrate', 'pr'].includes(command)) {
      usage('Workflow does not authorize repository integration, push, PR, merge, or finish');
    }
    usage(`Unknown workflow command: ${command}`);
  } catch (error) {
    stderr.write(
      `${error instanceof UsageError ? 'workflow usage' : 'workflow'}: ${error.message}\n`,
    );
    return error instanceof UsageError ? 2 : 1;
  }
}

module.exports = {
  runCli,
};
