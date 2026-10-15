import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const dirs: string[] = [];

export function tempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  dirs.push(dir);
  return dir;
}

export function removeTempDirs(): void {
  for (const dir of dirs.splice(0)) fs.rmSync(dir, { recursive: true, force: true });
}

// A hook or a dev shell can export GIT_DIR, or a variable under another named prefix; none may reach the temp repos.
export function cleanEnv(...prefixes: string[]): NodeJS.ProcessEnv {
  const env = { ...process.env };
  for (const key of Object.keys(env)) {
    if (['GIT_', ...prefixes].some((prefix) => key.startsWith(prefix))) delete env[key];
  }
  return env;
}

export function git(repo: string, args: string[], epoch?: number): string {
  const env = cleanEnv();
  if (epoch !== undefined) {
    env.GIT_AUTHOR_DATE = `@${epoch} +0000`;
    env.GIT_COMMITTER_DATE = `@${epoch} +0000`;
  }
  const r = spawnSync(
    'git',
    ['-c', 'user.email=test@test', '-c', 'user.name=test', '-c', 'commit.gpgsign=false', ...args],
    { cwd: repo, encoding: 'utf8', env },
  );
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

export function commit(repo: string, epoch?: number, message = 'step'): string {
  git(repo, ['add', '-A']);
  git(repo, ['commit', '-q', '--no-verify', '-m', message], epoch);
  return git(repo, ['rev-parse', 'HEAD']);
}
