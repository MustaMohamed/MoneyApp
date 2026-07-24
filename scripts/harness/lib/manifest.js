const fs = require('node:fs');
const { assertSafeRelativePath, pathIdentity, resolveInside } = require('./paths');

const PHASE_ONE_EXECUTABLE_GUARDS = new Set(['VERIFY-SIX-CHECKS']);
const WORKFLOW_V1_FIELDS = ['version', 'internalGuards', 'states', 'roles', 'events'];
const WORKFLOW_V1_EVENT_FIELDS = ['origins', 'destination', 'roles', 'guard'];
const WORKFLOW_V1_INTERNAL_GUARDS = ['INIT-NON-MAIN', 'DELIVERY-EVIDENCE-FRESH'];
const WORKFLOW_V1_STATES = [
  'brainstorming',
  'awaiting_spec_signoff',
  'planning',
  'awaiting_plan_approval',
  'execution',
  'validation',
  'awaiting_device_qa',
  'integration_ready',
  'cancelled',
];
const WORKFLOW_V1_ACTIVE_STATES = WORKFLOW_V1_STATES.slice(0, -1);
const WORKFLOW_V1_ROLES = ['user', 'sarah', 'tariq', 'dev', 'system'];

function workflowEvent(origins, destination, roles, guard) {
  return { origins, destination, roles, guard };
}

const WORKFLOW_V1_EVENTS = {
  'initiative.created': workflowEvent(['none'], 'brainstorming', ['sarah'], 'INIT-NON-MAIN'),
  'spec.submitted': workflowEvent(
    ['brainstorming'],
    'awaiting_spec_signoff',
    ['sarah', 'tariq'],
    'GATE-SPEC-SIGNOFF',
  ),
  'spec.signed': workflowEvent(
    ['awaiting_spec_signoff'],
    'planning',
    ['sarah'],
    'GATE-SPEC-SIGNOFF',
  ),
  'spec.revised': workflowEvent(
    WORKFLOW_V1_STATES.slice(1, -1),
    'awaiting_spec_signoff',
    ['sarah', 'tariq'],
    'GATE-SPEC-SIGNOFF',
  ),
  'plan.submitted': workflowEvent(
    ['planning'],
    'awaiting_plan_approval',
    ['tariq'],
    'LEAD-PLAN-APPROVAL',
  ),
  'plan.approved': workflowEvent(
    ['awaiting_plan_approval'],
    'execution',
    ['sarah'],
    'LEAD-PLAN-APPROVAL',
  ),
  'plan.revised': workflowEvent(
    WORKFLOW_V1_STATES.slice(3, -1),
    'awaiting_plan_approval',
    ['tariq'],
    'LEAD-PLAN-APPROVAL',
  ),
  'implementation.ready': workflowEvent(
    ['execution'],
    'validation',
    ['dev'],
    'DELIVERY-EVIDENCE-FRESH',
  ),
  'review.approved': workflowEvent(['validation'], 'validation', ['tariq'], 'LEAD-REVIEW-VERDICT'),
  'review.changes_requested': workflowEvent(
    ['validation'],
    'execution',
    ['tariq'],
    'LEAD-REVIEW-VERDICT',
  ),
  'verification.passed': workflowEvent(
    ['validation'],
    'validation',
    ['system'],
    'VERIFY-SIX-CHECKS',
  ),
  'verification.failed': workflowEvent(
    ['validation'],
    'validation',
    ['system'],
    'VERIFY-SIX-CHECKS',
  ),
  'device_qa.passed': workflowEvent(
    ['awaiting_device_qa'],
    'integration_ready',
    ['sarah'],
    'GATE-DEVICE-QA',
  ),
  'device_qa.failed': workflowEvent(
    ['awaiting_device_qa'],
    'execution',
    ['sarah'],
    'GATE-DEVICE-QA',
  ),
  'work.reopened': workflowEvent(
    ['validation', 'awaiting_device_qa', 'integration_ready'],
    'execution',
    ['sarah', 'tariq', 'dev'],
    'DELIVERY-EVIDENCE-FRESH',
  ),
  'blocker.opened': workflowEvent(
    WORKFLOW_V1_ACTIVE_STATES,
    'same',
    ['sarah', 'tariq', 'dev'],
    'GATE-CRITICAL-TRIGGER',
  ),
  'blocker.resolved': workflowEvent(
    WORKFLOW_V1_ACTIVE_STATES,
    'same',
    ['sarah'],
    'GATE-CRITICAL-TRIGGER',
  ),
  'initiative.cancelled': workflowEvent(
    WORKFLOW_V1_STATES.slice(0, -2),
    'cancelled',
    ['sarah'],
    'AUTH-USER-INTEGRATION',
  ),
};
const WORKFLOW_V1_INTEGRATION_READY_EVENTS = [
  'spec.revised',
  'plan.revised',
  'work.reopened',
  'blocker.opened',
  'blocker.resolved',
];

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function requireObject(value, label) {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
}

