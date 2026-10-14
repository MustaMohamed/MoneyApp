import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const source = path.join(__dirname, '..', '..', 'scripts', 'package_json_scripts_only.mjs');

const INSTALL_SCRIPTS = [
  'preinstall',
  'install',
  'postinstall',
  'prepublish',
  'preprepare',
  'prepare',
  'postprepare',
  'dependencies',
] as const;

const BASE = {
  name: 'fixture',
  version: '1.0.0',
  files: ['dist', 'src'],
  scripts: { lint: 'oxlint', postinstall: 'patch-package' },
  dependencies: { react: '19.0.0', 'react-native': '0.81.0' },
};

const dirs: string[] = [];
let elsewhere = '';

function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

// A hook or a dev shell can export GIT_DIR; it may not reach the temp repos.
function cleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (key.startsWith('GIT_')) delete env[key];
  }
  return env;
}

function git(repo: string, args: string[]): string {
  const r = spawnSync(
    'git',
    ['-c', 'user.email=pkg@test', '-c', 'user.name=pkg', '-c', 'commit.gpgsign=false', ...args],
    { cwd: repo, encoding: 'utf8', env: cleanEnv() },
  );
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function json(value: unknown, indent: number | string = 2): string {
  return `${JSON.stringify(value, null, indent)}\n`;
}

function setPackageJson(repo: string, text: string | undefined): void {
  const file = path.join(repo, 'package.json');
  if (text === undefined) fs.rmSync(file);
  else fs.writeFileSync(file, text);
}

function commit(repo: string): string {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '--no-verify', '-m', 'step']);
  return git(repo, ['rev-parse', 'HEAD']);
}

function newRepo(packageJson: string): string {
  if (!fs.existsSync(source)) throw new Error('missing scripts/package_json_scripts_only.mjs');
  const repo = tempDir('ma191-pkg-');
  git(repo, ['init', '-q', '-b', 'main']);
  fs.mkdirSync(path.join(repo, 'scripts'));
  fs.copyFileSync(source, path.join(repo, 'scripts', 'package_json_scripts_only.mjs'));
  setPackageJson(repo, packageJson);
  commit(repo);
  return repo;
}

// cwd is outside the repo: the script finds its repo from its own path.
function run(repo: string, args: string[]) {
  const r = spawnSync(
    'node',
    [path.join(repo, 'scripts', 'package_json_scripts_only.mjs'), ...args],
    {
      cwd: elsewhere,
      encoding: 'utf8',
      env: cleanEnv(),
      timeout: 10_000,
    },
  );
  return { status: r.status, stdout: r.stdout };
}

function workingTree(base: string, next: string | undefined) {
  const repo = newRepo(base);
  setPackageJson(repo, next);
  return run(repo, ['HEAD']);
}

function lastCommit(first: string, second: string | undefined) {
  const repo = newRepo(first);
  setPackageJson(repo, second);
  commit(repo);
  return run(repo, ['HEAD^1', 'HEAD']);
}

beforeAll(() => {
  elsewhere = tempDir('ma191-cwd-');
});

afterAll(() => {
  for (const dir of dirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('package_json_scripts_only, working tree against HEAD', () => {
  it.each<[string, string]>([
    ['unchanged', json(BASE)],
    ['with lint edited', json({ ...BASE, scripts: { ...BASE.scripts, lint: 'oxlint --fix' } })],
    ['with lint removed', json({ ...BASE, scripts: { postinstall: 'patch-package' } })],
    [
      'with a non-install script added',
      json({ ...BASE, scripts: { ...BASE.scripts, test: 'jest' } }),
    ],
    [
      're-indented with keys reordered at the top and nested',
      json(
        {
          dependencies: { 'react-native': '0.81.0', react: '19.0.0' },
          scripts: { postinstall: 'patch-package', lint: 'oxlint' },
          files: ['dist', 'src'],
          version: '1.0.0',
          name: 'fixture',
        },
        '\t',
      ),
    ],
  ])('exits 0 %s', (_label, next) => {
    expect(workingTree(json(BASE), next)).toEqual({ status: 0, stdout: '' });
  });

  const KINDS = {
    added: (name: string) => [{ lint: 'oxlint' }, { lint: 'oxlint', [name]: 'node a.js' }],
    edited: (name: string) => [
      { lint: 'oxlint', [name]: 'node a.js' },
      { lint: 'oxlint', [name]: 'node b.js' },
    ],
    removed: (name: string) => [{ lint: 'oxlint', [name]: 'node a.js' }, { lint: 'oxlint' }],
  };
  const KIND_NAMES = ['added', 'edited', 'removed'] as const;
  const INSTALL_CASES = INSTALL_SCRIPTS.flatMap((name) =>
    KIND_NAMES.map((kind) => [name, kind] as const),
  );

  it.each(INSTALL_CASES)('exits 1 when the install script %s is %s', (name, kind) => {
    const [before, after] = KINDS[kind](name);

    expect(
      workingTree(json({ ...BASE, scripts: before }), json({ ...BASE, scripts: after })),
    ).toEqual({ status: 1, stdout: '' });
  });

  it.each<[string, string | undefined]>([
    [
      'a dependencies version moved',
      json({ ...BASE, dependencies: { ...BASE.dependencies, react: '19.0.1' } }),
    ],
    ['the files entries swapped', json({ ...BASE, files: ['src', 'dist'] })],
    ['name changed', json({ ...BASE, name: 'other' })],
    ['text that does not parse', '{\n  "name": "fixture",\n'],
    ['the file deleted', undefined],
  ])('exits 1 with %s', (_label, next) => {
    expect(workingTree(json(BASE), next)).toEqual({ status: 1, stdout: '' });
  });

  it('exits 1 when a __proto__ key changes its value', () => {
    expect(
      workingTree(
        '{"name":"fixture","__proto__":{"a":1}}\n',
        '{"name":"fixture","__proto__":{"a":2}}\n',
      ),
    ).toEqual({ status: 1, stdout: '' });
  });
});

describe('package_json_scripts_only, two revisions', () => {
  it('exits 1 for <root>^1 <root>, a side git show cannot read', () => {
    const repo = newRepo(json(BASE));
    const root = git(repo, ['rev-parse', 'HEAD']);

    expect(run(repo, [`${root}^1`, root])).toEqual({ status: 1, stdout: '' });
  });

  it('exits 0 for HEAD^1 HEAD on a lint-only commit', () => {
    expect(
      lastCommit(json(BASE), json({ ...BASE, scripts: { ...BASE.scripts, lint: 'oxlint --fix' } })),
    ).toEqual({ status: 0, stdout: '' });
  });

  it('exits 0 for HEAD^1 HEAD on a commit that removes a scripts block holding only lint', () => {
    const { scripts: _scripts, ...noScripts } = BASE;

    expect(lastCommit(json({ ...BASE, scripts: { lint: 'oxlint' } }), json(noScripts))).toEqual({
      status: 0,
      stdout: '',
    });
  });

  it('exits 1 for HEAD^1 HEAD on a commit that moves a dependency', () => {
    expect(
      lastCommit(
        json(BASE),
        json({ ...BASE, dependencies: { ...BASE.dependencies, react: '19.0.1' } }),
      ),
    ).toEqual({ status: 1, stdout: '' });
  });

  it('exits 1 for HEAD^1 HEAD on a commit that deletes package.json', () => {
    expect(lastCommit(json(BASE), undefined)).toEqual({ status: 1, stdout: '' });
  });

  it('exits 1 with no argument', () => {
    expect(run(newRepo(json(BASE)), [])).toEqual({ status: 1, stdout: '' });
  });
});
