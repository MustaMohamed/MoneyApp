const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../lib/manifest');
const {
  canonicalStringify,
  finalizeHashedObject,
  hashCanonicalObject,
} = require('../lib/workflow/canonical');
const { loadTaskGraph, validateTaskGraph } = require('../lib/tasks/graph');

const root = path.resolve(__dirname, '../../..');
const manifest = loadManifest(root);
const limits = manifest.workflow.tasks.limits;
const graphPath = 'docs/superpowers/task-graphs/2026-07-25-harness-bounded-task-packets.json';
const planPath = 'docs/superpowers/plans/2026-07-25-harness-bounded-task-packets.md';
const expectedPlan = {
  path: planPath,
  sha256: crypto
    .createHash('sha256')
    .update(fs.readFileSync(path.join(root, planPath)))
    .digest('hex'),
};

function task(overrides = {}) {
  return {
    id: 'task-01',
    title: 'Add graph validation',
    kind: 'mutation',
    ownerRole: 'dev',
    objective: 'Validate a strict graph.',
    dependsOn: [],
    readPaths: ['scripts/harness/lib/workflow/canonical.js'],
    writePaths: ['scripts/harness/lib/tasks/graph.js'],
    acceptanceCriteria: ['Strict graph fields are accepted.'],
    verificationCommands: [['node', '--test', 'scripts/harness/__tests__/task_graph.test.js']],
    recommendedCommitMessage: 'feat: validate task graph',
    escalationNotes: [],
    ...overrides,
  };
}

function graph(overrides = {}) {
  return finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: '2026-07-25-example',
      plan: {
        path: 'docs/superpowers/plans/2026-07-25-example.md',
        sha256: 'a'.repeat(64),
      },
      tasks: [task()],
      ...overrides,
    },
    'graphHash',
  );
}

function options(overrides = {}) {
  return {
    limits,
    expectedInitiativeId: '2026-07-25-example',
    expectedPlan: {
      path: 'docs/superpowers/plans/2026-07-25-example.md',
      sha256: 'a'.repeat(64),
    },
    ...overrides,
  };
}

void test('loads the committed Phase 3 graph as canonical plan-bound immutable evidence', () => {
  const loaded = loadTaskGraph({
    root,
    relativePath: graphPath,
    limits,
    expectedInitiativeId: '2026-07-25-harness-phase-3',
    expectedPlan,
  });
  const source = fs.readFileSync(path.join(root, graphPath), 'utf8');

  assert.equal(source, canonicalStringify(loaded));
  assert.equal(loaded.graphHash, hashCanonicalObject(loaded, 'graphHash'));
  assert.equal(loaded.tasks.length, 12);
  assert(Object.isFrozen(loaded));
  assert(Object.isFrozen(loaded.tasks[0]));
});

void test('rejects unknown graph and task fields and invalid core enums', () => {
  const cases = [
    [graph({ unexpected: true }), /task graph fields.*unexpected/i],
    [graph({ tasks: [task({ unexpected: true })] }), /task task-01 fields.*unexpected/i],
    [graph({ schemaVersion: 2 }), /schemaVersion must be 1/i],
    [graph({ initiativeId: 'example' }), /initiative ID/i],
    [graph({ tasks: [task({ id: 'one' })] }), /task ID/i],
    [graph({ tasks: [task({ kind: 'analysis' })] }), /kind.*mutation.*validation/i],
    [graph({ tasks: [task({ ownerRole: 'user' })] }), /ownerRole/i],
    [graph({ tasks: [task({ acceptanceCriteria: [] })] }), /acceptanceCriteria/i],
    [graph({ tasks: [task({ verificationCommands: [] })] }), /verificationCommands/i],
    [graph({ tasks: [task({ kind: 'mutation', writePaths: [] })] }), /mutation.*write/i],
    [
      graph({ tasks: [task({ kind: 'validation', writePaths: ['scripts/harness/check.js'] })] }),
      /validation.*write/i,
    ],
  ];

  for (const [value, error] of cases) {
    assert.throws(() => validateTaskGraph(value, options()), error);
  }
});

void test('requires unique IDs and exact plan and initiative binding', () => {
  assert.throws(
    () => validateTaskGraph(graph({ tasks: [task(), task()] }), options()),
    /duplicate task ID task-01/i,
  );
  assert.throws(
    () =>
      validateTaskGraph(
        graph({ plan: { ...options().expectedPlan, sha256: 'b'.repeat(64) } }),
        options(),
      ),
    /embedded plan reference/i,
  );
  assert.throws(
    () => validateTaskGraph(graph(), options({ expectedInitiativeId: '2026-07-25-other' })),
    /initiative ID.*expected/i,
  );
});

