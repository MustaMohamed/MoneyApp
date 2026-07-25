const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const { assertSafeRelativePath, pathIdentity, resolveInside } = require('../paths');

const EXCLUDED_PREFIXES = Object.freeze([
  'docs/superpowers/initiatives/',
  'docs/superpowers/reviews/',
  'docs/superpowers/qa/',
]);
const READ_ONLY_GIT_COMMANDS = new Set(['rev-parse', 'status', 'ls-files']);
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });
const HEX_40 = /^[a-f0-9]{40}$/;
const BRANCH_FORBIDDEN_CHARACTERS = new Set(['~', '^', ':', '?', '*', '[', '\\']);

function assertRepositoryRoot(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root) {
    throw new Error('Repository root must be a normalized absolute path');
  }
  const stats = fs.lstatSync(root);
  if (stats.isSymbolicLink() || !stats.isDirectory()) {
    throw new Error('Repository root must be a real directory, not a symbolic link');
  }
  if (fs.realpathSync(root) !== root) {
    throw new Error('Repository root must be its canonical physical path');
  }
  return root;
}

function requireInitiativeBranch(initiative) {
  if (
    typeof initiative !== 'object' ||
    initiative === null ||
    Array.isArray(initiative) ||
    (Object.getPrototypeOf(initiative) !== Object.prototype &&
      Object.getPrototypeOf(initiative) !== null)
  ) {
    throw new Error('Initiative must be a plain object with a non-main branch');
  }
  const descriptor = Object.getOwnPropertyDescriptor(initiative, 'branch');
  const branch = descriptor?.value;
  const hasForbiddenCharacter =
    typeof branch === 'string' &&
    Array.from(branch).some((character) => {
      const codePoint = character.codePointAt(0);
      return codePoint <= 0x20 || codePoint === 0x7f || BRANCH_FORBIDDEN_CHARACTERS.has(character);
    });
  if (
    !descriptor?.enumerable ||
    typeof branch !== 'string' ||
    branch.length === 0 ||
    branch === 'main' ||
    branch === 'master' ||
    branch === 'HEAD' ||
    branch.startsWith('-') ||
    branch.endsWith('/') ||
    branch.endsWith('.') ||
    branch.includes('..') ||
    branch.includes('@{') ||
    branch.includes('//') ||
    hasForbiddenCharacter
  ) {
    throw new Error('Initiative branch must be a safe non-main branch');
  }
  return branch;
}

function defaultRunGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function runGit(root, args, options) {
  if (!READ_ONLY_GIT_COMMANDS.has(args[0])) {
    throw new Error(`Workflow delivery evidence forbids Git command: ${String(args[0])}`);
  }
  return (options.runGit ?? ((gitArgs) => defaultRunGit(root, gitArgs)))(args);
}

function decodeUtf8(output, label) {
  try {
    return UTF8_DECODER.decode(Buffer.isBuffer(output) ? output : Buffer.from(output));
  } catch {
    throw new Error(`${label} returned invalid UTF-8`);
  }
}

function decodeNulRecords(output, label) {
  const decoded = decodeUtf8(output, label);
  if (decoded.length === 0) return [];
  if (!decoded.endsWith('\0')) {
    throw new Error(`${label} must return NUL-delimited records`);
  }
  return decoded.slice(0, -1).split('\0');
}

