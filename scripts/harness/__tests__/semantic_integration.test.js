const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const { loadManifest } = require('../lib/manifest');
const { resolveInside } = require('../lib/paths');
const { renderAll } = require('../lib/render');
const { evaluateRules } = require('../lib/semantics');

const root = path.resolve(__dirname, '../../..');

void test('all sixteen rendered targets satisfy every scoped semantic rule', () => {
  const manifest = loadManifest(root);
  const rendered = renderAll(root, manifest);
  const files = Object.fromEntries(rendered);
  const rules = JSON.parse(fs.readFileSync(resolveInside(root, manifest.rules), 'utf8')).rules;

  assert.equal(rendered.size, 16);
  assert.deepEqual(evaluateRules(rules, files, { requireCompleteScope: true }), []);
});
