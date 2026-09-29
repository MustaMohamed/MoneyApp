import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const boardSh = path.join(repoRoot, 'scripts', 'board.sh');
const ghStub = path.join(__dirname, 'fixtures', 'board_sh_gh_stub.sh');

interface Comment {
  id: number;
  html_url: string;
  body: string;
}

const COMMENT_URL = 'https://github.com/MustaMohamed/MoneyApp/issues/146#issuecomment-';

const comment = (id: number, body: string): Comment => ({
  id,
  html_url: `${COMMENT_URL}${id}`,
  body,
});

const OPEN = comment(9001, 'Question: open\nAsks: Which screen owns the tally?\nLeft: Defined');
const OPEN_CRLF = comment(
  9001,
  'Question: open\r\nAsks: Which screen owns the tally?\r\nLeft: Defined',
);
const ANSWERED = comment(
  9002,
  'Question: answered 2026-09-29\nAnswer: A\nAsks: Which column does the tally sit in?',
);
const QUOTED = comment(9003, 'Blocked on #104\nQuestion: open, quoted on a later line');
const SECOND_OPEN = comment(9004, 'Question: open\nAsks: Which rounding does the tally use?');
const EPIC_OPEN: Comment = {
  id: 9005,
  html_url: 'https://github.com/MustaMohamed/MoneyApp/issues/639#issuecomment-9005',
  body: 'Question: open\nAsks: Which cut does the epic follow?\nLeft: Defined',
};

const REVIEWED =
  'Part of #639 · Depends on MA-100 (#600) · Verify none · Flags none · Reviewed 2026-09-29';
const UNREVIEWED =
  'Part of #639 · Depends on MA-100 (#600) · Verify none · Flags none · Reviewed none';
const REVIEWED_NO_DEPS =
  'Part of #639 · Depends on nothing · Verify none · Flags none · Reviewed 2026-09-29';

const refusal = (c: Comment): string =>
  `#146: open question ${c.html_url}, skipped; /queue asks answers it`;

interface Leaf {
  status: string;
  header: string;
  comments: Comment[] | undefined;
  epic?: { status: string; comments: Comment[] | undefined };
}

const stubDirs: string[] = [];

function leafBody(header: string): string {
  return [
    header,
    '',
    '## Task Definition',
    'A fixture leaf under an epic.',
    '',
    '## Context',
    '- Size: 2 files outside tests, ~120 lines, at `dc2cb03a`: `scripts/board.sh`, `docs/workflow.md`',
    '',
  ].join('\n');
}

const boardItem = (id: string, number: number, status: string) => ({
  id,
  content: { number },
  fieldValueByName: { name: status },
});

// Epic 639 carries the `epic` label, so it is a marked parent; leaf 146 depends on 600, which is closed.
function stubBoard(leaf: Leaf): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ma146-gh-stub-'));
  stubDirs.push(dir);
  fs.copyFileSync(ghStub, path.join(dir, 'gh'));
  fs.chmodSync(path.join(dir, 'gh'), 0o755);
  const body = leafBody(leaf.header);
  const milestone = { title: 'Unattended delivery' };
  const epic = leaf.epic ?? { status: 'In Progress', comments: [] };
  const files: Record<string, unknown> = {
    'issues_639.json': {
      number: 639,
      state: 'open',
      state_reason: null,
      body: 'Unattended delivery · Reviewed 2026-09-29\n\n## Goal\nAn epic.',
      milestone,
      labels: [{ name: 'epic' }],
    },
    'issues_639_sub_issues.json': [{ number: 146, state: 'open', state_reason: null, body }],
    'issues_146.json': {
      number: 146,
      state: 'open',
      state_reason: null,
      body,
      milestone,
      labels: [],
    },
    'issues_146_sub_issues.json': [],
    'issues_600.json': {
      number: 600,
      state: 'closed',
      state_reason: 'completed',
      body: 'Part of #639 · Depends on nothing · Verify none · Flags none · Reviewed 2026-09-20',
    },
    'issue_list.json': [],
    'board_items.json': [
      {
        data: {
          node: {
            items: {
              pageInfo: { hasNextPage: false, endCursor: null },
              nodes: [
                boardItem('PVTI_146', 146, leaf.status),
                boardItem('PVTI_639', 639, epic.status),
                boardItem('PVTI_600', 600, 'Done'),
              ],
            },
          },
        },
      },
    ],
  };
  if (epic.comments) files['issues_639_comments.json'] = epic.comments;
  if (leaf.comments) files['issues_146_comments.json'] = leaf.comments;
  for (const [name, value] of Object.entries(files)) {
    fs.writeFileSync(path.join(dir, name), JSON.stringify(value));
  }
  return dir;
}

function lines(dir: string, name: string): string[] {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
}

