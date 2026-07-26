const assert = require('node:assert/strict');
const test = require('node:test');

const { runCli } = require('../lib/workflow/cli');

const ID = '2026-07-25-cli-test';
const BRANCH = 'refactor/cli-test';
const BASE_SHA = '1'.repeat(40);
const HEAD_SHA = '2'.repeat(40);
const DIGEST = '3'.repeat(64);
const CYCLE = '4'.repeat(64);
const SPEC = {
  path: 'docs/superpowers/specs/2026-07-25-cli-test-design.md',
  sha256: '5'.repeat(64),
};
const PLAN = {
  path: 'docs/superpowers/plans/2026-07-25-cli-test.md',
  sha256: '6'.repeat(64),
};
const TASK_GRAPH = {
  path: 'docs/superpowers/task-graphs/2026-07-25-cli-test.json',
  sha256: 'b'.repeat(64),
};
const REVIEW = {
  path: 'docs/superpowers/reviews/2026-07-25-cli-test-review.md',
  sha256: '7'.repeat(64),
};
const QA = {
  path: 'docs/superpowers/qa/2026-07-25-cli-test-qa.md',
  sha256: '8'.repeat(64),
};
const NOW = '2026-07-25T12:34:56.789Z';

const machine = {
  roles: ['user', 'sarah', 'tariq', 'dev', 'system'],
  events: {
    'initiative.created': { roles: ['sarah'] },
    'spec.submitted': { roles: ['sarah', 'tariq'] },
    'spec.signed': { roles: ['sarah'] },
    'spec.revised': { roles: ['sarah', 'tariq'] },
    'plan.submitted': { roles: ['tariq'] },
    'plan.approved': { roles: ['sarah'] },
    'plan.revised': { roles: ['tariq'] },
    'implementation.ready': { roles: ['dev'] },
    'review.approved': { roles: ['tariq'] },
    'review.changes_requested': { roles: ['tariq'] },
    'verification.passed': { roles: ['system'] },
    'verification.failed': { roles: ['system'] },
    'device_qa.passed': { roles: ['sarah'] },
    'device_qa.failed': { roles: ['sarah'] },
    'work.reopened': { roles: ['sarah', 'tariq', 'dev'] },
    'blocker.opened': { roles: ['sarah', 'tariq', 'dev'] },
    'blocker.resolved': { roles: ['sarah'] },
    'initiative.cancelled': { roles: ['sarah'] },
  },
};

function writable() {
  let value = '';
  return {
    write(chunk) {
      value += String(chunk);
    },
    value() {
      return value;
    },
  };
}

function projection(overrides = {}) {
  return {
    initiative: { id: ID, title: 'CLI test', branch: BRANCH, baseSha: BASE_SHA },
    phase: 'validation',
    owner: 'tariq',
    sequence: 6,
    latestEvent: { type: 'implementation.ready', eventHash: CYCLE },
    spec: { current: SPEC, signed: true, deviceQaMode: 'not_applicable' },
    plan: { current: PLAN, taskGraph: TASK_GRAPH, approved: true },
    delivery: { branch: BRANCH, headSha: HEAD_SHA, contentDigest: DIGEST },
    validationCycleId: CYCLE,
    review: undefined,
    verification: undefined,
    qa: undefined,
    openBlockers: {},
    legalNextEvents: ['review.approved', 'review.changes_requested'],
    ...overrides,
  };
}

