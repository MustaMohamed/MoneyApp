const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../../..');

void test('lint validates generic assets and canonical harness parity without recursion', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.match(pkg.scripts.lint, /validate:agent-assets/);
  assert.match(pkg.scripts['validate:agent-assets'], /harness:check/);
  assert.doesNotMatch(pkg.scripts['harness:check'], /validate:agent-assets/);
});

void test('pre-push delegates to the canonical verifier', () => {
  const hook = fs.readFileSync(path.join(root, '.husky/pre-push'), 'utf8').trim();
  assert.equal(hook, 'npm run verify:pr');
});

void test('lint-staged validates relevant harness files after source formatting', async () => {
  const configUrl = pathToFileURL(path.join(root, 'lint-staged.config.mjs')).href;
  const config = (await import(configUrl)).default;
  const harnessScript = path.join(root, 'scripts/harness/check.js');
  const manifest = path.join(root, 'harness/manifest.json');

  assert.deepEqual(config['*']([harnessScript, manifest]), [
    `oxlint --fix "${harnessScript}"`,
    `oxfmt "${harnessScript}" "${manifest}"`,
    'npm run harness:check',
  ]);
});

void test('lint-staged treats workflow machine, ledgers, evidence, and runtime policies as harness inputs', async () => {
  const configUrl = pathToFileURL(path.join(root, 'lint-staged.config.mjs')).href;
  const config = (await import(`${configUrl}?workflow=${Date.now()}`)).default;
  const relevant = [
    'harness/workflow/state_machine.json',
    'docs/superpowers/initiatives/2026-07-25-example/events/000001-event.json',
    'docs/superpowers/initiatives/2026-07-25-example/task-events/000001-event.json',
    'docs/superpowers/task-graphs/2026-07-25-example.json',
    'docs/superpowers/reviews/2026-07-25-example.md',
    'docs/superpowers/qa/2026-07-25-example.md',
    '.gitattributes',
    '.gitignore',
  ].map((file) => path.join(root, file));

  for (const file of relevant) {
    assert(
      config['*']([file]).includes('npm run harness:check'),
      `${path.relative(root, file)} must trigger harness validation`,
    );
  }

  const immutableEvidence = relevant.filter(
    (file) => file.includes('/task-events/') || file.includes('/task-graphs/'),
  );
  assert.deepEqual(config['*'](immutableEvidence), ['npm run harness:check']);
});

void test('lint-staged validates generated harness files without formatting vendored assets', async () => {
  const configUrl = pathToFileURL(path.join(root, 'lint-staged.config.mjs')).href;
  const config = (await import(configUrl)).default;
  const generatedAsset = path.join(root, '.agents/skills/moneyapp-expert-panel/SKILL.md');

  assert.deepEqual(config['*']([generatedAsset]), ['npm run harness:check']);
});

void test('lint-staged does not validate the harness for unrelated staged files', async () => {
  const configUrl = pathToFileURL(path.join(root, 'lint-staged.config.mjs')).href;
  const config = (await import(configUrl)).default;
  const appSource = path.join(root, 'src/utils/example.ts');

  assert.deepEqual(config['*']([appSource]), [
    `oxlint --fix "${appSource}"`,
    `oxfmt "${appSource}"`,
  ]);
});
