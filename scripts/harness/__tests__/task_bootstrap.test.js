const assert = require('node:assert/strict');
const test = require('node:test');

const { finalizeHashedObject } = require('../lib/workflow/canonical');
const {
  createBootstrapAttestation,
  validateBootstrapChain,
  verifyBootstrapAttestation,
} = require('../lib/tasks/bootstrap');

const ID = '2026-07-26-example';
const BASE = '1'.repeat(40);
const HEAD_ONE = '2'.repeat(40);
const HEAD_TWO = '3'.repeat(40);
const COMMAND = ['node', '--test', 'focused.test.js'];

function task(id, dependsOn, kind = 'mutation') {
  return {
    id,
    title: id,
    kind,
    ownerRole: 'dev',
    objective: `Complete ${id}.`,
    dependsOn,
    readPaths: [],
    writePaths: kind === 'mutation' ? [`generated/${id}.js`] : [],
    acceptanceCriteria: [`${id} is complete.`],
    verificationCommands: [COMMAND],
    recommendedCommitMessage: `feat: complete ${id}`,
    escalationNotes: [],
  };
}

const graph = finalizeHashedObject(
  {
    schemaVersion: 1,
    initiativeId: ID,
    plan: { path: 'docs/superpowers/plans/example.md', sha256: 'a'.repeat(64) },
    tasks: [
      task('task-01', []),
      task('task-02', ['task-01']),
      task('task-03', ['task-02'], 'validation'),
    ],
  },
  'graphHash',
);

function completion(taskId, startHead, endHead, overrides = {}) {
  return {
    taskId,
    startHead,
    endHead,
    changedPaths: startHead === endHead || taskId === 'task-03' ? [] : [`generated/${taskId}.js`],
    summary: `Completed ${taskId}.`,
    checks: [{ command: COMMAND, passed: true, summary: 'Focused test passed.' }],
    ...overrides,
  };
}

void test('validates an activation chain from the initiative base', () => {
  const completions = [
    completion('task-01', BASE, HEAD_ONE),
    completion('task-02', HEAD_ONE, HEAD_TWO),
  ];
  const result = validateBootstrapChain({
    graph,
    completions,
    baseSha: BASE,
    previousChain: [],
    previousAccountedHead: BASE,
    replacement: false,
  });

  assert.equal(result.mode, 'activation');
  assert.deepEqual(result.chain, completions);
  assert.deepEqual(result.imported, completions);
  assert.equal(result.accountedHead, HEAD_TWO);
  assert.equal(Object.isFrozen(result), true);
});

void test('validates replacement extensions and complete legacy snapshots', () => {
  const first = completion('task-01', BASE, HEAD_ONE);
  const second = completion('task-02', HEAD_ONE, HEAD_TWO);

  const extension = validateBootstrapChain({
    graph,
    completions: [second],
    baseSha: BASE,
    previousChain: [first],
    previousAccountedHead: HEAD_ONE,
    replacement: true,
  });
  assert.equal(extension.mode, 'extension');
  assert.deepEqual(extension.chain, [first, second]);

  const snapshot = validateBootstrapChain({
    graph,
    completions: [first, second],
    baseSha: BASE,
    previousChain: [first],
    previousAccountedHead: HEAD_ONE,
    replacement: true,
  });
  assert.equal(snapshot.mode, 'snapshot');
  assert.deepEqual(snapshot.chain, [first, second]);
});

void test('rejects invalid checkpoints, gaps, duplicates, and dependency reordering', () => {
  const first = completion('task-01', BASE, HEAD_ONE);
  const second = completion('task-02', HEAD_ONE, HEAD_TWO);
  const options = {
    graph,
    baseSha: BASE,
    previousChain: [],
    previousAccountedHead: BASE,
    replacement: false,
  };

  assert.throws(
    () => validateBootstrapChain({ ...options, completions: [{ ...first, startHead: HEAD_TWO }] }),
    /checkpoint/i,
  );
  assert.throws(
    () =>
      validateBootstrapChain({
        ...options,
        completions: [first, { ...second, startHead: BASE }],
      }),
    /contiguous/i,
  );
  assert.throws(
    () => validateBootstrapChain({ ...options, completions: [first, first] }),
    /duplicate/i,
  );
  assert.throws(
    () =>
      validateBootstrapChain({
        ...options,
        completions: [completion('task-02', BASE, HEAD_TWO)],
      }),
    /dependenc/i,
  );
});

void test('rejects unknown tasks and incomplete required checks', () => {
  const options = {
    graph,
    baseSha: BASE,
    previousChain: [],
    previousAccountedHead: BASE,
    replacement: false,
  };
  assert.throws(
    () =>
      validateBootstrapChain({
        ...options,
        completions: [completion('task-99', BASE, HEAD_ONE)],
      }),
    /unknown task/i,
  );
  assert.throws(
    () =>
      validateBootstrapChain({
        ...options,
        completions: [completion('task-01', BASE, HEAD_ONE, { checks: [] })],
      }),
    /required check/i,
  );
  assert.throws(
    () =>
      validateBootstrapChain({
        ...options,
        completions: [
          completion('task-01', BASE, HEAD_ONE, {
            checks: [{ command: COMMAND, passed: false, summary: 'Failed.' }],
          }),
        ],
      }),
    /required check.*pass/i,
  );
});

