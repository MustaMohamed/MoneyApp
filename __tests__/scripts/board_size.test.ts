import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(path.join(__dirname, '..', '..', 'scripts', 'board_size.mjs')).href;

const PATHS = [
  '.claude/skills/queue/SKILL.md',
  'scripts/board_next.mjs',
  'scripts/board_page/board.js',
  '.claude/skills/ship/SKILL.md',
  '.claude/skills/ship/references/merge.md',
  '.claude/skills/ship/references/battery.md',
  '.claude/skills/ship/references/recheck.md',
  '.claude/skills/ship/references/triage.md',
  '.claude/skills/prep/SKILL.md',
  '.claude/skills/issue-review/SKILL.md',
  '.claude/skills/emulator-verify/SKILL.md',
  '.claude/skills/board/SKILL.md',
  'docs/workflow.md',
  'CLAUDE.md',
];

// The Size line of #642 as its body holds it.
const SIZE_642 =
  '- Size: 14 files outside tests, ~192 lines, at `dc2cb03a`: `.claude/skills/queue/SKILL.md`, `scripts/board_next.mjs`, `scripts/board_page/board.js`, `.claude/skills/ship/SKILL.md`, `.claude/skills/ship/references/merge.md`, `.claude/skills/ship/references/battery.md`, `.claude/skills/ship/references/recheck.md`, `.claude/skills/ship/references/triage.md`, `.claude/skills/prep/SKILL.md`, `.claude/skills/issue-review/SKILL.md`, `.claude/skills/emulator-verify/SKILL.md`, `.claude/skills/board/SKILL.md`, `docs/workflow.md`, `CLAUDE.md`';

const body = (sizeLine: string) =>
  ['## Context', '- Tests: `__tests__/scripts/board_next.test.ts`.', sizeLine, '', '## Links'].join(
    '\n',
  );

const CASES: Record<string, string> = {
  backticked: body(SIZE_642),
  bareSha: body(SIZE_642.replace('at `dc2cb03a`: ', 'at dc2cb03a: ')),
  noAt: body('- Size: 3 files outside tests, ~80 lines'),
  none: body('- Tests: none.'),
  unparsed: body('- Size: several files'),
};

const driver = `
import { bodySize } from ${JSON.stringify(moduleUrl)};
const cases = ${JSON.stringify(CASES)};
const out = {};
for (const [k, text] of Object.entries(cases)) out[k] = bodySize(text);
process.stdout.write(JSON.stringify(out));
`;

function runDriver(): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync('node', ['--input-type=module', '-e', driver], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('bodySize', () => {
  const r = runDriver();
  const out = JSON.parse(r.stdout || '{}') as Record<string, unknown>;

  test('the module loads and the driver exits clean', () => {
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  test('the Size line of #642 gives its files, its lines and its 14 paths in order, no backticks', () => {
    expect(out.backticked).toEqual({ files: 14, lines: 192, paths: PATHS });
  });

  test('the same line with a bare sha gives the same result', () => {
    expect(out.bareSha).toEqual({ files: 14, lines: 192, paths: PATHS });
  });

  test('a Size line with no "at <sha>: " names no paths', () => {
    expect(out.noAt).toEqual({ files: 3, lines: 80, paths: [] });
  });

  test('a body with no Size line is null', () => {
    expect(out).toHaveProperty('none', null);
  });

  test('a Size line with no count is unparsed', () => {
    expect(out.unparsed).toEqual({ unparsed: true });
  });
});
