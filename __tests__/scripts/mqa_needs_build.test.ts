import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { cleanEnv, commit, git, removeTempDirs, tempDir } from '@/test_helpers/git_repo';

const repoRoot = path.join(__dirname, '..', '..');
const mqaSh = path.join(repoRoot, '.claude', 'skills', 'emulator-verify', 'mqa.sh');
const adbStub = path.join(__dirname, 'fixtures', 'mqa_adb_stub.sh');
const scriptsOnly = path.join(repoRoot, 'scripts', 'package_json_scripts_only.mjs');

const SERIAL = 'emulator-5554';
const DAY = 86_400;
const T0 = 1_790_000_000;

let stubBin = '';
let leaseDir = '';
let workDir = '';

function write(repo: string, file: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), text);
}

function newRepo(): string {
  const repo = tempDir('ma178-repo-');
  git(repo, ['init', '-q', '-b', 'main']);
  write(repo, '.claude/skills/emulator-verify/mqa.sh', fs.readFileSync(mqaSh, 'utf8'));
  write(repo, 'scripts/package_json_scripts_only.mjs', fs.readFileSync(scriptsOnly, 'utf8'));
  return repo;
}

function needsBuild(repo: string, apkTime: string, extraEnv: Record<string, string> = {}) {
  const env = cleanEnv('MQA_');
  const r = spawnSync(
    'bash',
    ['.claude/skills/emulator-verify/mqa.sh', 'needs-build', 'main', '--exit-code'],
    {
      cwd: repo,
      encoding: 'utf8',
      timeout: 20_000,
      env: {
        ...env,
        PATH: `${stubBin}${path.delimiter}${String(env.PATH)}`,
        ADB_STUB_SERIAL: SERIAL,
        ADB_STUB_APK_TIME: apkTime,
        MQA_SERIAL: SERIAL,
        MQA_LEASE_DIR: leaseDir,
        MQA_WORK: workDir,
        ...extraEnv,
      },
    },
  );
  return { status: r.status, lines: r.stdout.split('\n'), stderr: r.stderr };
}

let nativeRepo = '';
let nativeSha = '';
let docsOnlyRepo = '';
let branchPatchRepo = '';
let forkedRepo = '';
let forkedSha = '';
let mergedRepo = '';
let atPathRepo = '';
let atPathSha = '';

beforeAll(() => {
  stubBin = tempDir('ma178-adb-');
  fs.copyFileSync(adbStub, path.join(stubBin, 'adb'));
  fs.chmodSync(path.join(stubBin, 'adb'), 0o755);
  leaseDir = tempDir('ma178-leases-');
  workDir = tempDir('ma178-work-');

  // main: a package.json commit at T0, then a docs commit a day later; the branch adds nothing.
  nativeRepo = newRepo();
  write(nativeRepo, 'package.json', '{}\n');
  nativeSha = commit(nativeRepo, T0, 'native');
  write(nativeRepo, 'readme.md', 'docs\n');
  commit(nativeRepo, T0 + DAY, 'docs');
  git(nativeRepo, ['checkout', '-q', '-b', 'feat']);

  docsOnlyRepo = newRepo();
  write(docsOnlyRepo, 'readme.md', 'docs\n');
  commit(docsOnlyRepo, T0, 'docs');
  git(docsOnlyRepo, ['checkout', '-q', '-b', 'feat']);

  branchPatchRepo = newRepo();
  write(branchPatchRepo, 'package.json', '{}\n');
  commit(branchPatchRepo, T0, 'native');
  git(branchPatchRepo, ['checkout', '-q', '-b', 'feat']);
  write(branchPatchRepo, 'patches/react-native+0.0.0.patch', 'patch\n');
  commit(branchPatchRepo, T0 + 3 * DAY, 'patch');

  // The branch forks after a package.json commit at T0; main gains app.json two days after the fork.
  forkedRepo = newRepo();
  write(forkedRepo, 'package.json', '{}\n');
  forkedSha = commit(forkedRepo, T0, 'native');
  git(forkedRepo, ['checkout', '-q', '-b', 'feat']);
  git(forkedRepo, ['checkout', '-q', 'main']);
  write(forkedRepo, 'app.json', '{}\n');
  commit(forkedRepo, T0 + 3 * DAY, 'native on main');
  git(forkedRepo, ['checkout', '-q', 'feat']);

  // The branch adds patches/ at T0 + 1 day; main adds app.json at T0 + 3 days and is merged into the branch with --no-ff a day later.
  mergedRepo = newRepo();
  write(mergedRepo, 'readme.md', 'docs\n');
  commit(mergedRepo, T0, 'docs');
  git(mergedRepo, ['checkout', '-q', '-b', 'feat']);
  write(mergedRepo, 'patches/react-native+0.0.0.patch', 'patch\n');
  commit(mergedRepo, T0 + DAY, 'patch');
  git(mergedRepo, ['checkout', '-q', 'main']);
  write(mergedRepo, 'app.json', '{}\n');
  commit(mergedRepo, T0 + 3 * DAY, 'native on main');
  git(mergedRepo, ['checkout', '-q', 'feat']);
  git(mergedRepo, ['merge', '-q', '--no-ff', '--no-edit', 'main'], T0 + 4 * DAY);

  // main's native commit also touches a path starting with @, the header mark's old first character.
  atPathRepo = newRepo();
  write(atPathRepo, '@x/z', 'z\n');
  write(atPathRepo, 'package.json', '{}\n');
  atPathSha = commit(atPathRepo, T0, 'native and @x');
  git(atPathRepo, ['checkout', '-q', '-b', 'feat']);
});

