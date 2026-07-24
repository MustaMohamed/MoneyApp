const fs = require('node:fs');
const { spawnSync } = require('node:child_process');
const { resolveInside } = require('./paths');

function runVerification(root, checks, overrides = {}) {
  const spawn =
    overrides.spawn ||
    ((command, args) => spawnSync(command, args, { cwd: root, stdio: 'inherit' }));
  const isDirectory =
    overrides.isDirectory ||
    ((relativePath) => {
      const absolute = resolveInside(root, relativePath);
      return fs.existsSync(absolute) && fs.statSync(absolute).isDirectory();
    });

  for (const check of checks) {
    const [command, ...args] = check.local;
    const result = spawn(command, args);
    if (result.status !== 0) return { ok: false, failedCheck: check.id };
    if (check.assertDirectory && !isDirectory(check.assertDirectory)) {
      return { ok: false, failedCheck: check.id };
    }
  }
  return { ok: true };
}

module.exports = { runVerification };
