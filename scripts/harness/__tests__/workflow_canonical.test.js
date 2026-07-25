const assert = require('node:assert/strict');
const test = require('node:test');

const {
  canonicalStringify,
  finalizeEvent,
  verifyCanonicalEvent,
} = require('../lib/workflow/canonical');

function createdEvent(overrides = {}) {
  return {
    schemaVersion: 1,
    initiativeId: '2026-07-25-example',
    sequence: 1,
    type: 'initiative.created',
    recordedAt: '2026-07-25T00:00:00.000Z',
    recordedBy: { role: 'sarah' },
    payload: {
      title: 'Example',
      branch: 'refactor/example',
      baseSha: 'a'.repeat(40),
    },
    ...overrides,
  };
}

void test('finalizes and verifies a self-hashed canonical event', () => {
  const event = finalizeEvent(createdEvent());

  assert.match(event.eventHash, /^[a-f0-9]{64}$/);
  assert.deepEqual(verifyCanonicalEvent(canonicalStringify(event)), event);
  assert.ok(Object.isFrozen(event));
  assert.ok(Object.isFrozen(event.payload));
});

void test('sorts object keys recursively and uses two-space UTF-8 JSON with one LF', () => {
  const canonical = canonicalStringify({
    z: 'مرحبا',
    nested: { z: 2, a: [{ y: true, b: 'é' }] },
    a: 1,
  });

  assert.equal(
    canonical,
    [
      '{',
      '  "a": 1,',
      '  "nested": {',
      '    "a": [',
      '      {',
      '        "b": "é",',
      '        "y": true',
      '      }',
      '    ],',
      '    "z": 2',
      '  },',
      '  "z": "مرحبا"',
      '}',
      '',
    ].join('\n'),
  );
  assert.equal(Buffer.from(canonical, 'utf8').toString('utf8'), canonical);
  assert.ok(!canonical.includes('\r'));
  assert.match(canonical, /[^\n]\n$/);
  assert.ok(!canonical.endsWith('\n\n'));
});

void test('sorts integer-like object keys lexically rather than by JavaScript enumeration order', () => {
  const canonical = canonicalStringify({
    nested: { 2: 'two', 10: 'ten', 1: 'one' },
    2: 'two',
    10: 'ten',
    1: 'one',
  });

  assert.equal(
    canonical,
    [
      '{',
      '  "1": "one",',
      '  "10": "ten",',
      '  "2": "two",',
      '  "nested": {',
      '    "1": "one",',
      '    "10": "ten",',
      '    "2": "two"',
      '  }',
      '}',
      '',
    ].join('\n'),
  );
});

void test('preserves root and nested own __proto__ keys without prototype pollution', () => {
  const nested = {};
  Object.defineProperty(nested, '__proto__', {
    value: { safe: true },
    enumerable: true,
    configurable: true,
    writable: true,
  });
  const input = { nested };
  Object.defineProperty(input, '__proto__', {
    value: 'root-value',
    enumerable: true,
    configurable: true,
    writable: true,
  });

  const canonical = canonicalStringify(input);

  assert.match(canonical, /^\{\n  "__proto__": "root-value",/);
  assert.match(canonical, /"nested": \{\n    "__proto__": \{\n      "safe": true/);
  assert.equal(Object.prototype.safe, undefined);
});

void test('keeps the event hash stable across input key order', () => {
  const first = finalizeEvent(createdEvent());
  const second = finalizeEvent({
    payload: {
      baseSha: 'a'.repeat(40),
      branch: 'refactor/example',
      title: 'Example',
    },
    recordedBy: { role: 'sarah' },
    recordedAt: '2026-07-25T00:00:00.000Z',
    type: 'initiative.created',
    sequence: 1,
    initiativeId: '2026-07-25-example',
    schemaVersion: 1,
  });

  assert.equal(second.eventHash, first.eventHash);
  assert.equal(canonicalStringify(second), canonicalStringify(first));
});

void test('rejects a self-hash mismatch after a leaf edit', () => {
  const event = finalizeEvent(createdEvent());
  const edited = canonicalStringify({
    ...event,
    payload: { ...event.payload, title: 'Edited' },
  });

  assert.throws(() => verifyCanonicalEvent(edited), /event hash mismatch/i);
});

void test('rejects noncanonical stored whitespace and line endings', () => {
  const event = finalizeEvent(createdEvent());
  const compact = `${JSON.stringify(event)}\n`;
  const crlf = canonicalStringify(event).replaceAll('\n', '\r\n');
  const extraLf = `${canonicalStringify(event)}\n`;

  assert.throws(() => verifyCanonicalEvent(compact), /canonical bytes/i);
  assert.throws(() => verifyCanonicalEvent(crlf), /canonical bytes/i);
  assert.throws(() => verifyCanonicalEvent(extraLf), /canonical bytes/i);
});

void test('rejects invalid UTF-8 bytes', () => {
  const invalidUtf8 = Buffer.from([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]);

  assert.throws(() => verifyCanonicalEvent(invalidUtf8), /UTF-8/i);
});

void test('rejects duplicate JSON keys at any depth', () => {
  const duplicateTopLevel = Buffer.from('{"eventHash":"a","eventHash":"b"}\n', 'utf8');
  const duplicateNested = Buffer.from(
    '{"eventHash":"a","payload":{"title":"one","title":"two"}}\n',
    'utf8',
  );

  assert.throws(() => verifyCanonicalEvent(duplicateTopLevel), /duplicate JSON key.*eventHash/i);
  assert.throws(() => verifyCanonicalEvent(duplicateNested), /duplicate JSON key.*payload\.title/i);
});

void test('rejects non-plain objects', () => {
  for (const value of [new Date(), new Map(), new Set(), /pattern/]) {
    assert.throws(() => canonicalStringify({ value }), /plain object/i);
  }
});

void test('rejects unsupported JSON values instead of normalizing them', () => {
  const unsupported = [
    undefined,
    () => undefined,
    Symbol('value'),
    1n,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    -0,
  ];

  for (const value of unsupported) {
    assert.throws(() => canonicalStringify({ value }), /unsupported JSON value/i);
  }

  const sparse = [];
  sparse[1] = 'value';
  assert.throws(() => canonicalStringify(sparse), /sparse array/i);

  const symbolKeyed = ['value'];
  symbolKeyed[Symbol('hidden')] = true;
  assert.throws(() => canonicalStringify(symbolKeyed), /unsupported JSON value/i);

  const accessorArray = ['value'];
  Object.defineProperty(accessorArray, 0, { enumerable: true, get: () => 'computed' });
  assert.throws(() => canonicalStringify(accessorArray), /unsupported JSON value/i);

  const cyclic = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalStringify(cyclic), /cyclic/i);
});

void test('rejects a string source that cannot round-trip through UTF-8', () => {
  const event = finalizeEvent(createdEvent());
  const canonical = canonicalStringify(event);
  const sourceWithLoneSurrogate = canonical.replace('"Example"', '"\ud800"');

  assert.throws(() => verifyCanonicalEvent(sourceWithLoneSurrogate), /UTF-8/i);
});