afterAll(removeTempDirs);

const BASE_REBUILD = new RegExp(
  `^REBUILD: main changed the native surface in ([0-9a-f]{4,40}), and the APK on ${SERIAL} predates it\\.`,
);
const BASE_REUSE = new RegExp(
  `^REUSE: no native surface change since main, and the APK on ${SERIAL} was installed after its newest one, ([0-9a-f]{4,40}); this branch reaches the device over Metro\\.$`,
);
const BRANCH_REBUILD = /^REBUILD: native surface changed since main, /;

function expectVerdict(
  r: ReturnType<typeof needsBuild>,
  pattern: RegExp,
  sha: string,
  status: number,
): void {
  const match = pattern.exec(r.lines[0]);
  expect(match).not.toBeNull();
  expect(sha.startsWith(match?.[1] ?? '-')).toBe(true);
  expect(r.status).toBe(status);
  expect(r.stderr).toBe('');
}

const PKG = {
  name: 'fixture',
  version: '1.0.0',
  scripts: { lint: 'oxlint', postinstall: 'patch-package' },
  dependencies: { react: '19.0.0', 'react-native': '0.81.0' },
};

function pkgJson(over: Partial<typeof PKG> = {}): string {
  return `${JSON.stringify({ ...PKG, ...over }, null, 2)}\n`;
}

const LINT_ONLY = pkgJson({ scripts: { lint: 'oxlint --fix', postinstall: 'patch-package' } });
const DEPENDENCY_MOVED = pkgJson({ dependencies: { react: '19.0.1', 'react-native': '0.81.0' } });

// main: a root commit two days before T0, then a commit at T0 that moves a dependency.
function mainAtT0(): { repo: string; t0Sha: string } {
  const repo = newRepo();
  write(
    repo,
    'package.json',
    pkgJson({ dependencies: { react: '19.0.0', 'react-native': '0.80.0' } }),
  );
  write(repo, 'package-lock.json', '{ "lockfileVersion": 3 }\n');
  commit(repo, T0 - 2 * DAY, 'root');
  write(repo, 'package.json', pkgJson());
  const t0Sha = commit(repo, T0, 'dependency');
  return { repo, t0Sha };
}

function mainWithLater(change: (repo: string) => void) {
  const { repo, t0Sha } = mainAtT0();
  change(repo);
  const laterSha = commit(repo, T0 + 2 * DAY, 'later');
  git(repo, ['checkout', '-q', '-b', 'feat']);
  return { repo, t0Sha, laterSha };
}

// main merges a side branch with --no-ff: the side commit at T0 + 1 day, the merge at T0 + 3 days.
function mainWithMerge(change: (repo: string) => void) {
  const { repo, t0Sha } = mainAtT0();
  git(repo, ['checkout', '-q', '-b', 'side']);
  change(repo);
  commit(repo, T0 + DAY, 'side');
  git(repo, ['checkout', '-q', 'main']);
  git(repo, ['merge', '-q', '--no-ff', '--no-edit', 'side'], T0 + 3 * DAY);
  const mergeSha = git(repo, ['rev-parse', 'HEAD']);
  git(repo, ['checkout', '-q', '-b', 'feat']);
  return { repo, t0Sha, mergeSha };
}

