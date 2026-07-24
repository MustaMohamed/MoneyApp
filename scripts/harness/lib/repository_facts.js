const fs = require('node:fs');
const path = require('node:path');
const { resolveInside } = require('./paths');
const { classifyPositiveSignalsGuidance } = require('./semantics');

function allDependencies(pkg) {
  return { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
}

function lockHasPackage(lock, packageName) {
  return Boolean(
    lock.packages?.[`node_modules/${packageName}`] || lock.dependencies?.[packageName],
  );
}

function collectSourceText(root) {
  const chunks = [];
  const visit = (relativePath) => {
    const absolute = resolveInside(root, relativePath);
    const stat = fs.statSync(absolute);
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort()) {
        visit(path.posix.join(relativePath, entry));
      }
    } else if (/\.[cm]?[jt]sx?$/.test(relativePath)) {
      chunks.push(fs.readFileSync(absolute, 'utf8'));
    }
  };
  visit('src');
  return chunks.join('\n');
}

function collectBabelText(root) {
  return ['babel.config.js', 'babel.config.cjs', 'babel.config.mjs']
    .map((file) => resolveInside(root, file))
    .filter((file) => fs.existsSync(file))
    .map((file) => fs.readFileSync(file, 'utf8'))
    .join('\n');
}

function validateDependencyFacts(pkg, lock, liveText, sourceText, babelText) {
  const dependencies = allDependencies(pkg);
  const errors = [];
  if (
    !dependencies.zustand ||
    !lockHasPackage(lock, 'zustand') ||
    !/from\s+['"]zustand(?:\/[^'"]+)?['"]/.test(sourceText)
  ) {
    errors.push({
      ruleId: 'STACK-ZUSTAND',
      file: 'package.json',
      message: 'Zustand guidance does not match package, lockfile, and source imports',
    });
  }
  const positiveLiveGuidance = classifyPositiveSignalsGuidance(liveText);
  const signalsEvidence = [
    dependencies['@preact/signals-react'] && 'package.json dependency',
    lockHasPackage(lock, '@preact/signals-react') && 'package-lock.json package',
    /@preact\/signals-react(?:-transform)?/.test(babelText) && 'Babel transform',
    /from\s+['"]@preact\/signals-react(?:\/[^'"]+)?['"]/.test(sourceText) && 'source import',
    positiveLiveGuidance && `positive live ${positiveLiveGuidance.kind}`,
  ].filter(Boolean);
  if (signalsEvidence.length > 0) {
    errors.push({
      ruleId: 'STACK-NO-SIGNALS',
      file: 'package.json',
      message: `Signals rollback contradicted by ${signalsEvidence.join(', ')}`,
    });
  }
  return errors;
}

const REQUIRED_REPOSITORY_PATHS = [
  'src/app',
  'src/modules',
  'src/components/ui/screen.tsx',
  'src/components/ui/sheet.tsx',
  'src/constants/theme.ts',
  'src/constants/theme_tokens.ts',
];

function validateRepositoryPaths(root, manifest) {
  const errors = [];
  for (const relativePath of REQUIRED_REPOSITORY_PATHS) {
    if (!fs.existsSync(resolveInside(root, relativePath))) {
      errors.push({
        ruleId: 'PATH-SRC-CANONICAL',
        file: relativePath,
        message: 'required canonical path is absent',
      });
    }
  }
  const targets = new Set(manifest.targets.map((target) => target.path));
  for (const persona of manifest.personas) {
    for (const relativePath of [
      `.codex/agents/${persona.id}.toml`,
      `.claude/agents/${persona.id}.md`,
    ]) {
      if (!targets.has(relativePath) || !fs.existsSync(resolveInside(root, relativePath))) {
        errors.push({
          ruleId: 'PERSONA-SURFACE-REGISTRATION',
          file: relativePath,
          message: 'persona surface is absent or unregistered',
        });
      }
    }
  }
  return errors;
}

function extractJobBlock(workflow, job) {
  const lines = workflow.split('\n');
  const start = lines.findIndex((line) => line === `  ${job}:`);
  if (start === -1) return '';
  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^  [a-zA-Z0-9_-]+:$/.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join('\n');
}

const REQUIRED_CHECK_IDS = ['format', 'lint', 'typecheck', 'test', 'doctor', 'prebuild'];

function validateVerificationContract(checks, workflow) {
  const errors = [];
  const ids = checks.map((check) => check.id);
  if (JSON.stringify(ids) !== JSON.stringify(REQUIRED_CHECK_IDS)) {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: 'harness/manifest.json',
      message: `expected ordered check identities ${REQUIRED_CHECK_IDS.join(', ')}`,
    });
  }

  for (const check of checks) {
    if (
      !Array.isArray(check.local) ||
      check.local.length === 0 ||
      check.local.some((part) => typeof part !== 'string' || part.length === 0) ||
      typeof check.ci?.job !== 'string' ||
      typeof check.ci?.run !== 'string'
    ) {
      errors.push({
        ruleId: 'VERIFY-SIX-CHECKS',
        file: 'harness/manifest.json',
        message: `invalid registry entry for ${check.id}`,
      });
      continue;
    }
    const block = extractJobBlock(workflow, check.ci.job);
    if (!block.includes(`run: ${check.ci.run}`)) {
      errors.push({
        ruleId: 'VERIFY-SIX-CHECKS',
        file: '.github/workflows/pr-checks.yml',
        message: `CI job ${check.ci.job} does not run registered ${check.id} check`,
      });
    }
  }

  const prebuild = checks.find((check) => check.id === 'prebuild');
  if (prebuild?.assertDirectory !== 'android') {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: 'harness/manifest.json',
      message: 'prebuild must assert the worktree-owned android directory',
    });
  }
  return errors;
}

function validateIntegrationContract(pkg, prePush) {
  const errors = [];
  if (pkg.scripts?.['verify:pr'] !== 'node scripts/harness/verify_pr.js') {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: 'package.json',
      message: 'verify:pr must delegate to scripts/harness/verify_pr.js',
    });
  }
  if (prePush.trim() !== 'npm run verify:pr') {
    errors.push({
      ruleId: 'VERIFY-SIX-CHECKS',
      file: '.husky/pre-push',
      message: 'pre-push must contain only npm run verify:pr',
    });
  }
  return errors;
}

module.exports = {
  REQUIRED_CHECK_IDS,
  collectBabelText,
  collectSourceText,
  extractJobBlock,
  validateDependencyFacts,
  validateIntegrationContract,
  validateRepositoryPaths,
  validateVerificationContract,
};
