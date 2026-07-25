const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { finalizeEvent } = require('../lib/workflow/canonical');
const {
  validateCycleBoundDelivery,
  validateDeliverySeed,
  validateEventEnvelope,
  validateEventPayload,
  validateMachine,
} = require('../lib/workflow/schema');

const root = path.resolve(__dirname, '../../..');
const machine = JSON.parse(
  fs.readFileSync(path.join(root, 'harness/workflow/state_machine.json'), 'utf8'),
);
const HASH = 'b'.repeat(64);
const SHA = 'a'.repeat(40);
const ARTIFACT = {
  path: 'docs/superpowers/specs/2026-07-25-example-design.md',
  sha256: HASH,
};
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-example.md',
  sha256: 'c'.repeat(64),
};
const REVIEW = {
  path: 'docs/superpowers/reviews/2026-07-25-example-review.md',
  sha256: 'd'.repeat(64),
};
const QA = {
  path: 'docs/superpowers/qa/2026-07-25-example-qa.md',
  sha256: 'e'.repeat(64),
};
const DELIVERY_SEED = {
  branch: 'refactor/example',
  headSha: SHA,
  contentDigest: 'f'.repeat(64),
};
const DELIVERY = {
  ...DELIVERY_SEED,
  validationCycleId: '1'.repeat(64),
};
const USER_AUTHORITY = {
  decisionBy: 'user',
  recordedBy: 'sarah',
  basis: 'The product owner approved this exact evidence.',
};
const SARAH_AUTHORITY = {
  decisionBy: 'sarah',
  recordedBy: 'sarah',
  basis: 'Sarah approved the plan for autonomous execution.',
};
const TARIQ_AUTHORITY = {
  decisionBy: 'tariq',
  recordedBy: 'tariq',
  basis: 'Tariq reviewed the current validation cycle.',
};

const VALID_PAYLOADS = {
  'initiative.created': {
    title: 'Example',
    branch: 'refactor/example',
    baseSha: SHA,
  },
  'spec.submitted': {
    spec: ARTIFACT,
    deviceQa: { mode: 'required', rationale: 'The application behavior changed.' },
  },
  'spec.signed': {
    spec: ARTIFACT,
    authority: USER_AUTHORITY,
  },
  'spec.revised': {
    spec: ARTIFACT,
    deviceQa: { mode: 'not_applicable', rationale: 'Repository tooling only.' },
    reason: 'Clarified canonical event validation.',
  },
  'plan.submitted': { plan: PLAN },
  'plan.approved': { plan: PLAN, authority: SARAH_AUTHORITY },
  'plan.revised': { plan: PLAN, reason: 'Added missing failure-path coverage.' },
  'implementation.ready': { delivery: DELIVERY_SEED },
  'review.approved': {
    verdict: 'approved',
    review: REVIEW,
    delivery: DELIVERY,
    authority: TARIQ_AUTHORITY,
  },
  'review.changes_requested': {
    verdict: 'changes_requested',
    review: REVIEW,
    delivery: DELIVERY,
    authority: TARIQ_AUTHORITY,
  },
  'verification.passed': {
    delivery: DELIVERY,
    checks: [
      { id: 'format', status: 'passed' },
      { id: 'lint', status: 'passed' },
    ],
  },
  'verification.failed': {
    delivery: DELIVERY,
    checks: [
      { id: 'format', status: 'passed' },
      { id: 'lint', status: 'failed' },
    ],
    failedCheck: 'lint',
  },
  'device_qa.passed': {
    authority: USER_AUTHORITY,
    qa: QA,
    device: 'Pixel 9 Pro',
    os: 'Android 16',
    delivery: DELIVERY,
  },
  'device_qa.failed': {
    authority: USER_AUTHORITY,
    qa: QA,
    device: 'Pixel 9 Pro',
    os: 'Android 16',
    failedCases: ['Account creation CTA did not respond.'],
    delivery: DELIVERY,
  },
  'work.reopened': {
    reason: 'Delivery changed after validation.',
    delivery: DELIVERY,
  },
  'blocker.opened': {
    blockerId: 'native-dependency',
    trigger: 'new_dependency',
    risk: 'The proposed library introduces native code.',
    owner: 'sarah',
    requiredResolver: 'user',
  },
  'blocker.resolved': {
    blockerId: 'native-dependency',
    resolution: 'The product owner rejected the dependency.',
    authority: USER_AUTHORITY,
  },
  'initiative.cancelled': {
    reason: 'The initiative is no longer needed.',
    authority: USER_AUTHORITY,
  },
};

