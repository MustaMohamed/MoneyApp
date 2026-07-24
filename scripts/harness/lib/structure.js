const fs = require('node:fs');
const { extractSection } = require('./render');
const { resolveInside } = require('./paths');

function findParityErrors(rendered, actualFiles) {
  const errors = [];
  for (const [file, expected] of rendered) {
    if (actualFiles[file] !== expected) {
      errors.push({
        ruleId: 'GENERATION-PARITY',
        file,
        message: 'run npm run harness:generate',
      });
    }
  }
  return errors;
}

function findOrphanGeneratedOutputs(notice, registeredTargets, files) {
  return Object.entries(files)
    .filter(([file, text]) => text.includes(notice) && !registeredTargets.has(file))
    .map(([file]) => ({
      ruleId: 'UNREGISTERED-GENERATED-OUTPUT',
      file,
      message: 'generated marker exists outside harness/manifest.json',
    }));
}

function compareRenderPasses(first, second) {
  const errors = [];
  const paths = new Set([...first.keys(), ...second.keys()]);
  for (const file of paths) {
    if (first.get(file) !== second.get(file)) {
      errors.push({
        ruleId: 'NONDETERMINISTIC-GENERATION',
        file,
        message: 'consecutive in-memory renders differ',
      });
    }
  }
  return errors;
}

const TOML_AGENT_KEYS = new Set(['name', 'description', 'developer_instructions']);

function isJsonString(value) {
  try {
    return typeof JSON.parse(value) === 'string';
  } catch {
    return false;
  }
}

function hasExactKeys(seen, expected) {
  return seen.size === expected.size && [...expected].every((key) => seen.has(key));
}

function isUnicodeScalarValue(value) {
  return value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff);
}

function isValidTomlBasicString(value) {
  if (value.length < 2 || value[0] !== '"' || value.at(-1) !== '"') return false;

  const body = value.slice(1, -1);
  const simpleEscapes = new Set(['b', 't', 'n', 'f', 'r', '"', '\\']);
  for (let index = 0; index < body.length; ) {
    const character = body[index];
    if (character === '"') return false;

    if (character !== '\\') {
      const codePoint = body.codePointAt(index);
      if (
        !isUnicodeScalarValue(codePoint) ||
        codePoint === 127 ||
        (codePoint <= 31 && character !== '\t')
      ) {
        return false;
      }
      index += codePoint > 0xffff ? 2 : 1;
      continue;
    }

    const escape = body[index + 1];
    if (simpleEscapes.has(escape)) {
      index += 2;
      continue;
    }
    if (escape !== 'u' && escape !== 'U') return false;

    const width = escape === 'u' ? 4 : 8;
    const digits = body.slice(index + 2, index + 2 + width);
    if (digits.length !== width || !/^[0-9A-Fa-f]+$/.test(digits)) return false;
    if (!isUnicodeScalarValue(Number.parseInt(digits, 16))) return false;
    index += width + 2;
  }

  return true;
}

function isValidTomlMultilineBody(body) {
  const simpleEscapes = new Set(['b', 't', 'n', 'f', 'r', '"', '\\']);

  for (let index = 0; index < body.length; ) {
    const character = body[index];
    const codePoint = character.codePointAt(0);
    if (
      codePoint === 127 ||
      (codePoint <= 31 && character !== '\t' && character !== '\n' && character !== '\r')
    ) {
      return false;
    }
    if (character !== '\\') {
      index += 1;
      continue;
    }

    const escape = body[index + 1];
    if (escape === undefined) return false;
    if (simpleEscapes.has(escape)) {
      index += 2;
      continue;
    }

    if (escape === 'u' || escape === 'U') {
      const width = escape === 'u' ? 4 : 8;
      const digits = body.slice(index + 2, index + 2 + width);
      if (digits.length !== width || !/^[0-9A-Fa-f]+$/.test(digits)) return false;
      if (!isUnicodeScalarValue(Number.parseInt(digits, 16))) return false;
      index += width + 2;
      continue;
    }

    const isLineContinuation = escape === '\n' || (escape === '\r' && body[index + 2] === '\n');
    if (!isLineContinuation) return false;

    index += escape === '\n' ? 2 : 3;
    while (index < body.length && [' ', '\t', '\n', '\r'].includes(body[index])) {
      index += 1;
    }
    if (index === body.length) return false;
  }

  return true;
}

