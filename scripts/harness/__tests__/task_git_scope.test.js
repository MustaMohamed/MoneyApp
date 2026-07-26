const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const test = require('node:test');

const { finalizeHashedObject } = require('../lib/workflow/canonical');
const {
  attestBootstrapChain,
  attestLegacyBootstrapBridge,
  collectTaskCompletionRevision,
  collectTaskStartRevision,
  parseNameStatusZ,
  validateChangedPaths,
} = require('../lib/tasks/git_scope');

const BRANCH = 'refactor/example';
const START = 'a'.repeat(40);
const END = 'b'.repeat(40);
const COMMAND = ['node', '--test', 'focused.test.js'];

function repositoryRoot(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-task-git-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'scripts/harness/lib/tasks'), { recursive: true });
  fs.writeFileSync(path.join(root, 'scripts/harness/lib/tasks/graph.js'), 'module.exports = {};');
  return root;
}

function task(overrides = {}) {
  return {
    id: 'task-01',
    kind: 'mutation',
    dependsOn: [],
    verificationCommands: [COMMAND],
    writePaths: ['scripts/harness/lib/tasks/**'],
    ...overrides,
  };
}

function completion(taskId, startHead, endHead, changedPaths) {
  return {
    taskId,
    startHead,
    endHead,
    changedPaths,
    summary: `Completed ${taskId}.`,
    checks: [{ command: COMMAND, passed: true, summary: 'Focused test passed.' }],
  };
}

function graph(tasks = [task()]) {
  return finalizeHashedObject(
    {
      schemaVersion: 1,
      initiativeId: '2026-07-26-example',
      plan: {
        path: 'docs/superpowers/plans/2026-07-26-example.md',
        sha256: 'a'.repeat(64),
      },
      tasks,
    },
    'graphHash',
  );
}

function realRepository(t) {
  const root = repositoryRoot(t);
  const git = (...args) =>
    execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  git('init', '-b', BRANCH);
  git('config', 'user.email', 'harness@example.test');
  git('config', 'user.name', 'Harness Test');
  git('add', 'scripts/harness/lib/tasks/graph.js');
  git('commit', '-m', 'base');
  const startHead = git('rev-parse', 'HEAD');
  fs.writeFileSync(
    path.join(root, 'scripts/harness/lib/tasks/graph.js'),
    'module.exports = { ready: true };',
  );
  git('add', 'scripts/harness/lib/tasks/graph.js');
  git('commit', '-m', 'change');
  return { root, startHead, endHead: git('rev-parse', 'HEAD') };
}

function gitStub(overrides = {}) {
  const calls = [];
  const values = {
    'rev-parse --abbrev-ref HEAD': `${BRANCH}\n`,
    'rev-parse --verify HEAD': `${END}\n`,
    'status --porcelain=v1 -z --untracked-files=all': Buffer.alloc(0),
    'merge-base --is-ancestor': Buffer.alloc(0),
    'diff --name-status -z --find-renames --find-copies': Buffer.from(
      'M\0scripts/harness/lib/tasks/graph.js\0',
    ),
    ...overrides,
  };
  return {
    calls,
    runGit(args) {
      calls.push(args);
      const prefix = args.slice(0, 2).join(' ');
      if (args[0] === 'merge-base') {
        const value = values['merge-base --is-ancestor'];
        if (value instanceof Error) throw value;
        return value;
      }
      if (args[0] === 'diff') {
        const value = values['diff --name-status -z --find-renames --find-copies'];
        if (value instanceof Error) throw value;
        return value;
      }
      const value = values[prefix] ?? values[args.slice(0, 4).join(' ')];
      if (value instanceof Error) throw value;
      if (value === undefined) throw new Error(`Unexpected Git command: ${args.join(' ')}`);
      return value;
    },
  };
}

void test('parses created, modified, deleted, renamed, and copied NUL status records', () => {
  const records = parseNameStatusZ(
    Buffer.from(
      [
        'A',
        'created.js',
        'M',
        'modified.js',
        'D',
        'deleted.js',
        'R100',
        'old.js',
        'new.js',
        'C090',
        'source.js',
        'copy.js',
        '',
      ].join('\0'),
    ),
  );
  assert.deepEqual(records, [
    { status: 'A', sourcePath: undefined, destinationPath: 'created.js' },
    { status: 'M', sourcePath: undefined, destinationPath: 'modified.js' },
    { status: 'D', sourcePath: undefined, destinationPath: 'deleted.js' },
    { status: 'R100', sourcePath: 'old.js', destinationPath: 'new.js' },
    { status: 'C090', sourcePath: 'source.js', destinationPath: 'copy.js' },
  ]);
});