function roleFor(type) {
  return machine.events[type].roles[0];
}

function envelope(type, overrides = {}) {
  const sequence = overrides.sequence ?? 2;
  const event = {
    schemaVersion: 1,
    initiativeId: '2026-07-25-example',
    sequence,
    type,
    recordedAt: '2026-07-25T00:00:00.000Z',
    recordedBy: { role: roleFor(type) },
    ...(sequence === 1 ? {} : { parent: { sequence: sequence - 1, eventHash: HASH } }),
    payload: VALID_PAYLOADS[type],
    ...overrides,
  };
  return finalizeEvent(event);
}

function invalidOwnProperty(value, kind) {
  const clone = { ...value };
  if (kind === 'non-enumerable') {
    Object.defineProperty(clone, 'unexpected', { value: true, enumerable: false });
  } else if (kind === 'symbol') {
    clone[Symbol('unexpected')] = true;
  } else {
    const [key] = Object.keys(clone);
    const original = clone[key];
    Object.defineProperty(clone, key, {
      enumerable: true,
      configurable: true,
      get: () => original,
    });
  }
  return clone;
}

void test('accepts the canonical machine and one valid fixture for every event type', () => {
  assert.equal(validateMachine(machine), machine);
  assert.equal(validateDeliverySeed(DELIVERY_SEED), DELIVERY_SEED);
  assert.equal(validateCycleBoundDelivery(DELIVERY), DELIVERY);

  for (const type of Object.keys(machine.events)) {
    const event = envelope(type, type === 'initiative.created' ? { sequence: 1 } : {});

    assert.equal(validateEventEnvelope(event, machine), event);
    assert.equal(validateEventPayload(event, { initiativeId: event.initiativeId }), event.payload);
  }
});

void test('rejects every missing required payload field for every event type', () => {
  for (const type of Object.keys(machine.events)) {
    const event = envelope(type, type === 'initiative.created' ? { sequence: 1 } : {});
    for (const key of Object.keys(event.payload)) {
      const payload = { ...event.payload };
      delete payload[key];

      assert.throws(
        () => validateEventPayload({ ...event, payload }),
        new RegExp(`${type.replace('.', '\\.')} payload fields.*missing ${key}`, 'i'),
        `${type} must require payload.${key}`,
      );
    }
  }
});

