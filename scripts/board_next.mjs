#!/usr/bin/env node
// Read-only view of Project #2: every open ticket, its dependencies, and the next action per the CLAUDE.md transition table. board.sh stays the only writer.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const OWNER = 'MustaMohamed';
const NAME = 'MoneyApp';
const REPO = `${OWNER}/${NAME}`;
const PROJECT_ID = 'PVT_kwHOAPEDM84BiHOr';
const ISSUE_URL = `https://github.com/${REPO}/issues/`;
const COLUMNS = [
  'Todo',
  'Defined',
  'Ready For Development',
  'Planned',
  'In Progress',
  'In Review',
  'Awaiting Human',
  'Done',
];
const BUCKETS = ['yours', 'drift', 'flight', 'pull', 'define', 'wait'];
const BUCKET_LABEL = {
  yours: 'yours',
  drift: 'drift',
  flight: 'in flight',
  pull: 'pullable',
  define: 'define',
  wait: 'waiting',
};

function parseArgs(argv) {
  const opts = { format: 'text', snapshot: '', save: '', scope: null };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--format') opts.format = argv[++i];
    else if (a === '--snapshot') opts.snapshot = argv[++i];
    else if (a === '--save') opts.save = argv[++i];
    else if (a === '--scope') opts.scope = Number(argv[++i]);
    else if (a === '--help' || a === '-h') {
      process.stdout.write(
        'usage: node scripts/board_next.mjs [--format text|json|html] [--scope <issue>] [--snapshot <file>] [--save <file>]\n',
      );
      process.exit(0);
    } else {
      process.stderr.write(`board_next: unknown argument ${a}\n`);
      process.exit(2);
    }
  }
  if (!['text', 'json', 'html'].includes(opts.format)) {
    process.stderr.write(`board_next: unknown format ${opts.format}\n`);
    process.exit(2);
  }
  return opts;
}

function gh(args) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function graphql(query, variables = {}) {
  const args = ['api', 'graphql', '-f', `query=${query}`];
  for (const [k, v] of Object.entries(variables))
    args.push(v === null ? '-F' : '-f', `${k}=${v === null ? 'null' : v}`);
  const out = JSON.parse(gh(args));
  if (out.errors?.length) throw new Error(out.errors.map((e) => e.message).join('; '));
  return out.data;
}

const ISSUE_FIELDS = `number title state stateReason body milestone { title } labels(first: 10) { nodes { name } }
  parent { number } subIssues(first: 100) { nodes { number state stateReason } }
  linkedBranches(first: 5) { nodes { ref { name target { ... on Commit { committedDate } } } } }
  closedByPullRequestsReferences(first: 5) { nodes { number state merged isDraft reviewDecision updatedAt
    commits(last: 1) { nodes { commit { statusCheckRollup { state } } } } } }
  comments(last: 5) { nodes { body } }`;

function normalizeIssue(c) {
  return {
    number: c.number,
    title: c.title,
    state: c.state.toLowerCase(),
    stateReason: c.stateReason ? c.stateReason.toLowerCase() : null,
    labels: (c.labels?.nodes ?? []).map((l) => l.name),
    milestone: c.milestone?.title ?? null,
    header: (c.body ?? '').split('\n')[0].trim(),
    parent: c.parent?.number ?? null,
    children: (c.subIssues?.nodes ?? []).map((s) => ({
      number: s.number,
      state: s.state.toLowerCase(),
      stateReason: s.stateReason ? s.stateReason.toLowerCase() : null,
    })),
    branches: (c.linkedBranches?.nodes ?? []).map((b) => ({
      name: b.ref?.name,
      committedDate: b.ref?.target?.committedDate ?? null,
    })),
    prs: (c.closedByPullRequestsReferences?.nodes ?? []).map((p) => ({
      number: p.number,
      state: p.state,
      checks: p.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state ?? 'NONE',
      reviewDecision: p.reviewDecision ?? null,
      updatedAt: p.updatedAt,
    })),
    comments: (c.comments?.nodes ?? []).map((k) => k.body),
  };
}

function fetchSnapshot() {
  const items = [];
  let cursor = null;
  do {
    const data = graphql(
      `query($id: ID!, $cursor: String) { node(id: $id) { ... on ProjectV2 { items(first: 100, after: $cursor) {
        pageInfo { hasNextPage endCursor }
        nodes { fieldValueByName(name: "Status") { ... on ProjectV2ItemFieldSingleSelectValue { name } } content { ... on Issue { ${ISSUE_FIELDS} } } } } } } }`,
      { id: PROJECT_ID, cursor },
    );
    const page = data.node.items;
    for (const n of page.nodes) {
      if (!n.content?.number) continue;
      items.push({ status: n.fieldValueByName?.name ?? null, ...normalizeIssue(n.content) });
    }
    cursor = page.pageInfo.hasNextPage ? page.pageInfo.endCursor : null;
  } while (cursor);

  const onBoard = new Set(items.map((i) => i.number));
  const offBoard = [];
  cursor = null;
  do {
    const data = graphql(
      `
        query ($owner: String!, $name: String!, $cursor: String) {
          repository(owner: $owner, name: $name) {
            issues(states: OPEN, first: 100, after: $cursor) {
              pageInfo {
                hasNextPage
                endCursor
              }
              nodes {
                number
                title
                state
                body
                milestone {
                  title
                }
                parent {
                  number
                }
              }
            }
          }
        }
      `,
      { owner: OWNER, name: NAME, cursor },
    );
    for (const n of data.repository.issues.nodes) {
      if (onBoard.has(n.number) || !n.milestone) continue;
      offBoard.push({
        number: n.number,
        title: n.title,
        state: 'open',
        milestone: n.milestone.title,
        header: (n.body ?? '').split('\n')[0].trim(),
        parent: n.parent?.number ?? null,
      });
    }
    cursor = data.repository.issues.pageInfo.hasNextPage
      ? data.repository.issues.pageInfo.endCursor
      : null;
  } while (cursor);

  const known = new Set([...onBoard, ...offBoard.map((i) => i.number)]);
  const missing = new Set();
  for (const it of [...items, ...offBoard]) {
    for (const d of headerDeps(it.header).deps) if (!known.has(d)) missing.add(d);
    for (const m of blockedOn(it.comments ?? [])) if (!known.has(m)) missing.add(m);
  }
  const extra = {};
  const nums = [...missing];
  for (let i = 0; i < nums.length; i += 50) {
    const slice = nums.slice(i, i + 50);
    const q = slice.map((n) => `i${n}: issue(number: ${n}) { number state stateReason }`).join(' ');
    const data = graphql(`query { repository(owner: "${OWNER}", name: "${NAME}") { ${q} } }`);
    for (const v of Object.values(data.repository)) {
      if (v)
        extra[v.number] = {
          number: v.number,
          state: v.state.toLowerCase(),
          stateReason: v.stateReason?.toLowerCase() ?? null,
        };
    }
  }

  let shipState = [];
  try {
    shipState = fs
      .readdirSync(path.join(os.homedir(), '.ship', 'MoneyApp'))
      .filter((d) => /^MA-\d+$/.test(d));
  } catch {
    shipState = [];
  }
  return { fetchedAt: new Date().toISOString(), shipState, items, offBoard, extra };
}