void test('collects a clean attached task start with direct read-only Git arguments', (t) => {
  const root = repositoryRoot(t);
  const git = gitStub({ 'rev-parse --verify HEAD': `${START}\n` });
  const result = collectTaskStartRevision(root, BRANCH, { runGit: git.runGit });

  assert.deepEqual(result, { branch: BRANCH, startHead: START });
  assert.deepEqual(git.calls, [
    ['rev-parse', '--abbrev-ref', 'HEAD'],
    ['rev-parse', '--verify', 'HEAD'],
    ['status', '--porcelain=v1', '-z', '--untracked-files=all'],
  ]);
  assert.equal(
    git.calls.every((args) => Array.isArray(args)),
    true,
  );
  assert.equal(
    git.calls.some((args) => args.join(' ').includes('sh -c')),
    false,
  );
});

void test('rejects committed delivery changes between the accounted checkpoint and claim', (t) => {
  const root = repositoryRoot(t);
  const git = gitStub({
    'diff --name-status -z --find-renames --find-copies': Buffer.from('M\0src/unaccounted.js\0'),
  });

  assert.throws(
    () =>
      collectTaskStartRevision(root, BRANCH, {
        expectedHead: START,
        runGit: git.runGit,
      }),
    /unaccounted committed delivery paths.*src\/unaccounted\.js/i,
  );
});

void test('allows only harness evidence commits between the checkpoint and claim', (t) => {
  const root = repositoryRoot(t);
  const git = gitStub({
    'diff --name-status -z --find-renames --find-copies': Buffer.from(
      [
        'M',
        'docs/superpowers/initiatives/2026-07-25-example/task-events/event.json',
        'M',
        'docs/superpowers/specs/2026-07-25-example-design.md',
        'M',
        'docs/superpowers/plans/2026-07-25-example.md',
        'M',
        'docs/superpowers/task-graphs/2026-07-25-example.json',
        '',
      ].join('\0'),
    ),
  });

  assert.deepEqual(
    collectTaskStartRevision(root, BRANCH, {
      expectedHead: START,
      runGit: git.runGit,
    }),
    { branch: BRANCH, startHead: END },
  );
});

void test('collects and validates a committed mutation delta', (t) => {
  const root = repositoryRoot(t);
  const git = gitStub();
  const result = collectTaskCompletionRevision(root, { branch: BRANCH, startHead: START }, task(), {
    runGit: git.runGit,
  });

  assert.deepEqual(result, {
    branch: BRANCH,
    startHead: START,
    endHead: END,
    changedPaths: ['scripts/harness/lib/tasks/graph.js'],
  });
  assert(
    git.calls.every((args) => ['rev-parse', 'status', 'merge-base', 'diff'].includes(args[0])),
  );
});

void test('validates an explicit historical completion range under the current branch tip', (t) => {
  const root = repositoryRoot(t);
  const currentHead = 'c'.repeat(40);
  const git = gitStub({ 'rev-parse --verify HEAD': `${currentHead}\n` });
  const result = collectTaskCompletionRevision(root, { branch: BRANCH, startHead: START }, task(), {
    runGit: git.runGit,
    endHead: END,
  });

  assert.equal(result.endHead, END);
  assert.deepEqual(
    git.calls.filter((args) => args[0] === 'merge-base'),
    [
      ['merge-base', '--is-ancestor', END, currentHead],
      ['merge-base', '--is-ancestor', START, END],
    ],
  );
});

void test('validates both rename paths, only copy destinations, and evidence exclusions', (t) => {
  const root = repositoryRoot(t);
  const git = gitStub({
    'diff --name-status -z --find-renames --find-copies': Buffer.from(
      [
        'R100',
        'scripts/harness/lib/tasks/old.js',
        'scripts/harness/lib/tasks/new.js',
        'C100',
        'outside/source.js',
        'scripts/harness/lib/tasks/copied.js',
        'M',
        'docs/superpowers/initiatives/id/task-events/000001-event.json',
        '',
      ].join('\0'),
    ),
  });
  const result = collectTaskCompletionRevision(root, { branch: BRANCH, startHead: START }, task(), {
    runGit: git.runGit,
  });
  assert.deepEqual(result.changedPaths, [
    'scripts/harness/lib/tasks/copied.js',
    'scripts/harness/lib/tasks/new.js',
    'scripts/harness/lib/tasks/old.js',
  ]);
});

