const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '../../..');

void test('root adapters contain identical binding decisions', () => {
  const agents = fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8');
  const claude = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  const bindings = [
    'explicit user request',
    'Spec sign-off',
    'Device QA',
    'Signals rollback',
    'src/modules/<domain>/',
    'HeroUI Native',
    'npm run verify:pr',
  ];
  for (const binding of bindings) {
    assert.equal(agents.includes(binding), true, `AGENTS.md missing ${binding}`);
    assert.equal(claude.includes(binding), true, `CLAUDE.md missing ${binding}`);
  }
});
