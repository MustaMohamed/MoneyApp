// The leases runs hold on tickets, one file per issue number, .claude/skills/queue/SKILL.md § Lease.
import fs from 'node:fs';
import path from 'node:path';

/** @param {string} dir @returns {{ number: number, skill: string, worktree: string, touchedAt: string, worktreeGone: boolean }[]} */
export function readLeases(dir) {
  let names = [];
  try {
    names = fs.readdirSync(dir).filter((f) => /^\d+$/.test(f));
  } catch {
    return [];
  }
  return names.flatMap((f) => {
    const file = path.join(dir, f);
    let text = '';
    let mtime = new Date(0);
    try {
      text = fs.readFileSync(file, 'utf8');
      mtime = fs.statSync(file).mtime;
    } catch (err) {
      // A run that ends between the listing and the read has removed its lease.
      if (!fs.existsSync(file)) return [];
      throw err;
    }
    const field = (key) => new RegExp(`^${key}=(.*)$`, 'm').exec(text)?.[1].trim() ?? '';
    const worktree = field('worktree');
    return [
      {
        number: Number(f),
        skill: field('skill'),
        worktree,
        touchedAt: mtime.toISOString(),
        worktreeGone: !worktree || !fs.existsSync(worktree),
      },
    ];
  });
}