function branchFromT0(): { repo: string; t0Sha: string } {
  const { repo, t0Sha } = mainAtT0();
  git(repo, ['checkout', '-q', '-b', 'feat']);
  return { repo, t0Sha };
}

const lintOnly = (repo: string) => write(repo, 'package.json', LINT_ONLY);

describe('mqa needs-build, base side', () => {
  it("rebuilds when the APK is a day older than the newest native-surface commit on main, listing that commit's files", () => {
    const r = needsBuild(nativeRepo, String(T0 - DAY));

    expectVerdict(r, BASE_REBUILD, nativeSha, 0);
    expect(r.lines[1]).toBe('  package.json');
  });

  it('reuses when the APK is a day newer than that commit, naming it', () => {
    const r = needsBuild(nativeRepo, String(T0 + DAY));

    expectVerdict(r, BASE_REUSE, nativeSha, 1);
  });

  it('keeps the old reuse line when main holds no native-surface commit', () => {
    const r = needsBuild(docsOnlyRepo, String(T0 - DAY));

    expect(r.lines[0]).toBe(
      'REUSE: no native surface change since main; this branch reaches the device over Metro.',
    );
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('');
  });

  it('rebuilds when the APK time cannot be read, on the repo of the first case', () => {
    const r = needsBuild(nativeRepo, '');

    expectVerdict(r, BASE_REBUILD, nativeSha, 0);
  });

  it("reuses an APK newer than the fork's native commit when main gained a native commit after the fork", () => {
    const r = needsBuild(forkedRepo, String(T0 + 2 * DAY));

    expectVerdict(r, BASE_REUSE, forkedSha, 1);
  });

  it('names the native commit when it also touches a path starting with @', () => {
    const r = needsBuild(atPathRepo, String(T0 + DAY));

    expectVerdict(r, BASE_REUSE, atPathSha, 1);
  });

  it.each<[string, (repo: string) => void]>([
    ['a lint script edit', lintOnly],
    [
      'a re-indent and key reorder',
      (repo) =>
        write(
          repo,
          'package.json',
          `${JSON.stringify(
            {
              dependencies: { 'react-native': '0.81.0', react: '19.0.0' },
              scripts: { postinstall: 'patch-package', lint: 'oxlint' },
              version: '1.0.0',
              name: 'fixture',
            },
            null,
            4,
          )}\n`,
        ),
    ],
  ])(
    'reuses past a later main commit whose only native change is %s in package.json, naming the commit before it',
    (_label, change) => {
      const { repo, t0Sha } = mainWithLater(change);

      const r = needsBuild(repo, String(T0 + DAY));

      expectVerdict(r, BASE_REUSE, t0Sha, 1);
    },
  );

  it.each<[string, (repo: string) => void, string]>([
    [
      'edits postinstall',
      (repo) =>
        write(
          repo,
          'package.json',
          pkgJson({ scripts: { lint: 'oxlint', postinstall: 'patch-package --error-on-fail' } }),
        ),
      '  package.json',
    ],
    [
      'changes version',
      (repo) => write(repo, 'package.json', pkgJson({ version: '1.0.1' })),
      '  package.json',
    ],
    [
      'changes package-lock.json alone',
      (repo) => write(repo, 'package-lock.json', '{ "lockfileVersion": 3, "packages": {} }\n'),
      '  package-lock.json',
    ],
    [
      'writes a package.json that does not parse',
      (repo) => write(repo, 'package.json', '{\n  "name": "fixture",\n'),
      '  package.json',
    ],
    [
      'deletes package.json',
      (repo) => fs.rmSync(path.join(repo, 'package.json')),
      '  package.json',
    ],
  ])(
    'rebuilds when a later main commit %s, naming that commit and listing its file',
    (_label, change, file) => {
      const { repo, laterSha } = mainWithLater(change);

      const r = needsBuild(repo, String(T0 + DAY));

      expectVerdict(r, BASE_REBUILD, laterSha, 0);
      expect(r.lines).toContain(file);
    },
  );

  it('rebuilds on a later main commit with a lint-only package.json and app.json, listing app.json and not package.json', () => {
    const { repo, laterSha } = mainWithLater((at) => {
      lintOnly(at);
      write(at, 'app.json', '{}\n');
    });

    const r = needsBuild(repo, String(T0 + DAY));

    expectVerdict(r, BASE_REBUILD, laterSha, 0);
    expect(r.lines).toContain('  app.json');
    expect(r.lines).not.toContain('  package.json');
  });

  it('rebuilds when main merges, after the APK, a side branch that moved a dependency, naming the merge', () => {
    const { repo, mergeSha } = mainWithMerge((at) => write(at, 'package.json', DEPENDENCY_MOVED));

    const r = needsBuild(repo, String(T0 + 2 * DAY));

    expectVerdict(r, BASE_REBUILD, mergeSha, 0);
    expect(r.lines).toContain('  package.json');
  });

  it('reuses when main merges, after the APK, a lint-only side branch, naming the T0 commit', () => {
    const { repo, t0Sha } = mainWithMerge(lintOnly);

    const r = needsBuild(repo, String(T0 + 2 * DAY));

    expectVerdict(r, BASE_REUSE, t0Sha, 1);
  });

  it('rebuilds naming the T0 commit when the APK time cannot be read, past a later lint-only commit', () => {
    const { repo, t0Sha } = mainWithLater(lintOnly);

    const r = needsBuild(repo, '');

    expectVerdict(r, BASE_REBUILD, t0Sha, 0);
    expect(r.lines).toContain('  package.json');
  });
});