void test('requires enumerable own string data properties in envelope and nested schema objects', () => {
  const nestedCases = [
    {
      label: 'recordedBy',
      event: envelope('spec.submitted'),
      apply: (event, mutate) => ({ ...event, recordedBy: mutate(event.recordedBy) }),
      validate: (event) => validateEventEnvelope(event, machine),
    },
    {
      label: 'parent',
      event: envelope('spec.submitted'),
      apply: (event, mutate) => ({ ...event, parent: mutate(event.parent) }),
      validate: (event) => validateEventEnvelope(event, machine),
    },
    {
      label: 'artifact',
      event: envelope('spec.submitted'),
      apply: (event, mutate) => ({
        ...event,
        payload: { ...event.payload, spec: mutate(event.payload.spec) },
      }),
      validate: validateEventPayload,
    },
    {
      label: 'deviceQa',
      event: envelope('spec.submitted'),
      apply: (event, mutate) => ({
        ...event,
        payload: { ...event.payload, deviceQa: mutate(event.payload.deviceQa) },
      }),
      validate: validateEventPayload,
    },
    {
      label: 'authority',
      event: envelope('review.approved'),
      apply: (event, mutate) => ({
        ...event,
        payload: { ...event.payload, authority: mutate(event.payload.authority) },
      }),
      validate: validateEventPayload,
    },
    {
      label: 'delivery seed',
      event: envelope('implementation.ready'),
      apply: (event, mutate) => ({
        ...event,
        payload: { ...event.payload, delivery: mutate(event.payload.delivery) },
      }),
      validate: validateEventPayload,
    },
    {
      label: 'cycle-bound delivery',
      event: envelope('review.approved'),
      apply: (event, mutate) => ({
        ...event,
        payload: { ...event.payload, delivery: mutate(event.payload.delivery) },
      }),
      validate: validateEventPayload,
    },
    {
      label: 'check result',
      event: envelope('verification.passed'),
      apply: (event, mutate) => ({
        ...event,
        payload: {
          ...event.payload,
          checks: [mutate(event.payload.checks[0]), ...event.payload.checks.slice(1)],
        },
      }),
      validate: validateEventPayload,
    },
  ];

  for (const kind of ['non-enumerable', 'symbol', 'accessor']) {
    const event = envelope('spec.submitted');
    assert.throws(
      () => validateEventEnvelope(invalidOwnProperty(event, kind), machine),
      /own enumerable string data properties/i,
      `event envelope must reject ${kind} properties`,
    );

    const payloadEvent = {
      ...event,
      payload: invalidOwnProperty(event.payload, kind),
    };
    assert.throws(
      () => validateEventPayload(payloadEvent),
      /own enumerable string data properties/i,
      `payload must reject ${kind} properties`,
    );

    for (const nestedCase of nestedCases) {
      assert.throws(
        () =>
          nestedCase.validate(
            nestedCase.apply(nestedCase.event, (value) => invalidOwnProperty(value, kind)),
          ),
        /own enumerable string data properties/i,
        `${nestedCase.label} must reject ${kind} properties`,
      );
    }
  }
});

void test('requires own enumerable string data properties in the machine event registry', () => {
  for (const kind of ['non-enumerable', 'symbol', 'accessor']) {
    const candidate = JSON.parse(JSON.stringify(machine));
    candidate.events = invalidOwnProperty(candidate.events, kind);

    assert.throws(
      () => validateMachine(candidate),
      /workflow machine events.*own enumerable string data properties/i,
    );
  }
});

void test('rejects unknown envelope and payload keys', () => {
  const event = envelope('initiative.created', { sequence: 1 });
  const unknownEnvelope = { ...event, unexpected: true };
  const unknownPayload = {
    ...event,
    payload: { ...event.payload, unexpected: true },
  };

  assert.throws(() => validateEventEnvelope(unknownEnvelope, machine), /event fields.*unexpected/i);
  assert.throws(
    () => validateEventPayload(unknownPayload),
    /initiative\.created payload.*unexpected/i,
  );
});

void test('requires canonical ISO timestamps', () => {
  for (const recordedAt of [
    '2026-07-25',
    '2026-07-25T00:00:00Z',
    '2026-07-25T02:00:00.000+02:00',
    '2026-02-30T00:00:00.000Z',
  ]) {
    assert.throws(
      () => validateEventEnvelope({ ...envelope('spec.submitted'), recordedAt }, machine),
      /canonical ISO timestamp/i,
    );
  }
});

void test('requires a safe date-prefixed initiative ID matching context', () => {
  for (const initiativeId of [
    'example',
    '2026-07-25-Example',
    '2026-07-25-example_slug',
    '2026-02-30-example',
    '../2026-07-25-example',
  ]) {
    assert.throws(
      () => validateEventEnvelope({ ...envelope('spec.submitted'), initiativeId }, machine),
      /initiative ID/i,
    );
  }

  assert.throws(
    () =>
      validateEventPayload(envelope('spec.submitted'), {
        initiativeId: '2026-07-25-other',
      }),
    /directory initiative ID/i,
  );
});