function harness(overrides = {}) {
  const stdout = writable();
  const stderr = writable();
  const appended = [];
  const dependencies = {
    root: '/repo',
    stdout,
    stderr,
    clock: () => NOW,
    loadManifest: () => ({
      workflow: {
        machine: 'machine.json',
        tasks: {
          directory: 'docs/superpowers/task-graphs',
          limits: {
            maxTasks: 40,
            maxDependencies: 12,
            maxReadPaths: 24,
            maxWritePaths: 16,
            maxAcceptanceCriteria: 12,
            maxVerificationCommands: 8,
            maxTaskTextBytes: 8192,
            maxPacketBytes: 24576,
          },
        },
      },
      verification: { checks: [{ id: 'format', local: ['npm', 'run', 'format:check'] }] },
    }),
    loadWorkflowMachine: () => machine,
    loadEventHistory: () => ({
      events: [{}],
      paths: ['event.json'],
      projection: projection(),
    }),
    appendEvent: (request) => {
      appended.push(request);
      return {
        event: {
          sequence: request.expectedSequence,
          type: request.draft.type,
          eventHash: '9'.repeat(64),
        },
        path: 'event.json',
      };
    },
    recoverRuntimeFiles: () => ({ status: 'recovered', removed: ['lock'] }),
    createArtifactReference: (_root, relativePath) => {
      const references = new Map([
        [SPEC.path, SPEC],
        [PLAN.path, PLAN],
        [TASK_GRAPH.path, TASK_GRAPH],
        [REVIEW.path, REVIEW],
        [QA.path, QA],
      ]);
      const reference = references.get(relativePath);
      if (!reference) throw new Error(`Unexpected artifact ${relativePath}`);
      return reference;
    },
    validateArtifactReference: (_root, reference) => reference,
    loadTaskGraph: () => ({}),
    loadTaskContext: () => ({
      taskProjection: { implementationReadyAllowed: true },
    }),
    collectDeliveryRevision: () => ({
      branch: BRANCH,
      headSha: HEAD_SHA,
      contentDigest: DIGEST,
    }),
    getWorkflowStatus: () => ({
      schemaVersion: 1,
      initiativeId: ID,
      phase: 'validation',
      owner: 'tariq',
      sequence: 6,
      evidence: {},
      blockers: [],
      nextActions: [],
    }),
    listWorkflowStatuses: () => [],
    formatWorkflowStatus: () => 'human status\n',
    checkWorkflowStatus: (status) => ({ ok: true, errors: [], status }),
    selectInitiativeId: ({ initiativeId }) => initiativeId ?? ID,
    verifyWorkflow: () => ({
      ok: true,
      recorded: true,
      event: {
        sequence: 7,
        type: 'verification.passed',
        eventHash: 'a'.repeat(64),
      },
    }),
    ...overrides,
  };
  return { stdout, stderr, appended, dependencies };
}

async function execute(argv, overrides = {}) {
  const context = harness(overrides);
  const code = await runCli({ ...context.dependencies, argv });
  return { code, ...context };
}

