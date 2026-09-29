import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'scripts', 'board_lease.mjs'),
).href;

const TOUCHED = new Date('2026-09-08T09:30:00Z');

interface Lease {
  number: number;
  skill: string;
  worktree: string;
  touchedAt: string;
  worktreeGone: boolean;
}

function runDriver(dirs: string[]): { status: number | null; stdout: string; stderr: string } {
  const driver = `
import { readLeases } from ${JSON.stringify(moduleUrl)};
process.stdout.write(JSON.stringify(${JSON.stringify(dirs)}.map((d) => readLeases(d))));
`;
  const r = spawnSync('node', ['--input-type=module', '-e', driver], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('readLeases', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'board-lease-'));
  const leases = path.join(root, 'leases');
  const worktree = path.join(root, 'MA-642');
  const gone = path.join(root, 'MA-643');
  fs.mkdirSync(leases);
  fs.mkdirSync(worktree);
  const write = (name: string, text: string) => {
    const file = path.join(leases, name);
    fs.writeFileSync(file, text);
    fs.utimesSync(file, TOUCHED, TOUCHED);
  };
  write('642', `skill=ship\nworktree=${worktree}\ntask=ship-642\n`);
  write('643', `skill=prep\nworktree=${gone}\n`);
  write('notes.txt', 'skill=ship\n');

  const r = runDriver([leases, path.join(root, 'missing')]);
  const [found, missing] = JSON.parse(r.stdout || '[[],[]]') as [Lease[], Lease[]];
  const byNumber = [...found].sort((a, b) => a.number - b.number);

  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  test('the module loads and the driver exits clean', () => {
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  test('a lease whose worktree exists reads its fields and its mtime, and its task line is ignored', () => {
    expect(byNumber[0]).toEqual({
      number: 642,
      skill: 'ship',
      worktree,
      touchedAt: TOUCHED.toISOString(),
      worktreeGone: false,
    });
  });

  test('a lease whose worktree is missing reads worktreeGone', () => {
    expect(byNumber[1]).toEqual({
      number: 643,
      skill: 'prep',
      worktree: gone,
      touchedAt: TOUCHED.toISOString(),
      worktreeGone: true,
    });
  });

  test('a file whose name is not an issue number is skipped', () => {
    expect(found.map((l) => l.number).sort((a, b) => a - b)).toEqual([642, 643]);
  });

  test('a missing folder reads as no leases', () => {
    expect(missing).toEqual([]);
  });
});
