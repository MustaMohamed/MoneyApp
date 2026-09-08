import { spawnSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const script = path.join(repoRoot, 'scripts', 'board_next.mjs');
const fixture = path.join(__dirname, 'fixtures', 'board_next.snapshot.json');

interface Action {
  number: number;
  bucket: string;
  action: string;
  command?: string;
}

function run(...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync('node', [script, '--snapshot', fixture, ...args], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

function actions(...args: string[]): Action[] {
  const r = run('--format', 'json', ...args);
  expect(r.stderr).toBe('');
  expect(r.status).toBe(0);
  return (JSON.parse(r.stdout) as { actions: Action[] }).actions;
}

function byNumber(list: Action[], n: number): Action {
  const found = list.find((a) => a.number === n);
  if (!found) throw new Error(`#${n} missing from the actions`);
  return found;
}

describe('board_next rule table', () => {
  const list = actions();

  const rows: Array<[number, string, string, string | undefined]> = [
    [101, 'yours', 'merge PR #501', undefined],
    [102, 'yours', 'checks red on PR #502', '/ship 102'],
    [103, 'yours', 'no PR: a dispute or a cap', 'read ~/.ship/MoneyApp/MA-103/state.md'],
    [
      112,
      'drift',
      'closed, board says In Review',
      'bash scripts/board.sh status 112 Done && bash scripts/board.sh promote 113',
    ],
    [
      113,
      'drift',
      'every child closed as completed, still open',
      'bash scripts/board.sh promote 113',
    ],
    [
      115,
      'drift',
      'column behind its furthest child (Ready For Development)',
      'bash scripts/board.sh status 115 "Ready For Development"',
    ],
    [118, 'drift', 'has sub-issues at Todo', 'bash scripts/board.sh status 118 Defined'],
    [109, 'drift', 'Ready For Development with Reviewed none', '/issue-review 109'],
    [107, 'drift', 'Planned without a linked branch', '/prep 107 --replan'],
    [105, 'drift', 'In Progress with PR #505 open', '/ship 105'],
    [
      124,
      'drift',
      'Done but the issue is open',
      'close it or bash scripts/board.sh status 124 <column>',
    ],
    [123, 'drift', 'header has no Depends on', 'fix the header line'],
    [130, 'drift', 'milestone issue not on the board', 'bash scripts/board.sh add 130'],
    [
      104,
      'flight',
      'implementing, branch feat/MA-104-implementing, last commit 6h ago, ship state on this machine',
      '/ship 104',
    ],
    [129, 'flight', 'battery running on PR #529, checks pending', '/ship 129'],
    [106, 'pull', 'Planned, branch feat/MA-106-planned', '/ship 106'],
    [108, 'pull', 'pullable', '/prep 108'],
    [110, 'define', 'Defined, Reviewed none', '/issue-review 110'],
    [127, 'define', 'parent unmarked, a child at Defined', '/issue-review 127'],
    [
      117,
      'define',
      'marked, every Depends on closed, promote missed',
      'bash scripts/board.sh promote 117',
    ],
    [120, 'define', 'Todo, deps closed', '/boundaries 120 or /tickets 120'],
    [119, 'define', 'Todo, waits on #108', '/boundaries 119 or /tickets 119'],
    [122, 'define', 'Blocked on #111, closed', 'bash scripts/board.sh status 122 <column>'],
    [114, 'wait', 'marked, waits on #104', undefined],
    [121, 'wait', 'Blocked on #104', undefined],
    [125, 'wait', 'parent, children at Todo lead', undefined],
    [100, 'wait', 'parent, mirrors its children', undefined],
  ];

  test.each(rows)('#%i lands in %s: %s', (n, bucket, action, command) => {
    const a = byNumber(list, n);
    expect([a.bucket, a.action, a.command]).toEqual([bucket, action, command]);
  });

  test('closed issues that are Done, and closed children, are not listed', () => {
    expect(list.map((a) => a.number)).not.toContain(111);
  });

  test('bucket order is yours, drift, flight, pull, define, wait', () => {
    const order = ['yours', 'drift', 'flight', 'pull', 'define', 'wait'];
    const seen = list.map((a) => order.indexOf(a.bucket));
    expect(seen).toEqual([...seen].sort((a, b) => a - b));
  });

  test('a Todo with closed deps sorts before a Todo with open deps', () => {
    const nums = list.map((a) => a.number);
    expect(nums.indexOf(120)).toBeLessThan(nums.indexOf(119));
  });

  test('scoping to a parent keeps its subtree only', () => {
    const scoped = actions('--scope', '115');
    expect(scoped.map((a) => a.number).sort()).toEqual([114, 115, 116].sort());
  });
});

describe('board_next text', () => {
  test('one line per ticket with the command, waits at the bottom', () => {
    const r = run('--format', 'text');
    expect(r.status).toBe(0);
    const lines = r.stdout.split('\n');
    expect(lines).toContain('#101 MA-101 · Awaiting Human · merge PR #501 · yours');
    expect(lines).toContain('#108 MA-108 · Ready For Development · pullable · /prep 108');
    expect(lines).toContain('#114 MA-114 · Defined · marked, waits on #104');
    expect(lines.indexOf('#101 MA-101 · Awaiting Human · merge PR #501 · yours')).toBeLessThan(
      lines.indexOf('#114 MA-114 · Defined · marked, waits on #104'),
    );
  });

  test('json carries the graph decision', () => {
    const r = run('--format', 'json');
    const out = JSON.parse(r.stdout) as {
      graph: boolean;
      openLeaves: number;
      deepestChain: number;
    };
    expect(out.openLeaves).toBeGreaterThan(8);
    expect(out.graph).toBe(true);
  });
});

describe('board_next html', () => {
  test('draws both trees: hierarchy first with dependency lanes, dependency first by wave, one toggle', () => {
    const r = run('--format', 'html');
    expect(r.status).toBe(0);
    const html = r.stdout;
    expect(html.startsWith('<style>')).toBe(true);
    expect(html).not.toContain('<!--');
    expect(html).toContain('id="tg-h"');
    expect(html).toContain('id="tg-d"');
    expect(html).toContain('data-v="h"');
    expect(html).toContain('data-v="d"');
    const hier = html.slice(html.indexOf('id="tg-h"'), html.indexOf('id="tg-d"'));
    const dep = html.slice(html.indexOf('id="tg-d"'));
    expect(hier).toContain('data-i="100"');
    expect(hier).toContain('data-i="115"');
    expect(hier).toContain('data-i="108"');
    expect(hier).toContain('data-f="108" data-t="119"');
    expect(hier).toContain('data-f="104" data-t="114"');
    expect(hier).not.toContain('data-i="111"');
    expect(dep).toContain('Can start now');
    expect(dep).toContain('After 1 close');
    const x = (frag: string, n: number) =>
      Number(
        new RegExp(
          `data-i="${n}"[^>]*><title>[^<]*</title><rect class="card[^"]*" x="([\\d.]+)"`,
        ).exec(frag)?.[1],
      );
    expect(x(dep, 119)).toBeGreaterThan(x(dep, 108));
    expect(x(hier, 119)).toBe(x(hier, 108));
    expect(html).toContain(`onclick="sendPrompt('/prep 108')"`);
    expect(html).toContain('>PR #501<');
  });
});
