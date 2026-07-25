const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const { assertSafeRelativePath, pathIdentity, resolveInside } = require('../paths');

const HEX_64 = /^[a-f0-9]{64}$/;
const ARTIFACT_KEYS = new Set(['path', 'sha256']);
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

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

function requireExactArtifactReference(reference) {
  if (
    typeof reference !== 'object' ||
    reference === null ||
    Array.isArray(reference) ||
    (Object.getPrototypeOf(reference) !== Object.prototype &&
      Object.getPrototypeOf(reference) !== null)
  ) {
    throw new Error('Artifact reference must be a plain object');
  }
  const keys = Reflect.ownKeys(reference);
  const invalidDescriptor = keys.find((key) => {
    if (typeof key !== 'string') return true;
    const descriptor = Object.getOwnPropertyDescriptor(reference, key);
    return !descriptor?.enumerable || !Object.hasOwn(descriptor, 'value');
  });
  const unknown = keys.filter((key) => typeof key !== 'string' || !ARTIFACT_KEYS.has(key));
  const missing = [...ARTIFACT_KEYS].filter((key) => !Object.hasOwn(reference, key));
  if (invalidDescriptor || unknown.length > 0 || missing.length > 0) {
    const details = [
      unknown.length > 0 && `unexpected ${unknown.map(String).join(', ')}`,
      missing.length > 0 && `missing ${missing.join(', ')}`,
      invalidDescriptor && 'non-data property',
    ].filter(Boolean);
    throw new Error(`Artifact reference fields are invalid: ${details.join('; ')}`);
  }
  assertSafeRelativePath(reference.path);
  if (typeof reference.sha256 !== 'string' || !HEX_64.test(reference.sha256)) {
    throw new Error('Artifact reference sha256 must be 64-character lowercase hexadecimal');
  }
  return reference;
}

function decodeNulPaths(output, label) {
  const bytes = Buffer.isBuffer(output) ? output : Buffer.from(output);
  let decoded;
  try {
    decoded = UTF8_DECODER.decode(bytes);
  } catch {
    throw new Error(`${label} returned invalid UTF-8`);
  }
  if (!decoded.endsWith('\0')) {
    throw new Error(`${label} must return NUL-delimited paths`);
  }
  return decoded.slice(0, -1).split('\0');
}

function defaultRunGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 16 * 1024 * 1024,
  });
}

function assertTrackedArtifact(root, relativePath, options) {
  let output;
  try {
    output = (options.runGit ?? ((args) => defaultRunGit(root, args)))([
      'ls-files',
      '--error-unmatch',
      '-z',
      '--',
      relativePath,
    ]);
  } catch (error) {
    throw new Error(`Artifact must be tracked by Git: ${relativePath}`, { cause: error });
  }
  const trackedPaths = decodeNulPaths(output, 'git ls-files');
  if (
    trackedPaths.length !== 1 ||
    pathIdentity(trackedPaths[0]) !== pathIdentity(relativePath) ||
    trackedPaths[0] !== relativePath
  ) {
    throw new Error(`Tracked artifact path is not the exact canonical path: ${relativePath}`);
  }
}

function sameFile(first, second) {
  return (
    first.dev === second.dev &&
    first.ino === second.ino &&
    first.size === second.size &&
    first.mtimeMs === second.mtimeMs
  );
}

function readExactRegularFile(root, relativePath) {
  const absolutePath = resolveInside(root, relativePath);
  const before = fs.lstatSync(absolutePath);
  if (before.isSymbolicLink()) {
    throw new Error(`Artifact path must not be a symbolic-link: ${relativePath}`);
  }
  if (!before.isFile()) {
    throw new Error(`Artifact path must be a regular file: ${relativePath}`);
  }

  let descriptor;
  try {
    descriptor = fs.openSync(absolutePath, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    const opened = fs.fstatSync(descriptor);
    if (!opened.isFile() || !sameFile(before, opened)) {
      throw new Error(`Artifact changed while opening: ${relativePath}`);
    }
    const bytes = fs.readFileSync(descriptor);
    const after = fs.fstatSync(descriptor);
    const current = fs.lstatSync(absolutePath);
    if (!sameFile(opened, after) || !sameFile(opened, current)) {
      throw new Error(`Artifact changed while reading: ${relativePath}`);
    }
    return bytes;
  } finally {
    if (descriptor !== undefined) fs.closeSync(descriptor);
  }
}

function sha256Bytes(bytes) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) {
    throw new Error('SHA-256 input must be exact bytes');
  }
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function createArtifactReference(root, relativePath, options = {}) {
  assertRepositoryRoot(root);
  assertSafeRelativePath(relativePath);
  assertTrackedArtifact(root, relativePath, options);
  const bytes = readExactRegularFile(root, relativePath);
  return Object.freeze({
    path: relativePath,
    sha256: sha256Bytes(bytes),
  });
}

function validateArtifactReference(root, reference, options = {}) {
  requireExactArtifactReference(reference);
  const observed = createArtifactReference(root, reference.path, options);
  if (observed.sha256 !== reference.sha256) {
    throw new Error(
      `Stale artifact ${reference.path}: expected ${reference.sha256}; observed ${observed.sha256}`,
    );
  }
  return Object.freeze({ path: reference.path, sha256: reference.sha256 });
}

module.exports = {
  createArtifactReference,
  validateArtifactReference,
  sha256Bytes,
};
