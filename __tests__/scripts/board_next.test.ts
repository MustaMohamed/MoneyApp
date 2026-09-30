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
  actor?: string;
  runnable?: boolean;
  rank?: number;
  unblocks?: number;
  frees?: number[];
  waitsOn?: number[];
  reviewed?: string | null;
  pr?: { number: number; state: string; url: string } | null;
  progress?: { total: number; closed: number; open: number[] } | null;
  questions?: number;
  lease?: 'held' | 'stale' | null;
  leaseSkill?: string | null;
  paths?: string[];
  queue?: 'Defined' | 'Ready For Development' | 'Planned' | null;
}

interface TreeModel {
  leaves: Array<{
    n: number;
    blockers: Array<{ n: number; parent: boolean }>;
    pill: { text: string; kind: string; click: string } | null;
    parent: number | null;
  }>;
  parents: Array<{ n: number; root: boolean; depth: number; done: number; kids: number }>;
}

function htmlPage(): string {
  const r = run('--format', 'html');
  expect(r.status).toBe(0);
  return r.stdout;
}

function treeModel(html = htmlPage()): TreeModel {
  const json =
    /<script type="application\/json" id="tg-model">([^]*?)<\/script>/.exec(html)?.[1] ?? '{}';
  return JSON.parse(json) as TreeModel;
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
    [
      143,
      'yours',
      'Blocked on a ruling from /prep',
      'bash scripts/board.sh status 143 "Ready For Development"',
    ],
    [146, 'yours', '1 open question', '/queue asks'],
    [147, 'yours', '2 open questions', '/queue asks'],
    [149, 'yours', '1 open question', '/queue asks'],
    [102, 'yours', 'checks red on PR #502', '/ship 102'],
    [103, 'drift', 'Awaiting Human without a PR', '/ship 103'],
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
    [
      109,
      'drift',
      'Ready For Development with Reviewed none',
      'bash scripts/board.sh status 109 Defined',
    ],
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
    [141, 'define', 'marked, no Size line', '/issue-review 141'],
    [142, 'define', 'over the size gate, 14 files, ~520 lines', '/tickets 142'],
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
    [144, 'wait', 'Blocked on #104', undefined],
    [145, 'wait', 'Blocked on #104', undefined],
    [125, 'wait', 'parent, children at Todo lead', undefined],
    [100, 'wait', 'parent, mirrors its children', undefined],
    [131, 'wait', 'parent, mirrors its children', undefined],
  ];

  test.each(rows)('#%i lands in %s: %s', (n, bucket, action, command) => {
    const a = byNumber(list, n);
    expect([a.bucket, a.action, a.command]).toEqual([bucket, action, command]);
  });

  test('an answered record counts for nothing: the ticket follows its column', () => {
    const a = byNumber(list, 148);
    expect([a.bucket, a.action, a.command]).toEqual([
      'define',
      'Defined, Reviewed none',
      '/issue-review 148',
    ]);
    expect(a.questions).toBe(0);
  });

  test('a parent at In Progress whose one open child /ship parked at Blocked mirrors its children', () => {
    const a = byNumber(list, 156);
    expect([a.bucket, a.action, a.command]).toEqual([
      'wait',
      'parent, mirrors its children',
      undefined,
    ]);
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

  test('a ticket with an open record reads as yours, with /queue asks', () => {
    const lines = run('--format', 'text').stdout.split('\n');
    expect(lines).toContain('#146 MA-146 · Defined · 1 open question · /queue asks');
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
  test('ships the tree model and the runtime that lays it out at the container width', () => {
    const html = htmlPage();
    expect(html.startsWith('<style>')).toBe(true);
    expect(html).not.toContain('<!--');
    expect(html).toContain('data-v="h"');
    expect(html).toContain('data-v="d"');
    expect(html).toContain('data-theme="dark"');
    const model = treeModel(html);
    const leaf = (n: number) => model.leaves.find((l) => l.n === n);
    expect(model.leaves.map((l) => l.n)).not.toContain(111);
    expect(leaf(119)?.blockers).toEqual([{ n: 108, parent: false }]);
    expect(leaf(114)?.blockers).toEqual([{ n: 104, parent: false }]);
    expect(leaf(121)?.blockers).toEqual([{ n: 104, parent: false }]);
    expect(leaf(108)?.pill?.click).toBe("sendPrompt('/prep 108')");
    expect(leaf(101)?.pill?.text).toBe('PR #501');
    expect(leaf(116)?.parent).toBe(115);
    const p = (n: number) => model.parents.find((x) => x.n === n);
    expect(p(100)?.root).toBe(true);
    expect(p(115)).toMatchObject({ root: false, depth: 1, kids: 2, done: 0 });
    expect(p(113)).toMatchObject({ kids: 1, done: 1 });
    expect(html).toContain('r.clientWidth');
    expect(html).toContain('ResizeObserver');
  });

  test('a card with an open record carries the /queue asks pill', () => {
    const leaf = treeModel().leaves.find((l) => l.n === 146);
    expect(leaf?.pill).toMatchObject({ text: '/queue asks', kind: 'you' });
  });

  test('a card Blocked on a ruling carries the column its command sets, not a ship state pill', () => {
    const leaf = treeModel().leaves.find((l) => l.n === 143);
    expect(leaf?.pill).toMatchObject({ text: 'set Ready For Development', kind: 'you' });
  });

  test('a Blocked on #m comment older than the last five draws no blocker', () => {
    const leaf = treeModel().leaves.find((l) => l.n === 151);
    expect(leaf?.blockers).toEqual([]);
  });
});

describe('board_next card fields', () => {
  const list = actions();

  test('a parent with an open child never gets a close command from a merged PR that names it', () => {
    const a = byNumber(list, 131);
    expect(a.command).toBeUndefined();
    expect(a.actor).toBe('nobody');
  });

  test('who acts: a merge is yours, a skill is a session, board.sh is the page, a wait is nobody', () => {
    expect(byNumber(list, 101).actor).toBe('you');
    expect(byNumber(list, 108).actor).toBe('session');
    expect(byNumber(list, 120).actor).toBe('you');
    expect(byNumber(list, 113).actor).toBe('page');
    expect(byNumber(list, 114).actor).toBe('nobody');
  });

  test('only a literal board.sh command is runnable from the page', () => {
    expect(byNumber(list, 113).runnable).toBe(true);
    expect(byNumber(list, 122).runnable).toBe(false);
    expect(byNumber(list, 108).runnable).toBe(false);
  });

  test('frees and waits on mirror each other, and the rank puts what frees the most first', () => {
    expect(byNumber(list, 108).frees).toEqual([119]);
    expect(byNumber(list, 119).waitsOn).toEqual([108]);
    expect(byNumber(list, 114).rank).toBeUndefined();
    const ranked = list
      .filter((a) => a.rank !== undefined)
      .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0));
    expect(ranked.map((a) => a.rank)).toEqual(ranked.map((_, i) => i + 1));
    const freeing = ranked.filter((a) => (a.unblocks ?? 0) > 0).length;
    expect(ranked.slice(0, freeing).every((a) => (a.unblocks ?? 0) > 0)).toBe(true);
  });

  test('an open record is yours to answer from a session, never run from the page', () => {
    const a = byNumber(list, 146);
    expect({ actor: a.actor, runnable: a.runnable, questions: a.questions }).toEqual({
      actor: 'you',
      runnable: false,
      questions: 1,
    });
    expect(byNumber(list, 147).questions).toBe(2);
  });

  test('a card gets its PR, its review date and a parent its progress', () => {
    expect(byNumber(list, 101).pr).toMatchObject({ number: 501, state: 'OPEN' });
    expect(byNumber(list, 109).reviewed).toBe('none');
    expect(byNumber(list, 115).progress).toEqual({ total: 2, closed: 0, open: [114, 116] });
  });

  test('next names the first ticket for you, for a session and for the page', () => {
    const out = JSON.parse(run('--format', 'json').stdout) as {
      next: Record<string, number | null>;
    };
    expect(out.next.you).toBe(101);
    expect(typeof out.next.session).toBe('number');
    expect(typeof out.next.page).toBe('number');
  });
});

