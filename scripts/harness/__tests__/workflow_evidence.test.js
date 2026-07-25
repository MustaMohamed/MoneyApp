const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { createArtifactReference, validateArtifactReference } = require('../lib/workflow/evidence');
const gitRevision = require('../lib/workflow/git_revision');

const { assertDeliveryClean, collectDeliveryRevision, computeDeliveryDigest } = gitRevision;

const BRANCH = 'refactor/example';
const HEAD_SHA = 'a'.repeat(40);
const EXCLUDED_PREFIXES = [
  'docs/superpowers/initiatives/',
  'docs/superpowers/reviews/',
  'docs/superpowers/qa/',
];

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function createFixture(t, entries = {}) {
  const root = fs.realpathSync(
    fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-workflow-evidence-')),
  );
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [relativePath, value] of Object.entries(entries)) {
    const target = path.join(root, relativePath);
    if (value === DIRECTORY) {
      fs.mkdirSync(target, { recursive: true });
      continue;
    }
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, value);
  }
  return root;
}

function trackedArtifactGit(relativePath, calls = []) {
  return (args) => {
    calls.push(args);
    assert.deepEqual(args, ['ls-files', '--error-unmatch', '-z', '--', relativePath]);
    return Buffer.from(`${relativePath}\0`, 'utf8');
  };
}

function createGitRunner({
  branch = BRANCH,
  headSha = HEAD_SHA,
  status = Buffer.alloc(0),
  trackedPaths = [],
} = {}) {
  const calls = [];
  const sequenceIndexes = new Map();

  function next(value, key) {
    if (!Array.isArray(value)) return value;
    const index = sequenceIndexes.get(key) ?? 0;
    assert.ok(index < value.length, `Missing injected ${key} value at index ${index}`);
    sequenceIndexes.set(key, index + 1);
    return value[index];
  }

  const runGit = (args) => {
    calls.push(args);
    switch (args[0]) {
      case 'rev-parse':
        if (args[1] === '--abbrev-ref') {
          assert.deepEqual(args, ['rev-parse', '--abbrev-ref', 'HEAD']);
          return Buffer.from(`${next(branch, 'branch')}\n`, 'utf8');
        }
        assert.deepEqual(args, ['rev-parse', 'HEAD']);
        return Buffer.from(`${next(headSha, 'HEAD')}\n`, 'utf8');
      case 'status':
        assert.deepEqual(args, ['status', '--porcelain=v1', '-z', '--untracked-files=all']);
        return Buffer.from(next(status, 'status'));
      case 'ls-files':
        assert.deepEqual(args, ['ls-files', '-z']);
        return Buffer.from(`${trackedPaths.join('\0')}${trackedPaths.length > 0 ? '\0' : ''}`);
      default:
        throw new Error(`Unexpected Git command: ${args.join(' ')}`);
    }
  };
  return { calls, runGit };
}

const DIRECTORY = Symbol('directory');

void test('creates and validates a frozen artifact reference from exact tracked bytes', (t) => {
  const exactBytes = Buffer.from([0x00, 0xff, 0x0a, 0x41]);
  const relativePath = 'docs/superpowers/specs/2026-07-25-évidence.md';
  const root = createFixture(t, { [relativePath]: exactBytes });
  const calls = [];
  const options = { runGit: trackedArtifactGit(relativePath, calls) };

  const reference = createArtifactReference(root, relativePath, options);
  const validated = validateArtifactReference(root, reference, options);

  assert.deepEqual(reference, { path: relativePath, sha256: sha256(exactBytes) });
  assert.deepEqual(validated, reference);
  assert.notEqual(validated, reference);
  assert.ok(Object.isFrozen(reference));
  assert.ok(Object.isFrozen(validated));
  assert.deepEqual(calls, [
    ['ls-files', '--error-unmatch', '-z', '--', relativePath],
    ['ls-files', '--error-unmatch', '-z', '--', relativePath],
  ]);
});

void test('rejects artifact references with unknown keys or malformed hashes', (t) => {
  const relativePath = 'docs/superpowers/specs/example.md';
  const root = createFixture(t, { [relativePath]: 'spec' });
  const options = { runGit: trackedArtifactGit(relativePath) };
  const valid = createArtifactReference(root, relativePath, options);

  assert.throws(
    () => validateArtifactReference(root, { ...valid, extra: true }, options),
    /artifact reference.*unexpected.*extra/i,
  );
  for (const invalidHash of [undefined, 42, 'A'.repeat(64), 'a'.repeat(63), 'g'.repeat(64)]) {
    assert.throws(
      () => validateArtifactReference(root, { path: relativePath, sha256: invalidHash }, options),
      /sha256.*lowercase hexadecimal/i,
    );
  }
});