function requireUniqueStringArray(value, label, duplicateLabel) {
  requireArray(value, label);
  const seen = new Set();
  for (const entry of value) {
    requireNonEmptyString(entry, `${label} entry`);
    if (seen.has(entry)) throw new Error(`duplicate ${duplicateLabel}: ${entry}`);
    seen.add(entry);
  }
  return seen;
}

function requireExactKeys(value, expectedKeys, label) {
  const actualKeys = Object.keys(value);
  const missing = expectedKeys.filter((key) => !actualKeys.includes(key));
  const extra = actualKeys.filter((key) => !expectedKeys.includes(key));
  if (missing.length > 0 || extra.length > 0) {
    const differences = [
      missing.length > 0 && `missing ${missing.join(', ')}`,
      extra.length > 0 && `extra ${extra.join(', ')}`,
    ].filter(Boolean);
    throw new Error(`${label} mismatch: ${differences.join('; ')}`);
  }
}

function requireExactArray(value, expected, label) {
  if (value.length !== expected.length || value.some((entry, index) => entry !== expected[index])) {
    throw new Error(`${label} must equal ${expected.join(', ')}`);
  }
}

function parseJsonWithoutDuplicateKeys(source, label) {
  const parsed = JSON.parse(source);
  let offset = 0;

  function skipWhitespace() {
    while (/\s/.test(source[offset] ?? '')) offset += 1;
  }

  function scanString() {
    const start = offset;
    offset += 1;
    while (source[offset] !== '"') {
      if (source[offset] === '\\') offset += 1;
      offset += 1;
    }
    offset += 1;
    return JSON.parse(source.slice(start, offset));
  }

  function scanValue(path) {
    skipWhitespace();
    if (source[offset] === '{') {
      scanObject(path);
      return;
    }
    if (source[offset] === '[') {
      scanArray(path);
      return;
    }
    if (source[offset] === '"') {
      scanString();
      return;
    }
    while (!/[\s,\]}]/.test(source[offset] ?? '')) offset += 1;
  }

  function scanObject(path) {
    offset += 1;
    skipWhitespace();
    const keys = new Set();
    while (source[offset] !== '}') {
      const key = scanString();
      if (keys.has(key)) {
        if (path.length === 1 && path[0] === 'events') {
          throw new Error(`duplicate event in ${label}: ${key}`);
        }
        throw new Error(`duplicate JSON key in ${label}: ${[...path, key].join('.')}`);
      }
      keys.add(key);
      skipWhitespace();
      offset += 1;
      scanValue([...path, key]);
      skipWhitespace();
      if (source[offset] === ',') {
        offset += 1;
        skipWhitespace();
      }
    }
    offset += 1;
  }

  function scanArray(path) {
    offset += 1;
    skipWhitespace();
    let index = 0;
    while (source[offset] !== ']') {
      scanValue([...path, String(index)]);
      index += 1;
      skipWhitespace();
      if (source[offset] === ',') {
        offset += 1;
        skipWhitespace();
      }
    }
    offset += 1;
  }

  scanValue([]);
  return parsed;
}

