#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const { loadManifest } = require('./lib/manifest');
const { renderAll } = require('./lib/render');
const { resolveInside } = require('./lib/paths');
const {
  compareRenderPasses,
  measureRenderedTargets,
  validateRegisteredStructure,
} = require('./lib/structure');
const { evaluateRules } = require('./lib/semantics');
const {
  collectSourceText,
  validateDependencyFacts,
  validateIntegrationContract,
  validateRepositoryPaths,
  validateVerificationContract,
} = require('./lib/repository_facts');

const root = path.resolve(__dirname, '../..');
const manifest = loadManifest(root);
const errors = [];
const rendered = renderAll(root, manifest);
const pkg = JSON.parse(fs.readFileSync(resolveInside(root, 'package.json'), 'utf8'));

function collectLiveFiles() {
  const files = {};
  const visit = (relativePath) => {
    const absolute = resolveInside(root, relativePath);
    if (!fs.existsSync(absolute)) return;
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) {
        visit(path.posix.join(relativePath, entry));
      }
      return;
    }
    if (relativePath.endsWith('.md') || relativePath.endsWith('.toml')) {
      files[relativePath] = fs.readFileSync(absolute, 'utf8');
    }
  };
  for (const liveRoot of ['AGENTS.md', 'CLAUDE.md', '.agents', '.claude', '.codex']) {
    visit(liveRoot);
  }
  return files;
}

const liveFiles = collectLiveFiles();
const secondRender = renderAll(root, manifest);
errors.push(...compareRenderPasses(rendered, secondRender));
errors.push(...validateRegisteredStructure(root, manifest, rendered, liveFiles));
const rules = JSON.parse(fs.readFileSync(resolveInside(root, manifest.rules), 'utf8')).rules;
errors.push(...evaluateRules(rules, liveFiles, { requireCompleteScope: true }));
errors.push(
  ...validateDependencyFacts(
    pkg,
    JSON.parse(fs.readFileSync(resolveInside(root, 'package-lock.json'), 'utf8')),
    collectSourceText(root),
  ),
);
errors.push(...validateRepositoryPaths(root, manifest));
errors.push(
  ...validateVerificationContract(
    manifest.verification.checks,
    fs.readFileSync(resolveInside(root, '.github/workflows/pr-checks.yml'), 'utf8'),
  ),
);
errors.push(
  ...validateIntegrationContract(
    pkg,
    fs.readFileSync(resolveInside(root, '.husky/pre-push'), 'utf8'),
  ),
);

if (errors.length > 0) {
  for (const error of errors) {
    console.error(`${error.ruleId} ${error.file}: ${error.message}`);
  }
  process.exit(1);
}

for (const metric of measureRenderedTargets(rendered)) {
  console.log(`Harness budget ${metric.file}: ${metric.lines} lines, ${metric.bytes} bytes`);
}
console.log(`Harness valid (${manifest.targets.length} generated targets)`);
