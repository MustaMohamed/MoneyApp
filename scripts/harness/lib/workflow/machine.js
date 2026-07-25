const fs = require('node:fs');

const { resolveInside } = require('../paths');
const { validateMachine } = require('./schema');

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function loadWorkflowMachine(root, manifest) {
  const machinePath = manifest?.workflow?.machine;
  const absolutePath = resolveInside(root, machinePath);
  const machine = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  validateMachine(machine);
  return deepFreeze(machine);
}

function getEventDefinition(machine, type) {
  if (!machine?.events || !Object.hasOwn(machine.events, type)) {
    throw new Error(`Unknown workflow event type: ${String(type)}`);
  }
  return machine.events[type];
}

function assertAllowedOrigin(definition, phase) {
  if (phase === 'none') {
    throw new Error('The pseudo-origin none is not a real workflow phase');
  }
  const origin = phase === undefined ? 'none' : phase;
  if (!definition.origins.includes(origin)) {
    throw new Error(
      `Workflow event cannot be recorded from ${origin}; allowed origins: ${definition.origins.join(', ')}`,
    );
  }
  return definition;
}

module.exports = {
  loadWorkflowMachine,
  getEventDefinition,
  assertAllowedOrigin,
};
