#!/usr/bin/env node
// Exits 0 when package.json at <old-rev> and at <new-rev>, or in the working tree, differ only in scripts npm does not run on install, whitespace or key order; 1 otherwise.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const INSTALL_SCRIPTS = new Set([
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
  'dependencies',
]);

/** @param {unknown} value @returns {value is Record<string, unknown>} */
function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

// Built as a string, so a __proto__ key compares like any other key.
/** @param {unknown} value @returns {string} */
function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (!isRecord(value)) return JSON.stringify(value);
  const fields = Object.keys(value)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`);
  return `{${fields.join(',')}}`;
}

/** @param {string} text @returns {string} */
function packageForm(text) {
  const pkg = JSON.parse(text);
  if (!isRecord(pkg) || !isRecord(pkg.scripts)) return canonical(pkg);
  const { scripts, ...rest } = pkg;
  const kept = Object.fromEntries(
    Object.entries(scripts).filter(([name]) => INSTALL_SCRIPTS.has(name)),
  );
  return canonical(Object.keys(kept).length > 0 ? { ...rest, scripts: kept } : rest);
}

/** @param {string} rev @returns {string} */
function atRev(rev) {
  return execFileSync('git', ['show', `${rev}:package.json`], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });
}

/** @param {string[]} args @returns {boolean} */
function scriptsOnly(args) {
  const [oldRev, newRev] = args;
  if (!oldRev) return false;
  try {
    const next =
      args.length > 1 ? atRev(newRev) : fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8');
    return packageForm(atRev(oldRev)) === packageForm(next);
  } catch {
    return false;
  }
}

process.exit(scriptsOnly(process.argv.slice(2)) ? 0 : 1);