function run(dir: string, ...args: string[]) {
  const r = spawnSync('bash', [boardSh, ...args], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 20_000,
    env: {
      ...process.env,
      PATH: `${dir}${path.delimiter}${String(process.env.PATH)}`,
      GH_STUB_DIR: dir,
      GH_TOKEN: 'board-promote-test-no-network',
      GITHUB_TOKEN: 'board-promote-test-no-network',
    },
  });
  const calls = lines(dir, 'calls.jsonl').map((l) => JSON.parse(l) as string[]);
  return {
    status: r.status,
    stdout: r.stdout,
    stderr: r.stderr,
    unhandled: lines(dir, 'unhandled.log'),
    missing: lines(dir, 'missing.log'),
    statusWrites: calls
      .filter((c) => c.some((a) => a.includes('updateProjectV2ItemFieldValue')))
      .map((c) => c.find((a) => a.startsWith('item='))?.slice('item='.length)),
  };
}

afterAll(() => {
  for (const dir of stubDirs) fs.rmSync(dir, { recursive: true, force: true });
});

describe('board.sh questions', () => {
  it('prints one line per open record: the CRLF record, not the answered one or a later-line quote', () => {
    const dir = stubBoard({
      status: 'Defined',
      header: REVIEWED,
      comments: [OPEN_CRLF, ANSWERED, QUOTED],
    });

    const r = run(dir, 'questions', '146');

    expect(r.unhandled).toEqual([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toBe(`9001 ${OPEN_CRLF.html_url}\n`);
  });
});

describe('board.sh promote', () => {
  it('refuses a Defined leaf with a Reviewed date, closed deps and Size within the gate while a record is open, naming each open record', () => {
    const dir = stubBoard({
      status: 'Defined',
      header: REVIEWED,
      comments: [OPEN, ANSWERED, SECOND_OPEN],
    });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.status).toBe(0);
    const stderr = r.stderr.split('\n');
    expect(stderr).toContain(refusal(OPEN));
    expect(stderr).toContain(refusal(SECOND_OPEN));
    expect(r.stderr).not.toContain(ANSWERED.html_url);
    expect(r.stdout).toContain('promoted 0, skipped 1');
    expect(r.statusWrites).toEqual([]);
  });

  it('promotes the same leaf once its record is answered', () => {
    const dir = stubBoard({
      status: 'Defined',
      header: REVIEWED,
      comments: [ANSWERED, QUOTED],
    });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.status).toBe(0);
    expect(r.stderr).not.toContain('open question');
    expect(r.stdout).toContain('promoted 1, skipped 0');
    expect(r.statusWrites).toContain('PVTI_146');
  });

  it.each([
    ['parked by /issue-review: Defined, Reviewed none', 'Defined', UNREVIEWED],
    ['parked by /prep: Blocked, with a Reviewed date', 'Blocked', REVIEWED],
  ])('names the open record on a leaf %s', (_label, status, header) => {
    const dir = stubBoard({ status, header, comments: [OPEN] });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.status).toBe(0);
    expect(r.stderr.split('\n')).toContain(refusal(OPEN));
    expect(r.stdout).toContain('promoted 0, skipped 1');
    expect(r.statusWrites).toEqual([]);
  });

  it('skips a leaf whose comments cannot be read, and writes no status', () => {
    const dir = stubBoard({ status: 'Defined', header: REVIEWED, comments: undefined });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.missing).toEqual(['issues_146_comments.json']);
    expect(r.stderr.split('\n')).toContain('#146: could not read its comments, skipped');
    expect(r.stdout).toContain('promoted 0, skipped 1');
    expect(r.statusWrites).toEqual([]);
  });

  it('promotes no child of, and does not lift, a Defined epic with an open record', () => {
    const dir = stubBoard({
      status: 'Defined',
      header: REVIEWED_NO_DEPS,
      comments: [],
      epic: { status: 'Defined', comments: [EPIC_OPEN] },
    });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.status).toBe(0);
    expect(r.stderr.split('\n')).toContain(
      `#146: parent #639 has an open question ${EPIC_OPEN.html_url}, skipped; /queue asks answers it`,
    );
    expect(r.stdout).toContain('promoted 0, skipped 1');
    expect(r.statusWrites).toEqual([]);
  });

  it('does not lift a Defined epic with an open record whose child already sits at Ready For Development', () => {
    const dir = stubBoard({
      status: 'Ready For Development',
      header: REVIEWED_NO_DEPS,
      comments: [],
      epic: { status: 'Defined', comments: [EPIC_OPEN] },
    });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.missing).toEqual([]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('promoted 0, skipped 0');
    expect(r.statusWrites).toEqual([]);
  });

  it('exits 1 when the parent comments cannot be read, and writes no status', () => {
    const dir = stubBoard({
      status: 'Defined',
      header: REVIEWED,
      comments: [],
      epic: { status: 'In Progress', comments: undefined },
    });

    const r = run(dir, 'promote', '639');

    expect(r.unhandled).toEqual([]);
    expect(r.status).toBe(1);
    expect(r.stderr.split('\n')).toContain('board.sh: could not read the comments of #639');
    expect(r.missing).toEqual(['issues_639_comments.json']);
    expect(r.statusWrites).toEqual([]);
  });
});
