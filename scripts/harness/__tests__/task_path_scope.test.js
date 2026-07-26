const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  assertScopeResolvesInside,
  matchesScope,
  parsePathScope,
  scopesOverlap,
} = require('../lib/tasks/path_scope');

void test('parses exact paths plus star and whole-segment double-star globs', () => {
  assert.deepEqual(parsePathScope('scripts/harness/**/*.js'), [
    { type: 'literal', value: 'scripts' },
    { type: 'literal', value: 'harness' },
    { type: 'many' },
    { type: 'pattern', value: '*.js' },
  ]);
  assert.deepEqual(parsePathScope('AGENTS.md'), [{ type: 'literal', value: 'AGENTS.md' }]);
});

void test('matches task scopes without crossing path separators', () => {
  assert.equal(matchesScope('scripts/harness/lib/tasks/graph.js', 'scripts/harness/**'), true);
  assert.equal(
    matchesScope('scripts/harness/lib/tasks/graph.js', 'scripts/*/lib/tasks/*.js'),
    true,
  );
  assert.equal(matchesScope('scripts/harness/lib/tasks/graph.js', 'scripts/*/graph.js'), false);
  assert.equal(matchesScope('scripts/harness/graph.js', 'scripts/harness/**/*.js'), true);
  assert.equal(matchesScope('scripts/harness/nested/graph.md', 'scripts/harness/**/*.js'), false);
});

void test('rejects unsafe, nonportable, and unsupported glob spelling', () => {
  for (const scope of [
    '',
    '/absolute.js',
    '../escape.js',
    'nested/./alias.js',
    'nested//alias.js',
    'nested\\alias.js',
    'C:/absolute.js',
    'generated/cafe\u0301.js',
    'generated/name?.js',
    'generated/[ab].js',
    'generated/{a,b}.js',
    'generated/ab**cd.js',
    'generated/***.js',
    'generated/CON.js',
    'generated/name.',
  ]) {
    assert.throws(() => parsePathScope(scope), /scope|glob|portable|relative|NFC/i, scope);
  }
});

void test('detects exact and glob intersections without false overlap for disjoint literals', () => {
  const cases = [
    ['scripts/harness/**', 'scripts/harness/lib/tasks/*.js', true],
    ['scripts/harness/*.js', 'scripts/harness/graph.js', true],
    ['scripts/harness/*.js', 'scripts/harness/*.md', false],
    ['scripts/harness/**/task_*.js', 'scripts/harness/lib/task_graph.js', true],
    ['harness/**', 'scripts/**', false],
    ['AGENTS.md', 'CLAUDE.md', false],
    ['scripts/*/graph.js', 'scripts/harness/packet.js', false],
    ['**/*.js', 'docs/**/*.md', false],
  ];
  for (const [left, right, expected] of cases) {
    assert.equal(scopesOverlap(left, right), expected, `${left} ∩ ${right}`);
    assert.equal(scopesOverlap(right, left), expected, `${right} ∩ ${left}`);
  }
});

void test('rejects literal-prefix symlink escapes before a scope is accepted', (t) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-task-scope-')));
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'moneyapp-task-scope-outside-'));
  t.after(() => {
    fs.rmSync(root, { recursive: true, force: true });
    fs.rmSync(outside, { recursive: true, force: true });
  });
  fs.mkdirSync(path.join(root, 'scripts'), { recursive: true });
  fs.symlinkSync(outside, path.join(root, 'scripts', 'linked'));

  assert.doesNotThrow(() => assertScopeResolvesInside(root, 'scripts/harness/**/*.js'));
  assert.throws(() => assertScopeResolvesInside(root, 'scripts/linked/**/*.js'), /symbolic.?link/i);
});
