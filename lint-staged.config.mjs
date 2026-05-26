// Vendored Claude Code tooling (skills/agents) is checked into the repo but is
// NOT project source. oxlint/oxfmt ignore these paths, so passing their files to
// `oxlint --fix` yields an empty file set and a non-zero exit ("No files found to
// lint"), which fails the pre-commit hook. Filter those paths out of every task.
const VENDORED_DIRS = ['/.claude/', '/.agents/'];
const isVendored = (file) => VENDORED_DIRS.some((dir) => file.includes(dir));
const keep = (files) => files.filter((file) => !isVendored(file));
const quote = (files) => files.map((file) => `"${file}"`).join(' ');

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,tsx,js,cjs,mjs}': (files) => {
    const targets = keep(files);
    if (targets.length === 0) return [];
    const list = quote(targets);
    return [`oxlint --fix ${list}`, `oxfmt ${list}`];
  },
  '*.json': (files) => {
    const targets = keep(files);
    if (targets.length === 0) return [];
    return [`oxfmt ${quote(targets)}`];
  },
};