void test('prevents replacement from hiding, reordering, or repeating completed work', () => {
  const first = completion('task-01', BASE, HEAD_ONE);
  const second = completion('task-02', HEAD_ONE, HEAD_TWO);
  const options = {
    graph,
    baseSha: BASE,
    previousChain: [first, second],
    previousAccountedHead: HEAD_TWO,
    replacement: true,
  };

  assert.throws(
    () => validateBootstrapChain({ ...options, completions: [first] }),
    /hide|completed count|snapshot/i,
  );
  assert.throws(
    () => validateBootstrapChain({ ...options, completions: [second, first] }),
    /prefix|reorder|checkpoint|already completed/i,
  );
  assert.throws(
    () =>
      validateBootstrapChain({
        ...options,
        completions: [completion('task-02', HEAD_TWO, HEAD_TWO)],
      }),
    /already completed|repeat/i,
  );
});

void test('accepts a validation task only without head movement or delivery paths', () => {
  const first = completion('task-01', BASE, HEAD_ONE);
  const second = completion('task-02', HEAD_ONE, HEAD_TWO);
  const third = completion('task-03', HEAD_TWO, HEAD_TWO);
  assert.doesNotThrow(() =>
    validateBootstrapChain({
      graph,
      completions: [first, second, third],
      baseSha: BASE,
      previousChain: [],
      previousAccountedHead: BASE,
      replacement: false,
    }),
  );
  assert.throws(
    () =>
      validateBootstrapChain({
        graph,
        completions: [
          first,
          second,
          { ...third, endHead: '4'.repeat(40), changedPaths: ['generated/invalid.js'] },
        ],
        baseSha: BASE,
        previousChain: [],
        previousAccountedHead: BASE,
        replacement: false,
      }),
    /validation task/i,
  );
});

void test('creates and verifies a portable attestation bound to its full context', () => {
  const completions = [
    completion('task-01', BASE, HEAD_ONE),
    completion('task-02', HEAD_ONE, HEAD_TWO),
  ];
  const context = {
    graphHash: graph.graphHash,
    branch: 'feat/example',
    checkpoint: BASE,
    validatedHead: HEAD_TWO,
    completions,
  };
  const attestation = createBootstrapAttestation(context);

  assert.deepEqual(attestation, {
    schemaVersion: 1,
    validatedHead: HEAD_TWO,
    ranges: [
      { taskId: 'task-01', digest: attestation.ranges[0].digest },
      { taskId: 'task-02', digest: attestation.ranges[1].digest },
    ],
    chainDigest: attestation.chainDigest,
  });
  assert.match(attestation.ranges[0].digest, /^[a-f0-9]{64}$/u);
  assert.match(attestation.chainDigest, /^[a-f0-9]{64}$/u);
  assert.equal(verifyBootstrapAttestation({ ...context, attestation }), true);
});

void test('rejects a portable attestation changed outside its observed context', () => {
  const completions = [
    completion('task-01', BASE, HEAD_ONE),
    completion('task-02', HEAD_ONE, HEAD_TWO),
  ];
  const context = {
    graphHash: graph.graphHash,
    branch: 'feat/example',
    checkpoint: BASE,
    validatedHead: HEAD_TWO,
    completions,
  };
  const attestation = createBootstrapAttestation(context);
  const changedCompletion = {
    ...completions[0],
    changedPaths: ['generated/different.js'],
  };
  const changedRangeOrder = {
    ...attestation,
    ranges: [...attestation.ranges].reverse(),
  };
  const changedRangeDigest = {
    ...attestation,
    ranges: [{ ...attestation.ranges[0], digest: 'f'.repeat(64) }, attestation.ranges[1]],
  };

  const cases = [
    [{ ...context, graphHash: 'f'.repeat(64), attestation }, /attestation/i],
    [{ ...context, branch: 'feat/other', attestation }, /attestation/i],
    [{ ...context, checkpoint: 'f'.repeat(40), attestation }, /attestation/i],
    [{ ...context, validatedHead: 'f'.repeat(40), attestation }, /attestation/i],
    [
      {
        ...context,
        completions: [changedCompletion, completions[1]],
        attestation,
      },
      /attestation/i,
    ],
    [{ ...context, attestation: changedRangeOrder }, /attestation/i],
    [{ ...context, attestation: changedRangeDigest }, /attestation/i],
    [
      {
        ...context,
        attestation: { ...attestation, chainDigest: 'f'.repeat(64) },
      },
      /attestation/i,
    ],
  ];

  for (const [candidate, error] of cases) {
    assert.throws(() => verifyBootstrapAttestation(candidate), error);
  }
});
