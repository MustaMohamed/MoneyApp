const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { loadManifest, validateWorkflowMachine } = require('../lib/manifest');

const root = path.resolve(__dirname, '../../..');
const STATES = [
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
const ACTIVE_STATES = STATES.slice(0, -1);
const ROLES = ['user', 'sarah', 'tariq', 'dev', 'system'];
const INTERNAL_GUARDS = ['INIT-NON-MAIN', 'DELIVERY-EVIDENCE-FRESH'];
const SEMANTIC_RULE_IDS = new Set([
  'AUTH-USER-INTEGRATION',
  'GATE-SPEC-SIGNOFF',
  'GATE-DEVICE-QA',
  'GATE-CRITICAL-TRIGGER',
  'LEAD-PLAN-APPROVAL',
  'LEAD-REVIEW-VERDICT',
]);

function event(origins, destination, roles, guard) {
  return { origins, destination, roles, guard };
}

const EXPECTED_MACHINE = {
  version: 1,
  internalGuards: INTERNAL_GUARDS,
  states: STATES,
  roles: ROLES,
  events: {
    'initiative.created': event(['none'], 'brainstorming', ['sarah'], 'INIT-NON-MAIN'),
    'spec.submitted': event(
      ['brainstorming'],
      'awaiting_spec_signoff',
      ['sarah', 'tariq'],
      'GATE-SPEC-SIGNOFF',
    ),
    'spec.signed': event(['awaiting_spec_signoff'], 'planning', ['sarah'], 'GATE-SPEC-SIGNOFF'),
    'spec.revised': event(
      STATES.slice(1, -1),
      'awaiting_spec_signoff',
      ['sarah', 'tariq'],
      'GATE-SPEC-SIGNOFF',
    ),
    'plan.submitted': event(
      ['planning'],
      'awaiting_plan_approval',
      ['tariq'],
      'LEAD-PLAN-APPROVAL',
    ),
    'plan.approved': event(
      ['awaiting_plan_approval'],
      'execution',
      ['sarah'],
      'LEAD-PLAN-APPROVAL',
    ),
    'plan.revised': event(
      STATES.slice(3, -1),
      'awaiting_plan_approval',
      ['tariq'],
      'LEAD-PLAN-APPROVAL',
    ),
    'implementation.ready': event(['execution'], 'validation', ['dev'], 'DELIVERY-EVIDENCE-FRESH'),
    'review.approved': event(['validation'], 'validation', ['tariq'], 'LEAD-REVIEW-VERDICT'),
    'review.changes_requested': event(
      ['validation'],
      'execution',
      ['tariq'],
      'LEAD-REVIEW-VERDICT',
    ),
    'verification.passed': event(['validation'], 'validation', ['system'], 'VERIFY-SIX-CHECKS'),
    'verification.failed': event(['validation'], 'validation', ['system'], 'VERIFY-SIX-CHECKS'),
    'device_qa.passed': event(
      ['awaiting_device_qa'],
      'integration_ready',
      ['sarah'],
      'GATE-DEVICE-QA',
    ),
    'device_qa.failed': event(['awaiting_device_qa'], 'execution', ['sarah'], 'GATE-DEVICE-QA'),
    'work.reopened': event(
      ['validation', 'awaiting_device_qa', 'integration_ready'],
      'execution',
      ['sarah', 'tariq', 'dev'],
      'DELIVERY-EVIDENCE-FRESH',
    ),
    'blocker.opened': event(
      ACTIVE_STATES,
      'same',
      ['sarah', 'tariq', 'dev'],
      'GATE-CRITICAL-TRIGGER',
    ),
    'blocker.resolved': event(ACTIVE_STATES, 'same', ['sarah'], 'GATE-CRITICAL-TRIGGER'),
    'initiative.cancelled': event(
      STATES.slice(0, -2),
      'cancelled',
      ['sarah'],
      'AUTH-USER-INTEGRATION',
    ),
  },
};

function cloneMachine() {
  return JSON.parse(JSON.stringify(EXPECTED_MACHINE));
}

function validate(machine) {
  return validateWorkflowMachine(machine, SEMANTIC_RULE_IDS);
}

function createMachineRoot(t, machineSource) {
  const fixtureRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-workflow-machine-'));
  t.after(() => fs.rmSync(fixtureRoot, { recursive: true, force: true }));
  fs.mkdirSync(path.join(fixtureRoot, 'harness/rules'), { recursive: true });
  fs.mkdirSync(path.join(fixtureRoot, 'harness/workflow'), { recursive: true });
  fs.writeFileSync(
    path.join(fixtureRoot, 'harness/manifest.json'),
    JSON.stringify({
      version: 1,
      policyOrder: [],
      targets: [],
      personas: [],
      rules: 'harness/rules/semantics.json',
      workflow: { machine: 'harness/workflow/state_machine.json' },
      verification: { checks: [] },
    }),
  );
  fs.writeFileSync(
    path.join(fixtureRoot, 'harness/rules/semantics.json'),
    JSON.stringify({ rules: [] }),
  );
  fs.writeFileSync(path.join(fixtureRoot, 'harness/workflow/state_machine.json'), machineSource);
  return fixtureRoot;
}

void test('registers the exact version-1 workflow machine', () => {
  const manifest = loadManifest(root);
  const machine = JSON.parse(fs.readFileSync(path.join(root, manifest.workflow.machine), 'utf8'));

  assert.equal(manifest.workflow.machine, 'harness/workflow/state_machine.json');
  assert.deepEqual(machine, EXPECTED_MACHINE);
});

void test('rejects duplicate states', () => {
  const machine = cloneMachine();
  machine.states.push('brainstorming');

  assert.throws(() => validate(machine), /duplicate state.*brainstorming/);
});

void test('rejects duplicate event keys in the machine source', (t) => {
  const machineSource = `{
    "version": 1,
    "internalGuards": ["TEST-INTERNAL"],
    "states": ["brainstorming"],
    "roles": ["sarah"],
    "events": {
      "initiative.created": {
        "origins": ["none"],
        "destination": "brainstorming",
        "roles": ["sarah"],
        "guard": "TEST-INTERNAL"
      },
      "initiative.created": {
        "origins": ["none"],
        "destination": "brainstorming",
        "roles": ["sarah"],
        "guard": "TEST-INTERNAL"
      }
    }
  }`;
  const fixtureRoot = createMachineRoot(t, machineSource);

  assert.throws(() => loadManifest(fixtureRoot), /duplicate event.*initiative\.created/);
});

void test('rejects extra, missing, and reordered canonical arrays', () => {
  for (const field of ['internalGuards', 'states', 'roles']) {
    const canonical = EXPECTED_MACHINE[field];
    const extra = cloneMachine();
    extra[field].push(`unexpected-${field}`);
    const missing = cloneMachine();
    missing[field].splice(Math.floor(canonical.length / 2), 1);
    const reordered = cloneMachine();
    reordered[field].reverse();

    for (const [mutation, machine] of [
      ['extra', extra],
      ['missing', missing],
      ['reordered', reordered],
    ]) {
      assert.throws(() => validate(machine), `${field} must reject ${mutation} entries`);
    }
  }
});

void test('rejects missing and extra canonical events', () => {
  const missing = cloneMachine();
  delete missing.events['spec.submitted'];
  const extra = cloneMachine();
  extra.events['implementation.retry'] = event(
    ['execution'],
    'validation',
    ['dev'],
    'DELIVERY-EVIDENCE-FRESH',
  );

  assert.throws(() => validate(missing), /event set.*spec\.submitted/);
  assert.throws(() => validate(extra), /event set.*implementation\.retry/);
});

void test('rejects unknown top-level and event fields', () => {
  const topLevel = cloneMachine();
  topLevel.description = 'not part of version 1';
  const eventField = cloneMachine();
  eventField.events['spec.signed'].description = 'not part of version 1';

  assert.throws(() => validate(topLevel), /workflow machine fields.*description/);
  assert.throws(() => validate(eventField), /workflow event spec\.signed fields.*description/);
});

void test('rejects a mutation of every field in every canonical event', () => {
  const alternateGuard = (guard) =>
    guard === 'GATE-SPEC-SIGNOFF' ? 'LEAD-PLAN-APPROVAL' : 'GATE-SPEC-SIGNOFF';

  for (const [eventType, canonical] of Object.entries(EXPECTED_MACHINE.events)) {
    const originMutation = cloneMachine();
    originMutation.events[eventType].origins =
      canonical.origins.length > 1
        ? canonical.origins.slice(1)
        : [canonical.origins[0] === 'brainstorming' ? 'execution' : 'brainstorming'];

    const destinationMutation = cloneMachine();
    destinationMutation.events[eventType].destination =
      canonical.destination === 'execution' ? 'validation' : 'execution';

    const rolesMutation = cloneMachine();
    rolesMutation.events[eventType].roles =
      canonical.roles.length > 1
        ? canonical.roles.slice(1)
        : [canonical.roles[0] === 'sarah' ? 'tariq' : 'sarah'];

    const guardMutation = cloneMachine();
    guardMutation.events[eventType].guard = alternateGuard(canonical.guard);

    for (const [field, machine] of [
      ['origins', originMutation],
      ['destination', destinationMutation],
      ['roles', rolesMutation],
      ['guard', guardMutation],
    ]) {
      assert.throws(
        () => validate(machine),
        `canonical contract must reject ${eventType}.${field} mutation`,
      );
    }
  }
});

void test('rejects unknown origins and destinations', () => {
  const unknownOrigin = cloneMachine();
  unknownOrigin.events['spec.signed'].origins = ['missing'];
  const unknownDestination = cloneMachine();
  unknownDestination.events['spec.signed'].destination = 'missing';

  assert.throws(() => validate(unknownOrigin), /unknown origin.*missing/);
  assert.throws(() => validate(unknownDestination), /unknown destination.*missing/);
});

void test('accepts canonical semantic and internal guards and rejects missing guard IDs', () => {
  assert.doesNotThrow(() => validate(cloneMachine()));

  const missingGuard = cloneMachine();
  missingGuard.events['spec.signed'].guard = 'MISSING-GUARD';
  assert.throws(() => validate(missingGuard), /unknown guard.*MISSING-GUARD/);
});

void test('accepts the named Phase 1 executable guard and rejects unknown lookalikes', () => {
  assert.doesNotThrow(() => validate(cloneMachine()));

  const unknownExecutableGuard = cloneMachine();
  unknownExecutableGuard.events['verification.passed'].guard = 'VERIFY-UNKNOWN-CHECKS';
  assert.throws(() => validate(unknownExecutableGuard), /unknown guard.*VERIFY-UNKNOWN-CHECKS/);
});

void test('rejects declared internal guards that no event uses', () => {
  const machine = cloneMachine();
  machine.internalGuards.push('UNUSED-INTERNAL');

  assert.throws(() => validate(machine), /unused internal guard.*UNUSED-INTERNAL/);
});

void test('rejects arbitrary same-state events from integration_ready', () => {
  const machine = cloneMachine();
  machine.events['implementation.retry'] = event(
    ['integration_ready'],
    'same',
    ['dev'],
    'DELIVERY-EVIDENCE-FRESH',
  );

  assert.throws(
    () => validate(machine),
    /integration_ready.*spec\.revised.*plan\.revised.*work\.reopened.*blocker\.opened.*blocker\.resolved/,
  );
});

void test('rejects arbitrary integration_ready-destination events from integration_ready', () => {
  const machine = cloneMachine();
  machine.events['implementation.retry'] = event(
    ['integration_ready'],
    'integration_ready',
    ['dev'],
    'DELIVERY-EVIDENCE-FRESH',
  );

  assert.throws(
    () => validate(machine),
    /integration_ready.*spec\.revised.*plan\.revised.*work\.reopened.*blocker\.opened.*blocker\.resolved/,
  );
});