void test('enforces every canonical task and graph bound at the exact boundary', () => {
  const fortyTasks = Array.from({ length: limits.maxTasks }, (_, index) =>
    task({
      id: `task-${String(index + 1).padStart(2, '0')}`,
      writePaths: [`generated/task-${String(index + 1).padStart(2, '0')}.js`],
    }),
  );
  assert.doesNotThrow(() => validateTaskGraph(graph({ tasks: fortyTasks }), options()));
  assert.throws(
    () =>
      validateTaskGraph(
        graph({
          tasks: [...fortyTasks, task({ id: 'task-041', writePaths: ['generated/task-041.js'] })],
        }),
        options(),
      ),
    /maximum 40 tasks/i,
  );

  const boundaryCases = [
    ['dependsOn', limits.maxDependencies, 'dependencies'],
    ['readPaths', limits.maxReadPaths, 'read paths'],
    ['writePaths', limits.maxWritePaths, 'write paths'],
    ['acceptanceCriteria', limits.maxAcceptanceCriteria, 'acceptance criteria'],
    ['verificationCommands', limits.maxVerificationCommands, 'verification commands'],
  ];
  for (const [field, maximum, label] of boundaryCases) {
    const values = Array.from({ length: maximum }, (_, index) => {
      if (field === 'dependsOn') return `task-${String(index + 2).padStart(2, '0')}`;
      if (field === 'verificationCommands') return ['node', `check-${index}`];
      if (field === 'acceptanceCriteria') return `Criterion ${index}`;
      return `generated/${field}-${index}.js`;
    });
    const dependencies =
      field === 'dependsOn'
        ? values.map((id, index) => task({ id, writePaths: [`generated/dependency-${index}.js`] }))
        : [];
    assert.doesNotThrow(() =>
      validateTaskGraph(graph({ tasks: [...dependencies, task({ [field]: values })] }), options()),
    );
    assert.throws(
      () =>
        validateTaskGraph(
          graph({
            tasks: [
              ...dependencies,
              task({
                [field]: [
                  ...values,
                  field === 'verificationCommands'
                    ? ['node', 'one-too-many']
                    : field === 'dependsOn'
                      ? 'task-99'
                      : `generated/${field}-overflow.js`,
                ],
              }),
            ],
          }),
          options(),
        ),
      new RegExp(`maximum ${maximum} ${label}`, 'i'),
    );
  }
});

void test('measures task text as UTF-8 bytes and rejects malformed command arrays', () => {
  const fixedTextBytes = Buffer.byteLength(
    [
      task().title,
      task().recommendedCommitMessage,
      ...task().acceptanceCriteria,
      ...task().verificationCommands.flat(),
      ...task().escalationNotes,
    ].join('\0'),
    'utf8',
  );
  const atLimit = 'x'.repeat(limits.maxTaskTextBytes - fixedTextBytes - 1);
  assert.doesNotThrow(() =>
    validateTaskGraph(graph({ tasks: [task({ objective: atLimit })] }), options()),
  );
  assert.throws(
    () => validateTaskGraph(graph({ tasks: [task({ objective: `${atLimit}é` })] }), options()),
    /maximum 8192 text bytes/i,
  );

  for (const verificationCommands of [[[]], [['node', '']], ['node --test']]) {
    assert.throws(
      () => validateTaskGraph(graph({ tasks: [task({ verificationCommands })] }), options()),
      /verification command/i,
    );
  }
});

void test('rejects noncanonical bytes, duplicate keys, bad hash, and symlinked graph files', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(root, '.tmp-task-graph-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const relativePath = 'graph.json';
  const target = path.join(tempRoot, relativePath);
  const value = graph();

  fs.writeFileSync(target, `${JSON.stringify(value)}\n`);
  assert.throws(
    () => loadTaskGraph({ root: tempRoot, relativePath, ...options() }),
    /canonical bytes/i,
  );

  fs.writeFileSync(target, canonicalStringify({ ...value, graphHash: 'f'.repeat(64) }));
  assert.throws(
    () => loadTaskGraph({ root: tempRoot, relativePath, ...options() }),
    /hash mismatch/i,
  );

  fs.writeFileSync(target, '{"graphHash":"a","graphHash":"b"}\n');
  assert.throws(
    () => loadTaskGraph({ root: tempRoot, relativePath, ...options() }),
    /duplicate JSON key/i,
  );

  fs.unlinkSync(target);
  fs.symlinkSync(path.join(root, graphPath), target);
  assert.throws(
    () => loadTaskGraph({ root: tempRoot, relativePath, ...options() }),
    /symbolic.?link/i,
  );
});
