// oxlint ignores `/.claude/`, so a task with only those paths exits non-zero and fails the hook.
const VENDORED_DIRS = ['/.claude/'];

/** @param {string} file */
const isVendored = (file) => VENDORED_DIRS.some((dir) => file.includes(dir));

/** @param {string[]} files */
const keep = (files) => files.filter((file) => !isVendored(file));

/** @param {string[]} files */
const quote = (files) => files.map((file) => `"${file}"`).join(' ');

/** @type {import('lint-staged').Configuration} */
export default {
  '*.{ts,tsx,js,cjs,mjs}': (/** @type {string[]} */ files) => {
    const targets = keep(files);
    if (targets.length === 0) return [];
    const list = quote(targets);
    return [`oxlint --fix ${list}`, `oxfmt ${list}`];
  },
  '*.json': (/** @type {string[]} */ files) => {
    const targets = keep(files);
    if (targets.length === 0) return [];
    return [`oxfmt ${quote(targets)}`];
  },
};
