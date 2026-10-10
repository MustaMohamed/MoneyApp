const { spawnSync } = require('child_process');

const HINT = 'run from a git checkout of MoneyApp';

function listSrcFiles(root) {
  const listing = spawnSync(
    'git',
    ['-c', 'core.quotePath=false', 'ls-files', 'src/*.ts', 'src/*.tsx'],
    {
      cwd: root,
      encoding: 'utf8',
    },
  );

  // `spawnSync` returns `stdout: undefined` on failure, so this must precede the split below.
  if (listing.error || listing.status !== 0) {
    console.error(
      `git ls-files failed to run — ${HINT} (${listing.error?.message ?? `exit code ${String(listing.status)}`})`,
    );
    process.exit(1);
  }

  const files = listing.stdout.split('\n').filter(Boolean);

  // A broken pathspec would otherwise pass with zero files scanned.
  if (files.length === 0) {
    console.error(`git ls-files returned no files — ${HINT}`);
    process.exit(1);
  }

  return files;
}

module.exports = { listSrcFiles };