function readTomlMultilineBody(lines, startIndex) {
  const bodyLines = [];

  for (let index = startIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const delimiterIndex = line.indexOf('"""');
    if (delimiterIndex === -1) {
      bodyLines.push(line);
      continue;
    }

    const precedingBackslashes = line.slice(0, delimiterIndex).match(/\\+$/)?.[0].length ?? 0;
    if (precedingBackslashes % 2 === 1) {
      bodyLines.push(line);
      continue;
    }
    if (delimiterIndex !== line.lastIndexOf('"""') || delimiterIndex !== line.length - 3) {
      return undefined;
    }

    bodyLines.push(line.slice(0, delimiterIndex));
    const body = bodyLines.join('\n');
    return isValidTomlMultilineBody(body) ? index : undefined;
  }

  return undefined;
}

function isValidAgentToml(text) {
  const lines = text.split('\n');
  if (lines.at(-1) === '') lines.pop();

  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(lines[index]);
    if (!assignment) return false;

    const [, key, value] = assignment;
    if (!TOML_AGENT_KEYS.has(key) || seen.has(key)) return false;
    seen.add(key);

    if (key !== 'developer_instructions') {
      if (!isValidTomlBasicString(value)) return false;
      continue;
    }

    if (value !== '"""') return false;

    const closingIndex = readTomlMultilineBody(lines, index);
    if (closingIndex === undefined) return false;
    index = closingIndex;
  }

  return hasExactKeys(seen, TOML_AGENT_KEYS);
}

function frontmatterSchema(file) {
  if (file.startsWith('.claude/agents/')) {
    return new Set(['name', 'description', 'tools', 'model']);
  }
  if (file.startsWith('.agents/skills/') || file.startsWith('.claude/skills/')) {
    return new Set(['name', 'description']);
  }
  if (file.startsWith('.claude/commands/')) {
    return new Set(['description']);
  }
  return undefined;
}