void test('rejects wrong sequence, event hash, and parent shapes', () => {
  const event = envelope('spec.submitted');

  assert.throws(() => validateEventEnvelope({ ...event, sequence: 0 }, machine), /sequence/i);
  assert.throws(
    () => validateEventEnvelope({ ...event, eventHash: 'A'.repeat(64) }, machine),
    /eventHash.*lowercase hexadecimal/i,
  );
  assert.throws(
    () =>
      validateEventEnvelope(
        { ...event, parent: { sequence: 0, eventHash: event.parent.eventHash } },
        machine,
      ),
    /parent sequence/i,
  );
  assert.throws(
    () => validateEventEnvelope({ ...event, parent: undefined }, machine),
    /event fields|parent/i,
  );
  assert.throws(
    () =>
      validateEventEnvelope(
        {
          ...envelope('initiative.created', { sequence: 1 }),
          parent: { sequence: 0, eventHash: HASH },
        },
        machine,
      ),
    /first event.*parent/i,
  );
});

void test('rejects unknown event types, roles, and unauthorized recorder roles', () => {
  const event = envelope('spec.submitted');

  assert.throws(
    () => validateEventEnvelope({ ...event, type: 'unknown.event' }, machine),
    /unknown event type/i,
  );
  assert.throws(
    () => validateEventEnvelope({ ...event, recordedBy: { role: 'unknown' } }, machine),
    /unknown recorder role/i,
  );
  assert.throws(
    () => validateEventEnvelope({ ...event, recordedBy: { role: 'dev' } }, machine),
    /not authorized.*spec\.submitted/i,
  );
  assert.throws(
    () =>
      validateEventEnvelope({ ...event, recordedBy: { role: 'sarah', name: 'Sarah' } }, machine),
    /recordedBy fields.*name/i,
  );
});

void test('requires exact authority, recorder consistency, and nonempty basis', () => {
  const cases = [
    [
      envelope('spec.signed'),
      { ...VALID_PAYLOADS['spec.signed'], authority: { ...USER_AUTHORITY, basis: '' } },
      /authority basis/i,
    ],
    [
      envelope('plan.approved'),
      {
        ...VALID_PAYLOADS['plan.approved'],
        authority: { ...SARAH_AUTHORITY, decisionBy: 'user' },
      },
      /plan\.approved.*decisionBy.*sarah/i,
    ],
    [
      envelope('review.approved'),
      {
        ...VALID_PAYLOADS['review.approved'],
        authority: { ...TARIQ_AUTHORITY, recordedBy: 'sarah' },
      },
      /authority recordedBy.*recorder/i,
    ],
    [
      envelope('device_qa.passed'),
      {
        ...VALID_PAYLOADS['device_qa.passed'],
        authority: { ...USER_AUTHORITY, decisionBy: 'tariq' },
      },
      /device_qa\.passed.*decisionBy.*user/i,
    ],
  ];

  for (const [event, payload, error] of cases) {
    assert.throws(() => validateEventPayload({ ...event, payload }), error);
  }
});

void test('allows cancellation by Sarah or by a user decision recorded by Sarah', () => {
  const event = envelope('initiative.cancelled');
  const sarahDecision = {
    reason: 'Sarah cancelled the initiative within delegated scope.',
    authority: {
      decisionBy: 'sarah',
      recordedBy: 'sarah',
      basis: 'Sarah removed the initiative from the approved scope.',
    },
  };

  assert.doesNotThrow(() => validateEventPayload({ ...event, payload: sarahDecision }));
  assert.throws(
    () =>
      validateEventPayload({
        ...event,
        payload: {
          ...sarahDecision,
          authority: { ...sarahDecision.authority, decisionBy: 'tariq' },
        },
      }),
    /initiative\.cancelled.*decisionBy/i,
  );
});