describe('board_next leases and the queue column', () => {
  const list = actions();

  test('a Planned leaf whose lease is held is in flight with no command, and nobody acts on it', () => {
    const a = byNumber(list, 152);
    expect({
      bucket: a.bucket,
      action: a.action,
      command: a.command,
      actor: a.actor,
      queue: a.queue,
      lease: a.lease,
      leaseSkill: a.leaseSkill,
    }).toEqual({
      bucket: 'flight',
      action: 'ship running, lease held',
      command: undefined,
      actor: 'nobody',
      queue: null,
      lease: 'held',
      leaseSkill: 'ship',
    });
  });

  test.each([
    [153, 'prep', 'last written 3 hours before the snapshot'],
    [154, 'issue-review', 'its worktree is gone'],
  ])('#%i with a stale %s lease (%s) is drift with the rm command, never queued', (n, skill) => {
    const a = byNumber(list, n);
    expect(a.action).toMatch(new RegExp(`^stale lease, ${skill}, last write `));
    expect({
      bucket: a.bucket,
      command: a.command,
      queue: a.queue,
      lease: a.lease,
      leaseSkill: a.leaseSkill,
    }).toEqual({
      bucket: 'drift',
      command: `rm ~/.ship/MoneyApp/queue/leases/${n}`,
      queue: null,
      lease: 'stale',
      leaseSkill: skill,
    });
  });

  test('a ticket with ship state on this machine and no lease queues from Planned', () => {
    const a = byNumber(list, 104);
    expect({ actor: a.actor, queue: a.queue, lease: a.lease, leaseSkill: a.leaseSkill }).toEqual({
      actor: 'session',
      queue: 'Planned',
      lease: null,
      leaseSkill: null,
    });
  });

  test('In Progress or In Review with no ship state on this machine is held: nobody acts, and it is not queued', () => {
    for (const n of [105, 129]) {
      const a = byNumber(list, n);
      expect({ n, actor: a.actor, queue: a.queue }).toEqual({ n, actor: 'nobody', queue: null });
    }
  });

  test('a pullable leaf queues from Ready For Development and an unreviewed Defined leaf from Defined', () => {
    expect(byNumber(list, 108).queue).toBe('Ready For Development');
    expect(byNumber(list, 110).queue).toBe('Defined');
  });

  test('a Defined leaf with Reviewed none and an open Depends on is not queued', () => {
    const a = byNumber(list, 155);
    expect([a.command, a.actor]).toEqual(['/issue-review 155', 'session']);
    expect(a.queue).toBeNull();
  });

  test('a Planned leaf whose command is a replan is not queued', () => {
    const a = byNumber(list, 107);
    expect([a.command, a.actor]).toEqual(['/prep 107 --replan', 'session']);
    expect(a.queue).toBeNull();
  });

  test('a leaf with an open question record is not queued', () => {
    const a = byNumber(list, 146);
    expect(a.questions).toBe(1);
    expect(a.queue).toBeNull();
  });

  test('a parent is never queued, even with a session command', () => {
    const a = byNumber(list, 127);
    expect([a.bucket, a.command, a.actor]).toEqual(['define', '/issue-review 127', 'session']);
    expect(a.queue).toBeNull();
  });

  test('paths are the Size paths the snapshot holds, and empty without them', () => {
    expect(byNumber(list, 152).paths).toEqual(['scripts/board_next.mjs', 'docs/workflow.md']);
    expect(byNumber(list, 108).paths).toEqual([]);
    expect(byNumber(list, 110).paths).toEqual([]);
  });

  test('a Defined leaf under a parent that reads Reviewed none is not queued, since the review cannot mark it', () => {
    for (const n of [128, 150]) {
      const a = byNumber(list, n);
      expect({ n, command: a.command, queue: a.queue }).toEqual({
        n,
        command: `/issue-review ${n}`,
        queue: null,
      });
    }
  });
});
