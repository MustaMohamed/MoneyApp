const crypto = require('node:crypto');
const { TextDecoder } = require('node:util');

function unsupported(path, detail) {
  throw new Error(`Unsupported JSON value at ${path}: ${detail}`);
}

function canonicalClone(value, path = '$', ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) unsupported(path, String(value));
    return value;
  }
  if (typeof value !== 'object') unsupported(path, typeof value);
  if (ancestors.has(value)) throw new Error(`Cyclic JSON value at ${path}`);

  ancestors.add(value);
  try {
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype) {
        throw new Error(`Expected a plain array at ${path}`);
      }
      const keys = Reflect.ownKeys(value);
      if (keys.some((key) => typeof key !== 'string')) {
        unsupported(path, 'symbol-keyed array property');
      }
      const expectedKeys = Array.from({ length: value.length }, (_, index) => String(index));
      const unexpectedKeys = keys.filter((key) => key !== 'length' && !expectedKeys.includes(key));
      if (unexpectedKeys.length > 0) {
        unsupported(path, `array properties ${unexpectedKeys.join(', ')}`);
      }
      for (let index = 0; index < value.length; index += 1) {
        if (!Object.hasOwn(value, index))
          throw new Error(`Sparse array is not canonical at ${path}`);
        const descriptor = Object.getOwnPropertyDescriptor(value, index);
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
          unsupported(`${path}[${index}]`, 'non-enumerable or accessor property');
        }
      }
      return value.map((entry, index) => canonicalClone(entry, `${path}[${index}]`, ancestors));
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new Error(`Expected a plain object at ${path}`);
    }
    const ownKeys = Reflect.ownKeys(value);
    if (ownKeys.some((key) => typeof key !== 'string')) {
      unsupported(path, 'symbol-keyed object property');
    }

    const result = Object.create(null);
    for (const key of ownKeys.map(String).sort()) {
      const descriptor = Object.getOwnPropertyDescriptor(value, key);
      if (!descriptor?.enumerable || !Object.hasOwn(descriptor, 'value')) {
        unsupported(`${path}.${key}`, 'non-enumerable or accessor property');
      }
      Object.defineProperty(result, key, {
        value: canonicalClone(descriptor.value, `${path}.${key}`, ancestors),
        enumerable: true,
        configurable: true,
        writable: true,
      });
    }
    return result;
  } finally {
    ancestors.delete(value);
  }
}

function serializeCanonical(value, depth = 0) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  const indentation = '  '.repeat(depth);
  const childIndentation = '  '.repeat(depth + 1);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    const entries = value.map(
      (entry) => `${childIndentation}${serializeCanonical(entry, depth + 1)}`,
    );
    return `[\n${entries.join(',\n')}\n${indentation}]`;
  }

  const keys = Reflect.ownKeys(value).map(String).sort();
  if (keys.length === 0) return '{}';
  const entries = keys.map(
    (key) =>
      `${childIndentation}${JSON.stringify(key)}: ${serializeCanonical(value[key], depth + 1)}`,
  );
  return `{\n${entries.join(',\n')}\n${indentation}}`;
}

function canonicalStringify(value) {
  return `${serializeCanonical(canonicalClone(value))}\n`;
}

function deepFreeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function finalizeEvent(event) {
  const cloned = canonicalClone(event);
  if (cloned === null || Array.isArray(cloned) || typeof cloned !== 'object') {
    throw new Error('Event must be a plain object');
  }
  delete cloned.eventHash;
  const eventHash = sha256(canonicalStringify(cloned));
  return deepFreeze(canonicalClone({ ...cloned, eventHash }));
}

function hashCanonicalObject(value, hashField) {
  if (typeof hashField !== 'string' || hashField.length === 0) {
    throw new Error('Canonical hash field must be a nonempty string');
  }
  const cloned = canonicalClone(value);
  if (cloned === null || Array.isArray(cloned) || typeof cloned !== 'object') {
    throw new Error('Canonical hashed value must be a plain object');
  }
  delete cloned[hashField];
  return sha256(canonicalStringify(cloned));
}

function finalizeHashedObject(value, hashField) {
  const cloned = canonicalClone(value);
  if (cloned === null || Array.isArray(cloned) || typeof cloned !== 'object') {
    throw new Error('Canonical hashed value must be a plain object');
  }
  delete cloned[hashField];
  return deepFreeze(
    canonicalClone({
      ...cloned,
      [hashField]: hashCanonicalObject(cloned, hashField),
    }),
  );
}