void test('rejects unsafe, non-NFC, and canonical-alias artifact paths', (t) => {
  const root = createFixture(t, {
    'docs/spec.md': 'spec',
    'docs/évidence.md': 'normalized',
  });
  const neverGit = () => {
    throw new Error('Git must not run for an unsafe path');
  };

  for (const invalidPath of [
    '/tmp/spec.md',
    '../spec.md',
    'docs/../spec.md',
    'docs\\spec.md',
    'docs/e\u0301vidence.md',
  ]) {
    assert.throws(
      () => createArtifactReference(root, invalidPath, { runGit: neverGit }),
      /repository-relative|NFC/i,
    );
  }
  assert.throws(
    () =>
      createArtifactReference(root, 'DOCS/spec.md', {
        runGit: trackedArtifactGit('DOCS/spec.md'),
      }),
    /path alias/i,
  );
});

void test('rejects untracked, missing, directory, and symlink artifact paths', (t) => {
  const root = createFixture(t, {
    'docs/tracked.md': 'tracked',
    'docs/folder': DIRECTORY,
    'outside.md': 'outside',
  });
  fs.symlinkSync(path.join(root, 'outside.md'), path.join(root, 'docs/link.md'));

  assert.throws(
    () =>
      createArtifactReference(root, 'docs/tracked.md', {
        runGit() {
          throw new Error('pathspec did not match any files');
        },
      }),
    /tracked by Git/i,
  );
  assert.throws(
    () =>
      createArtifactReference(root, 'docs/missing.md', {
        runGit: trackedArtifactGit('docs/missing.md'),
      }),
    /missing|not found|ENOENT/i,
  );
  assert.throws(
    () =>
      createArtifactReference(root, 'docs/folder', {
        runGit: trackedArtifactGit('docs/folder'),
      }),
    /regular file/i,
  );
  assert.throws(
    () =>
      createArtifactReference(root, 'docs/link.md', {
        runGit: trackedArtifactGit('docs/link.md'),
      }),
    /symbolic-link/i,
  );
});

void test('rejects stale artifact hashes', (t) => {
  const relativePath = 'docs/superpowers/plans/example.md';
  const root = createFixture(t, { [relativePath]: 'current plan' });
  const options = { runGit: trackedArtifactGit(relativePath) };

  assert.throws(
    () => validateArtifactReference(root, { path: relativePath, sha256: 'b'.repeat(64) }, options),
    /stale artifact.*expected.*observed/i,
  );
});

void test('computes a stable framed digest independent of tracked-path enumeration order', (t) => {
  const root = createFixture(t, {
    'src/alpha.js': 'alpha',
    'src/é file.js': 'é',
    'src/spaces -- name.js': 'arrow',
  });
  const bytes = new Map([
    ['src/alpha.js', Buffer.from('alpha')],
    ['src/é file.js', Buffer.from('é')],
    ['src/spaces -- name.js', Buffer.from('arrow')],
  ]);
  const readFile = (_absolutePath, relativePath) => Buffer.from(bytes.get(relativePath));

  const first = computeDeliveryDigest(
    root,
    ['src/é file.js', 'src/alpha.js', 'src/spaces -- name.js'],
    { readFile },
  );
  const second = computeDeliveryDigest(
    root,
    ['src/spaces -- name.js', 'src/é file.js', 'src/alpha.js'],
    { readFile },
  );

  assert.match(first, /^[a-f0-9]{64}$/);
  assert.equal(second, first);
});

void test('uses unambiguous path and exact-byte framing, including for an empty delivery', (t) => {
  const root = createFixture(t, {
    a: 'bc',
    ab: 'c',
  });

  const left = computeDeliveryDigest(root, ['a'], {
    readFile: () => Buffer.from('bc'),
  });
  const right = computeDeliveryDigest(root, ['ab'], {
    readFile: () => Buffer.from('c'),
  });
  const emptyFirst = computeDeliveryDigest(root, [], {
    readFile() {
      throw new Error('No file should be read for an empty delivery');
    },
  });
  const emptySecond = computeDeliveryDigest(root, []);

  assert.notEqual(left, right);
  assert.equal(emptySecond, emptyFirst);
  assert.match(emptyFirst, /^[a-f0-9]{64}$/);
});