void test('rejects invalid Device QA declarations and missing device evidence', () => {
  const submitted = envelope('spec.submitted');
  const qaPassed = envelope('device_qa.passed');

  assert.throws(
    () =>
      validateEventPayload({
        ...submitted,
        payload: {
          ...submitted.payload,
          deviceQa: { mode: 'none', rationale: 'Invalid bypass.' },
        },
      }),
    /deviceQa mode/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...qaPassed,
        payload: { ...qaPassed.payload, device: '' },
      }),
    /device/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...qaPassed,
        payload: { ...qaPassed.payload, os: '' },
      }),
    /operating system/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...envelope('device_qa.failed'),
        payload: { ...VALID_PAYLOADS['device_qa.failed'], failedCases: [] },
      }),
    /failedCases/i,
  );
});

void test('rejects malformed artifact, delivery, SHA, and digest evidence', () => {
  const submitted = envelope('spec.submitted');
  const implementation = envelope('implementation.ready');

  assert.throws(
    () =>
      validateEventPayload({
        ...submitted,
        payload: {
          ...submitted.payload,
          spec: { ...ARTIFACT, path: '../outside.md' },
        },
      }),
    /artifact path/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...implementation,
        payload: {
          delivery: { ...DELIVERY_SEED, validationCycleId: '1'.repeat(64) },
        },
      }),
    /delivery seed fields.*validationCycleId/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...envelope('review.approved'),
        payload: {
          ...VALID_PAYLOADS['review.approved'],
          delivery: DELIVERY_SEED,
        },
      }),
    /cycle-bound delivery fields.*validationCycleId/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...submitted,
        payload: {
          ...submitted.payload,
          spec: { ...ARTIFACT, sha256: SHA },
        },
      }),
    /sha256.*64/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...implementation,
        payload: {
          delivery: { ...DELIVERY_SEED, branch: 'main' },
        },
      }),
    /delivery branch.*main/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...implementation,
        payload: {
          delivery: { ...DELIVERY_SEED, headSha: HASH },
        },
      }),
    /headSha.*40/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...implementation,
        payload: {
          delivery: { ...DELIVERY_SEED, contentDigest: 'invalid' },
        },
      }),
    /contentDigest.*64/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...envelope('review.approved'),
        payload: {
          ...VALID_PAYLOADS['review.approved'],
          delivery: { ...DELIVERY, validationCycleId: 'A'.repeat(64) },
        },
      }),
    /validationCycleId.*lowercase hexadecimal/i,
  );
});

void test('rejects non-string values at every hash and SHA boundary', () => {
  const cases = [
    {
      label: 'event hash',
      event: envelope('spec.submitted'),
      validate: (event) =>
        validateEventEnvelope({ ...event, eventHash: [event.eventHash] }, machine),
    },
    {
      label: 'parent event hash',
      event: envelope('spec.submitted'),
      validate: (event) =>
        validateEventEnvelope(
          {
            ...event,
            parent: { ...event.parent, eventHash: [event.parent.eventHash] },
          },
          machine,
        ),
    },
    {
      label: 'base SHA',
      event: envelope('initiative.created', { sequence: 1 }),
      validate: (event) =>
        validateEventPayload({
          ...event,
          payload: { ...event.payload, baseSha: [event.payload.baseSha] },
        }),
    },
    {
      label: 'artifact digest',
      event: envelope('spec.submitted'),
      validate: (event) =>
        validateEventPayload({
          ...event,
          payload: {
            ...event.payload,
            spec: { ...event.payload.spec, sha256: [event.payload.spec.sha256] },
          },
        }),
    },
    {
      label: 'delivery HEAD',
      event: envelope('implementation.ready'),
      validate: (event) =>
        validateEventPayload({
          ...event,
          payload: {
            delivery: {
              ...event.payload.delivery,
              headSha: [event.payload.delivery.headSha],
            },
          },
        }),
    },
    {
      label: 'delivery content digest',
      event: envelope('implementation.ready'),
      validate: (event) =>
        validateEventPayload({
          ...event,
          payload: {
            delivery: {
              ...event.payload.delivery,
              contentDigest: [event.payload.delivery.contentDigest],
            },
          },
        }),
    },
    {
      label: 'validation cycle',
      event: envelope('review.approved'),
      validate: (event) =>
        validateEventPayload({
          ...event,
          payload: {
            ...event.payload,
            delivery: {
              ...event.payload.delivery,
              validationCycleId: [event.payload.delivery.validationCycleId],
            },
          },
        }),
    },
  ];

  for (const boundary of cases) {
    assert.throws(
      () => boundary.validate(boundary.event),
      /must be (?:40|64)-character lowercase hexadecimal/i,
      `${boundary.label} must not coerce an array to a string`,
    );
  }
});