function isValidFrontmatterScalar(value) {
  if (!value || value.includes('\t')) return false;
  if (value.startsWith('"')) return isJsonString(value);

  const reservedLeadingCharacters = new Set([
    '-',
    '?',
    ':',
    ',',
    '[',
    ']',
    '{',
    '}',
    '#',
    '&',
    '*',
    '!',
    '|',
    '>',
    "'",
    '%',
    '@',
    '`',
  ]);
  if (reservedLeadingCharacters.has(value[0])) return false;
  if (/:(?:\s|$)/.test(value) || /\s#/.test(value)) return false;

  const normalized = value.toLowerCase();
  if (['null', '~', 'true', 'false', '.nan', '.inf', '+.inf', '-.inf'].includes(normalized)) {
    return false;
  }
  if (Number.isFinite(Number(value.replaceAll('_', '')))) return false;
  if (
    /^\d{4}-\d{2}-\d{2}(?:[Tt ]\d{1,2}:\d{2}:\d{2}(?:\.\d+)?(?:Z| ?[-+]\d{1,2}:\d{2})?)?$/.test(
      value,
    )
  ) {
    return false;
  }

  return true;
}

function isValidFrontmatter(text, expectedKeys) {
  const lines = text.split('\n');
  if (lines[0] !== '---') return false;

  const closingIndex = lines.indexOf('---', 1);
  if (closingIndex === -1) return false;

  const seen = new Set();
  for (const line of lines.slice(1, closingIndex)) {
    const property = /^([A-Za-z][A-Za-z0-9_-]*): +(.+)$/.exec(line);
    if (!property) return false;

    const [, key, rawValue] = property;
    const value = rawValue.trim();
    if (!expectedKeys.has(key) || seen.has(key) || !isValidFrontmatterScalar(value)) {
      return false;
    }
    seen.add(key);
  }

  return hasExactKeys(seen, expectedKeys);
}

function validateFormat(file, text) {
  const errors = [];

  if (file.endsWith('.toml') && !isValidAgentToml(text)) {
    errors.push({ ruleId: 'GENERATED-FORMAT', file, message: 'invalid agent TOML' });
  }

  const expectedFrontmatterKeys = frontmatterSchema(file);
  if (expectedFrontmatterKeys && !isValidFrontmatter(text, expectedFrontmatterKeys)) {
    errors.push({ ruleId: 'GENERATED-FORMAT', file, message: 'invalid frontmatter' });
  }

  return errors;
}

const REQUIRED_PERSONA_IDS = ['sarah', 'marcus', 'layla', 'tariq', 'dev'];

function expectedPersonaTargets() {
  return REQUIRED_PERSONA_IDS.flatMap((id) => [
    `.codex/agents/${id}.toml`,
    `.claude/agents/${id}.md`,
  ]);
}

function validateRegisteredStructure(root, manifest, rendered, liveFiles) {
  const errors = [];
  const targets = new Set(manifest.targets.map((target) => target.path));
  const personaIds = manifest.personas.map((persona) => persona.id);
  if (JSON.stringify(personaIds) !== JSON.stringify(REQUIRED_PERSONA_IDS)) {
    errors.push({
      ruleId: 'PERSONA-SURFACE-REGISTRATION',
      file: 'harness/manifest.json',
      message: `expected personas ${REQUIRED_PERSONA_IDS.join(', ')}`,
    });
  }
  const requiredTargets = [
    'AGENTS.md',
    'CLAUDE.md',
    ...expectedPersonaTargets(),
    '.agents/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/skills/moneyapp-expert-panel/SKILL.md',
    '.claude/commands/feature.md',
    '.claude/commands/status.md',
  ];
  const requiredTargetSet = new Set(requiredTargets);

  for (const file of requiredTargets) {
    if (!targets.has(file)) {
      errors.push({
        ruleId: 'INCOMPLETE-TARGET-REGISTRATION',
        file,
        message: 'required supported-surface target is not registered',
      });
    }
  }
  for (const file of targets) {
    if (!requiredTargetSet.has(file)) {
      errors.push({
        ruleId: 'INCOMPLETE-TARGET-REGISTRATION',
        file,
        message: 'unsupported generated target is registered',
      });
    }
  }

  for (const persona of manifest.personas) {
    const text = fs.readFileSync(resolveInside(root, persona.source), 'utf8');
    for (const section of ['agent', 'inline']) {
      try {
        extractSection(text, section);
      } catch (error) {
        errors.push({
          ruleId: 'PERSONA-SECTION',
          file: persona.source,
          message: error.message,
        });
      }
    }
  }

  for (const [file, text] of rendered) {
    if (!text.includes(manifest.generatedNotice)) {
      errors.push({ ruleId: 'PROVENANCE-MARKER', file, message: 'missing generated notice' });
    }
    errors.push(...validateFormat(file, text));
  }
  errors.push(...findParityErrors(rendered, liveFiles));
  errors.push(...findOrphanGeneratedOutputs(manifest.generatedNotice, targets, liveFiles));
  return errors;
}

function measureRenderedTargets(rendered) {
  return [...rendered].map(([file, text]) => ({
    file,
    lines: text.split('\n').length - 1,
    bytes: Buffer.byteLength(text, 'utf8'),
  }));
}

module.exports = {
  compareRenderPasses,
  findOrphanGeneratedOutputs,
  findParityErrors,
  measureRenderedTargets,
  validateFormat,
  validateRegisteredStructure,
};