void test('changes the digest for exact byte differences', (t) => {
  const root = createFixture(t, { 'src/value.js': 'same-size' });

  const first = computeDeliveryDigest(root, ['src/value.js'], {
    readFile: () => Buffer.from('first'),
  });
  const second = computeDeliveryDigest(root, ['src/value.js'], {
    readFile: () => Buffer.from('secon'),
  });

  assert.notEqual(second, first);
});

void test('rejects duplicate identities, non-NFC paths, symlinks, directories, and missing files', (t) => {
  const root = createFixture(t, {
    'src/File.js': 'one',
    'src/folder': DIRECTORY,
    'src/target.js': 'target',
  });
  fs.symlinkSync(path.join(root, 'src/target.js'), path.join(root, 'src/link.js'));

  assert.throws(
    () => computeDeliveryDigest(root, ['src/File.js', 'src/file.js']),
    /duplicate path identity/i,
  );
  assert.throws(() => computeDeliveryDigest(root, ['src/e\u0301.js']), /NFC/i);
  assert.throws(() => computeDeliveryDigest(root, ['src/link.js']), /symbolic-link/i);
  assert.throws(() => computeDeliveryDigest(root, ['src/folder']), /regular file/i);
  assert.throws(() => computeDeliveryDigest(root, ['src/missing.js']), /missing|not found|ENOENT/i);
});

void test('rejects a tracked submodule directory explicitly', (t) => {
  const root = createFixture(t, {
    'vendor/submodule': DIRECTORY,
  });

  assert.throws(
    () => computeDeliveryDigest(root, ['vendor/submodule']),
    /submodule.*regular files only/i,
  );
});

void test('ignores only dirty paths under the three evidence prefixes', (t) => {
  const root = createFixture(t);
  const evidenceStatus = Buffer.from(
    [
      ' M docs/superpowers/initiatives/example/events/000001.json',
      '?? docs/superpowers/reviews/example.md',
      'A  docs/superpowers/qa/example.md',
      '',
    ].join('\0'),
  );
  const { runGit } = createGitRunner({ status: evidenceStatus });

  assert.deepEqual(assertDeliveryClean(root, { runGit }), []);
  assert.deepEqual(EXCLUDED_PREFIXES, [
    'docs/superpowers/initiatives/',
    'docs/superpowers/reviews/',
    'docs/superpowers/qa/',
  ]);
});

void test('ignored files omitted by porcelain status do not dirty delivery', (t) => {
  const root = createFixture(t);
  const { runGit } = createGitRunner({ status: Buffer.alloc(0) });

  assert.deepEqual(assertDeliveryClean(root, { runGit }), []);
});