describe('mqa needs-build, branch side', () => {
  it('rebuilds on a branch commit under patches/ later than the APK, as before', () => {
    const r = needsBuild(branchPatchRepo, String(T0 + 2 * DAY));

    expect(r.lines[0]).toMatch(/^REBUILD: native surface changed since main, /);
    expect(r.lines).toContain('  patches/react-native+0.0.0.patch');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('rebuilds when main, merged in with --no-ff, changed the native surface after the APK and after the branch did', () => {
    const r = needsBuild(mergedRepo, String(T0 + 2 * DAY));

    expect(r.lines[0]).toMatch(/^REBUILD: native surface changed since main, /);
    expect(r.lines).toContain('  patches/react-native+0.0.0.patch');
    expect(r.lines).toContain('  app.json');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it.each<[string, boolean]>([
    ['committed', true],
    ['left uncommitted', false],
  ])(
    'reads a lint-only package.json edit %s as no native change, reusing past the T0 commit',
    (_label, committed) => {
      const { repo, t0Sha } = branchFromT0();
      lintOnly(repo);
      if (committed) commit(repo, T0 + 2 * DAY, 'lint');

      const r = needsBuild(repo, String(T0 + DAY));

      expectVerdict(r, BASE_REUSE, t0Sha, 1);
    },
  );

  it('rebuilds on a branch commit that moves a dependency, listing package.json', () => {
    const { repo } = branchFromT0();
    write(repo, 'package.json', DEPENDENCY_MOVED);
    commit(repo, T0 + 2 * DAY, 'dependency on the branch');

    const r = needsBuild(repo, String(T0 + DAY));

    expect(r.lines[0]).toMatch(BRANCH_REBUILD);
    expect(r.lines).toContain('  package.json');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('rebuilds on an uncommitted dependency move on top of a committed lint edit, listing package.json', () => {
    const { repo } = branchFromT0();
    lintOnly(repo);
    commit(repo, T0 + 2 * DAY, 'lint');
    write(
      repo,
      'package.json',
      pkgJson({
        scripts: { lint: 'oxlint --fix', postinstall: 'patch-package' },
        dependencies: { react: '19.0.1', 'react-native': '0.81.0' },
      }),
    );

    const r = needsBuild(repo, String(T0 + DAY));

    expect(r.lines[0]).toMatch(BRANCH_REBUILD);
    expect(r.lines).toContain('  package.json');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('rebuilds on a branch commit with a lint edit and a patches/ file, listing the patch and not package.json', () => {
    const { repo } = branchFromT0();
    lintOnly(repo);
    write(repo, 'patches/react-native+0.0.0.patch', 'patch\n');
    commit(repo, T0 + 2 * DAY, 'lint and patch');

    const r = needsBuild(repo, String(T0 + DAY));

    expect(r.lines[0]).toMatch(BRANCH_REBUILD);
    expect(r.lines).toContain('  patches/react-native+0.0.0.patch');
    expect(r.lines).not.toContain('  package.json');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('reads the not-installed line on a lint-only branch when the app is not on the slot', () => {
    const { repo } = branchFromT0();
    lintOnly(repo);
    commit(repo, T0 + 2 * DAY, 'lint');

    const r = needsBuild(repo, String(T0 + DAY), { ADB_STUB_NOT_INSTALLED: '1' });

    expect(r.lines[0]).toMatch(
      new RegExp(`^REBUILD: com\\.moneyapp\\.app is not installed on ${SERIAL}\\. `),
    );
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });
});