void test('init creates sequence one with explicit immutable branch and base evidence', async () => {
  const result = await execute(
    ['init', '--id', ID, '--title', 'CLI test', '--branch', BRANCH, '--base-sha', BASE_SHA],
    {
      loadEventHistory: () => ({ events: [], paths: [], projection: undefined }),
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.stderr.value(), '');
  assert.equal(result.appended.length, 1);
  assert.equal(result.appended[0].initiativeId, ID);
  assert.equal(result.appended[0].expectedSequence, 1);
  assert.deepEqual(result.appended[0].draft, {
    type: 'initiative.created',
    recordedAt: NOW,
    recordedBy: { role: 'sarah' },
    payload: {
      title: 'CLI test',
      branch: BRANCH,
      baseSha: BASE_SHA,
    },
  });
});

void test('record uses observed leaf sequence while append receives the next sequence', async () => {
  const result = await execute(
    [
      'record',
      'spec.submitted',
      '--id',
      ID,
      '--expected-sequence',
      '1',
      '--recorded-by',
      'tariq',
      '--spec',
      SPEC.path,
      '--device-qa-mode',
      'not_applicable',
      '--device-qa-rationale',
      'Tooling only',
    ],
    {
      loadEventHistory: () => ({
        events: [{}],
        projection: projection({
          phase: 'brainstorming',
          sequence: 1,
          spec: undefined,
          plan: undefined,
          delivery: undefined,
          validationCycleId: undefined,
        }),
      }),
    },
  );

  assert.equal(result.code, 0);
  assert.equal(result.appended[0].expectedSequence, 2);
  assert.deepEqual(result.appended[0].draft.payload, {
    spec: SPEC,
    deviceQa: { mode: 'not_applicable', rationale: 'Tooling only' },
  });
});

void test('approved bootstrap commands preserve current artifact references and sequence semantics', async () => {
  const cases = [
    {
      sequence: 2,
      event: 'spec.signed',
      role: 'sarah',
      flags: ['--decision-by', 'user', '--basis', 'Approved in task'],
      payload: {
        spec: SPEC,
        authority: {
          decisionBy: 'user',
          recordedBy: 'sarah',
          basis: 'Approved in task',
        },
      },
    },
    {
      sequence: 3,
      event: 'plan.submitted',
      role: 'tariq',
      flags: ['--plan', PLAN.path, '--task-graph', TASK_GRAPH.path],
      payload: { plan: PLAN, taskGraph: TASK_GRAPH },
    },
    {
      sequence: 4,
      event: 'plan.approved',
      role: 'sarah',
      flags: ['--decision-by', 'sarah', '--basis', 'Sarah approved'],
      payload: {
        plan: PLAN,
        taskGraph: TASK_GRAPH,
        authority: {
          decisionBy: 'sarah',
          recordedBy: 'sarah',
          basis: 'Sarah approved',
        },
      },
    },
    {
      sequence: 5,
      event: 'implementation.ready',
      role: 'dev',
      flags: [],
      payload: {
        delivery: { branch: BRANCH, headSha: HEAD_SHA, contentDigest: DIGEST },
      },
    },
  ];

  for (const item of cases) {
    const result = await execute(
      [
        'record',
        item.event,
        '--id',
        ID,
        '--expected-sequence',
        String(item.sequence),
        '--recorded-by',
        item.role,
        ...item.flags,
      ],
      {
        loadEventHistory: () => ({
          events: [{}],
          projection: projection({ sequence: item.sequence }),
        }),
      },
    );
    assert.equal(result.code, 0, result.stderr.value());
    assert.equal(result.appended[0].expectedSequence, item.sequence + 1);
    assert.deepEqual(result.appended[0].draft.payload, item.payload);
  }
});

void test('spec and plan approvals revalidate the current artifact immediately before append', async (t) => {
  const cases = [
    {
      event: 'spec.signed',
      sequence: 2,
      role: 'sarah',
      current: SPEC,
      flags: ['--decision-by', 'user', '--basis', 'Approved'],
      payloadKey: 'spec',
    },
    {
      event: 'plan.approved',
      sequence: 4,
      role: 'sarah',
      current: PLAN,
      flags: ['--decision-by', 'sarah', '--basis', 'Approved'],
      payloadKey: 'plan',
    },
  ];

  for (const item of cases) {
    await t.test(`${item.event} uses validated reference`, async () => {
      const calls = [];
      const result = await execute(
        [
          'record',
          item.event,
          '--id',
          ID,
          '--expected-sequence',
          String(item.sequence),
          '--recorded-by',
          item.role,
          ...item.flags,
        ],
        {
          loadEventHistory: () => ({
            events: [{}],
            projection: projection({ sequence: item.sequence }),
          }),
          validateArtifactReference: (root, reference) => {
            calls.push({ root, reference });
            return { ...reference };
          },
        },
      );
      assert.equal(result.code, 0, result.stderr.value());
      assert.deepEqual(
        calls,
        item.event === 'plan.approved'
          ? [
              { root: '/repo', reference: item.current },
              { root: '/repo', reference: TASK_GRAPH },
            ]
          : [{ root: '/repo', reference: item.current }],
      );
      assert.deepEqual(result.appended[0].draft.payload[item.payloadKey], item.current);
      if (item.event === 'plan.approved') {
        assert.deepEqual(result.appended[0].draft.payload.taskGraph, TASK_GRAPH);
      }
    });

    await t.test(`${item.event} rejects stale current evidence without append`, async () => {
      const result = await execute(
        [
          'record',
          item.event,
          '--id',
          ID,
          '--expected-sequence',
          String(item.sequence),
          '--recorded-by',
          item.role,
          ...item.flags,
        ],
        {
          loadEventHistory: () => ({
            events: [{}],
            projection: projection({ sequence: item.sequence }),
          }),
          validateArtifactReference: () => {
            throw new Error('Stale artifact: observed digest changed');
          },
        },
      );
      assert.equal(result.code, 1);
      assert.match(result.stderr.value(), /stale artifact/i);
      assert.equal(result.appended.length, 0);
    });
  }
});

void test('builds cycle-bound review, QA, reopen, blocker, and cancellation payloads', async (t) => {
  const cases = [
    {
      event: 'review.approved',
      role: 'tariq',
      flags: ['--review', REVIEW.path, '--decision-by', 'tariq', '--basis', 'Reviewed'],
      payload: {
        verdict: 'approved',
        review: REVIEW,
        delivery: {
          branch: BRANCH,
          headSha: HEAD_SHA,
          contentDigest: DIGEST,
          validationCycleId: CYCLE,
        },
        authority: { decisionBy: 'tariq', recordedBy: 'tariq', basis: 'Reviewed' },
      },
    },
    {
      event: 'device_qa.failed',
      role: 'sarah',
      flags: [
        '--qa',
        QA.path,
        '--decision-by',
        'user',
        '--basis',
        'Device run',
        '--device',
        'Pixel 8',
        '--os',
        'Android 16',
        '--failed-cases',
        'launch, resume',
      ],
      payload: {
        authority: { decisionBy: 'user', recordedBy: 'sarah', basis: 'Device run' },
        qa: QA,
        device: 'Pixel 8',
        os: 'Android 16',
        failedCases: ['launch', 'resume'],
        delivery: {
          branch: BRANCH,
          headSha: HEAD_SHA,
          contentDigest: DIGEST,
          validationCycleId: CYCLE,
        },
      },
    },
    {
      event: 'work.reopened',
      role: 'dev',
      flags: ['--reason', 'Delivery changed'],
      payload: {
        reason: 'Delivery changed',
        delivery: {
          branch: BRANCH,
          headSha: HEAD_SHA,
          contentDigest: DIGEST,
          validationCycleId: CYCLE,
        },
      },
    },
    {
      event: 'blocker.opened',
      role: 'dev',
      flags: [
        '--blocker-id',
        'native-dependency',
        '--trigger',
        'new dependency',
        '--owner',
        'tariq',
        '--resolver',
        'user',
        '--reason',
        'Needs approval',
      ],
      payload: {
        blockerId: 'native-dependency',
        trigger: 'new dependency',
        risk: 'Needs approval',
        owner: 'tariq',
        requiredResolver: 'user',
      },
    },
    {
      event: 'blocker.resolved',
      role: 'sarah',
      flags: [
        '--blocker-id',
        'native-dependency',
        '--decision-by',
        'user',
        '--basis',
        'Approved explicitly',
        '--resolution',
        'Proceed',
      ],
      payload: {
        blockerId: 'native-dependency',
        resolution: 'Proceed',
        authority: {
          decisionBy: 'user',
          recordedBy: 'sarah',
          basis: 'Approved explicitly',
        },
      },
    },
    {
      event: 'initiative.cancelled',
      role: 'sarah',
      flags: ['--decision-by', 'user', '--basis', 'Owner request', '--reason', 'No longer needed'],
      payload: {
        reason: 'No longer needed',
        authority: { decisionBy: 'user', recordedBy: 'sarah', basis: 'Owner request' },
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.event, async () => {
      const result = await execute([
        'record',
        item.event,
        '--id',
        ID,
        '--expected-sequence',
        '6',
        '--recorded-by',
        item.role,
        ...item.flags,
      ]);
      assert.equal(result.code, 0, result.stderr.value());
      assert.deepEqual(result.appended[0].draft.payload, item.payload);
    });
  }
});

void test('review and QA records collect a fresh clean revision immediately before append', async (t) => {
  const CURRENT_HEAD = 'a'.repeat(40);
  const cases = [
    {
      event: 'review.approved',
      role: 'tariq',
      flags: ['--review', REVIEW.path, '--decision-by', 'tariq', '--basis', 'Reviewed'],
    },
    {
      event: 'review.changes_requested',
      role: 'tariq',
      flags: ['--review', REVIEW.path, '--decision-by', 'tariq', '--basis', 'Changes'],
    },
    {
      event: 'device_qa.passed',
      role: 'sarah',
      flags: [
        '--qa',
        QA.path,
        '--decision-by',
        'user',
        '--basis',
        'Run',
        '--device',
        'Pixel',
        '--os',
        'Android',
      ],
    },
    {
      event: 'device_qa.failed',
      role: 'sarah',
      flags: [
        '--qa',
        QA.path,
        '--decision-by',
        'user',
        '--basis',
        'Run',
        '--device',
        'Pixel',
        '--os',
        'Android',
        '--failed-cases',
        'resume',
      ],
    },
  ];

  for (const item of cases) {
    await t.test(`${item.event} binds the current revision to the active cycle`, async () => {
      const calls = [];
      const result = await execute(
        [
          'record',
          item.event,
          '--id',
          ID,
          '--expected-sequence',
          '6',
          '--recorded-by',
          item.role,
          ...item.flags,
        ],
        {
          collectDeliveryRevision: (root, initiative, options) => {
            calls.push({ root, initiative, options });
            return {
              branch: BRANCH,
              headSha: CURRENT_HEAD,
              contentDigest: DIGEST,
            };
          },
        },
      );
      assert.equal(result.code, 0, result.stderr.value());
      assert.equal(calls.length, 1);
      assert.deepEqual(result.appended[0].draft.payload.delivery, {
        branch: BRANCH,
        headSha: CURRENT_HEAD,
        contentDigest: DIGEST,
        validationCycleId: CYCLE,
      });
    });

    await t.test(`${item.event} rejects dirty collection without append`, async () => {
      const result = await execute(
        [
          'record',
          item.event,
          '--id',
          ID,
          '--expected-sequence',
          '6',
          '--recorded-by',
          item.role,
          ...item.flags,
        ],
        {
          collectDeliveryRevision: () => {
            throw new Error('Delivery is dirty outside evidence paths');
          },
        },
      );
      assert.equal(result.code, 1);
      assert.match(result.stderr.value(), /delivery is dirty/i);
      assert.equal(result.appended.length, 0);
    });

    await t.test(`${item.event} rejects content drift without append`, async () => {
      const result = await execute(
        [
          'record',
          item.event,
          '--id',
          ID,
          '--expected-sequence',
          '6',
          '--recorded-by',
          item.role,
          ...item.flags,
        ],
        {
          collectDeliveryRevision: () => ({
            branch: BRANCH,
            headSha: CURRENT_HEAD,
            contentDigest: 'f'.repeat(64),
          }),
        },
      );
      assert.equal(result.code, 1);
      assert.match(result.stderr.value(), /content digest.*active delivery/i);
      assert.equal(result.appended.length, 0);
    });
  }
});

void test('work.reopened preserves the prior cycle delivery after content drift', async () => {
  const result = await execute(
    [
      'record',
      'work.reopened',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'sarah',
      '--reason',
      'Delivery changed',
    ],
    {
      collectDeliveryRevision: () => {
        throw new Error('work.reopened must not collect the current delivery');
      },
    },
  );

  assert.equal(result.code, 0, result.stderr.value());
  assert.deepEqual(result.appended[0].draft.payload.delivery, {
    branch: BRANCH,
    headSha: HEAD_SHA,
    contentDigest: DIGEST,
    validationCycleId: CYCLE,
  });
});

void test('builds revised spec and plan and passed QA payloads', async (t) => {
  const cases = [
    {
      event: 'spec.revised',
      role: 'tariq',
      flags: [
        '--spec',
        SPEC.path,
        '--device-qa-mode',
        'required',
        '--device-qa-rationale',
        'Runtime behavior changed',
        '--reason',
        'Scope changed',
      ],
      payload: {
        spec: SPEC,
        deviceQa: { mode: 'required', rationale: 'Runtime behavior changed' },
        reason: 'Scope changed',
      },
    },
    {
      event: 'plan.revised',
      role: 'tariq',
      flags: [
        '--plan',
        PLAN.path,
        '--task-graph',
        TASK_GRAPH.path,
        '--reason',
        'Review correction',
      ],
      payload: { plan: PLAN, taskGraph: TASK_GRAPH, reason: 'Review correction' },
    },
    {
      event: 'device_qa.passed',
      role: 'sarah',
      flags: [
        '--qa',
        QA.path,
        '--decision-by',
        'user',
        '--basis',
        'Device run',
        '--device',
        'Pixel 8',
        '--os',
        'Android 16',
      ],
      payload: {
        authority: { decisionBy: 'user', recordedBy: 'sarah', basis: 'Device run' },
        qa: QA,
        device: 'Pixel 8',
        os: 'Android 16',
        delivery: {
          branch: BRANCH,
          headSha: HEAD_SHA,
          contentDigest: DIGEST,
          validationCycleId: CYCLE,
        },
      },
    },
  ];

  for (const item of cases) {
    await t.test(item.event, async () => {
      const result = await execute([
        'record',
        item.event,
        '--id',
        ID,
        '--expected-sequence',
        '6',
        '--recorded-by',
        item.role,
        ...item.flags,
      ]);
      assert.equal(result.code, 0, result.stderr.value());
      assert.deepEqual(result.appended[0].draft.payload, item.payload);
    });
  }
});

void test('status, list, check, and recovery delegate without mutation', async (t) => {
  await t.test('status JSON', async () => {
    const result = await execute(['status', '--id', ID, '--json']);
    assert.equal(result.code, 0);
    const parsed = JSON.parse(result.stdout.value());
    assert.equal(parsed.initiativeId, ID);
    assert.equal(parsed.schemaVersion, 1);
  });

  await t.test('list JSON', async () => {
    const result = await execute(['list', '--json'], {
      listWorkflowStatuses: () => [
        {
          schemaVersion: 1,
          initiativeId: ID,
          phase: 'validation',
          owner: 'tariq',
          sequence: 6,
          evidence: {},
          blockers: [],
          nextActions: [],
        },
      ],
    });
    assert.equal(result.code, 0);
    assert.equal(JSON.parse(result.stdout.value())[0].initiativeId, ID);
  });

  await t.test('check invalid returns one', async () => {
    const result = await execute(['check', '--id', ID], {
      checkWorkflowStatus: (status) => ({ ok: false, errors: ['stale spec'], status }),
    });
    assert.equal(result.code, 1);
    assert.match(result.stderr.value(), /stale spec/);
    assert.equal(result.appended.length, 0);
  });

  await t.test('check without id injects read-only Git branch selection', async () => {
    let observedBranch;
    const result = await execute(['check'], {
      runGit: (args) => {
        assert.deepEqual(args, ['rev-parse', '--abbrev-ref', 'HEAD']);
        return Buffer.from(`${BRANCH}\n`);
      },
      selectInitiativeId: (options) => {
        observedBranch = options.readCurrentBranch();
        return ID;
      },
    });
    assert.equal(result.code, 0);
    assert.equal(observedBranch, BRANCH);
  });

  await t.test('recovery is token scoped and defaults to actual recovery', async () => {
    let request;
    const result = await execute(['recover', '--id', ID, '--token', 'a'.repeat(32)], {
      recoverRuntimeFiles: (value) => {
        request = value;
        return { status: 'recovered', removed: ['lock'] };
      },
    });
    assert.equal(result.code, 0);
    assert.equal(request.initiativeId, ID);
    assert.equal(request.token, 'a'.repeat(32));
    assert.equal(request.dryRun, false);
  });
});

void test('verify delegates only the typed id and observed sequence and reports its receipt', async (t) => {
  await t.test('passed verification returns zero', async () => {
    let request;
    const result = await execute(['verify', '--id', ID, '--expected-sequence', '6'], {
      verifyWorkflow: (value) => {
        request = value;
        return {
          ok: true,
          recorded: true,
          event: {
            sequence: 7,
            type: 'verification.passed',
            eventHash: 'a'.repeat(64),
          },
        };
      },
    });

    assert.equal(result.code, 0);
    assert.equal(request.initiativeId, ID);
    assert.equal(request.expectedSequence, 6);
    assert.deepEqual(request.checks, [{ id: 'format', local: ['npm', 'run', 'format:check'] }]);
    assert.match(result.stdout.value(), /verification\.passed/);
  });

  await t.test('failed checks record failure and return one', async () => {
    const result = await execute(['verify', '--id', ID, '--expected-sequence', '6'], {
      verifyWorkflow: () => ({
        ok: false,
        recorded: true,
        event: {
          sequence: 7,
          type: 'verification.failed',
          eventHash: 'b'.repeat(64),
        },
      }),
    });

    assert.equal(result.code, 1);
    assert.match(result.stdout.value(), /verification\.failed/);
  });

  await t.test('stale facts record nothing and return one', async () => {
    const result = await execute(['verify', '--id', ID, '--expected-sequence', '6'], {
      verifyWorkflow: () => ({
        ok: false,
        recorded: false,
        reason: 'contentDigest changed while verification checks ran',
      }),
    });

    assert.equal(result.code, 1);
    assert.equal(result.stdout.value(), '');
    assert.match(result.stderr.value(), /contentDigest changed/i);
  });
});

void test('returns usage code two for malformed or forbidden commands', async (t) => {
  const cases = [
    ['unknown'],
    ['transition', '--to', 'validation'],
    ['push'],
    ['merge'],
    ['finish'],
    ['verify', '--id', ID, '--expected-sequence', '6', '--claim-green', 'yes'],
    ['verify', '--id', ID],
    [
      'record',
      'verification.passed',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'system',
    ],
    [
      'record',
      'verification.failed',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'system',
    ],
    [
      'record',
      'initiative.created',
      '--id',
      ID,
      '--expected-sequence',
      '0',
      '--recorded-by',
      'sarah',
    ],
    ['record', 'review.approved', '--id', ID, '--recorded-by', 'tariq'],
    ['record', 'review.approved', '--id', ID, '--expected-sequence', '6'],
    [
      'record',
      'plan.submitted',
      '--id',
      ID,
      '--expected-sequence',
      '3',
      '--recorded-by',
      'tariq',
      '--plan',
      PLAN.path,
    ],
    [
      'record',
      'plan.revised',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'tariq',
      '--plan',
      PLAN.path,
      '--reason',
      'Review correction',
    ],
    [
      'record',
      'review.approved',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'tariq',
      '--review',
      REVIEW.path,
      '--decision-by',
      'tariq',
    ],
    ['status', '--id', ID, '--id', ID],
    ['status', '--wat', 'value'],
    ['status', '--id'],
    ['status', '--id', '../unsafe'],
    ['init', '--id', ID, '--title', 'CLI test', '--branch', 'main', '--base-sha', BASE_SHA],
  ];

  for (const argv of cases) {
    await t.test(argv.join(' '), async () => {
      const result = await execute(argv);
      assert.equal(result.code, 2);
      assert.notEqual(result.stderr.value(), '');
      assert.equal(result.appended.length, 0);
    });
  }
});

void test('rejects stale expected sequence and wrong event authority before append', async (t) => {
  await t.test('stale sequence', async () => {
    const result = await execute([
      'record',
      'implementation.ready',
      '--id',
      ID,
      '--expected-sequence',
      '5',
      '--recorded-by',
      'dev',
    ]);
    assert.equal(result.code, 1);
    assert.match(result.stderr.value(), /stale expected sequence.*observed 6/i);
    assert.equal(result.appended.length, 0);
  });

  await t.test('wrong recorder', async () => {
    const result = await execute([
      'record',
      'review.approved',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'dev',
      '--review',
      REVIEW.path,
      '--decision-by',
      'tariq',
      '--basis',
      'Reviewed',
    ]);
    assert.equal(result.code, 2);
    assert.match(result.stderr.value(), /not authorized/i);
    assert.equal(result.appended.length, 0);
  });
});

void test('rejects invalid device QA declarations and failed cases', async (t) => {
  const cases = [
    [
      'record',
      'spec.revised',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'tariq',
      '--spec',
      SPEC.path,
      '--device-qa-mode',
      'optional',
      '--device-qa-rationale',
      'No',
      '--reason',
      'Change',
    ],
    [
      'record',
      'device_qa.failed',
      '--id',
      ID,
      '--expected-sequence',
      '6',
      '--recorded-by',
      'sarah',
      '--qa',
      QA.path,
      '--decision-by',
      'user',
      '--basis',
      'Run',
      '--device',
      'Pixel',
      '--os',
      'Android',
      '--failed-cases',
      ',',
    ],
  ];
  for (const argv of cases) {
    await t.test(argv[2], async () => {
      const result = await execute(argv);
      assert.equal(result.code, 2);
      assert.equal(result.appended.length, 0);
    });
  }
});

void test('rejects noncanonical blocker owner and resolver roles before append', async (t) => {
  const base = [
    'record',
    'blocker.opened',
    '--id',
    ID,
    '--expected-sequence',
    '6',
    '--recorded-by',
    'dev',
    '--blocker-id',
    'critical',
    '--trigger',
    'new dependency',
    '--reason',
    'Needs authority',
  ];
  for (const roleFlags of [
    ['--owner', 'system', '--resolver', 'user'],
    ['--owner', 'dev', '--resolver', 'system'],
    ['--owner', 'arbitrary', '--resolver', 'arbitrary'],
  ]) {
    await t.test(roleFlags.join(' '), async () => {
      const result = await execute([...base, ...roleFlags]);
      assert.equal(result.code, 2);
      assert.match(result.stderr.value(), /blocker (owner|resolver)/i);
      assert.equal(result.appended.length, 0);
    });
  }
});
