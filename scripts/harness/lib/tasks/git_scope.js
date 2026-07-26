const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');

const { assertSafeRelativePath, pathIdentity, resolveInside } = require('../paths');
const { createBootstrapAttestation } = require('./bootstrap');
const { matchesScope } = require('./path_scope');

const EVIDENCE_PREFIXES = Object.freeze([
  'docs/superpowers/initiatives/',
  'docs/superpowers/plans/',
  'docs/superpowers/reviews/',
  'docs/superpowers/specs/',
  'docs/superpowers/task-graphs/',
  'docs/superpowers/qa/',
]);
const READ_ONLY_GIT_COMMANDS = new Set(['diff', 'merge-base', 'rev-parse', 'status']);
const HEX_40 = /^[a-f0-9]{40}$/u;
const UTF8_DECODER = new TextDecoder('utf-8', { fatal: true });

function assertRepositoryRoot(root) {
  if (typeof root !== 'string' || !path.isAbsolute(root) || path.resolve(root) !== root) {
    throw new Error('Repository root must be a normalized absolute path');
  }
  const stats = fs.lstatSync(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() || fs.realpathSync(root) !== root) {
    throw new Error('Repository root must be a canonical physical directory');
  }
}

function defaultRunGit(root, args) {
  return execFileSync('git', ['-C', root, ...args], {
    encoding: 'buffer',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 32 * 1024 * 1024,
  });
}

