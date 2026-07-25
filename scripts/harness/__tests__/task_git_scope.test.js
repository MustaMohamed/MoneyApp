const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  collectTaskCompletionRevision,
  collectTaskStartRevision,
  parseNameStatusZ,
  validateChangedPaths,
} = require('../lib/tasks/git_scope');

const BRANCH = 'refactor/example';
const START = 'a'.repeat(40);
const END = 'b'.repeat(40);

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
    writePaths: ['scripts/harness/lib/tasks/**'],
    ...overrides,
  };
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
      if (args[0] === 'diff') return values['diff --name-status -z --find-renames --find-copies'];
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
