const fs = require('node:fs');
const { assertSafeRelativePath, pathIdentity, resolveInside } = require('./paths');

function requireArray(value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} must be an array`);
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
}

function validateManifest(manifest) {
  if (manifest.version !== 1) throw new Error('manifest version must be 1');
  requireArray(manifest.policyOrder, 'policyOrder');
  requireArray(manifest.targets, 'targets');
  requireArray(manifest.personas, 'personas');
  requireArray(manifest.verification?.checks, 'verification.checks');
  requireNonEmptyString(manifest.rules, 'rules');
  assertSafeRelativePath(manifest.rules);

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
  const manifest = validateManifest(JSON.parse(fs.readFileSync(path, 'utf8')));
  for (const target of manifest.targets) resolveInside(root, target.path);
  const registeredInputs = [
    manifest.rules,
    ...manifest.policyOrder,
    ...manifest.targets.flatMap((target) => [target.template, ...target.sources]),
    ...manifest.personas.map((persona) => persona.source),
  ];
  for (const input of registeredInputs) {
    if (!fs.existsSync(resolveInside(root, input))) {
      throw new Error(`missing registered input: ${input}`);
    }
  }
  return manifest;
}

module.exports = { loadManifest, validateManifest };