function runGit(root, args, options) {
  if (
    !Array.isArray(args) ||
    args.length === 0 ||
    args.some((argument) => typeof argument !== 'string') ||
    !READ_ONLY_GIT_COMMANDS.has(args[0])
  ) {
    throw new Error(`Task evidence forbids Git command: ${String(args?.[0])}`);
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

function decodeLine(output, label) {
  const decoded = decodeUtf8(output, label);
  if (!decoded.endsWith('\n') || decoded.slice(0, -1).includes('\n')) {
    throw new Error(`${label} must return exactly one LF-terminated line`);
  }
  return decoded.slice(0, -1);
}

function decodeNulRecords(output, label) {
  const decoded = decodeUtf8(output, label);
  if (decoded.length === 0) return [];
  if (!decoded.endsWith('\0')) {
    throw new Error(`${label} must return NUL-delimited records`);
  }
  return decoded.slice(0, -1).split('\0');
}

function comparePaths(left, right) {
  return Buffer.compare(Buffer.from(left, 'utf8'), Buffer.from(right, 'utf8'));
}

function isEvidencePath(relativePath) {
  return EVIDENCE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
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
    entries.push({ paths, status });
  }
  return entries;
}

function assertDeliveryClean(root, options) {
  const output = runGit(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all'], options);
  const dirty = new Set();
  for (const entry of parsePorcelainStatus(output)) {
    if (entry.status === '!!') continue;
    for (const relativePath of entry.paths) {
      assertSafeRelativePath(relativePath);
      if (!isEvidencePath(relativePath)) dirty.add(relativePath);
    }
  }
  const paths = [...dirty].sort(comparePaths);
  if (paths.length > 0) {
    throw new Error(`Dirty delivery paths are not allowed: ${JSON.stringify(paths)}`);
  }
}

function readBranch(root, options) {
  return decodeLine(
    runGit(root, ['rev-parse', '--abbrev-ref', 'HEAD'], options),
    'git rev-parse --abbrev-ref HEAD',
  );
}

function readHead(root, options) {
  const head = decodeLine(
    runGit(root, ['rev-parse', '--verify', 'HEAD'], options),
    'git rev-parse --verify HEAD',
  );
  if (!HEX_40.test(head)) {
    throw new Error('Git HEAD must be a 40-character lowercase hexadecimal commit');
  }
  return head;
}

function assertExpectedBranch(branch, expectedBranch) {
  if (branch === 'HEAD') {
    throw new Error('Detached HEAD cannot produce task execution evidence');
  }
  if (branch !== expectedBranch) {
    throw new Error(`Branch mismatch: expected ${expectedBranch}; observed ${branch}`);
  }
}

function collectRepositorySnapshot(root, expectedBranch, options = {}) {
  assertRepositoryRoot(root);
  const branch = readBranch(root, options);
  assertExpectedBranch(branch, expectedBranch);
  const head = readHead(root, options);
  assertDeliveryClean(root, options);
  return Object.freeze({ branch, head });
}

function parseNameStatusZ(output) {
  const records = decodeNulRecords(output, 'git diff --name-status');
  const entries = [];
  for (let index = 0; index < records.length; index += 1) {
    const status = records[index];
    if (!/^(?:[ACDMRTUXB]|[RC][0-9]{1,3})$/u.test(status)) {
      throw new Error(`Invalid Git name-status code: ${JSON.stringify(status)}`);
    }
    index += 1;
    if (index >= records.length) {
      throw new Error(`Git name-status record ${status} is missing its path`);
    }
    const firstPath = records[index];
    if (status.startsWith('R') || status.startsWith('C')) {
      index += 1;
      if (index >= records.length) {
        throw new Error(`Git name-status record ${status} is missing its destination path`);
      }
      entries.push({
        status,
        sourcePath: firstPath,
        destinationPath: records[index],
      });
    } else {
      entries.push({
        status,
        sourcePath: undefined,
        destinationPath: firstPath,
      });
    }
  }
  return entries;
}

function validateChangedPaths(root, task, changedPaths) {
  assertRepositoryRoot(root);
  if (!task || !Array.isArray(task.writePaths) || !Array.isArray(changedPaths)) {
    throw new Error('Task write scopes and changed paths must be arrays');
  }
  const identities = new Set();
  const normalized = [];
  for (const relativePath of changedPaths) {
    assertSafeRelativePath(relativePath);
    resolveInside(root, relativePath);
    const identity = pathIdentity(relativePath);
    if (identities.has(identity)) {
      throw new Error(`Changed paths contain an aliased duplicate: ${relativePath}`);
    }
    identities.add(identity);
    if (!task.writePaths.some((scope) => matchesScope(relativePath, scope))) {
      throw new Error(`Changed path is outside approved write scopes: ${relativePath}`);
    }
    normalized.push(relativePath);
  }
  return Object.freeze(normalized.sort(comparePaths));
}

function collectTaskStartRevision(root, expectedBranch, options = {}) {
  assertRepositoryRoot(root);
  const branch = readBranch(root, options);
  assertExpectedBranch(branch, expectedBranch);
  const startHead = readHead(root, options);
  assertDeliveryClean(root, options);
  if (options.expectedHead !== undefined) {
    if (!HEX_40.test(options.expectedHead)) {
      throw new Error(
        'Accounted task checkpoint must be a 40-character lowercase hexadecimal commit',
      );
    }
    if (startHead !== options.expectedHead) {
      try {
        runGit(root, ['merge-base', '--is-ancestor', options.expectedHead, startHead], options);
      } catch (error) {
        throw new Error('Current task start HEAD does not descend from the accounted checkpoint', {
          cause: error,
        });
      }
      const records = parseNameStatusZ(
        runGit(
          root,
          [
            'diff',
            '--name-status',
            '-z',
            '--find-renames',
            '--find-copies',
            options.expectedHead,
            startHead,
            '--',
          ],
          options,
        ),
      );
      const unaccounted = new Set();
      for (const record of records) {
        if (record.status.startsWith('R') && !isEvidencePath(record.sourcePath)) {
          unaccounted.add(record.sourcePath);
        }
        if (!isEvidencePath(record.destinationPath)) {
          unaccounted.add(record.destinationPath);
        }
      }
      const paths = [...unaccounted].sort(comparePaths);
      if (paths.length > 0) {
        throw new Error(
          `Unaccounted committed delivery paths are not allowed: ${JSON.stringify(paths)}`,
        );
      }
    }
  }
  return Object.freeze({ branch, startHead });
}

function collectChangedPaths(root, startHead, endHead, task, options) {
  const records = parseNameStatusZ(
    runGit(
      root,
      ['diff', '--name-status', '-z', '--find-renames', '--find-copies', startHead, endHead, '--'],
      options,
    ),
  );
  const paths = [];
  for (const record of records) {
    if (record.status.startsWith('R') && !isEvidencePath(record.sourcePath)) {
      paths.push(record.sourcePath);
    }
    if (!isEvidencePath(record.destinationPath)) paths.push(record.destinationPath);
  }
  return validateChangedPaths(root, task, paths);
}

function collectTaskCompletionRevision(root, startRevision, task, options = {}) {
  assertRepositoryRoot(root);
  if (
    !startRevision ||
    typeof startRevision.branch !== 'string' ||
    !HEX_40.test(startRevision.startHead)
  ) {
    throw new Error('Task start revision is invalid');
  }
  const branch = readBranch(root, options);
  assertExpectedBranch(branch, startRevision.branch);
  const currentHead = readHead(root, options);
  const endHead = options.endHead ?? currentHead;
  if (!HEX_40.test(endHead)) {
    throw new Error('Explicit task end HEAD must be a 40-character lowercase hexadecimal commit');
  }
  assertDeliveryClean(root, options);

  if (endHead !== currentHead) {
    try {
      runGit(root, ['merge-base', '--is-ancestor', endHead, currentHead], options);
    } catch (error) {
      throw new Error('Historical task end HEAD does not belong to the current branch', {
        cause: error,
      });
    }
  }
  if (endHead !== startRevision.startHead) {
    try {
      runGit(root, ['merge-base', '--is-ancestor', startRevision.startHead, endHead], options);
    } catch (error) {
      throw new Error('Task end HEAD does not descend from its start HEAD', { cause: error });
    }
  }
  if (task.kind === 'validation' && endHead !== startRevision.startHead) {
    throw new Error('A validation task forbids HEAD movement and delivery content changes');
  }

  const changedPaths = collectChangedPaths(root, startRevision.startHead, endHead, task, options);
  if (task.kind === 'validation') {
    if (changedPaths.length > 0) {
      throw new Error('A validation task forbids HEAD movement and delivery content changes');
    }
  } else {
    if (endHead === startRevision.startHead || changedPaths.length === 0) {
      throw new Error('A mutation task requires HEAD movement and a nonempty committed delta');
    }
  }

  return Object.freeze({
    branch,
    startHead: startRevision.startHead,
    endHead,
    changedPaths,
  });
}

function equalStringArrays(left, right) {
  return (
    Array.isArray(left) &&
    Array.isArray(right) &&
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

function assertObservedCompletion(completion, observed) {
  if (
    completion.taskId !== observed.taskId ||
    completion.startHead !== observed.startHead ||
    completion.endHead !== observed.endHead ||
    !equalStringArrays(completion.changedPaths, observed.changedPaths)
  ) {
    throw new Error(
      `Bootstrap attestation changed paths or range mismatch for ${completion.taskId}`,
    );
  }
}

function assertAncestor(root, ancestor, descendant, message, options) {
  try {
    runGit(root, ['merge-base', '--is-ancestor', ancestor, descendant], options);
  } catch (error) {
    throw new Error(message, { cause: error });
  }
}

function attestBootstrapChain(
  root,
  { branch, graph, checkpoint, previousAccountedHead, completions },
  options = {},
) {
  if (!graph || !Array.isArray(graph.tasks) || !HEX_40.test(checkpoint ?? '')) {
    throw new Error('Bootstrap attestation requires an approved graph and checkpoint');
  }
  if (!Array.isArray(completions) || completions.length === 0) {
    throw new Error('Bootstrap attestation requires at least one completion');
  }

  const opening = collectRepositorySnapshot(root, branch, options);
  const tasks = new Map(graph.tasks.map((candidate) => [candidate.id, candidate]));
  const observedCompletions = [];
  let expectedStart = checkpoint;

  for (const completion of completions) {
    const task = tasks.get(completion.taskId);
    if (!task) {
      throw new Error(`Bootstrap attestation references unknown task ${completion.taskId}`);
    }
    if (completion.startHead !== expectedStart) {
      throw new Error(`Bootstrap attestation chain is not contiguous at ${completion.taskId}`);
    }
    const observed = collectTaskCompletionRevision(
      root,
      { branch, startHead: completion.startHead },
      task,
      { ...options, endHead: completion.endHead },
    );
    assertObservedCompletion(completion, { taskId: completion.taskId, ...observed });
    observedCompletions.push(completion);
    expectedStart = completion.endHead;
  }

  const validatedHead = completions.at(-1).endHead;
  if (validatedHead !== opening.head) {
    throw new Error('Bootstrap attestation endpoint does not reach the stable repository HEAD');
  }
  if (previousAccountedHead !== undefined) {
    if (!HEX_40.test(previousAccountedHead)) {
      throw new Error('Previous accounted HEAD must be a commit hash');
    }
    assertAncestor(
      root,
      previousAccountedHead,
      validatedHead,
      'Bootstrap replacement endpoint does not descend from its prior accounted HEAD',
      options,
    );
  }

  const attestation = createBootstrapAttestation({
    graphHash: graph.graphHash,
    branch,
    checkpoint,
    validatedHead,
    completions: observedCompletions,
  });
  const closing = collectRepositorySnapshot(root, branch, options);
  if (closing.branch !== opening.branch || closing.head !== opening.head) {
    throw new Error('Repository branch or HEAD changed during bootstrap attestation');
  }

  return Object.freeze({
    observedCompletions: Object.freeze([...observedCompletions]),
    attestation,
  });
}

module.exports = {
  attestBootstrapChain,
  collectTaskCompletionRevision,
  collectTaskStartRevision,
  parseNameStatusZ,
  validateChangedPaths,
};
