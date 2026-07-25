// Vendored Claude Code tooling (skills/agents) is checked into the repo but is
// NOT project source. oxlint/oxfmt ignore these paths, so passing their files to
// `oxlint --fix` yields an empty file set and a non-zero exit ("No files found to
// lint"), which fails the pre-commit hook. Filter those paths out of every task.
const VENDORED_DIRS = ['/.claude/', '/.agents/'];
const HARNESS_PREFIXES = [
  'harness/',
  '.agents/',
  '.claude/',
  '.codex/',
  'scripts/harness/',
  'docs/superpowers/initiatives/',
  'docs/superpowers/task-graphs/',
  'docs/superpowers/reviews/',
  'docs/superpowers/qa/',
];
const HARNESS_FILES = new Set([
  'AGENTS.md',
  'CLAUDE.md',
  '.gitattributes',
  '.gitignore',
  'package.json',
  'lint-staged.config.mjs',
  '.husky/pre-push',
  '.github/workflows/pr-checks.yml',
  'scripts/validate-agent-assets.js',
]);

/** @param {string} file */
const isVendored = (file) => VENDORED_DIRS.some((dir) => file.includes(dir));

/** @param {string[]} files */
const keep = (files) => files.filter((file) => !isVendored(file));

/** @param {string} file */
const isImmutableTaskEvidence = (file) => {
  const value = relative(file);
  return (
    value.startsWith('docs/superpowers/task-graphs/') ||
    (value.startsWith('docs/superpowers/initiatives/') && value.includes('/task-events/'))
  );
};

/** @param {string[]} files */
const quote = (files) => files.map((file) => `"${file}"`).join(' ');

/** @param {string} file */
const relative = (file) => {
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-call, typescript/no-unsafe-member-access -- lint-staged invokes this Node config from the repository root
  const root = process.cwd();
  return file.replace(`${root}/`, '');
};

/** @param {string} file */
const affectsHarness = (file) => {
  const value = relative(file);
  return HARNESS_FILES.has(value) || HARNESS_PREFIXES.some((prefix) => value.startsWith(prefix));
};

/** @type {import('lint-staged').Configuration} */
export default {
  '*': (/** @type {string[]} */ files) => {
    const commands = [];
    const lintTargets = keep(files.filter((file) => /\.(?:ts|tsx|js|cjs|mjs)$/u.test(file)));
    const formatTargets = keep(
      files.filter(
        (file) => /\.(?:ts|tsx|js|cjs|mjs|json)$/u.test(file) && !isImmutableTaskEvidence(file),
      ),
    );

    if (lintTargets.length > 0) commands.push(`oxlint --fix ${quote(lintTargets)}`);
    if (formatTargets.length > 0) commands.push(`oxfmt ${quote(formatTargets)}`);
    if (files.some(affectsHarness)) commands.push('npm run harness:check');

    return commands;
  },
};