void test('rejects detached, wrong, dirty, divergent, empty, and out-of-scope mutations', (t) => {
  const root = repositoryRoot(t);
  const cases = [
    [gitStub({ 'rev-parse --abbrev-ref HEAD': 'HEAD\n' }), /detached HEAD/i],
    [gitStub({ 'rev-parse --abbrev-ref HEAD': 'refactor/other\n' }), /branch mismatch/i],
    [
      gitStub({
        'status --porcelain=v1 -z --untracked-files=all': Buffer.from(
          ' M scripts/harness/lib/tasks/graph.js\0',
        ),
      }),
      /dirty delivery/i,
    ],
    [gitStub({ 'merge-base --is-ancestor': new Error('not ancestor') }), /does not descend/i],
    [
      gitStub({ 'diff --name-status -z --find-renames --find-copies': Buffer.alloc(0) }),
      /nonempty committed delta/i,
    ],
    [
      gitStub({
        'diff --name-status -z --find-renames --find-copies': Buffer.from('M\0src/outside.js\0'),
      }),
      /outside approved write scopes.*src\/outside\.js/i,
    ],
  ];
  for (const [git, error] of cases) {
    assert.throws(
      () =>
        collectTaskCompletionRevision(root, { branch: BRANCH, startHead: START }, task(), {
          runGit: git.runGit,
        }),
      error,
    );
  }
});

void test('requires validation tasks to preserve HEAD and delivery content', (t) => {
  const root = repositoryRoot(t);
  const validation = task({ kind: 'validation', writePaths: [] });
  assert.throws(
    () =>
      collectTaskCompletionRevision(root, { branch: BRANCH, startHead: START }, validation, {
        runGit: gitStub().runGit,
      }),
    /validation task.*HEAD movement/i,
  );

  const unchanged = gitStub({
    'rev-parse --verify HEAD': `${START}\n`,
    'diff --name-status -z --find-renames --find-copies': Buffer.alloc(0),
  });
  assert.deepEqual(
    collectTaskCompletionRevision(root, { branch: BRANCH, startHead: START }, validation, {
      runGit: unchanged.runGit,
    }),
    { branch: BRANCH, startHead: START, endHead: START, changedPaths: [] },
  );
});

void test('rejects unsafe, aliased, and out-of-scope changed paths', (t) => {
  const root = repositoryRoot(t);
  for (const changedPaths of [
    ['../escape.js'],
    ['Scripts/harness/lib/tasks/graph.js'],
    ['scripts/harness/lib/tasks/cafe\u0301.js'],
    ['scripts\\harness\\lib\\tasks\\graph.js'],
  ]) {
    assert.throws(() => validateChangedPaths(root, task(), changedPaths), /path|scope|NFC/i);
  }
});

void test('attests an exact bootstrap chain from a stable real repository', (t) => {
  const repository = realRepository(t);
  const completions = [
    completion('task-01', repository.startHead, repository.endHead, [
      'scripts/harness/lib/tasks/graph.js',
    ]),
  ];
  const result = attestBootstrapChain(repository.root, {
    branch: BRANCH,
    graph: graph(),
    checkpoint: repository.startHead,
    completions,
  });

  assert.deepEqual(result.observedCompletions, completions);
  assert.equal(result.attestation.validatedHead, repository.endHead);
  assert.equal(result.attestation.ranges[0].taskId, 'task-01');
  assert.match(result.attestation.chainDigest, /^[a-f0-9]{64}$/u);
});

void test('attests an evidence-only bridge and rejects non-evidence or divergent gaps', (t) => {
  const root = repositoryRoot(t);
  const bridge = {
    beforeHead: START,
    afterHead: END,
    changedPaths: ['docs/superpowers/specs/legacy-design.md'],
  };
  const evidenceGit = gitStub({
    'diff --name-status -z --find-renames --find-copies': Buffer.from(
      'M\0docs/superpowers/specs/legacy-design.md\0',
    ),
  });
  const attested = attestLegacyBootstrapBridge(root, bridge, {
    runGit: evidenceGit.runGit,
  });
  assert.equal(attested.beforeHead, START);
  assert.equal(attested.afterHead, END);
  assert.deepEqual(attested.changedPaths, bridge.changedPaths);
  assert.match(attested.digest, /^[a-f0-9]{64}$/u);

  assert.throws(
    () =>
      attestLegacyBootstrapBridge(
        root,
        { ...bridge, changedPaths: ['scripts/harness/lib/tasks/store.js'] },
        {
          runGit: gitStub({
            'diff --name-status -z --find-renames --find-copies': Buffer.from(
              'M\0scripts/harness/lib/tasks/store.js\0',
            ),
          }).runGit,
        },
      ),
    /evidence/i,
  );
  assert.throws(
    () =>
      attestLegacyBootstrapBridge(root, bridge, {
        runGit: gitStub({
          'merge-base --is-ancestor': new Error('not ancestor'),
        }).runGit,
      }),
    /descend|ancestor/i,
  );
});

