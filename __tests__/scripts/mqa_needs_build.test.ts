import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const mqaSh = path.join(repoRoot, '.claude', 'skills', 'emulator-verify', 'mqa.sh');
const adbStub = path.join(__dirname, 'fixtures', 'mqa_adb_stub.sh');

const SERIAL = 'emulator-5554';
const DAY = 86_400;
const T0 = 1_790_000_000;

const dirs: string[] = [];
let stubBin = '';
let leaseDir = '';
let workDir = '';

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

// A hook or a dev shell can export GIT_DIR or MQA_SERIAL; neither may reach the temp repos.
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_') || key.startsWith('MQA_')) delete env[key];
  }
  return env;
}

function git(repo: string, args: string[], epoch?: number): string {
  const env = cleanEnv();
  if (epoch !== undefined) {
    env.GIT_AUTHOR_DATE = `@${epoch} +0000`;
    env.GIT_COMMITTER_DATE = `@${epoch} +0000`;
  }
  const r = spawnSync(
    'git',
    ['-c', 'user.email=mqa@test', '-c', 'user.name=mqa', '-c', 'commit.gpgsign=false', ...args],
    { cwd: repo, encoding: 'utf8', env },
  );
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function write(repo: string, file: string, text: string): void {
  fs.mkdirSync(path.dirname(path.join(repo, file)), { recursive: true });
  fs.writeFileSync(path.join(repo, file), text);
}

function commit(repo: string, epoch: number, message: string): string {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '--no-verify', '-m', message], epoch);
  return git(repo, ['rev-parse', 'HEAD']);
}

function newRepo(): string {
  const repo = tempDir('ma178-repo-');
  git(repo, ['init', '-q', '-b', 'main']);
  write(repo, '.claude/skills/emulator-verify/mqa.sh', fs.readFileSync(mqaSh, 'utf8'));
  return repo;
}

function needsBuild(repo: string, apkTime: string) {
  const env = cleanEnv();
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

afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

const BASE_REBUILD = new RegExp(
  `^REBUILD: main changed the native surface in ([0-9a-f]{4,40}), and the APK on ${SERIAL} predates it\\.`,
);
const BASE_REUSE = new RegExp(
  `^REUSE: no native surface change since main, and the APK on ${SERIAL} was installed after its newest one, ([0-9a-f]{4,40}); this branch reaches the device over Metro\\.$`,
);

describe('mqa needs-build, base side', () => {
  it("rebuilds when the APK is a day older than the newest native-surface commit on main, listing that commit's files", () => {
    const r = needsBuild(nativeRepo, String(T0 - DAY));

    expect(r.lines[0]).toMatch(BASE_REBUILD);
    expect(nativeSha.startsWith(BASE_REBUILD.exec(r.lines[0])?.[1] ?? '-')).toBe(true);
    expect(r.lines[1]).toBe('  package.json');
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it('reuses when the APK is a day newer than that commit, naming it', () => {
    const r = needsBuild(nativeRepo, String(T0 + DAY));

    const match = BASE_REUSE.exec(r.lines[0]);
    expect(match).not.toBeNull();
    expect(nativeSha.startsWith(match?.[1] ?? '-')).toBe(true);
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('');
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

    expect(r.lines[0]).toMatch(BASE_REBUILD);
    expect(nativeSha.startsWith(BASE_REBUILD.exec(r.lines[0])?.[1] ?? '-')).toBe(true);
    expect(r.status).toBe(0);
    expect(r.stderr).toBe('');
  });

  it("reuses an APK newer than the fork's native commit when main gained a native commit after the fork", () => {
    const r = needsBuild(forkedRepo, String(T0 + 2 * DAY));

    const match = BASE_REUSE.exec(r.lines[0]);
    expect(match).not.toBeNull();
    expect(forkedSha.startsWith(match?.[1] ?? '-')).toBe(true);
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('');
  });

  it('names the native commit when it also touches a path starting with @', () => {
    const r = needsBuild(atPathRepo, String(T0 + DAY));

    const match = BASE_REUSE.exec(r.lines[0]);
    expect(match).not.toBeNull();
    expect(atPathSha.startsWith(match?.[1] ?? '-')).toBe(true);
    expect(r.status).toBe(1);
    expect(r.stderr).toBe('');
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
});