function validateWorkflowMachine(machine, semanticRuleIds = new Set()) {
  requireObject(machine, 'workflow machine');
  if (machine.version !== 1) throw new Error('workflow machine version must be 1');
  requireExactKeys(machine, WORKFLOW_V1_FIELDS, 'workflow machine fields');

  const internalGuards = requireUniqueStringArray(
    machine.internalGuards,
    'workflow machine internalGuards',
    'internal guard',
  );
  const states = requireUniqueStringArray(machine.states, 'workflow machine states', 'state');
  const roles = requireUniqueStringArray(machine.roles, 'workflow machine roles', 'role');
  requireObject(machine.events, 'workflow machine events');

  const allowedGuards = new Set([
    ...semanticRuleIds,
    ...PHASE_ONE_EXECUTABLE_GUARDS,
    ...internalGuards,
  ]);
  const usedInternalGuards = new Set();
  const integrationReadyEvents = new Set(WORKFLOW_V1_INTEGRATION_READY_EVENTS);

  for (const [eventType, event] of Object.entries(machine.events)) {
    requireNonEmptyString(eventType, 'workflow event type');
    requireObject(event, `workflow event ${eventType}`);
    requireExactKeys(event, WORKFLOW_V1_EVENT_FIELDS, `workflow event ${eventType} fields`);
    const origins = requireUniqueStringArray(
      event.origins,
      `workflow event ${eventType} origins`,
      `origin in event ${eventType}`,
    );
    const eventRoles = requireUniqueStringArray(
      event.roles,
      `workflow event ${eventType} roles`,
      `role in event ${eventType}`,
    );
    requireNonEmptyString(event.destination, `workflow event ${eventType} destination`);
    requireNonEmptyString(event.guard, `workflow event ${eventType} guard`);

    for (const origin of origins) {
      if (origin !== 'none' && !states.has(origin)) {
        throw new Error(`workflow event ${eventType} has unknown origin: ${origin}`);
      }
    }
    if (event.destination !== 'same' && !states.has(event.destination)) {
      throw new Error(`workflow event ${eventType} has unknown destination: ${event.destination}`);
    }
    for (const role of eventRoles) {
      if (!roles.has(role)) {
        throw new Error(`workflow event ${eventType} has unknown role: ${role}`);
      }
    }
    if (!allowedGuards.has(event.guard)) {
      throw new Error(`workflow event ${eventType} has unknown guard: ${event.guard}`);
    }
    if (internalGuards.has(event.guard)) usedInternalGuards.add(event.guard);

    if (origins.has('integration_ready') && !integrationReadyEvents.has(eventType)) {
      throw new Error(
        `workflow event ${eventType} includes integration_ready; allowed events are ${WORKFLOW_V1_INTEGRATION_READY_EVENTS.join(', ')}`,
      );
    }
  }

  for (const guard of internalGuards) {
    if (!usedInternalGuards.has(guard)) {
      throw new Error(`unused internal guard: ${guard}`);
    }
  }

  requireExactArray(
    machine.internalGuards,
    WORKFLOW_V1_INTERNAL_GUARDS,
    'workflow machine internalGuards',
  );
  requireExactArray(machine.states, WORKFLOW_V1_STATES, 'workflow machine states');
  requireExactArray(machine.roles, WORKFLOW_V1_ROLES, 'workflow machine roles');
  requireExactKeys(machine.events, Object.keys(WORKFLOW_V1_EVENTS), 'workflow machine event set');

  for (const [eventType, expected] of Object.entries(WORKFLOW_V1_EVENTS)) {
    const actual = machine.events[eventType];
    requireExactArray(actual.origins, expected.origins, `workflow event ${eventType} origins`);
    if (actual.destination !== expected.destination) {
      throw new Error(`workflow event ${eventType} destination must be ${expected.destination}`);
    }
    requireExactArray(actual.roles, expected.roles, `workflow event ${eventType} roles`);
    if (actual.guard !== expected.guard) {
      throw new Error(`workflow event ${eventType} guard must be ${expected.guard}`);
    }
  }

  return machine;
}

