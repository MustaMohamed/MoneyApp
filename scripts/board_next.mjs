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
  const idx = open
    .map((c) => ctx.statusOf(c.number))
    .filter((s) => s && s !== 'Blocked')
    .map(columnIndex);
  if (idx.some((i) => i >= columnIndex('In Progress'))) return 'In Progress';
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
    const closedAny = item.children.length > open.length;
    const stays = closedAny && item.status === 'In Progress';
    if (item.status !== 'Blocked' && item.status !== expected && !stays) {
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

const TREE_CSS = `.tg{--c-bg:#1f1f1e;--c-card:#2c2c2a;--c-grp:#262624;--c-text:#f1efe8;--c-text2:#b4b2a9;--c-muted:#8a8984;--c-border:#3a3a38;--c-border2:#5f5e5a;--c-accent:#cecbf6;--c-accent-bg:#26215c;--c-accent-bd:#7f77dd;--c-warn:#fac775;--c-warn-bg:#412402;--c-warn-bd:#ba7517;--c-danger:#f7c1c1;--c-danger-bg:#501313;--c-danger-bd:#e24b4a;--c-success-bd:#639922;--c-btn:#2c2c2a;
font-family:var(--font-sans);color:var(--c-text);background:var(--c-bg);padding:12px 14px 10px;border-radius:12px}
.tg[data-theme="light"]{--c-bg:#faf9f6;--c-card:#ffffff;--c-grp:#f1efe8;--c-text:#1a1a1a;--c-text2:#5f5e5a;--c-muted:#888780;--c-border:#d3d1c7;--c-border2:#b4b2a9;--c-accent:#3c3489;--c-accent-bg:#eeedfe;--c-accent-bd:#7f77dd;--c-warn:#633806;--c-warn-bg:#faeeda;--c-warn-bd:#ef9f27;--c-danger:#791f1f;--c-danger-bg:#fcebeb;--c-danger-bd:#e24b4a;--c-success-bd:#639922;--c-btn:#ffffff}
.tg-bar{display:flex;align-items:center;gap:8px;padding:0 0 10px;font-size:13px;color:var(--c-text2)}
.tg-bar .sp{flex:1}
.tg-btn{font:inherit;font-size:12px;font-weight:500;padding:3px 10px;border-radius:8px;border:0.5px solid var(--c-border2);background:var(--c-btn);color:var(--c-text2);cursor:pointer}
.tg-btn.on{border-color:var(--c-accent-bd);background:var(--c-accent-bg);color:var(--c-accent)}
.tg svg{display:block;width:100%;height:auto}
.tg{min-width:0}
.tg [hidden]{display:none}
.tg text{font-family:var(--font-sans)}
.tg .id{font-size:13px;font-weight:500;fill:var(--c-text)}
.tg .st{font-size:11px;fill:var(--c-text2)}
.tg .tt{font-size:12px;fill:var(--c-text2)}
.tg .why{font-size:11px;fill:var(--c-muted)}
.tg .tag{font-size:11px;fill:var(--c-muted)}
.tg .card{fill:var(--c-card);stroke:var(--c-border2);stroke-width:0.5}
.tg .card.run{stroke:var(--c-accent-bd)}.tg .card.you{stroke:var(--c-warn-bd)}.tg .card.fix{stroke:var(--c-danger-bd)}.tg .card.done{opacity:0.55}
.tg .edge{fill:none;stroke:var(--c-accent-bd);stroke-width:3;opacity:0.9}
.tg .edge.you{stroke:var(--c-warn-bd)}.tg .edge.fix{stroke:var(--c-danger-bd)}.tg .edge.wait{stroke:var(--c-border2);opacity:1}.tg .edge.done{stroke:var(--c-success-bd)}
.tg .tree{fill:none;stroke:var(--c-text2);stroke-width:2;opacity:0.9}
.tg .dep{fill:none;stroke:var(--c-accent-bd);stroke-width:2.2;stroke-dasharray:7 5;opacity:0.95}
.tg .dep.hi{stroke:var(--c-accent);stroke-width:3.2;stroke-dasharray:none;opacity:1}
.tg .hd{fill:var(--c-accent-bd)}
.tg .pill{stroke-width:0.5}.tg .pill.run{fill:var(--c-accent-bg);stroke:var(--c-accent-bd)}.tg .pill.you{fill:var(--c-warn-bg);stroke:var(--c-warn-bd)}.tg .pill.fix{fill:var(--c-danger-bg);stroke:var(--c-danger-bd)}
.tg .pt{font-size:11px;font-weight:500}.tg .pt.run{fill:var(--c-accent)}.tg .pt.you{fill:var(--c-warn)}.tg .pt.fix{fill:var(--c-danger)}
.tg .node{cursor:pointer}
.tg .node.lo{opacity:0.35}
.tg .grp{fill:var(--c-grp);stroke:var(--c-border2);stroke-width:0.5}
.tg .grp.fix{stroke:var(--c-danger-bd)}
.tg .gl{font-size:12px;font-weight:500;fill:var(--c-text)}.tg .gs{font-size:11px;fill:var(--c-muted)}
.tg .col{font-size:11px;fill:var(--c-muted)}
.tg .key{font-size:11px;fill:var(--c-muted)}`;

const TREE_RUNTIME = String.raw`(function(){
var r=document.getElementById('tg-root');if(!r)return;
var M=JSON.parse(document.getElementById('tg-model').textContent);
var CARD_H=80,PITCH=104;
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
function clip(s,n){s=String(s||'');return s.length<=n?s:s.slice(0,Math.max(0,n-1))+'…';}
function pillSvg(p,x,y){if(!p)return '';var w=Math.max(56,Math.round(p.text.length*6.2+14));return '<rect class="pill '+p.kind+'" x="'+x+'" y="'+y+'" width="'+w+'" height="18" rx="9"/><text class="pt '+p.kind+'" x="'+(x+w/2)+'" y="'+(y+13)+'" text-anchor="middle">'+esc(p.text)+'</text>';}
function card(x,y,w,a,tag,why){var tc=Math.floor((w-22)/6.1),wc=Math.floor((w-22)/5.5);var click=a.pill?a.pill.click:"openLink('"+a.url+"')";
return '<g class="node" data-i="'+a.n+'" data-dim="'+(a.kind==='wait'||a.kind==='done'?'0':'1')+'" onclick="'+click+'"><title>'+esc(a.tip)+'</title><rect class="card '+a.kind+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+CARD_H+'" rx="6"/><path class="edge '+a.kind+'" d="M'+(x+2)+' '+(y+6)+' L'+(x+2)+' '+(y+CARD_H-6)+'"/><text class="id" x="'+(x+12)+'" y="'+(y+19)+'">'+esc(a.id)+'</text><text class="st" x="'+(x+w-10)+'" y="'+(y+19)+'" text-anchor="end">'+esc(a.status)+'</text><text class="tt" x="'+(x+12)+'" y="'+(y+36)+'">'+esc(clip(a.title,tc))+'</text><text class="why" x="'+(x+12)+'" y="'+(y+52)+'">'+esc(clip(why||'',wc))+'</text>'+pillSvg(a.pill,x+10,y+58)+(tag?'<text class="tag" x="'+(x+w-10)+'" y="'+(y+71)+'" text-anchor="end">'+esc(tag)+'</text>':'')+'</g>';}
function group(x,y,w,g,lines){var c=Math.floor((w-20)/6.1),cs=Math.floor((w-20)/5.5);var click=g.pill?g.pill.click:(g.url?"openLink('"+g.url+"')":'');
return '<g class="node"'+(g.n!==undefined?' data-i="'+g.n+'" data-dim="0"':'')+(click?' onclick="'+click+'"':'')+'>'+(g.tip?'<title>'+esc(g.tip)+'</title>':'')+'<rect class="grp'+(g.fix?' fix':'')+'" x="'+x+'" y="'+y+'" width="'+w+'" height="'+CARD_H+'" rx="6"/><text class="gl" x="'+(x+10)+'" y="'+(y+19)+'">'+esc(clip(lines[0],c))+'</text><text class="tt" x="'+(x+10)+'" y="'+(y+36)+'">'+esc(clip(lines[1]||'',c))+'</text><text class="gs" x="'+(x+10)+'" y="'+(y+52)+'">'+esc(clip(lines[2]||'',cs))+'</text>'+(g.pill?pillSvg(g.pill,x+10,y+58):'<text class="gs" x="'+(x+10)+'" y="'+(y+71)+'">'+esc(clip(lines[3]||'',cs))+'</text>')+'</g>';}
function marker(id){return '<defs><marker id="'+id+'" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path class="hd" d="M1 1L9 5L1 9z"/></marker></defs>';}
var byN={};M.leaves.forEach(function(l){byN[l.n]=l;});var pByN={};M.parents.forEach(function(p){pByN[p.n]=p;});
function nameOf(n){return byN[n]?byN[n].id:(pByN[n]?pByN[n].id:'#'+n);}
function hier(W){
var maxD=0;M.parents.forEach(function(p){if(p.depth>maxD)maxD=p.depth;});var leafCol=maxD+1;
var extra=Math.max(0,W-680);var gap=Math.min(170,40+Math.round(extra*0.26));var w0=110+Math.round(extra*0.07),w1=130+Math.round(extra*0.09);
function colW(c){return c===0?w0:w1;}function colX(c){return c===0?20:20+w0+gap+(c-1)*(w1+gap);}
var leafX=colX(leafCol);var edgesAll=[];M.leaves.forEach(function(l){l.blockers.forEach(function(b){edgesAll.push({from:b.n,to:l.n,parent:b.parent});});});
var rightCount=edgesAll.filter(function(e){return !e.parent&&byN[e.from];}).length;
var laneGap=Math.min(30,Math.round(14+extra*0.05));var laneW=Math.max(48,rightCount*laneGap+20);var leafW=Math.max(230,W-20-laneW-leafX);var laneX0=leafX+leafW+18;
var rows=[],placed=[];
function leavesOf(pn){return M.leaves.filter(function(l){return l.parent===pn;});}
function kidsOf(pn){return M.parents.filter(function(p){return p.parent===pn;}).sort(function(x,y){return x.board-y.board;});}
function walk(pn,col){var start=rows.length;kidsOf(pn).forEach(function(cp){walk(cp.n,col+1);});leavesOf(pn).forEach(function(l){rows.push({kind:'leaf',a:l});});var p=pByN[pn];if(p.doneIds.length)rows.push({kind:'done',parent:pn,ids:p.doneIds,url:p.url});var end=rows.length-1;if(end<start)rows.push({kind:'empty'});placed.push({n:pn,col:col,start:start,end:Math.max(end,start)});}
M.parents.filter(function(p){return p.root;}).sort(function(x,y){return x.board-y.board;}).forEach(function(p){walk(p.n,0);});
var stray=M.leaves.filter(function(l){return l.parent===null;});var sg=null;if(stray.length){var st=rows.length;stray.forEach(function(l){rows.push({kind:'leaf',a:l});});sg={start:st,end:rows.length-1};}
var top=44;rows.forEach(function(r,i){r.y=top+i*PITCH;});function cy(r){return r.y+CARD_H/2;}
var svg='',dsvg='';
placed.forEach(function(pp){var p=pByN[pp.n];var y=(cy(rows[pp.start])+cy(rows[pp.end]))/2-CARD_H/2;pp.y=y;var x=colX(pp.col),w=colW(pp.col);
svg+=group(x,y,w,p,[p.id,p.title,p.status+', '+p.done+' of '+p.kids+' done',p.why]);
var xb=x+w+Math.min(40,Math.round(gap/2)),ys=[];placed.forEach(function(cp){if(pByN[cp.n].parent===pp.n)ys.push({x:colX(cp.col),y:cp.y+CARD_H/2});});
for(var i=pp.start;i<=pp.end;i++){var rr=rows[i];if((rr.kind==='leaf'&&rr.a.parent===pp.n)||(rr.kind==='done'&&rr.parent===pp.n))ys.push({x:leafX,y:cy(rr)});}
if(ys.length){var ymin=Math.min.apply(null,ys.map(function(o){return o.y;}).concat([y+CARD_H/2])),ymax=Math.max.apply(null,ys.map(function(o){return o.y;}).concat([y+CARD_H/2]));svg+='<path class="tree" d="M'+(x+w)+' '+(y+CARD_H/2)+' L'+xb+' '+(y+CARD_H/2)+' M'+xb+' '+ymin+' L'+xb+' '+ymax+ys.map(function(o){return ' M'+xb+' '+o.y+' L'+o.x+' '+o.y;}).join('')+'"/>';}});
if(sg){var y0=(cy(rows[sg.start])+cy(rows[sg.end]))/2-CARD_H/2;svg+=group(colX(0),y0,colW(0),{},['No parent','',stray.length+' open','']);var xb0=colX(0)+colW(0)+Math.min(40,Math.round(gap/2)),yy=[];for(var q=sg.start;q<=sg.end;q++)yy.push(cy(rows[q]));svg+='<path class="tree" d="M'+(colX(0)+colW(0))+' '+(y0+CARD_H/2)+' L'+xb0+' '+(y0+CARD_H/2)+' M'+xb0+' '+Math.min.apply(null,yy.concat([y0+CARD_H/2]))+' L'+xb0+' '+Math.max.apply(null,yy.concat([y0+CARD_H/2]))+yy.map(function(v){return ' M'+xb0+' '+v+' L'+leafX+' '+v;}).join('')+'"/>';}
var rowOf={};rows.forEach(function(rr){if(rr.kind==='leaf')rowOf[rr.a.n]=rr;});
rows.forEach(function(rr){if(rr.kind==='leaf'){var bn=rr.a.blockers.map(function(b){return b.parent?nameOf(b.n)+' closes':nameOf(b.n);});var why=rr.a.why;if(bn.length){if(/nothing blocks it|unblocked/.test(why))why='';why=(why?why+', ':'')+'after '+bn.join(', ');}svg+=card(leafX,rr.y,leafW,rr.a,'',why);}
else if(rr.kind==='done'){svg+='<g class="node" data-dim="0" onclick="openLink(\''+rr.url+'\')"><rect class="card done" x="'+leafX+'" y="'+rr.y+'" width="'+leafW+'" height="'+CARD_H+'" rx="6"/><path class="edge done" d="M'+(leafX+2)+' '+(rr.y+6)+' L'+(leafX+2)+' '+(rr.y+CARD_H-6)+'"/><text class="id" x="'+(leafX+12)+'" y="'+(rr.y+19)+'">'+rr.ids.length+' done</text><text class="st" x="'+(leafX+leafW-10)+'" y="'+(rr.y+19)+'" text-anchor="end">Done</text><text class="tt" x="'+(leafX+12)+'" y="'+(rr.y+36)+'">'+esc(clip(rr.ids.join(', '),Math.floor((leafW-22)/6.1)))+'</text></g>';}
else if(rr.kind==='empty'){svg+='<text class="why" x="'+(leafX+12)+'" y="'+(rr.y+44)+'">no open tickets</text>';}});
var touches={};function touch(n,o){(touches[n]=touches[n]||[]).push(o);}edgesAll.forEach(function(e){if(!e.parent)touch(e.from,e.to);touch(e.to,e.from);});
function yOf(n){return rowOf[n]?cy(rowOf[n]):(placed.filter(function(pp){return pp.n===n;})[0]||{y:0}).y;}
function portY(n,o){var list=[];(touches[n]||[]).forEach(function(v){if(list.indexOf(v)<0)list.push(v);});list.sort(function(p,q){return yOf(p)-yOf(q);});var i=list.indexOf(o);return cy(rowOf[n])+(i-(list.length-1)/2)*10;}
var right=edgesAll.filter(function(e){return !e.parent&&rowOf[e.from]&&rowOf[e.to];}).sort(function(p,q){return Math.abs(cy(rowOf[p.to])-cy(rowOf[p.from]))-Math.abs(cy(rowOf[q.to])-cy(rowOf[q.from]));});
var laneStep=Math.max(8,Math.min(laneGap,Math.floor((W-14-laneX0)/Math.max(1,right.length))));
right.forEach(function(e,i){var lx=laneX0+i*laneStep,y1=portY(e.from,e.to),y2=portY(e.to,e.from);dsvg+='<path class="dep" data-f="'+e.from+'" data-t="'+e.to+'" marker-end="url(#tga)" d="M'+(leafX+leafW)+' '+y1+' L'+lx+' '+y1+' L'+lx+' '+y2+' L'+(leafX+leafW+2)+' '+y2+'"/>';});
var pe=edgesAll.filter(function(e){return e.parent&&rowOf[e.to];});var lanes=[];pe.forEach(function(e){if(lanes.indexOf(e.from)<0)lanes.push(e.from);});
pe.forEach(function(e){var pp=placed.filter(function(o){return o.n===e.from;})[0];if(!pp)return;var lstep=gap>=80?14:10;var lx=leafX-12-lanes.indexOf(e.from)*lstep,y1=pp.y+CARD_H/2+14,y2=cy(rowOf[e.to])+14;dsvg+='<path class="dep" data-f="'+e.from+'" data-t="'+e.to+'" marker-end="url(#tga)" d="M'+(colX(pp.col)+colW(pp.col))+' '+y1+' L'+lx+' '+y1+' L'+lx+' '+y2+' L'+(leafX-2)+' '+y2+'"/>';});
var H=top+rows.length*PITCH+30;var heads='<text class="col" x="'+colX(0)+'" y="24">Epic</text>';for(var c=1;c<leafCol;c++)heads+='<text class="col" x="'+colX(c)+'" y="24">Split tasks</text>';heads+='<text class="col" x="'+leafX+'" y="24">Tickets</text>'+(right.length?'<text class="col" x="'+laneX0+'" y="24">Waits on</text>':'');
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Hierarchy first">'+marker('tga')+heads+svg+dsvg+'<text class="key" x="20" y="'+(H-18)+'">Solid elbow: part of. Dashed arrow: the ticket it points at waits on the one it starts from.</text><text class="key" x="20" y="'+(H-4)+'">Hover a ticket to trace its arrows. Click a pill to run it.</text></svg>';}
function dep(W){
var nodes={},keys=[];M.leaves.forEach(function(l){nodes[l.n]={key:l.n,a:l};keys.push(l.n);});
var needed={};M.leaves.forEach(function(l){l.blockers.forEach(function(b){if(b.parent)needed[b.n]=1;});});
Object.keys(needed).forEach(function(pn){var p=pByN[pn];if(!p)return;nodes['p'+pn]={key:'p'+pn,p:p,closeOf:Number(pn)};keys.push('p'+pn);});
function blockerKeys(k){var nd=nodes[k];if(nd.closeOf)return M.leaves.filter(function(l){return l.parent===nd.closeOf;}).map(function(l){return l.n;});return nd.a.blockers.map(function(b){return b.parent?'p'+b.n:b.n;}).filter(function(x){return !!nodes[x];});}
var wave={};function waveOf(k,seen){seen=seen||{};if(wave[k]!==undefined)return wave[k];if(seen[k])return 0;seen[k]=1;var bs=blockerKeys(k);var v=bs.length?1+Math.max.apply(null,bs.map(function(x){return waveOf(x,seen);})):0;wave[k]=v;return v;}
keys.forEach(function(k){waveOf(k);});var maxW=0;keys.forEach(function(k){if(wave[k]>maxW)maxW=wave[k];});
var colW=Math.max(230,Math.min(340,Math.floor((W-40)/(maxW+1))));var stepX=maxW>0?Math.floor((W-40-colW)/maxW):0;var staggered=stepX<colW+20;
function colX(c){return 20+c*stepX;}
var bucketOrder=['yours','drift','flight','pull','define','wait'];function bo(k){var nd=nodes[k];var a=nd.a||nd.p;return bucketOrder.indexOf(a.bucket)*100000+(a.board||0);}
var primary={};keys.forEach(function(k){var bs=blockerKeys(k);if(!bs.length)return;bs.sort(function(p,q){return (wave[q]-wave[p])||(bo(p)-bo(q));});primary[k]=bs[0];});
var order=[];function children(k){return keys.filter(function(c){return primary[c]===k;}).sort(function(p,q){return bo(p)-bo(q);});}
function visit(k){order.push(k);children(k).forEach(visit);}
keys.filter(function(k){return primary[k]===undefined;}).sort(function(p,q){return bo(p)-bo(q);}).forEach(visit);
var top=48,pos={};order.forEach(function(k,i){pos[k]={x:colX(wave[k]),y:top+i*PITCH};});
var svg='',tsvg='',dsvg='',sec=[];
order.forEach(function(k){var nd=nodes[k],p=pos[k];if(nd.closeOf){var g=nd.p;svg+=group(p.x,p.y,colW,g,[g.id+' closes',g.title,g.status+', '+g.open+' open child'+(g.open===1?'':'ren'),g.why]);}
else{var a=nd.a;var tag=a.parentTag;var bs=blockerKeys(k).filter(function(b){return b!==primary[k];}).map(function(b){return nodes[b].closeOf?nodes[b].p.id+' closes':nameOf(b);});var base=primary[k]?a.why.replace(/nothing blocks it|reviewed, unblocked/,'unblocked by the ticket above'):a.why;var why=base+(bs.length?(base?', ':'')+'also after '+bs.join(', '):'');svg+=card(p.x,p.y,colW,a,tag,why);}});
order.forEach(function(k){var pk=primary[k];if(!pk)return;var a=pos[pk],b=pos[k];if(staggered)tsvg+='<path class="tree" d="M'+(a.x+18)+' '+(a.y+CARD_H)+' L'+(a.x+18)+' '+(b.y+CARD_H/2)+' L'+b.x+' '+(b.y+CARD_H/2)+'"/>';else tsvg+='<path class="tree" d="M'+(a.x+colW)+' '+(a.y+CARD_H/2)+' L'+(a.x+colW+20)+' '+(a.y+CARD_H/2)+' L'+(a.x+colW+20)+' '+(b.y+CARD_H/2)+' L'+b.x+' '+(b.y+CARD_H/2)+'"/>';blockerKeys(k).forEach(function(o){if(o!==pk)sec.push({from:o,to:k});});});
sec.sort(function(p,q){return Math.abs(pos[p.to].y-pos[p.from].y)-Math.abs(pos[q.to].y-pos[q.from].y);});
sec.forEach(function(e,i){var o=pos[e.from],b=pos[e.to];var lx=Math.max(o.x,b.x)+colW+14+i*12;if(lx>W-6)lx=W-6-i*6;var y1=o.y+CARD_H/2+10,y2=b.y+CARD_H/2+12;dsvg+='<path class="dep" data-f="'+e.from+'" data-t="'+e.to+'" marker-end="url(#tgb)" d="M'+(o.x+colW)+' '+y1+' L'+lx+' '+y1+' L'+lx+' '+y2+' L'+(b.x+colW+2)+' '+y2+'"/>';});
var H=top+order.length*PITCH+30;var heads='';for(var c=0;c<=maxW;c++)heads+='<text class="col" x="'+colX(c)+'" y="'+(stepX<100?22+(c%2)*13:26)+'">'+(c===0?'Can start now':'After '+c+' close'+(c>1?'s':''))+'</text>';
return '<svg viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Dependency first">'+marker('tgb')+heads+tsvg+dsvg+svg+'<text class="key" x="20" y="'+(H-18)+'">Solid: the lower ticket waits on the one above it. Dashed, from the right: its other blockers.</text><text class="key" x="20" y="'+(H-4)+'">Grey tag: which part of the epic it belongs to. Click a pill to run it.</text></svg>';}
var hw=document.getElementById('tg-hw'),dw=document.getElementById('tg-dw');var lastW=0;
function render(){var W=Math.max(680,Math.floor(r.clientWidth-28));if(W===lastW)return;lastW=W;hw.innerHTML=hier(W);dw.innerHTML=dep(W);}
render();if(window.ResizeObserver){new ResizeObserver(function(){render();}).observe(r);}
var bs=r.querySelectorAll('.tg-btn[data-v]');for(var i=0;i<bs.length;i++){bs[i].addEventListener('click',function(){var v=this.getAttribute('data-v');hw.hidden=v!=='h';dw.hidden=v!=='d';for(var j=0;j<bs.length;j++)bs[j].classList.toggle('on',bs[j]===this);});}
var tb=r.querySelector('.tg-btn[data-theme-toggle]');if(tb){tb.addEventListener('click',function(){var dark=r.getAttribute('data-theme')!=='light';r.setAttribute('data-theme',dark?'light':'dark');this.textContent=dark?'Dark':'Light';});}
function mark(id){var ps=r.querySelectorAll('.dep');var rel={};for(var k=0;k<ps.length;k++){var p=ps[k];var on=!!id&&(p.getAttribute('data-f')===id||p.getAttribute('data-t')===id);p.classList.toggle('hi',on);if(on){rel[p.getAttribute('data-f')]=1;rel[p.getAttribute('data-t')]=1;}}
var ns=r.querySelectorAll('.node[data-i]');for(var m=0;m<ns.length;m++){var n=ns[m],nid=n.getAttribute('data-i');n.classList.toggle('lo',!!id&&nid!==id&&!rel[nid]&&n.getAttribute('data-dim')==='1');}}
r.addEventListener('mouseover',function(e){var t=e.target;while(t&&t!==r&&!(t.classList&&t.classList.contains('node')))t=t.parentNode;mark(t&&t!==r?t.getAttribute('data-i'):null);});
r.addEventListener('mouseleave',function(){mark(null);});})();`;

function cardKind(a) {
  if (!a) return 'wait';
  if (a.state === 'closed') return 'done';
  if (a.bucket === 'drift') return 'fix';
  if (a.bucket === 'yours') return 'you';
  if (a.command) return 'run';
  return 'wait';
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
  const depthOf = (n) => {
    let dpt = 0;
    let cur = parentOf(n);
    while (cur) {
      dpt += 1;
      cur = parentOf(cur);
    }
    return dpt;
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
  const model = {
    leaves: leaves.map((a) => {
      const pn = parentOf(a.number);
      return {
        n: a.number,
        id: rowId(a),
        title: shortTitle(a),
        status: shortStatus(a.status),
        kind: cardKind(a),
        bucket: a.bucket,
        board: a.boardIndex,
        why: friendly(a.action),
        parent: pn,
        parentTag: pn ? (rootSet.has(pn) ? 'Epic' : clip(rowId(inScope.get(pn)), 8)) : 'No parent',
        blockers: blockersOf(a.number),
        pill: cardKind(a) === 'done' ? null : pillLabel(a),
        url: `${ISSUE_URL}${a.number}`,
        tip: `${rowId(a)} ${shortTitle(a)}. ${a.status ?? ''}. ${a.action}${a.command ? `. Next: ${a.command}` : ''}`,
      };
    }),
    parents: parents.map((p) => {
      const it = ctx.byNumber.get(p.number);
      const kids = it?.children ?? [];
      const doneIds = kids
        .filter((k) => k.state === 'closed')
        .map((k) => {
          const kit = ctx.byNumber.get(k.number);
          return kit ? rowId(kit) : `#${k.number}`;
        });
      return {
        n: p.number,
        id: rowId(p),
        title: shortTitle(p),
        status: shortStatus(p.status),
        bucket: p.bucket,
        board: p.boardIndex,
        depth: depthOf(p.number),
        root: rootSet.has(p.number),
        parent: parentOf(p.number),
        kids: kids.length,
        done: doneIds.length,
        open: kids.length - doneIds.length,
        doneIds,
        why: friendly(p.action),
        fix: p.bucket === 'drift',
        pill: p.command ? pillLabel(p) : null,
        url: `${ISSUE_URL}${p.number}`,
        tip: `${rowId(p)} ${shortTitle(p)}. ${p.status ?? ''}. ${p.action}`,
      };
    }),
  };
  const kindCount = (b) => leaves.filter((x) => x.bucket === b).length;
  const runnable = kindCount('flight') + kindCount('pull') + kindCount('define');
  const needs = result.actions.filter((x) => x.bucket === 'yours' || x.bucket === 'drift').length;
  const waiting = kindCount('wait');
  const bar = `<div class="tg-bar"><span>${runnable} to run, ${needs} need you, ${waiting} waiting</span><span class="sp"></span><span>${esc(localStamp(result.fetchedAt))}</span><button class="tg-btn on" data-v="h">Hierarchy first</button><button class="tg-btn" data-v="d">Dependency first</button><button class="tg-btn" data-theme-toggle="1">Light</button></div>`;
  const json = JSON.stringify(model).replace(/</g, '\\u003c');
  return `<style>${TREE_CSS}</style><div class="tg" id="tg-root" data-theme="dark">${bar}<div id="tg-hw"></div><div id="tg-dw" hidden></div><script type="application/json" id="tg-model">${json}</script><script>${TREE_RUNTIME}</script></div>\n`;
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