function headerDeps(header) {
  const m = /Depends on (.*)$/.exec(header ?? '');
  if (!m) return { has: false, deps: [], unparsed: false };
  const field = m[1].split(' · ')[0].trim();
  if (field === 'nothing') return { has: true, deps: [], unparsed: false };
  const deps = [...field.matchAll(/#(\d+)/g)].map((x) => Number(x[1]));
  return { has: true, deps, unparsed: deps.length === 0 };
}

function headerReviewed(header) {
  const m = /Reviewed (\S+)/.exec(header ?? '');
  return m ? m[1] : null;
}

function blockedOn(comments) {
  const out = [];
  for (const c of comments)
    for (const m of c.matchAll(/Blocked on #(\d+)/g)) out.push(Number(m[1]));
  return out;
}

function maId(item) {
  const m = /^(MA-\d+)/.exec(item.title ?? '');
  return m ? m[1] : clip(item.title ?? `#${item.number}`, 32);
}

function inStandard(item) {
  return /^MA-\d+/.test(item.title ?? '') || /^Part of #\d+/.test(item.header ?? '');
}

function age(from, to) {
  const ms = new Date(to).getTime() - new Date(from).getTime();
  const h = Math.floor(ms / 3_600_000);
  if (h < 1) return `${Math.max(0, Math.floor(ms / 60_000))}m ago`;
  if (h < 48) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function columnIndex(status) {
  return COLUMNS.indexOf(status);
}

function expectedParentColumn(item, ctx) {
  const open = item.children.filter((c) => c.state === 'open');
  const closedAny = item.children.length > open.length;
  const cols = open.map((c) => ctx.statusOf(c.number)).filter((s) => s && s !== 'Blocked');
  const idx = cols.map(columnIndex);
  if (closedAny || idx.some((i) => i >= columnIndex('In Progress'))) return 'In Progress';
  if (idx.some((i) => i >= columnIndex('Ready For Development'))) return 'Ready For Development';
  return 'Defined';
}

function decide(item, ctx) {
  const n = item.number;
  const ma = maId(item);
  const openPr = (item.prs ?? []).find((p) => p.state === 'OPEN');
  const mergedPr = (item.prs ?? []).find((p) => p.state === 'MERGED');
  const isParent = (item.children ?? []).length > 0;
  const isEpic = (item.labels ?? []).includes('epic');
  const hd = headerDeps(item.header);
  const reviewed = headerReviewed(item.header);
  const openDeps = hd.deps.filter((d) => !ctx.isClosed(d));
  const waits = openDeps.map((d) => `#${d}`).join(', ');
  const parentCmd = item.parent ? ` && bash scripts/board.sh promote ${item.parent}` : '';

  if (item.offBoard)
    return {
      bucket: 'drift',
      action: 'milestone issue not on the board',
      command: `bash scripts/board.sh add ${n}`,
    };
  if (item.state === 'closed') {
    if (item.status === 'Done') return null;
    return {
      bucket: 'drift',
      action: `closed, board says ${item.status}`,
      command: `bash scripts/board.sh status ${n} Done${parentCmd}`,
    };
  }
  if (item.status === 'Done')
    return {
      bucket: 'drift',
      action: 'Done but the issue is open',
      command: `close it or bash scripts/board.sh status ${n} <column>`,
    };
  if (mergedPr && !openPr)
    return {
      bucket: 'drift',
      action: `PR #${mergedPr.number} merged, issue still open`,
      command: `gh issue close ${n} --reason completed${parentCmd}`,
    };

  if (item.status === 'Awaiting Human') {
    if (!openPr)
      return {
        bucket: 'yours',
        action: 'no PR: a dispute or a cap',
        command: `read ~/.ship/MoneyApp/${ma}/state.md`,
      };
    if (openPr.checks === 'SUCCESS')
      return { bucket: 'yours', action: `merge PR #${openPr.number}` };
    if (openPr.checks === 'PENDING' || openPr.checks === 'EXPECTED')
      return { bucket: 'yours', action: `checks pending on PR #${openPr.number}` };
    return { bucket: 'yours', action: `checks red on PR #${openPr.number}`, command: `/ship ${n}` };
  }

  if (isParent) {
    const open = item.children.filter((c) => c.state === 'open');
    if (open.length === 0) {
      const completed = item.children.every((c) => !c.stateReason || c.stateReason === 'completed');
      if (completed)
        return {
          bucket: 'drift',
          action: 'every child closed as completed, still open',
          command: `bash scripts/board.sh promote ${n}`,
        };
      return { bucket: 'wait', action: 'parent, a child closed as not planned; closes by hand' };
    }
    const expected = expectedParentColumn(item, ctx);
    if (item.status !== 'Blocked' && item.status !== expected) {
      const quoted = expected.includes(' ') ? `"${expected}"` : expected;
      const cmd = `bash scripts/board.sh status ${n} ${quoted}`;
      if (item.status === 'Todo')
        return { bucket: 'drift', action: 'has sub-issues at Todo', command: cmd };
      const dir = columnIndex(item.status) < columnIndex(expected) ? 'behind' : 'ahead of';
      return {
        bucket: 'drift',
        action: `column ${dir} its furthest child (${expected})`,
        command: cmd,
      };
    }
    const childCols = open.map((c) => ctx.statusOf(c.number));
    if (
      !isEpic &&
      reviewed === 'none' &&
      childCols.some((s) => s && s !== 'Todo' && s !== 'Blocked')
    ) {
      return {
        bucket: 'define',
        action: 'parent unmarked, a child at Defined',
        command: `/issue-review ${n}`,
        rank: 0,
      };
    }
    if (childCols.every((s) => s === 'Todo'))
      return { bucket: 'wait', action: 'parent, children at Todo lead' };
    return { bucket: 'wait', action: 'parent, mirrors its children' };
  }

  const standard = !isEpic && inStandard(item);
  if (standard && !hd.has)
    return { bucket: 'drift', action: 'header has no Depends on', command: 'fix the header line' };
  if (standard && hd.unparsed)
    return { bucket: 'drift', action: 'Depends on has no (#N)', command: 'fix the header line' };

  if (item.status === 'Blocked') {
    const on = blockedOn(item.comments ?? []);
    if (on.length === 0) return { bucket: 'wait', action: 'Blocked, no "Blocked on #m" comment' };
    const stillOpen = on.filter((m) => !ctx.isClosed(m));
    if (stillOpen.length)
      return { bucket: 'wait', action: `Blocked on ${stillOpen.map((m) => `#${m}`).join(', ')}` };
    return {
      bucket: 'define',
      action: `Blocked on ${on.map((m) => `#${m}`).join(', ')}, closed`,
      command: `bash scripts/board.sh status ${n} <column>`,
      rank: 1,
    };
  }

  if (item.status === 'Ready For Development') {
    if (reviewed === 'none' || reviewed === null)
      return {
        bucket: 'drift',
        action: 'Ready For Development with Reviewed none',
        command: `/issue-review ${n}`,
      };
    if (openDeps.length)
      return {
        bucket: 'drift',
        action: `Ready For Development with ${waits} open`,
        command: `/issue-review ${n}`,
      };
    return { bucket: 'pull', action: 'pullable', command: `/prep ${n}` };
  }

  if (item.status === 'Planned') {
    const br = (item.branches ?? [])[0];
    if (!br)
      return {
        bucket: 'drift',
        action: 'Planned without a linked branch',
        command: `/prep ${n} --replan`,
      };
    return { bucket: 'pull', action: `Planned, branch ${br.name}`, command: `/ship ${n}` };
  }

  if (item.status === 'In Progress') {
    if (openPr)
      return {
        bucket: 'drift',
        action: `In Progress with PR #${openPr.number} open`,
        command: `/ship ${n}`,
      };
    const br = (item.branches ?? [])[0];
    const parts = ['implementing'];
    if (br) parts.push(`branch ${br.name}`);
    if (br?.committedDate) parts.push(`last commit ${age(br.committedDate, ctx.fetchedAt)}`);
    parts.push(
      ctx.shipState.has(ma) ? 'ship state on this machine' : 'no ship state on this machine',
    );
    return { bucket: 'flight', action: parts.join(', '), command: `/ship ${n}` };
  }

  if (item.status === 'In Review') {
    if (!openPr)
      return { bucket: 'drift', action: 'In Review without a PR', command: `/ship ${n}` };
    const checks =
      openPr.checks === 'SUCCESS'
        ? 'green'
        : openPr.checks === 'PENDING' || openPr.checks === 'EXPECTED'
          ? 'pending'
          : openPr.checks === 'NONE'
            ? 'none'
            : 'red';
    return {
      bucket: 'flight',
      action: `battery running on PR #${openPr.number}, checks ${checks}`,
      command: `/ship ${n}`,
    };
  }

  if (item.status === 'Defined') {
    if (reviewed === 'none' || reviewed === null)
      return {
        bucket: 'define',
        action: 'Defined, Reviewed none',
        command: `/issue-review ${n}`,
        rank: 0,
      };
    if (openDeps.length) return { bucket: 'wait', action: `marked, waits on ${waits}` };
    return {
      bucket: 'define',
      action: 'marked, every Depends on closed, promote missed',
      command: `bash scripts/board.sh promote ${n}`,
      rank: 0,
    };
  }

  if (item.status === 'Todo') {
    const cmd = `/boundaries ${n} or /tickets ${n}`;
    if (openDeps.length)
      return { bucket: 'define', action: `Todo, waits on ${waits}`, command: cmd, rank: 2 };
    return { bucket: 'define', action: 'Todo, deps closed', command: cmd, rank: 1 };
  }

  return {
    bucket: 'drift',
    action: `unknown board column ${item.status ?? '(none)'}`,
    command: `bash scripts/board.sh status ${n} <column>`,
  };
}

function buildContext(snapshot) {
  const byNumber = new Map();
  snapshot.items.forEach((it, i) => byNumber.set(it.number, { ...it, boardIndex: i }));
  (snapshot.offBoard ?? []).forEach((it, i) =>
    byNumber.set(it.number, {
      ...it,
      offBoard: true,
      boardIndex: 10_000 + i,
      children: [],
      comments: [],
      prs: [],
      branches: [],
    }),
  );
  const childState = new Map();
  for (const it of snapshot.items) for (const c of it.children ?? []) childState.set(c.number, c);
  const extra = snapshot.extra ?? {};
  return {
    fetchedAt: snapshot.fetchedAt,
    shipState: new Set(snapshot.shipState ?? []),
    byNumber,
    statusOf: (n) => byNumber.get(n)?.status ?? null,
    isClosed: (n) => {
      const it = byNumber.get(n);
      if (it) return it.state === 'closed';
      if (childState.has(n)) return childState.get(n).state === 'closed';
      if (extra[n]) return extra[n].state === 'closed';
      return false;
    },
  };
}

function scopeSet(ctx, root) {
  if (root === null || Number.isNaN(root)) return null;
  const keep = new Set([root]);
  const queue = [root];
  while (queue.length) {
    const n = queue.shift();
    for (const c of ctx.byNumber.get(n)?.children ?? [])
      if (!keep.has(c.number)) {
        keep.add(c.number);
        queue.push(c.number);
      }
  }
  return keep;
}

function analyze(snapshot, scope) {
  const ctx = buildContext(snapshot);
  const keep = scopeSet(ctx, scope);
  const actions = [];
  for (const it of ctx.byNumber.values()) {
    if (keep && !keep.has(it.number)) continue;
    const d = decide(it, ctx);
    if (!d) continue;
    actions.push({
      number: it.number,
      ma: maId(it),
      title: it.title,
      status: it.offBoard ? null : it.status,
      state: it.state,
      parent: it.parent ?? null,
      isParent: (it.children ?? []).length > 0,
      deps: headerDeps(it.header).deps.map((d2) => ({ number: d2, closed: ctx.isClosed(d2) })),
      bucket: d.bucket,
      action: d.action,
      command: d.command,
      rank: d.rank ?? 0,
      boardIndex: it.boardIndex,
    });
  }
  actions.sort(
    (a, b) =>
      BUCKETS.indexOf(a.bucket) - BUCKETS.indexOf(b.bucket) ||
      a.rank - b.rank ||
      a.boardIndex - b.boardIndex,
  );

  const openNodes = actions.filter((a) => a.state === 'open');
  const openSet = new Set(openNodes.map((a) => a.number));
  const depth = new Map();
  const depthOf = (n, seen = new Set()) => {
    if (depth.has(n)) return depth.get(n);
    if (seen.has(n)) return 0;
    seen.add(n);
    const it = ctx.byNumber.get(n);
    const ds = headerDeps(it?.header).deps.filter((d) => openSet.has(d));
    const v = ds.length ? 1 + Math.max(...ds.map((d) => depthOf(d, seen))) : 0;
    depth.set(n, v);
    return v;
  };
  let deepestChain = 0;
  for (const a of openNodes) deepestChain = Math.max(deepestChain, depthOf(a.number));
  const openLeaves = openNodes.filter((a) => !a.isParent).length;
  for (const a of actions) a.rank = undefined;
  return {
    fetchedAt: snapshot.fetchedAt,
    scope: scope ?? null,
    openLeaves,
    deepestChain,
    graph: openLeaves > 8 || deepestChain >= 2,
    actions,
    ctx,
  };
}

function localStamp(iso) {
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function textReport(result) {
  const counts = Object.fromEntries(
    BUCKETS.map((b) => [b, result.actions.filter((a) => a.bucket === b).length]),
  );
  const lines = [
    `Board ${localStamp(result.fetchedAt)} · ${result.actions.length} listed · ${BUCKETS.map((b) => `${counts[b]} ${BUCKET_LABEL[b]}`).join(' · ')}`,
  ];
  for (const b of BUCKETS) {
    const rows = result.actions.filter((a) => a.bucket === b);
    if (!rows.length) continue;
    lines.push('', BUCKET_LABEL[b]);
    for (const a of rows) {
      const col = a.status ?? 'off board';
      const tail = a.command ? ` · ${a.command}` : b === 'yours' ? ' · yours' : '';
      lines.push(`#${a.number} ${a.ma} · ${col} · ${a.action}${tail}`);
    }
  }
  return `${lines.join('\n')}\n`;
}

function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function clip(s, max) {
  return s.length <= max ? s : `${s.slice(0, Math.max(0, max - 1))}…`;
}

const SHORT = {
  'Ready For Development': 'Ready',
  'Awaiting Human': 'Awaiting you',
  'In Progress': 'In progress',
  'In Review': 'In review',
};

function shortStatus(status) {
  return SHORT[status] ?? status ?? 'Off board';
}

function shortTitle(a) {
  return (a.title ?? '').replace(/^MA-\d+\s+—\s+/, '');
}

function rowId(a) {
  return /^MA-\d+/.test(a.title ?? '') ? maId(a) : `#${a.number}`;
}

const FRIENDLY = [
  [/^Todo, deps closed$/, 'nothing blocks it'],
  [/^Todo$/, 'nothing blocks it'],
  [/^Defined, Reviewed none$/, 'not reviewed yet'],
  [/^pullable$/, 'reviewed, unblocked'],
  [/^Planned, branch .*$/, 'planned, branch ready'],
  [/^marked$/, 'reviewed, waiting'],
  [/^marked, every Depends on closed, promote missed$/, 'reviewed, promote missed'],
  [/^parent unmarked, a child at Defined$/, 'parent not reviewed yet'],
  [/^parent, mirrors its children$/, ''],
  [/^parent, children at Todo lead$/, ''],
];

function friendly(action) {
  const base = action.replace(/,? ?waits on #\d+(, #\d+)*/, '').trim();
  for (const [re, text] of FRIENDLY) if (re.test(base)) return text;
  return base;
}

const FIX_COLOR = '#D85A30';

function pillLabel(a) {
  const cmd = a.command ?? '';
  if (a.bucket === 'yours') {
    const pr = /PR #(\d+)/.exec(a.action);
    if (pr)
      return {
        text: `PR #${pr[1]}`,
        kind: 'you',
        click: `openLink('https://github.com/${REPO}/pull/${pr[1]}')`,
      };
    return { text: 'read ship state', kind: 'you', click: `sendPrompt('${esc(cmd)}')` };
  }
  if (a.bucket === 'drift') {
    let text = 'fix';
    let m;
    if ((m = /board\.sh status \d+ (.+)$/.exec(cmd))) text = `set ${m[1].replace(/"/g, '')}`;
    else if (/board\.sh promote/.test(cmd)) text = 'promote';
    else if (/board\.sh add/.test(cmd)) text = 'add to board';
    else if (/^gh issue close/.test(cmd)) text = 'close issue';
    else if (/^\//.test(cmd)) text = cmd.replace(/ \d+/, '');
    else if (/header/.test(cmd)) text = 'fix header';
    const runnable = /^(\/|bash |gh )/.test(cmd);
    return {
      text,
      kind: 'fix',
      click: runnable ? `sendPrompt('${esc(cmd)}')` : `openLink('${ISSUE_URL}${a.number}')`,
    };
  }
  if (!cmd) return null;
  if (cmd.startsWith('/')) {
    const first = cmd.split(' or ')[0];
    return {
      text: first.replace(/ \d+.*$/, ''),
      kind: 'run',
      click: `sendPrompt('${esc(first)}')`,
    };
  }
  return {
    text: cmd.replace(/^bash scripts\/board\.sh /, '').replace(/ \d+/, ''),
    kind: 'run',
    click: `sendPrompt('${esc(cmd)}')`,
  };
}

const TREE_CSS = `.tg{font-family:var(--font-sans);color:var(--text-primary)}
.tg-bar{display:flex;align-items:center;gap:8px;padding:2px 0 8px;font-size:13px;color:var(--text-secondary)}
.tg-bar .sp{flex:1}
.tg-btn{font:inherit;font-size:12px;font-weight:500;padding:3px 10px;border-radius:var(--radius);border:0.5px solid var(--border-strong);background:var(--surface-2);color:var(--text-secondary);cursor:pointer}
.tg-btn.on{border-color:var(--border-accent);background:var(--bg-accent);color:var(--text-accent)}
.tg svg{display:block;width:100%;height:auto}
.tg [hidden]{display:none}
.tg text{font-family:var(--font-sans)}
.tg .id{font-size:13px;font-weight:500;fill:var(--text-primary)}
.tg .st{font-size:11px;fill:var(--text-secondary)}
.tg .tt{font-size:12px;fill:var(--text-secondary)}
.tg .why{font-size:11px;fill:var(--text-muted)}
.tg .tag{font-size:11px;fill:var(--text-muted)}
.tg .card{fill:var(--surface-2);stroke:var(--border-strong);stroke-width:0.5}
.tg .card.run{stroke:var(--border-accent)}.tg .card.you{stroke:var(--border-warning)}.tg .card.fix{stroke:var(--border-danger)}.tg .card.done{opacity:0.6}
.tg .edge{fill:none;stroke:var(--border-accent);stroke-width:3;opacity:0.9}
.tg .edge.you{stroke:var(--border-warning)}.tg .edge.fix{stroke:var(--border-danger)}.tg .edge.wait{stroke:var(--border);opacity:1}.tg .edge.done{stroke:var(--border-success)}
.tg .tree{fill:none;stroke:var(--border-strong);stroke-width:1.2}
.tg .dep{fill:none;stroke:var(--text-secondary);stroke-width:1.4;stroke-dasharray:5 4}
.tg .dep.hi{stroke:var(--text-accent);stroke-width:2.2;stroke-dasharray:none}
.tg .hd{fill:var(--text-secondary)}
.tg .pill{stroke-width:0.5}.tg .pill.run{fill:var(--bg-accent);stroke:var(--border-accent)}.tg .pill.you{fill:var(--bg-warning);stroke:var(--border-warning)}.tg .pill.fix{fill:var(--bg-danger);stroke:var(--border-danger)}
.tg .pt{font-size:11px;font-weight:500}.tg .pt.run{fill:var(--text-accent)}.tg .pt.you{fill:var(--text-warning)}.tg .pt.fix{fill:var(--text-danger)}
.tg .node{cursor:pointer}
.tg .node.lo{opacity:0.35}
.tg .grp{fill:var(--surface-1);stroke:var(--border-strong);stroke-width:0.5}
.tg .grp.fix{stroke:var(--border-danger)}
.tg .gl{font-size:12px;font-weight:500;fill:var(--text-primary)}.tg .gs{font-size:11px;fill:var(--text-muted)}
.tg .col{font-size:11px;fill:var(--text-muted)}
.tg .key{font-size:11px;fill:var(--text-muted)}`;

const TREE_SCRIPT = `(function(){var r=document.getElementById('tg-root');if(!r)return;var h=document.getElementById('tg-hw'),d=document.getElementById('tg-dw');var bs=r.querySelectorAll('.tg-btn');for(var i=0;i<bs.length;i++){bs[i].addEventListener('click',function(){var v=this.getAttribute('data-v');h.hidden=v!=='h';d.hidden=v!=='d';for(var j=0;j<bs.length;j++)bs[j].classList.toggle('on',bs[j]===this);});}
function mark(id){var ps=r.querySelectorAll('.dep');var rel={};for(var k=0;k<ps.length;k++){var p=ps[k];var on=!!id&&(p.getAttribute('data-f')===id||p.getAttribute('data-t')===id);p.classList.toggle('hi',on);if(on){rel[p.getAttribute('data-f')]=1;rel[p.getAttribute('data-t')]=1;}}
var ns=r.querySelectorAll('.node[data-i]');for(var m=0;m<ns.length;m++){var n=ns[m],nid=n.getAttribute('data-i');n.classList.toggle('lo',!!id&&nid!==id&&!rel[nid]&&n.getAttribute('data-dim')==='1');}}
r.addEventListener('mouseover',function(e){var t=e.target;while(t&&t!==r&&!(t.classList&&t.classList.contains('node')))t=t.parentNode;mark(t&&t!==r?t.getAttribute('data-i'):null);});
r.addEventListener('mouseleave',function(){mark(null);});})();`;

const CARD_H = 80;
const PITCH = 104;

function cardKind(a) {
  if (!a) return 'wait';
  if (a.state === 'closed') return 'done';
  if (a.bucket === 'drift') return 'fix';
  if (a.bucket === 'yours') return 'you';
  if (a.command) return 'run';
  return 'wait';
}

function whyOf(a, blockerNames) {
  const f = friendly(a.action);
  const parts = [];
  if (f && !(blockerNames.length && /nothing blocks it|unblocked/.test(f))) parts.push(f);
  if (blockerNames.length) parts.push(`after ${blockerNames.join(', ')}`);
  return parts.join(', ');
}

function cardSvg(x, y, w, a, opts) {
  const kind = cardKind(a);
  const pill = kind === 'done' ? null : pillLabel(a);
  const pillW = pill ? Math.max(56, Math.round(pill.text.length * 6.2 + 14)) : 0;
  const titleChars = Math.floor((w - 22) / 6.1);
  const whyChars = Math.floor((w - 22) / 5.5);
  const click = pill ? pill.click : `openLink('${ISSUE_URL}${a.number}')`;
  const dim = kind === 'wait' || kind === 'done' ? '0' : '1';
  const tip = `${rowId(a)} ${shortTitle(a)}. ${a.status ?? ''}. ${a.action}${a.command ? `. Next: ${a.command}` : ''}`;
  return (
    `<g class="node" data-i="${a.number}" data-dim="${dim}" onclick="${click}"><title>${esc(tip)}</title>` +
    `<rect class="card ${kind}" x="${x}" y="${y}" width="${w}" height="${CARD_H}" rx="6"/><path class="edge ${kind}" d="M${x + 2} ${y + 6} L${x + 2} ${y + CARD_H - 6}"/>` +
    `<text class="id" x="${x + 12}" y="${y + 19}">${esc(rowId(a))}</text><text class="st" x="${x + w - 10}" y="${y + 19}" text-anchor="end">${esc(shortStatus(a.status))}</text>` +
    `<text class="tt" x="${x + 12}" y="${y + 36}">${esc(clip(opts.title ?? shortTitle(a), titleChars))}</text>` +
    `<text class="why" x="${x + 12}" y="${y + 52}">${esc(clip(opts.why ?? '', whyChars))}</text>` +
    (pill
      ? `<rect class="pill ${pill.kind}" x="${x + 10}" y="${y + 58}" width="${pillW}" height="18" rx="9"/><text class="pt ${pill.kind}" x="${x + 10 + pillW / 2}" y="${y + 71}" text-anchor="middle">${esc(pill.text)}</text>`
      : '') +
    (opts.tag
      ? `<text class="tag" x="${x + w - 10}" y="${y + 71}" text-anchor="end">${esc(opts.tag)}</text>`
      : '') +
    `</g>`
  );
}

function groupSvg(x, y, w, lines, opts) {
  const kind = opts.fix ? ' fix' : '';
  const pill = opts.a && opts.a.command ? pillLabel(opts.a) : null;
  const pillW = pill ? Math.max(56, Math.round(pill.text.length * 6.2 + 14)) : 0;
  const click = pill ? pill.click : opts.n ? `openLink('${ISSUE_URL}${opts.n}')` : '';
  const chars = Math.floor((w - 20) / 6.1);
  const charsS = Math.floor((w - 20) / 5.5);
  return (
    `<g class="node"${opts.n ? ` data-i="${opts.n}" data-dim="0"` : ''}${click ? ` onclick="${click}"` : ''}>${opts.tip ? `<title>${esc(opts.tip)}</title>` : ''}` +
    `<rect class="grp${kind}" x="${x}" y="${y}" width="${w}" height="${CARD_H}" rx="6"/>` +
    `<text class="gl" x="${x + 10}" y="${y + 19}">${esc(clip(lines[0], chars))}</text>` +
    `<text class="tt" x="${x + 10}" y="${y + 36}">${esc(clip(lines[1] ?? '', chars))}</text>` +
    `<text class="gs" x="${x + 10}" y="${y + 52}">${esc(clip(lines[2] ?? '', charsS))}</text>` +
    (pill
      ? `<rect class="pill ${pill.kind}" x="${x + 10}" y="${y + 58}" width="${pillW}" height="18" rx="9"/><text class="pt ${pill.kind}" x="${x + 10 + pillW / 2}" y="${y + 71}" text-anchor="middle">${esc(pill.text)}</text>`
      : `<text class="gs" x="${x + 10}" y="${y + 71}">${esc(clip(lines[3] ?? '', charsS))}</text>`) +
    `</g>`
  );
}

function elbow(x1, y1, xb, x2, y2) {
  return `M${x1} ${y1} L${xb} ${y1} L${xb} ${y2} L${x2} ${y2}`;
}

function treeReport(result) {
  const { ctx } = result;
  const inScope = new Map(result.actions.map((x) => [x.number, x]));
  const leaves = result.actions.filter((x) => x.state === 'open' && !x.isParent);
  const leafSet = new Set(leaves.map((x) => x.number));
  const parents = result.actions.filter((x) => x.isParent);
  const parentSet = new Set(parents.map((x) => x.number));
  const roots = parents.filter((p) => !(p.parent && parentSet.has(p.parent)));
  const rootSet = new Set(roots.map((r) => r.number));
  const parentOf = (n) => {
    const p = ctx.byNumber.get(n)?.parent ?? null;
    return p && parentSet.has(p) ? p : null;
  };
  const blockersOf = (n) => {
    const a = inScope.get(n);
    const it = ctx.byNumber.get(n);
    const out = [];
    for (const dd of a?.deps ?? []) {
      if (dd.closed) continue;
      if (leafSet.has(dd.number)) out.push({ n: dd.number, parent: false });
      else if (parentSet.has(dd.number) && !rootSet.has(dd.number))
        out.push({ n: dd.number, parent: true });
    }
    for (const m of blockedOn(it?.comments ?? []))
      if (leafSet.has(m) && !ctx.isClosed(m) && !out.some((o) => o.n === m))
        out.push({ n: m, parent: false });
    return out;
  };
  const nameOf = (n) => {
    const a = inScope.get(n);
    return a ? rowId(a) : `#${n}`;
  };
  const kindCount = (b) => leaves.filter((x) => x.bucket === b).length;
  const runnable = kindCount('flight') + kindCount('pull') + kindCount('define');
  const needs = result.actions.filter((x) => x.bucket === 'yours' || x.bucket === 'drift').length;
  const waiting = kindCount('wait');
  const marker = (id) =>
    `<defs><marker id="${id}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="hd" d="M1 1L9 5L1 9z"/></marker></defs>`;

  const hier = (() => {
    const depthOf = (n) => {
      let dpt = 0;
      let cur = parentOf(n);
      while (cur) {
        dpt += 1;
        cur = parentOf(cur);
      }
      return dpt;
    };
    const maxParentDepth = Math.max(0, ...parents.map((p) => depthOf(p.number)));
    const leafCol = maxParentDepth + 1;
    const colX = (col) => (col === 0 ? 20 : 170 + (col - 1) * 170);
    const colW = (col) => (col === 0 ? 110 : 130);
    const leafX = colX(leafCol);
    const leafW = 230;
    const laneX0 = leafX + leafW + 16;
    const rows = [];
    const placedParents = [];
    const orderLeaves = (pn) => leaves.filter((l) => parentOf(l.number) === pn);
    const childParents = (pn) =>
      parents.filter((p) => parentOf(p.number) === pn).sort((x, y) => x.boardIndex - y.boardIndex);
    const walk = (pn, col) => {
      const start = rows.length;
      for (const cp of childParents(pn)) walk(cp.number, col + 1);
      for (const l of orderLeaves(pn)) rows.push({ kind: 'leaf', a: l, y: 0 });
      const it = ctx.byNumber.get(pn);
      const closed = (it?.children ?? []).filter((k) => k.state === 'closed');
      if (closed.length) rows.push({ kind: 'done', parent: pn, closed, y: 0 });
      const end = rows.length - 1;
      if (end < start) rows.push({ kind: 'empty', parent: pn, y: 0 });
      placedParents.push({ n: pn, col, start, end: Math.max(end, start) });
    };
    for (const r of roots.sort((x, y) => x.boardIndex - y.boardIndex)) walk(r.number, 0);
    const stray = leaves.filter((l) => !parentOf(l.number));
    let strayGroup = null;
    if (stray.length) {
      const start = rows.length;
      for (const l of stray) rows.push({ kind: 'leaf', a: l, y: 0 });
      strayGroup = { start, end: rows.length - 1 };
    }
    const top = 44;
    rows.forEach((r, i) => {
      r.y = top + i * PITCH;
    });
    const cy = (r) => r.y + CARD_H / 2;
    let svg = '';
    for (const pp of placedParents) {
      const a = inScope.get(pp.n);
      const it = ctx.byNumber.get(pp.n);
      const kids = it?.children ?? [];
      const done = kids.filter((k) => k.state === 'closed').length;
      const y = (cy(rows[pp.start]) + cy(rows[pp.end])) / 2 - CARD_H / 2;
      pp.y = y;
      const x = colX(pp.col);
      const w = colW(pp.col);
      const lines = [
        rowId(a),
        shortTitle(a),
        `${shortStatus(a.status)}, ${done} of ${kids.length} done`,
        friendly(a.action),
      ];
      svg += groupSvg(x, y, w, lines, {
        n: pp.n,
        a,
        fix: a.bucket === 'drift',
        tip: `${rowId(a)} ${shortTitle(a)}. ${a.status}. ${a.action}`,
      });
      const xb = x + w + 20;
      const ys = [];
      for (const cp of placedParents)
        if (parentOf(cp.n) === pp.n) ys.push({ x: colX(cp.col), y: cp.y + CARD_H / 2 });
      for (let i = pp.start; i <= pp.end; i += 1) {
        const r = rows[i];
        if (
          (r.kind === 'leaf' && parentOf(r.a.number) === pp.n) ||
          (r.kind === 'done' && r.parent === pp.n)
        )
          ys.push({ x: leafX, y: cy(r) });
      }
      if (ys.length) {
        const ymin = Math.min(...ys.map((o) => o.y), y + CARD_H / 2);
        const ymax = Math.max(...ys.map((o) => o.y), y + CARD_H / 2);
        svg += `<path class="tree" d="M${x + w} ${y + CARD_H / 2} L${xb} ${y + CARD_H / 2} M${xb} ${ymin} L${xb} ${ymax}${ys.map((o) => ` M${xb} ${o.y} L${o.x} ${o.y}`).join('')}"/>`;
      }
    }
    if (strayGroup) {
      const y = (cy(rows[strayGroup.start]) + cy(rows[strayGroup.end])) / 2 - CARD_H / 2;
      svg += groupSvg(colX(0), y, colW(0), ['No parent', '', `${stray.length} open`, ''], {});
      const xb = colX(0) + colW(0) + 20;
      const ys = [];
      for (let i = strayGroup.start; i <= strayGroup.end; i += 1) ys.push(cy(rows[i]));
      svg += `<path class="tree" d="M${colX(0) + colW(0)} ${y + CARD_H / 2} L${xb} ${y + CARD_H / 2} M${xb} ${Math.min(...ys, y + CARD_H / 2)} L${xb} ${Math.max(...ys, y + CARD_H / 2)}${ys.map((yy) => ` M${xb} ${yy} L${leafX} ${yy}`).join('')}"/>`;
    }
    const rowOf = new Map();
    rows.forEach((r) => {
      if (r.kind === 'leaf') rowOf.set(r.a.number, r);
    });
    for (const r of rows) {
      if (r.kind === 'leaf') {
        const bs = blockersOf(r.a.number);
        svg += cardSvg(leafX, r.y, leafW, r.a, {
          why: whyOf(
            r.a,
            bs.map((o) => (o.parent ? `${nameOf(o.n)} closes` : nameOf(o.n))),
          ),
        });
      } else if (r.kind === 'done') {
        const ids = r.closed.map((k) => {
          const it = ctx.byNumber.get(k.number);
          return it ? rowId(it) : `#${k.number}`;
        });
        const fake = {
          number: r.closed[0].number,
          title: '',
          status: 'Done',
          state: 'closed',
          action: '',
          bucket: 'wait',
          deps: [],
        };
        svg += `<g class="node" data-dim="0" onclick="openLink('${ISSUE_URL}${r.parent}')"><rect class="card done" x="${leafX}" y="${r.y}" width="${leafW}" height="${CARD_H}" rx="6"/><path class="edge done" d="M${leafX + 2} ${r.y + 6} L${leafX + 2} ${r.y + CARD_H - 6}"/><text class="id" x="${leafX + 12}" y="${r.y + 19}">${r.closed.length} done</text><text class="st" x="${leafX + leafW - 10}" y="${r.y + 19}" text-anchor="end">Done</text><text class="tt" x="${leafX + 12}" y="${r.y + 36}">${esc(clip(ids.join(', '), 34))}</text></g>`;
        void fake;
      } else if (r.kind === 'empty') {
        svg += `<text class="why" x="${leafX + 12}" y="${r.y + 44}">no open tickets</text>`;
      }
    }
    const edges = [];
    for (const l of leaves)
      for (const b of blockersOf(l.number))
        edges.push({ from: b.n, to: l.number, parent: b.parent });
    const touches = new Map();
    const touch = (n, other) => {
      if (!touches.has(n)) touches.set(n, []);
      touches.get(n).push(other);
    };
    for (const e of edges) {
      if (!e.parent) touch(e.from, e.to);
      touch(e.to, e.from);
    }
    const portY = (n, other) => {
      const r = rowOf.get(n);
      const list = [...new Set(touches.get(n) ?? [])].sort(
        (p, q) =>
          (rowOf.get(p)?.y ?? placedParents.find((pp) => pp.n === p)?.y ?? 0) -
          (rowOf.get(q)?.y ?? placedParents.find((pp) => pp.n === q)?.y ?? 0),
      );
      const i = list.indexOf(other);
      return cy(r) + (i - (list.length - 1) / 2) * 10;
    };
    const rightEdges = edges
      .filter((e) => !e.parent && rowOf.has(e.from) && rowOf.has(e.to))
      .sort(
        (p, q) =>
          Math.abs(cy(rowOf.get(p.to)) - cy(rowOf.get(p.from))) -
          Math.abs(cy(rowOf.get(q.to)) - cy(rowOf.get(q.from))),
      );
    const laneStep = Math.max(
      7,
      Math.min(14, Math.floor((666 - laneX0) / Math.max(1, rightEdges.length))),
    );
    let dsvg = '';
    rightEdges.forEach((e, i) => {
      const lx = laneX0 + i * laneStep;
      const y1 = portY(e.from, e.to);
      const y2 = portY(e.to, e.from);
      dsvg += `<path class="dep" data-f="${e.from}" data-t="${e.to}" marker-end="url(#tga)" d="M${leafX + leafW} ${y1} L${lx} ${y1} L${lx} ${y2} L${leafX + leafW + 2} ${y2}"/>`;
    });
    const parentEdges = edges.filter((e) => e.parent && rowOf.has(e.to));
    const parentLanes = [...new Set(parentEdges.map((e) => e.from))];
    for (const e of parentEdges) {
      const pp = placedParents.find((o) => o.n === e.from);
      if (!pp) continue;
      const lx = leafX - 8 - parentLanes.indexOf(e.from) * 6;
      const y1 = pp.y + CARD_H / 2 + 12;
      const y2 = cy(rowOf.get(e.to)) + 12;
      dsvg += `<path class="dep" data-f="${e.from}" data-t="${e.to}" marker-end="url(#tga)" d="M${colX(pp.col) + colW(pp.col)} ${y1} L${lx} ${y1} L${lx} ${y2} L${leafX - 2} ${y2}"/>`;
    }
    const H = top + rows.length * PITCH + 30;
    const heads = [`<text class="col" x="${colX(0)}" y="24">Epic</text>`];
    for (let cidx = 1; cidx < leafCol; cidx += 1)
      heads.push(`<text class="col" x="${colX(cidx)}" y="24">Split tasks</text>`);
    heads.push(
      `<text class="col" x="${leafX}" y="24">Tickets</text>`,
      `<text class="col" x="${laneX0}" y="24">Waits on</text>`,
    );
    const key = `<text class="key" x="20" y="${H - 18}">Solid elbow: part of. Dashed arrow: the ticket it points at waits on the one it starts from.</text><text class="key" x="20" y="${H - 4}">Hover a ticket to trace its arrows. Click a pill to run it.</text>`;
    return `<div id="tg-hw"><svg id="tg-h" viewBox="0 0 680 ${H}" role="img" aria-label="Hierarchy first">${marker('tga')}${heads.join('')}${svg}${dsvg}${key}</svg></div>`;
  })();

  const dep = (() => {
    const nodes = new Map();
    for (const l of leaves) nodes.set(l.number, { key: l.number, a: l, closeOf: null });
    const neededParents = new Set();
    for (const l of leaves)
      for (const b of blockersOf(l.number)) if (b.parent) neededParents.add(b.n);
    for (const pn of neededParents)
      nodes.set(`p${pn}`, { key: `p${pn}`, a: inScope.get(pn), closeOf: pn });
    const blockerKeys = (key) => {
      const nd = nodes.get(key);
      if (nd.closeOf)
        return leaves.filter((l) => parentOf(l.number) === nd.closeOf).map((l) => l.number);
      return blockersOf(nd.a.number)
        .map((b) => (b.parent ? `p${b.n}` : b.n))
        .filter((k) => nodes.has(k));
    };
    const wave = new Map();
    const waveOf = (key, seen = new Set()) => {
      if (wave.has(key)) return wave.get(key);
      if (seen.has(key)) return 0;
      seen.add(key);
      const bs = blockerKeys(key);
      const v = bs.length ? 1 + Math.max(...bs.map((k) => waveOf(k, seen))) : 0;
      wave.set(key, v);
      return v;
    };
    for (const k of nodes.keys()) waveOf(k);
    const maxWave = Math.max(0, ...wave.values());
    const ncols = maxWave + 1;
    const colW = 230;
    const stepX = Math.min(colW + 40, Math.floor((650 - colW - 20) / Math.max(1, maxWave)));
    const staggered = stepX < colW + 20;
    const colX = (cidx) => 20 + cidx * stepX;
    const primary = new Map();
    for (const k of nodes.keys()) {
      const bs = blockerKeys(k);
      if (!bs.length) continue;
      bs.sort(
        (p, q) =>
          wave.get(q) - wave.get(p) ||
          (nodes.get(p).a?.boardIndex ?? 0) - (nodes.get(q).a?.boardIndex ?? 0),
      );
      primary.set(k, bs[0]);
    }
    const order = [];
    const children = (k) =>
      [...nodes.keys()]
        .filter((c) => primary.get(c) === k)
        .sort(
          (p, q) =>
            BUCKETS.indexOf(nodes.get(p).a?.bucket ?? 'wait') -
              BUCKETS.indexOf(nodes.get(q).a?.bucket ?? 'wait') ||
            (nodes.get(p).a?.boardIndex ?? 0) - (nodes.get(q).a?.boardIndex ?? 0),
        );
    const visit = (k) => {
      order.push(k);
      for (const c of children(k)) visit(c);
    };
    const rootsD = [...nodes.keys()]
      .filter((k) => !primary.has(k))
      .sort(
        (p, q) =>
          BUCKETS.indexOf(nodes.get(p).a?.bucket ?? 'wait') -
            BUCKETS.indexOf(nodes.get(q).a?.bucket ?? 'wait') ||
          (nodes.get(p).a?.boardIndex ?? 0) - (nodes.get(q).a?.boardIndex ?? 0),
      );
    for (const k of rootsD) visit(k);
    const top = 48;
    const pos = new Map();
    order.forEach((k, i) => pos.set(k, { x: colX(wave.get(k)), y: top + i * PITCH }));
    let svg = '';
    for (const k of order) {
      const nd = nodes.get(k);
      const p = pos.get(k);
      if (nd.closeOf) {
        const it = ctx.byNumber.get(nd.closeOf);
        const kids = it?.children ?? [];
        const open = kids.filter((x) => x.state === 'open').length;
        svg += groupSvg(
          p.x,
          p.y,
          colW,
          [
            `${rowId(nd.a)} closes`,
            shortTitle(nd.a),
            `${shortStatus(nd.a.status)}, ${open} open child${open === 1 ? '' : 'ren'}`,
            friendly(nd.a.action),
          ],
          {
            n: nd.closeOf,
            a: nd.a,
            fix: nd.a.bucket === 'drift',
            tip: `${rowId(nd.a)} ${shortTitle(nd.a)} closes when its children close. ${nd.a.action}`,
          },
        );
      } else {
        const pn = parentOf(nd.a.number);
        const tag = pn ? (rootSet.has(pn) ? 'Epic' : clip(rowId(inScope.get(pn)), 8)) : 'No parent';
        const bs = blockerKeys(k)
          .filter((b) => b !== primary.get(k))
          .map((b) => (nodes.get(b).closeOf ? `${rowId(nodes.get(b).a)} closes` : nameOf(b)));
        const base = primary.has(k)
          ? friendly(nd.a.action).replace(
              /nothing blocks it|reviewed, unblocked/,
              'unblocked by the ticket above',
            )
          : friendly(nd.a.action);
        const why = base + (bs.length ? `${base ? ', ' : ''}also after ${bs.join(', ')}` : '');
        svg += cardSvg(p.x, p.y, colW, nd.a, { tag, why });
      }
    }
    let tsvg = '';
    let dsvg = '';
    const secondary = [];
    for (const k of order) {
      const pk = primary.get(k);
      if (!pk) continue;
      const a = pos.get(pk);
      const b = pos.get(k);
      if (staggered)
        tsvg += `<path class="tree" d="M${a.x + 18} ${a.y + CARD_H} L${a.x + 18} ${b.y + CARD_H / 2} L${b.x} ${b.y + CARD_H / 2}"/>`;
      else
        tsvg += `<path class="tree" d="${elbow(a.x + colW, a.y + CARD_H / 2, a.x + colW + 20, b.x, b.y + CARD_H / 2)}"/>`;
      for (const other of blockerKeys(k)) if (other !== pk) secondary.push({ from: other, to: k });
    }
    secondary.sort(
      (p, q) =>
        Math.abs(pos.get(p.to).y - pos.get(p.from).y) -
        Math.abs(pos.get(q.to).y - pos.get(q.from).y),
    );
    secondary.forEach((e, i) => {
      const o = pos.get(e.from);
      const b = pos.get(e.to);
      const lx = Math.max(o.x, b.x) + colW + 12 + i * 8;
      const y1 = o.y + CARD_H / 2 + 10;
      const y2 = b.y + CARD_H / 2 + 12;
      dsvg += `<path class="dep" data-f="${esc(String(e.from))}" data-t="${esc(String(e.to))}" marker-end="url(#tgb)" d="M${o.x + colW} ${y1} L${lx} ${y1} L${lx} ${y2} L${b.x + colW + 2} ${y2}"/>`;
    });
    const H = top + order.length * PITCH + 30;
    const heads = Array.from(
      { length: ncols },
      (_, i) =>
        `<text class="col" x="${colX(i)}" y="${stepX < 100 ? 22 + (i % 2) * 13 : 26}">${i === 0 ? 'Can start now' : `After ${i} close${i > 1 ? 's' : ''}`}</text>`,
    ).join('');
    const key = `<text class="key" x="20" y="${H - 18}">Solid: the lower ticket waits on the one above it. Dashed, from the right: its other blockers.</text><text class="key" x="20" y="${H - 4}">Grey tag: which part of the epic it belongs to. Click a pill to run it.</text>`;
    return `<div id="tg-dw" hidden><svg id="tg-d" viewBox="0 0 680 ${H}" role="img" aria-label="Dependency first">${marker('tgb')}${heads}${tsvg}${dsvg}${svg}${key}</svg></div>`;
  })();

  const bar = `<div class="tg-bar"><span>${runnable} to run, ${needs} need you, ${waiting} waiting</span><span class="sp"></span><span>${esc(localStamp(result.fetchedAt))}</span><button class="tg-btn on" data-v="h">Hierarchy first</button><button class="tg-btn" data-v="d">Dependency first</button></div>`;
  return `<style>${TREE_CSS}</style><div class="tg" id="tg-root">${bar}${hier}${dep}<script>${TREE_SCRIPT}</script></div>\n`;
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const snapshot = opts.snapshot
    ? JSON.parse(fs.readFileSync(opts.snapshot, 'utf8'))
    : fetchSnapshot();
  if (opts.save) fs.writeFileSync(opts.save, `${JSON.stringify(snapshot, null, 2)}\n`);
  const result = analyze(snapshot, opts.scope);
  if (opts.format === 'json') {
    const { ctx: _ctx, ...rest } = result;
    process.stdout.write(`${JSON.stringify(rest, null, 2)}\n`);
  } else if (opts.format === 'html') {
    process.stdout.write(treeReport(result));
  } else {
    process.stdout.write(textReport(result));
  }
}

main();