function isExcludedEvidencePath(relativePath) {
  return EXCLUDED_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function comparePaths(first, second) {
  return Buffer.compare(Buffer.from(first, 'utf8'), Buffer.from(second, 'utf8'));
}

function normalizeTrackedPaths(trackedPaths) {
  if (!Array.isArray(trackedPaths)) {
    throw new Error('Tracked paths must be an array');
  }
  const identities = new Set();
  const normalized = [];
  for (const relativePath of trackedPaths) {
    assertSafeRelativePath(relativePath);
    const identity = pathIdentity(relativePath);
    if (identities.has(identity)) {
      throw new Error(`Tracked paths contain duplicate path identity: ${relativePath}`);
    }
    identities.add(identity);
    if (!isExcludedEvidencePath(relativePath)) normalized.push(relativePath);
  }
  return normalized.sort(comparePaths);
}

function sameFile(first, second) {
  return (
    first.dev === second.dev &&
    first.ino === second.ino &&
    first.size === second.size &&
    first.mtimeMs === second.mtimeMs
  );
}

function readDefaultExactFile(absolutePath, relativePath, before) {
  let descriptor;
  try {
    descriptor = fs.openSync(absolutePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || !sameFile(before, opened)) {
      throw new Error(`Tracked delivery file changed while opening: ${relativePath}`);
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const current = fs.lstatSync(absolutePath);
    if (!sameFile(opened, after) || !sameFile(opened, current)) {
      throw new Error(`Tracked delivery file changed while reading: ${relativePath}`);
    }
    return bytes;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function readTrackedFile(root, relativePath, options) {
  const absolutePath = resolveInside(root, relativePath);
  const before = fs.lstatSync(absolutePath);
  if (before.isSymbolicLink()) {
    throw new Error(`Tracked delivery path must not be a symbolic-link: ${relativePath}`);
  }
  if (before.isDirectory()) {
    throw new Error(
      `Tracked delivery path is a directory; submodules are unsupported and delivery digests require regular files only: ${relativePath}`,
    );
  }
  if (!before.isFile()) {
    throw new Error(`Tracked delivery path must be a regular file: ${relativePath}`);
  }
  const value = options.readFile
    ? options.readFile(absolutePath, relativePath)
    : readDefaultExactFile(absolutePath, relativePath, before);
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) {
    throw new Error(`File reader must return exact bytes for ${relativePath}`);
  }
  return Buffer.from(value);
}

function lengthFrame(length) {
  const frame = Buffer.alloc(8);
  frame.writeBigUInt64BE(BigInt(length));
  return frame;
}

function computeDeliveryDigest(root, trackedPaths, options = {}) {
  assertRepositoryRoot(root);
  const normalizedPaths = normalizeTrackedPaths(trackedPaths);
  const digest = crypto.createHash('sha256');
  digest.update(Buffer.from('moneyapp-delivery-content-v1\0', 'utf8'));
  digest.update(lengthFrame(normalizedPaths.length));
  for (const relativePath of normalizedPaths) {
    const pathBytes = Buffer.from(relativePath, 'utf8');
    const fileBytes = readTrackedFile(root, relativePath, options);
    digest.update(lengthFrame(pathBytes.length));
    digest.update(pathBytes);
    digest.update(lengthFrame(fileBytes.length));
    digest.update(fileBytes);
  }
  return digest.digest('hex');
}

function parsePorcelainStatus(output) {
  const records = decodeNulRecords(output, 'git status');
  const entries = [];
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.length < 4 || record[2] !== ' ') {
      throw new Error(`Invalid porcelain-v1 status record: ${JSON.stringify(record)}`);
    }
    const status = record.slice(0, 2);
    const paths = [record.slice(3)];
    if (status.includes('R') || status.includes('C')) {
      index += 1;
      if (index >= records.length) {
        throw new Error(`Rename/copy status is missing its source path: ${JSON.stringify(record)}`);
      }
      if (status.includes('R')) paths.push(records[index]);
    }
    entries.push({ status, paths });
  }
  return entries;
}

function assertDeliveryClean(root, options = {}) {
  assertRepositoryRoot(root);
  const output = runGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], options);
  const blocking = new Set();
  for (const entry of parsePorcelainStatus(output)) {
    if (entry.status === '!!') continue;
    for (const relativePath of entry.paths) {
      if (!isExcludedEvidencePath(relativePath)) blocking.add(relativePath);
    }
  }
  const paths = [...blocking].sort(comparePaths);
  if (paths.length > 0) {
    throw new Error(`Delivery is dirty outside evidence paths: ${JSON.stringify(paths)}`);
  }
  return Object.freeze(paths);
}

function readCurrentBranch(root, options) {
  return decodeUtf8(
    runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD'], options),
    'git rev-parse --abbrev-ref HEAD',
  ).replace(/\n$/, '');
}

function readHeadSha(root, options) {
  const headSha = decodeUtf8(
    runGit(root, ['rev-parse', 'HEAD'], options),
    'git rev-parse HEAD',
  ).replace(/\n$/, '');
  if (!HEX_40.test(headSha)) {
    throw new Error('Git HEAD must be a 40-character lowercase hexadecimal commit');
  }
  return headSha;
}

function collectDeliveryRevision(root, initiative, options = {}) {
  assertRepositoryRoot(root);
  const expectedBranch = requireInitiativeBranch(initiative);
  const branch = readCurrentBranch(root, options);
  if (branch === 'HEAD') {
    throw new Error('Detached HEAD cannot produce workflow delivery evidence');
  }
  if (branch !== expectedBranch) {
    throw new Error(
      `Branch mismatch: expected ${expectedBranch}; observed ${branch || '(detached)'}`,
    );
  }
  const headSha = readHeadSha(root, options);
  assertDeliveryClean(root, options);
  const trackedPaths = decodeNulRecords(runGit(root, ['ls-files', '-z'], options), 'git ls-files');
  const contentDigest = computeDeliveryDigest(root, trackedPaths, options);

  try {
    assertDeliveryClean(root, options);
  } catch (error) {
    throw new Error(`Delivery changed during revision collection: ${error.message}`, {
      cause: error,
    });
  }
  const observedBranch = readCurrentBranch(root, options);
  if (observedBranch !== branch) {
    throw new Error(
      `Branch changed during revision collection: expected ${branch}; observed ${
        observedBranch === 'HEAD' ? '(detached HEAD)' : observedBranch
      }`,
    );
  }
  const observedHeadSha = readHeadSha(root, options);
  if (observedHeadSha !== headSha) {
    throw new Error(
      `HEAD changed during revision collection: expected ${headSha}; observed ${observedHeadSha}`,
    );
  }

  return Object.freeze({ branch, headSha, contentDigest });
}

module.exports = {
  collectDeliveryRevision,
  assertDeliveryClean,
  computeDeliveryDigest,
};