void test('rejects invented ranges, path disagreement, and a stale final endpoint', (t) => {
  const root = repositoryRoot(t);
  const approvedGraph = graph();
  const options = {
    branch: BRANCH,
    graph: approvedGraph,
    checkpoint: START,
  };
  const exact = completion('task-01', START, END, ['scripts/harness/lib/tasks/graph.js']);

  assert.throws(
    () =>
      attestBootstrapChain(
        root,
        {
          ...options,
          completions: [{ ...exact, endHead: 'c'.repeat(40) }],
        },
        { runGit: gitStub().runGit },
      ),
    /end HEAD|historical|attest/i,
  );
  assert.throws(
    () =>
      attestBootstrapChain(
        root,
        {
          ...options,
          completions: [{ ...exact, changedPaths: ['scripts/harness/lib/tasks/other.js'] }],
        },
        { runGit: gitStub().runGit },
      ),
    /changed paths|attest/i,
  );
  assert.throws(
    () =>
      attestBootstrapChain(
        root,
        {
          ...options,
          completions: [exact],
        },
        {
          runGit: gitStub({
            'rev-parse --verify HEAD': `${'c'.repeat(40)}\n`,
          }).runGit,
        },
      ),
    /validated HEAD|repository HEAD|stale/i,
  );
  assert.throws(
    () =>
      attestBootstrapChain(
        root,
        { ...options, completions: [exact] },
        {
          runGit: gitStub({
            'merge-base --is-ancestor': new Error('not ancestor'),
          }).runGit,
        },
      ),
    /does not descend/i,
  );
  assert.throws(
    () =>
      attestBootstrapChain(
        root,
        { ...options, completions: [exact] },
        {
          runGit: gitStub({
            'diff --name-status -z --find-renames --find-copies': Buffer.from(
              'R100\0outside/old.js\0scripts/harness/lib/tasks/graph.js\0',
            ),
          }).runGit,
        },
      ),
    /outside approved write scopes.*outside\/old\.js/i,
  );
});

void test('rejects unsafe repository state and partial Git attestation', (t) => {
  const root = repositoryRoot(t);
  const approvedGraph = graph();
  const exact = completion('task-01', START, END, ['scripts/harness/lib/tasks/graph.js']);
  const options = { branch: BRANCH, graph: approvedGraph, checkpoint: START, completions: [exact] };
  const cases = [
    [gitStub({ 'rev-parse --abbrev-ref HEAD': 'HEAD\n' }), /detached HEAD/i],
    [gitStub({ 'rev-parse --abbrev-ref HEAD': 'feat/other\n' }), /branch mismatch/i],
    [
      gitStub({
        'status --porcelain=v1 -z --untracked-files=all': Buffer.from(
          ' M scripts/harness/lib/tasks/graph.js\0',
        ),
      }),
      /dirty delivery/i,
    ],
    [
      gitStub({
        'diff --name-status -z --find-renames --find-copies': new Error('object missing'),
      }),
      /object missing|attest/i,
    ],
  ];

  for (const [git, error] of cases) {
    assert.throws(() => attestBootstrapChain(root, options, { runGit: git.runGit }), error);
  }
});

void test('rejects a branch or HEAD race across chain attestation', (t) => {
  const root = repositoryRoot(t);
  const approvedGraph = graph();
  const exact = completion('task-01', START, END, ['scripts/harness/lib/tasks/graph.js']);
  for (const changed of ['branch', 'head']) {
    const branchValues = [
      `${BRANCH}\n`,
      `${BRANCH}\n`,
      changed === 'branch' ? 'feat/changed\n' : `${BRANCH}\n`,
    ];
    const headValues = [
      `${END}\n`,
      `${END}\n`,
      changed === 'head' ? `${'c'.repeat(40)}\n` : `${END}\n`,
    ];
    const git = gitStub({
      'rev-parse --abbrev-ref HEAD': () => Buffer.from(branchValues.shift()),
      'rev-parse --verify HEAD': () => Buffer.from(headValues.shift()),
    });
    const runGit = (args) => {
      const value = git.runGit(args);
      return typeof value === 'function' ? value() : value;
    };

    assert.throws(
      () =>
        attestBootstrapChain(
          root,
          { branch: BRANCH, graph: approvedGraph, checkpoint: START, completions: [exact] },
          { runGit },
        ),
      /changed during bootstrap attestation|branch mismatch/i,
    );
  }
});

void test('proves a replacement endpoint descends from its prior accounted head', (t) => {
  const root = repositoryRoot(t);
  const exact = completion('task-01', START, END, ['scripts/harness/lib/tasks/graph.js']);
  const git = gitStub();
  attestBootstrapChain(
    root,
    {
      branch: BRANCH,
      graph: graph(),
      checkpoint: START,
      previousAccountedHead: START,
      completions: [exact],
    },
    { runGit: git.runGit },
  );
  assert(
    git.calls.some(
      (args) =>
        args[0] === 'merge-base' &&
        args[1] === '--is-ancestor' &&
        args[2] === START &&
        args[3] === END,
    ),
  );
});