function parseJsonWithoutDuplicateKeys(source) {
  let offset = 0;

  function fail(message) {
    throw new Error(`${message} at JSON offset ${offset}`);
  }

  function skipWhitespace() {
    while (
      source[offset] === ' ' ||
      source[offset] === '\t' ||
      source[offset] === '\r' ||
      source[offset] === '\n'
    ) {
      offset += 1;
    }
  }

  function parseString() {
    if (source[offset] !== '"') fail('Expected JSON string');
    const start = offset;
    offset += 1;
    while (offset < source.length) {
      const character = source[offset];
      if (character === '"') {
        offset += 1;
        return JSON.parse(source.slice(start, offset));
      }
      if (character === '\\') {
        offset += 2;
      } else {
        if (character.charCodeAt(0) < 0x20) fail('Unescaped control character');
        offset += 1;
      }
    }
    fail('Unterminated JSON string');
  }

  function parseArray(path) {
    const result = [];
    offset += 1;
    skipWhitespace();
    if (source[offset] === ']') {
      offset += 1;
      return result;
    }
    for (let index = 0; ; index += 1) {
      result.push(parseValue(`${path}[${index}]`));
      skipWhitespace();
      if (source[offset] === ']') {
        offset += 1;
        return result;
      }
      if (source[offset] !== ',') fail('Expected comma in JSON array');
      offset += 1;
      skipWhitespace();
    }
  }

  function parseObject(path) {
    const result = Object.create(null);
    const keys = new Set();
    offset += 1;
    skipWhitespace();
    if (source[offset] === '}') {
      offset += 1;
      return result;
    }
    for (;;) {
      const key = parseString();
      if (keys.has(key)) throw new Error(`Duplicate JSON key at ${path}.${key}`);
      keys.add(key);
      skipWhitespace();
      if (source[offset] !== ':') fail('Expected colon in JSON object');
      offset += 1;
      skipWhitespace();
      Object.defineProperty(result, key, {
        value: parseValue(`${path}.${key}`),
        enumerable: true,
        configurable: true,
        writable: true,
      });
      skipWhitespace();
      if (source[offset] === '}') {
        offset += 1;
        return result;
      }
      if (source[offset] !== ',') fail('Expected comma in JSON object');
      offset += 1;
      skipWhitespace();
    }
  }

  function parseValue(path) {
    skipWhitespace();
    const character = source[offset];
    if (character === '{') return parseObject(path);
    if (character === '[') return parseArray(path);
    if (character === '"') return parseString();
    for (const [literal, value] of [
      ['true', true],
      ['false', false],
      ['null', null],
    ]) {
      if (source.startsWith(literal, offset)) {
        offset += literal.length;
        return value;
      }
    }
    const number = source.slice(offset).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
    if (number) {
      offset += number[0].length;
      return JSON.parse(number[0]);
    }
    fail(`Invalid JSON value at ${path}`);
  }

  skipWhitespace();
  const parsed = parseValue('$');
  skipWhitespace();
  if (offset !== source.length) fail('Unexpected trailing JSON content');
  return parsed;
}

function exactUtf8Source(value) {
  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'utf8');
    if (bytes.toString('utf8') !== value) {
      throw new Error('Canonical event string cannot round-trip through UTF-8');
    }
    return { bytes, source: value };
  }
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new Error('Canonical event source must be a string or UTF-8 byte buffer');
  }
  const bytes = Buffer.from(value);
  let source;
  try {
    source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('Canonical event source contains invalid UTF-8');
  }
  return { bytes, source };
}

function parseCanonicalJson(value, label = 'Canonical JSON') {
  const { bytes, source } = exactUtf8Source(value);
  const parsed = parseJsonWithoutDuplicateKeys(source);
  const canonical = canonicalStringify(parsed);
  if (!bytes.equals(Buffer.from(canonical, 'utf8'))) {
    throw new Error(`${label} does not match canonical bytes`);
  }
  return parsed;
}

function verifyCanonicalHashedObject(value, hashField, label = 'Canonical object') {
  const parsed = parseCanonicalJson(value, label);
  if (
    parsed === null ||
    Array.isArray(parsed) ||
    typeof parsed !== 'object' ||
    !/^[a-f0-9]{64}$/.test(parsed[hashField] ?? '')
  ) {
    throw new Error(`${label} must contain a lowercase hexadecimal ${hashField}`);
  }
  const expectedHash = hashCanonicalObject(parsed, hashField);
  if (parsed[hashField] !== expectedHash) throw new Error(`${label} hash mismatch`);
  return deepFreeze(parsed);
}

function verifyCanonicalEvent(value) {
  const { bytes, source } = exactUtf8Source(value);
  const event = parseJsonWithoutDuplicateKeys(source);
  const canonical = canonicalStringify(event);
  if (!bytes.equals(Buffer.from(canonical, 'utf8'))) {
    throw new Error('Stored event does not match canonical bytes');
  }
  if (
    event === null ||
    Array.isArray(event) ||
    typeof event !== 'object' ||
    !/^[a-f0-9]{64}$/.test(event.eventHash ?? '')
  ) {
    throw new Error('Canonical event must contain a lowercase hexadecimal eventHash');
  }

  const eventWithoutHash = { ...event };
  delete eventWithoutHash.eventHash;
  const expectedHash = sha256(canonicalStringify(eventWithoutHash));
  if (event.eventHash !== expectedHash) throw new Error('Canonical event hash mismatch');
  return deepFreeze(event);
}

module.exports = {
  canonicalClone,
  canonicalStringify,
  finalizeHashedObject,
  finalizeEvent,
  hashCanonicalObject,
  parseCanonicalJson,
  verifyCanonicalHashedObject,
  verifyCanonicalEvent,
};
