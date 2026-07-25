const fs = require('node:fs');

const { assertSafeRelativePath, resolveInside } = require('../paths');
const { verifyCanonicalHashedObject } = require('../workflow/canonical');
const { assertScopeResolvesInside, parsePathScope, scopesOverlap } = require('./path_scope');

const GRAPH_KEYS = new Set(['schemaVersion', 'initiativeId', 'plan', 'tasks', 'graphHash']);
const TASK_KEYS = new Set([
  'id',
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
]);
const ARTIFACT_KEYS = new Set(['path', 'sha256']);
const OWNER_ROLES = new Set(['sarah', 'marcus', 'layla', 'tariq', 'dev']);
const TASK_KINDS = new Set(['mutation', 'validation']);
const INITIATIVE_ID = /^(\d{4})-(\d{2})-(\d{2})-[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TASK_ID = /^task-(\d{2}|\d{3})$/;
const HEX_64 = /^[a-f0-9]{64}$/;

function compareCodeUnits(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requireObject(value, label) {
  if (
    typeof value !== 'object' ||
    value === null ||
    Array.isArray(value) ||
    (Object.getPrototypeOf(value) !== Object.prototype && Object.getPrototypeOf(value) !== null)
  ) {
    throw new Error(`${label} must be a plain object`);
  }
  return value;
}

function requireExactKeys(value, allowed, label) {
  requireObject(value, label);
  const keys = Reflect.ownKeys(value);
  if (keys.some((key) => typeof key !== 'string')) {
    throw new Error(`${label} fields must be enumerable string data properties`);
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
      throw new Error(`${label} fields must be enumerable string data properties`);
    }
  }
  const unknown = keys.filter((key) => !allowed.has(key));
  const missing = [...allowed].filter((key) => !Object.hasOwn(value, key));
  if (unknown.length > 0 || missing.length > 0) {
    const details = [
      unknown.length > 0 && `unexpected ${unknown.join(', ')}`,
      missing.length > 0 && `missing ${missing.join(', ')}`,
    ].filter(Boolean);
    throw new Error(`${label} fields are invalid: ${details.join('; ')}`);
  }
}

function requireString(value, label) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${label} must be a nonempty string`);
  }
  return value;
}

function requireInitiativeId(value) {
  const match = typeof value === 'string' ? value.match(INITIATIVE_ID) : undefined;
  if (!match) throw new Error('Task graph initiative ID must be a lowercase YYYY-MM-DD slug');
  const date = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new Error('Task graph initiative ID must start with a valid calendar date');
  }
  return value;
}

function validateArtifact(reference, label) {
  requireExactKeys(reference, ARTIFACT_KEYS, `${label} artifact`);
  assertSafeRelativePath(reference.path);
  if (typeof reference.sha256 !== 'string' || !HEX_64.test(reference.sha256)) {
    throw new Error(`${label} artifact sha256 must be 64-character lowercase hexadecimal`);
  }
}

function sameArtifact(left, right) {
  return left?.path === right?.path && left?.sha256 === right?.sha256;
}

function requireArray(value, label, maximum, boundLabel = label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
  if (value.length > maximum) {
    throw new Error(`${label} exceeds maximum ${maximum} ${boundLabel}`);
  }
  return value;
}

function requireUniqueStrings(
  value,
  label,
  maximum,
  { allowEmpty = false, boundLabel = label } = {},
) {
  requireArray(value, label, maximum, boundLabel);
  if (!allowEmpty && value.length === 0) {
    throw new Error(`${label} must be a nonempty array`);
  }
  const seen = new Set();
  for (const entry of value) {
    requireString(entry, `${label} entry`);
    if (seen.has(entry)) throw new Error(`${label} contains duplicate ${entry}`);
    seen.add(entry);
  }
  return value;
}

function validateCommands(commands, limits, taskId) {
  requireArray(
    commands,
    `Task ${taskId} verificationCommands`,
    limits.maxVerificationCommands,
    'verification commands',
  );
  if (commands.length === 0) {
    throw new Error(`Task ${taskId} verificationCommands must be a nonempty array`);
  }
  for (const [index, command] of commands.entries()) {
    if (!Array.isArray(command) || command.length === 0) {
      throw new Error(`Task ${taskId} verification command ${index} must be a nonempty array`);
    }
    for (const argument of command) {
      requireString(argument, `Task ${taskId} verification command ${index} argument`);
    }
  }
}

function validateTextBudget(task, limits) {
  const bytes = Buffer.byteLength(
    [
      task.title,
      task.objective,
      task.recommendedCommitMessage,
      ...task.acceptanceCriteria,
      ...task.verificationCommands.flat(),
      ...task.escalationNotes,
    ].join('\0'),
    'utf8',
  );
  if (bytes > limits.maxTaskTextBytes) {
    throw new Error(`Task ${task.id} exceeds maximum ${limits.maxTaskTextBytes} text bytes`);
  }
}

function validateTask(task, limits, ids, root) {
  const label = `Task ${String(task?.id ?? '<unknown>')}`;
  requireExactKeys(task, TASK_KEYS, `${label.toLowerCase()} fields`);
  const match = typeof task.id === 'string' ? task.id.match(TASK_ID) : undefined;
  if (!match || Number(match[1]) < 1 || Number(match[1]) > 999) {
    throw new Error(`${label} task ID must be task-01 through task-999`);
  }
  if (ids.has(task.id)) throw new Error(`Duplicate task ID ${task.id}`);
  ids.add(task.id);
  requireString(task.title, `${label} title`);
  requireString(task.objective, `${label} objective`);
  requireString(task.recommendedCommitMessage, `${label} recommendedCommitMessage`);
  if (!TASK_KINDS.has(task.kind)) {
    throw new Error(`${label} kind must be mutation or validation`);
  }
  if (!OWNER_ROLES.has(task.ownerRole)) {
    throw new Error(`${label} ownerRole must be sarah, marcus, layla, tariq, or dev`);
  }
  requireUniqueStrings(task.dependsOn, `${label} dependsOn`, limits.maxDependencies, {
    allowEmpty: true,
    boundLabel: 'dependencies',
  });
  requireUniqueStrings(task.readPaths, `${label} readPaths`, limits.maxReadPaths, {
    allowEmpty: true,
    boundLabel: 'read paths',
  });
  requireUniqueStrings(task.writePaths, `${label} writePaths`, limits.maxWritePaths, {
    allowEmpty: true,
    boundLabel: 'write paths',
  });
  for (const scope of [...task.readPaths, ...task.writePaths]) {
    try {
      parsePathScope(scope);
      if (root !== undefined) assertScopeResolvesInside(root, scope);
    } catch (error) {
      throw new Error(`${label} path scope is invalid: ${error.message}`);
    }
  }
  requireUniqueStrings(
    task.acceptanceCriteria,
    `${label} acceptanceCriteria`,
    limits.maxAcceptanceCriteria,
    { boundLabel: 'acceptance criteria' },
  );
  requireUniqueStrings(
    task.escalationNotes,
    `${label} escalationNotes`,
    limits.maxAcceptanceCriteria,
    { allowEmpty: true, boundLabel: 'escalation notes' },
  );
  validateCommands(task.verificationCommands, limits, task.id);
  if (task.kind === 'mutation' && task.writePaths.length === 0) {
    throw new Error(`${label} mutation task requires at least one write path`);
  }
  if (task.kind === 'validation' && task.writePaths.length !== 0) {
    throw new Error(`${label} validation task must not declare write paths`);
  }
  validateTextBudget(task, limits);
}

function validateDependencyGraph(tasks) {
  const byId = new Map(tasks.map((task) => [task.id, task]));
  const errors = [];
  for (const task of tasks) {
    for (const dependency of task.dependsOn) {
      if (dependency === task.id) {
        errors.push(`${task.id} cannot depend on itself`);
      } else if (!byId.has(dependency)) {
        errors.push(`${task.id} has unknown dependency ${dependency}`);
      }
    }
  }

  const colors = new Map();
  const stack = [];
  function visit(taskId) {
    if (colors.get(taskId) === 'done') return;
    if (colors.get(taskId) === 'active') {
      const start = stack.indexOf(taskId);
      errors.push(`Dependency cycle: ${[...stack.slice(start), taskId].join(' -> ')}`);
      return;
    }
    colors.set(taskId, 'active');
    stack.push(taskId);
    for (const dependency of byId.get(taskId).dependsOn) {
      if (byId.has(dependency) && dependency !== taskId) visit(dependency);
    }
    stack.pop();
    colors.set(taskId, 'done');
  }
  for (const taskId of [...byId.keys()].sort(compareCodeUnits)) visit(taskId);
  if (errors.length > 0) throw new Error(errors.join('\n'));

  const reachMemo = new Map();
  function reaches(from, target) {
    const key = `${from}:${target}`;
    if (reachMemo.has(key)) return reachMemo.get(key);
    const result = byId
      .get(from)
      .dependsOn.some((dependency) => dependency === target || reaches(dependency, target));
    reachMemo.set(key, result);
    return result;
  }

  const ordered = [...tasks].sort((left, right) => compareCodeUnits(left.id, right.id));
  for (let leftIndex = 0; leftIndex < ordered.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < ordered.length; rightIndex += 1) {
      const left = ordered[leftIndex];
      const right = ordered[rightIndex];
      if (reaches(left.id, right.id) || reaches(right.id, left.id)) continue;
      if (
        left.writePaths.some((leftScope) =>
          right.writePaths.some((rightScope) => scopesOverlap(leftScope, rightScope)),
        )
      ) {
        errors.push(`${left.id} and ${right.id} have unordered overlapping write scopes`);
      }
    }
  }
  if (errors.length > 0) throw new Error(errors.join('\n'));
}

function validateLimits(limits) {
  requireObject(limits, 'Task graph limits');
  for (const key of [
    'maxTasks',
    'maxDependencies',
    'maxReadPaths',
    'maxWritePaths',
    'maxAcceptanceCriteria',
    'maxVerificationCommands',
    'maxTaskTextBytes',
    'maxPacketBytes',
  ]) {
    if (!Number.isSafeInteger(limits[key]) || limits[key] < 1) {
      throw new Error(`Task graph limit ${key} must be a positive safe integer`);
    }
  }
}

function validateTaskGraph(graph, { limits, expectedInitiativeId, expectedPlan, root }) {
  validateLimits(limits);
  requireExactKeys(graph, GRAPH_KEYS, 'Task graph');
  if (graph.schemaVersion !== 1) throw new Error('Task graph schemaVersion must be 1');
  requireInitiativeId(graph.initiativeId);
  if (graph.initiativeId !== expectedInitiativeId) {
    throw new Error(
      `Task graph initiative ID ${graph.initiativeId} does not match expected ${expectedInitiativeId}`,
    );
  }
  validateArtifact(graph.plan, 'Task graph plan');
  if (!sameArtifact(graph.plan, expectedPlan)) {
    throw new Error('Task graph embedded plan reference does not match the approved plan');
  }
  if (typeof graph.graphHash !== 'string' || !HEX_64.test(graph.graphHash)) {
    throw new Error('Task graph graphHash must be 64-character lowercase hexadecimal');
  }
  if (!Array.isArray(graph.tasks) || graph.tasks.length === 0) {
    throw new Error('Task graph tasks must be a nonempty array');
  }
  if (graph.tasks.length > limits.maxTasks) {
    throw new Error(`Task graph exceeds maximum ${limits.maxTasks} tasks`);
  }
  const ids = new Set();
  for (const task of graph.tasks) validateTask(task, limits, ids, root);
  validateDependencyGraph(graph.tasks);
  return graph;
}

function readExactFile(root, relativePath) {
  assertSafeRelativePath(relativePath);
  const absolutePath = resolveInside(root, relativePath);
  const before = fs.lstatSync(absolutePath);
  if (before.isSymbolicLink()) {
    throw new Error(`Task graph must not be a symbolic link: ${relativePath}`);
  }
  if (!before.isFile()) throw new Error(`Task graph must be a regular file: ${relativePath}`);
  let descriptor;
  try {
    descriptor = fs.openSync(absolutePath, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0));
    const opened = fs.fstatSync(descriptor);
    if (
      !opened.isFile() ||
      opened.dev !== before.dev ||
      opened.ino !== before.ino ||
      opened.size !== before.size ||
      opened.mtimeMs !== before.mtimeMs
    ) {
      throw new Error(`Task graph changed while opening: ${relativePath}`);
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const current = fs.lstatSync(absolutePath);
    for (const stats of [after, current]) {
      if (
        stats.dev !== opened.dev ||
        stats.ino !== opened.ino ||
        stats.size !== opened.size ||
        stats.mtimeMs !== opened.mtimeMs
      ) {
        throw new Error(`Task graph changed while reading: ${relativePath}`);
      }
    }
    return bytes;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function loadTaskGraph(options) {
  const bytes = readExactFile(options.root, options.relativePath);
  const graph = verifyCanonicalHashedObject(bytes, 'graphHash', 'Task graph');
  return validateTaskGraph(graph, options);
}

module.exports = {
  loadTaskGraph,
  validateTaskGraph,
};