void test('rejects tracked, untracked, deleted, type-changed, and renamed delivery paths', (t) => {
  const root = createFixture(t);
  const status = Buffer.from(
    [
      ' M src/modified.js',
      '?? new file.js',
      ' D tests/deleted.test.js',
      'T  package.json',
      'R  src/new -> name.js',
      'src/old -> name.js',
      '',
    ].join('\0'),
  );
  const { runGit } = createGitRunner({ status });

  assert.throws(
    () => assertDeliveryClean(root, { runGit }),
    (error) => {
      assert.match(error.message, /delivery is dirty/i);
      for (const dirtyPath of [
        'new file.js',
        'package.json',
        'src/modified.js',
        'src/new -> name.js',
        'src/old -> name.js',
        'tests/deleted.test.js',
      ]) {
        assert.match(error.message, new RegExp(dirtyPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
      }
      return true;
    },
  );
});

void test('a rename crossing an evidence boundary blocks the delivery receipt', (t) => {
  const root = createFixture(t);
  const { runGit } = createGitRunner({
    status: Buffer.from('R  docs/superpowers/reviews/moved.md\0src/original.js\0', 'utf8'),
  });

  assert.throws(() => assertDeliveryClean(root, { runGit }), /src\/original\.js/);
});

void test('allows a copy from delivery into excluded evidence because the source is unchanged', (t) => {
  const root = createFixture(t);
  const { runGit } = createGitRunner({
    status: Buffer.from('C  docs/superpowers/reviews/copied.md\0src/original.js\0', 'utf8'),
  });

  assert.deepEqual(assertDeliveryClean(root, { runGit }), []);
});

void test('blocks only a copied destination outside evidence', (t) => {
  const root = createFixture(t);
  const { runGit } = createGitRunner({
    status: Buffer.from('C  src/copied.js\0docs/superpowers/reviews/original.md\0', 'utf8'),
  });

  assert.throws(
    () => assertDeliveryClean(root, { runGit }),
    /Delivery is dirty outside evidence paths: \["src\/copied\.js"\]/,
  );
});

void test('does not exclude near-miss evidence prefixes', (t) => {
  const root = createFixture(t);
  const { runGit } = createGitRunner({
    status: Buffer.from(
      [
        '?? docs/superpowers/initiatives-other/example.json',
        '?? docs/superpowers/reviews-other/example.md',
        '?? docs/superpowers/qa-other/example.md',
        '',
      ].join('\0'),
      'utf8',
    ),
  });

  assert.throws(
    () => assertDeliveryClean(root, { runGit }),
    /initiatives-other.*qa-other.*reviews-other/,
  );
});

void test('reports NUL-parsed tricky dirty filenames as deterministic JSON', (t) => {
  const root = createFixture(t);
  const { runGit } = createGitRunner({
    status: Buffer.from('?? z.js\0?? odd,\nname.js\0', 'utf8'),
  });

  assert.throws(
    () => assertDeliveryClean(root, { runGit }),
    /Delivery is dirty outside evidence paths: \["odd,\\nname\.js","z\.js"\]/,
  );
});

void test('collects branch and HEAD diagnostically while filtering only evidence paths', (t) => {
  const trackedPaths = [
    'docs/superpowers/qa/example.md',
    'src/index.js',
    'docs/superpowers/plans/example.md',
    'docs/superpowers/reviews/example.md',
    'scripts/harness/check.js',
    'docs/superpowers/initiatives/example/events/000001.json',
  ];
  const root = createFixture(t, Object.fromEntries(trackedPaths.map((entry) => [entry, entry])));
  const git = createGitRunner({ trackedPaths });
  const readPaths = [];
  const revision = collectDeliveryRevision(
    root,
    { branch: BRANCH },
    {
      runGit: git.runGit,
      readFile(_absolutePath, relativePath) {
        readPaths.push(relativePath);
        return Buffer.from(relativePath);
      },
    },
  );

  assert.deepEqual(Object.keys(revision), ['branch', 'headSha', 'contentDigest']);
  assert.equal(revision.branch, BRANCH);
  assert.equal(revision.headSha, HEAD_SHA);
  assert.match(revision.contentDigest, /^[a-f0-9]{64}$/);
  assert.deepEqual(readPaths.sort(), [
    'docs/superpowers/plans/example.md',
    'scripts/harness/check.js',
    'src/index.js',
  ]);
  assert.ok(Object.isFrozen(revision));
});

void test('evidence-only bytes and commits do not alter contentDigest, but delivery bytes do', (t) => {
  const trackedPaths = [
    'src/index.js',
    'docs/superpowers/initiatives/example/events/000001.json',
    'docs/superpowers/reviews/example.md',
    'docs/superpowers/qa/example.md',
  ];
  const root = createFixture(t, Object.fromEntries(trackedPaths.map((entry) => [entry, entry])));
  const contents = new Map(trackedPaths.map((entry) => [entry, Buffer.from(entry)]));

  function collect(headSha) {
    const git = createGitRunner({ trackedPaths, headSha });
    return collectDeliveryRevision(
      root,
      { branch: BRANCH },
      {
        runGit: git.runGit,
        readFile: (_absolutePath, relativePath) => Buffer.from(contents.get(relativePath)),
      },
    );
  }

  const initial = collect('a'.repeat(40));
  contents.set(
    'docs/superpowers/initiatives/example/events/000001.json',
    Buffer.from('changed ledger'),
  );
  contents.set('docs/superpowers/reviews/example.md', Buffer.from('changed review'));
  contents.set('docs/superpowers/qa/example.md', Buffer.from('changed qa'));
  const evidenceCommit = collect('b'.repeat(40));
  contents.set('src/index.js', Buffer.from('changed source'));
  const deliveryCommit = collect('c'.repeat(40));

  assert.notEqual(evidenceCommit.headSha, initial.headSha);
  assert.equal(evidenceCommit.contentDigest, initial.contentDigest);
  assert.notEqual(deliveryCommit.contentDigest, initial.contentDigest);
});

void test('rejects delivery files that become dirty while the digest is collected', (t) => {
  const trackedPaths = ['src/index.js'];
  const root = createFixture(t, { 'src/index.js': 'source' });
  const git = createGitRunner({
    trackedPaths,
    status: [Buffer.alloc(0), Buffer.from(' M src/index.js\0', 'utf8')],
  });

  assert.throws(
    () => collectDeliveryRevision(root, { branch: BRANCH }, { runGit: git.runGit }),
    /delivery changed during revision collection.*dirty.*src\/index\.js/i,
  );
});

void test('rejects a branch change while the digest is collected', (t) => {
  const trackedPaths = ['src/index.js'];
  const root = createFixture(t, { 'src/index.js': 'source' });
  const git = createGitRunner({
    trackedPaths,
    branch: [BRANCH, 'refactor/changed'],
    status: [Buffer.alloc(0), Buffer.alloc(0)],
  });

  assert.throws(
    () => collectDeliveryRevision(root, { branch: BRANCH }, { runGit: git.runGit }),
    /branch changed during revision collection.*refactor\/example.*refactor\/changed/i,
  );
});

void test('rejects a clean commit that changes HEAD while content is hashed', (t) => {
  const trackedPaths = ['src/index.js'];
  const root = createFixture(t, { 'src/index.js': 'source' });
  const git = createGitRunner({
    trackedPaths,
    headSha: ['a'.repeat(40), 'b'.repeat(40)],
    status: [Buffer.alloc(0), Buffer.alloc(0)],
  });

  assert.throws(
    () => collectDeliveryRevision(root, { branch: BRANCH }, { runGit: git.runGit }),
    /HEAD changed during revision collection.*a{40}.*b{40}/i,
  );
});

void test('source, tests, harness, spec, plan, package, and CI files are delivery-bound', (t) => {
  const trackedPaths = [
    'src/index.js',
    '__tests__/index.test.js',
    'scripts/harness/check.js',
    'docs/superpowers/specs/example.md',
    'docs/superpowers/plans/example.md',
    'package.json',
    '.github/workflows/pr-checks.yml',
  ];
  const root = createFixture(t, Object.fromEntries(trackedPaths.map((entry) => [entry, 'base'])));
  const contents = new Map(trackedPaths.map((entry) => [entry, Buffer.from('base')]));
  const digest = () =>
    computeDeliveryDigest(root, trackedPaths, {
      readFile: (_absolutePath, relativePath) => Buffer.from(contents.get(relativePath)),
    });
  const initial = digest();

  for (const trackedPath of trackedPaths) {
    contents.set(trackedPath, Buffer.from(`changed:${trackedPath}`));
    assert.notEqual(digest(), initial, trackedPath);
    contents.set(trackedPath, Buffer.from('base'));
  }
});

void test('rejects branch mismatches and malformed revision inputs', (t) => {
  const root = createFixture(t);
  const mismatchGit = createGitRunner({ branch: 'refactor/other' });

  assert.throws(
    () => collectDeliveryRevision(root, { branch: BRANCH }, { runGit: mismatchGit.runGit }),
    /branch mismatch.*refactor\/example.*refactor\/other/i,
  );
  assert.throws(
    () => collectDeliveryRevision('relative/root', { branch: BRANCH }),
    /root.*absolute/i,
  );
  for (const initiative of [undefined, null, {}, { branch: '' }, { branch: 'main' }]) {
    assert.throws(
      () => collectDeliveryRevision(root, initiative),
      /initiative.*branch|non-main branch/i,
    );
  }
});

void test('rejects detached HEAD explicitly', (t) => {
  const root = createFixture(t);
  const detachedGit = createGitRunner({ branch: 'HEAD' });

  assert.throws(
    () => collectDeliveryRevision(root, { branch: BRANCH }, { runGit: detachedGit.runGit }),
    /detached HEAD/i,
  );
});

void test('uses only read-only Git subcommands', (t) => {
  const trackedPaths = ['src/index.js'];
  const root = createFixture(t, { 'src/index.js': 'source' });
  const git = createGitRunner({ trackedPaths });

  collectDeliveryRevision(root, { branch: BRANCH }, { runGit: git.runGit });

  assert.deepEqual(
    git.calls.map(([command]) => command),
    ['rev-parse', 'rev-parse', 'status', 'ls-files', 'status', 'rev-parse', 'rev-parse'],
  );
  for (const [command] of git.calls) {
    assert.ok(['rev-parse', 'status', 'ls-files'].includes(command));
    assert.notEqual(command, 'branch');
  }
});

void test('git revision module exposes only the public Task 4 API', () => {
  assert.deepEqual(Object.keys(gitRevision).sort(), [
    'assertDeliveryClean',
    'collectDeliveryRevision',
    'computeDeliveryDigest',
  ]);
});