void test('accepts valid Git branch names without imposing an ASCII-only policy', () => {
  for (const branch of [
    'feature',
    'feat/example',
    'release/v1.2.3',
    'Feature/UPPER_case-123',
    'feature/égypt',
    'foo./bar',
    'foo.locked/bar',
  ]) {
    const event = envelope('initiative.created', { sequence: 1 });
    assert.doesNotThrow(
      () =>
        validateEventPayload({
          ...event,
          payload: { ...event.payload, branch },
        }),
      branch,
    );
  }
});

void test('rejects main branches and Git-invalid branch refs deterministically', () => {
  const invalidBranches = [
    '',
    'main',
    'master',
    'HEAD',
    '-feature',
    '.feature',
    'foo/.bar',
    'foo/.',
    'foo/bar.',
    'foo.lock/bar',
    'foo/bar.lock/baz',
    'foo..bar',
    'foo@{bar',
    'foo bar',
    'foo\u0001bar',
    'foo\u007fbar',
    'foo~bar',
    'foo^bar',
    'foo:bar',
    'foo?bar',
    'foo*bar',
    'foo[bar',
    'foo\\bar',
    'foo/',
    'foo//bar',
  ];

  for (const branch of invalidBranches) {
    const event = envelope('initiative.created', { sequence: 1 });
    assert.throws(
      () =>
        validateEventPayload({
          ...event,
          payload: { ...event.payload, branch },
        }),
      /initiative branch.*safe non-main branch/i,
      JSON.stringify(branch),
    );
  }
});

void test('requires coherent structured verification evidence', () => {
  const passed = envelope('verification.passed');
  const failed = envelope('verification.failed');

  assert.throws(
    () =>
      validateEventPayload({
        ...passed,
        payload: {
          ...passed.payload,
          checks: [{ id: 'format', status: 'failed' }],
        },
      }),
    /verification\.passed.*passed/i,
  );
  assert.throws(
    () =>
      validateEventPayload({
        ...failed,
        payload: {
          ...failed.payload,
          failedCheck: 'typecheck',
        },
      }),
    /failedCheck.*failed result/i,
  );
});

void test('requires canonical blocker owner and resolver roles', () => {
  for (const owner of ['sarah', 'tariq', 'dev']) {
    const event = envelope('blocker.opened');
    assert.doesNotThrow(() =>
      validateEventPayload({
        ...event,
        payload: { ...event.payload, owner },
      }),
    );
  }

  for (const requiredResolver of ['user', 'sarah', 'tariq']) {
    const event = envelope('blocker.opened');
    assert.doesNotThrow(() =>
      validateEventPayload({
        ...event,
        payload: { ...event.payload, requiredResolver },
      }),
    );
  }

  for (const owner of ['arbitrary', 'system', ['sarah']]) {
    const event = envelope('blocker.opened');
    assert.throws(
      () =>
        validateEventPayload({
          ...event,
          payload: { ...event.payload, owner },
        }),
      /blocker owner.*sarah.*tariq.*dev/i,
    );
  }

  for (const requiredResolver of ['arbitrary', 'system', 'dev', ['user']]) {
    const event = envelope('blocker.opened');
    assert.throws(
      () =>
        validateEventPayload({
          ...event,
          payload: { ...event.payload, requiredResolver },
        }),
      /blocker requiredResolver.*user.*sarah.*tariq/i,
    );
  }
});