function validateManifest(manifest) {
  if (manifest.version !== 1) throw new Error('manifest version must be 1');
  requireArray(manifest.policyOrder, 'policyOrder');
  requireArray(manifest.targets, 'targets');
  requireArray(manifest.personas, 'personas');
  requireArray(manifest.verification?.checks, 'verification.checks');
  requireNonEmptyString(manifest.rules, 'rules');
  requireNonEmptyString(manifest.workflow?.machine, 'workflow.machine');
  assertSafeRelativePath(manifest.rules);
  assertSafeRelativePath(manifest.workflow.machine);

  for (const policyPath of manifest.policyOrder) assertSafeRelativePath(policyPath);
  if (new Set(manifest.policyOrder).size !== manifest.policyOrder.length) {
    throw new Error('duplicate policyOrder entry');
  }

  const ids = new Set();
  const paths = new Map();
  for (const [index, target] of manifest.targets.entries()) {
    if (typeof target !== 'object' || target === null || Array.isArray(target)) {
      throw new Error(`target ${index} must be an object`);
    }
    for (const key of ['id', 'path', 'template']) {
      requireNonEmptyString(target[key], `target ${index} ${key}`);
    }
    requireArray(target.sources, `target ${target.id} sources`);
    assertSafeRelativePath(target.path);
    assertSafeRelativePath(target.template);
    for (const source of target.sources) assertSafeRelativePath(source);
    if (new Set(target.sources).size !== target.sources.length) {
      throw new Error(`${target.id}: duplicate source`);
    }
    if (ids.has(target.id)) {
      throw new Error(`duplicate target id: ${target.id}`);
    }
    const pathKey = pathIdentity(target.path);
    if (paths.has(pathKey)) {
      throw new Error(`duplicate target path: ${target.path} conflicts with ${paths.get(pathKey)}`);
    }
    ids.add(target.id);
    paths.set(pathKey, target.path);
  }

  const personaIds = new Set();
  for (const persona of manifest.personas) {
    assertSafeRelativePath(persona.source);
    if (personaIds.has(persona.id)) {
      throw new Error(`duplicate persona: ${persona.id}`);
    }
    for (const key of ['id', 'description', 'claudeTools', 'claudeModel']) {
      if (typeof persona[key] !== 'string' || persona[key].length === 0) {
        throw new Error(`persona ${persona.id || '<unknown>'} missing ${key}`);
      }
    }
    personaIds.add(persona.id);
  }

  const registeredInputs = [
    { label: 'manifest', path: 'harness/manifest.json' },
    { label: 'rules', path: manifest.rules },
    { label: 'workflow machine', path: manifest.workflow.machine },
    ...manifest.policyOrder.map((input) => ({ label: 'policyOrder', path: input })),
    ...manifest.targets.flatMap((target) => [
      { label: `target ${target.id} template`, path: target.template },
      ...target.sources.map((source) => ({
        label: `target ${target.id} source`,
        path: source,
      })),
    ]),
    ...manifest.personas.map((persona) => ({
      label: `persona ${persona.id} source`,
      path: persona.source,
    })),
  ];
  for (const input of registeredInputs) {
    const generatedPath = paths.get(pathIdentity(input.path));
    if (generatedPath) {
      throw new Error(
        `registered input ${input.label} ${input.path} aliases generated target path ${generatedPath}`,
      );
    }
  }

  return manifest;
}

function loadManifest(root) {
  const path = resolveInside(root, 'harness/manifest.json');
  const manifest = validateManifest(
    parseJsonWithoutDuplicateKeys(fs.readFileSync(path, 'utf8'), 'manifest'),
  );
  for (const target of manifest.targets) resolveInside(root, target.path);
  const registeredInputs = [
    manifest.rules,
    manifest.workflow.machine,
    ...manifest.policyOrder,
    ...manifest.targets.flatMap((target) => [target.template, ...target.sources]),
    ...manifest.personas.map((persona) => persona.source),
  ];
  for (const input of registeredInputs) {
    if (!fs.existsSync(resolveInside(root, input))) {
      throw new Error(`missing registered input: ${input}`);
    }
  }

  const semanticsPath = resolveInside(root, manifest.rules);
  const semantics = parseJsonWithoutDuplicateKeys(
    fs.readFileSync(semanticsPath, 'utf8'),
    'semantic rules',
  );
  requireArray(semantics.rules, 'semantic rules');
  const semanticRuleIds = new Set();
  for (const rule of semantics.rules) {
    requireObject(rule, 'semantic rule');
    requireNonEmptyString(rule.id, 'semantic rule id');
    semanticRuleIds.add(rule.id);
  }

  const machinePath = resolveInside(root, manifest.workflow.machine);
  const machine = parseJsonWithoutDuplicateKeys(
    fs.readFileSync(machinePath, 'utf8'),
    'workflow machine',
  );
  validateWorkflowMachine(machine, semanticRuleIds);
  return manifest;
}

module.exports = { loadManifest, validateManifest, validateWorkflowMachine };
