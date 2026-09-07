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
        'usage: node scripts/board_next.mjs [--format text|json|svg] [--scope <issue>] [--snapshot <file>] [--save <file>]\n',
      );
      process.exit(0);
    } else {
      process.stderr.write(`board_next: unknown argument ${a}\n`);
      process.exit(2);
    }
  }
  if (!['text', 'json', 'svg'].includes(opts.format)) {
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

const SHORT = { 'Ready For Development': 'Ready', 'Awaiting Human': 'Awaiting' };

function shortStatus(status) {
  return SHORT[status] ?? status ?? 'off board';
}

function ramp(a) {
  if (a.bucket === 'drift' || a.status === 'Blocked') return 'c-coral';
  if (a.state === 'closed') return 'c-gray';
  if (['In Progress', 'In Review', 'Awaiting Human'].includes(a.status)) return 'c-teal';
  if (['Ready For Development', 'Planned'].includes(a.status)) return 'c-purple';
  return 'c-gray';
}

function svgReport(result) {
  const { ctx } = result;
  const byNum = new Map(result.actions.map((a) => [a.number, a]));
  const shown = new Map();
  for (const a of result.actions)
    if (a.state === 'open' || a.bucket === 'drift') shown.set(a.number, a);
  for (const a of [...shown.values()]) {
    for (const d of a.deps) {
      if (shown.has(d.number)) continue;
      const it = ctx.byNumber.get(d.number);
      shown.set(d.number, {
        number: d.number,
        ma: it ? maId(it) : `#${d.number}`,
        title: it?.title ?? '',
        status: it?.status ?? (d.closed ? 'Done' : null),
        state: d.closed ? 'closed' : 'open',
        parent: it?.parent ?? null,
        isParent: false,
        deps: [],
        bucket: 'wait',
        action: d.closed ? 'closed' : 'not on the board',
        command: undefined,
        boardIndex: it?.boardIndex ?? 99_999,
        ghost: true,
      });
    }
  }

  const depth = new Map();
  const depthOf = (n, seen = new Set()) => {
    if (depth.has(n)) return depth.get(n);
    if (seen.has(n)) return 0;
    seen.add(n);
    const ds = (shown.get(n)?.deps ?? []).filter((d) => shown.has(d.number));
    const v = ds.length ? 1 + Math.max(...ds.map((d) => depthOf(d.number, seen))) : 0;
    depth.set(n, v);
    return v;
  };
  for (const n of shown.keys()) depthOf(n);
  const maxDepth = Math.max(0, ...depth.values());
  const ncols = maxDepth + 1;
  const left = 40;
  const right = 640;
  const gap = 18;
  const colW = Math.min(190, Math.floor((right - left - (ncols - 1) * gap) / ncols));
  const nodeH = 44;
  const rowGap = 12;
  const titleChars = Math.floor((colW - 16) / 7.4);
  const subChars = Math.floor((colW - 16) / 6.4);

  const bands = new Map();
  const bandOrder = [];
  const bandKey = (a) => {
    if (a.isParent) return a.number;
    return a.parent ?? 'none';
  };
  for (const a of [...shown.values()].sort((x, y) => x.boardIndex - y.boardIndex)) {
    const k = bandKey(a);
    if (!bands.has(k)) {
      bands.set(k, { key: k, header: null, nodes: [] });
      bandOrder.push(k);
    }
    if (a.isParent) bands.get(k).header = a;
    else bands.get(k).nodes.push(a);
  }
  bandOrder.sort((x, y) => {
    if (x === 'none') return 1;
    if (y === 'none') return -1;
    return (
      (shown.get(x)?.boardIndex ?? ctx.byNumber.get(x)?.boardIndex ?? 99_999) -
      (shown.get(y)?.boardIndex ?? ctx.byNumber.get(y)?.boardIndex ?? 99_999)
    );
  });

  const pos = new Map();
  const parts = [];
  let y = 40;
  for (const k of bandOrder) {
    const band = bands.get(k);
    const header = band.header ?? (k === 'none' ? null : (byNum.get(k) ?? null));
    const parentIt = k === 'none' ? null : ctx.byNumber.get(k);
    const bandTop = y;
    const label = header
      ? `#${header.number} ${header.ma} · ${shortStatus(header.status)} · ${header.command ?? header.action}`
      : parentIt
        ? `#${parentIt.number} ${maId(parentIt)} · ${shortStatus(parentIt.status)}`
        : k === 'none'
          ? 'no parent'
          : `#${k}`;
    y += 28;
    const cols = Array.from({ length: ncols }, () => []);
    for (const a of band.nodes) cols[Math.min(depth.get(a.number) ?? 0, ncols - 1)].push(a);
    const rows = Math.max(1, ...cols.map((c) => c.length));
    cols.forEach((c, ci) => {
      c.forEach((a, ri) => {
        const x = left + ci * (colW + gap);
        const ny = y + ri * (nodeH + rowGap);
        pos.set(a.number, { x, y: ny });
      });
    });
    const bandH = 28 + rows * (nodeH + rowGap) - rowGap + 12;
    const clickable = header?.command && header.command.startsWith('/');
    const headerClick = header
      ? clickable
        ? ` class="node" onclick="sendPrompt('${esc(header.command.split(' or ')[0])}')"`
        : ` class="node" onclick="openLink('${ISSUE_URL}${header.number}')"`
      : '';
    parts.push(
      `<g${headerClick}${header ? ` data-issue="${header.number}"` : ''}><rect x="${left - 8}" y="${bandTop}" width="${right - left + 16}" height="${bandH}" rx="6" fill="none" stroke="var(--border-strong)" stroke-width="0.5" stroke-dasharray="4 3"/>` +
        `<text x="${left}" y="${bandTop + 18}" class="ts">${esc(clip(label, 88))}</text></g>`,
    );
    y = bandTop + bandH + 16;
  }
  const height = y - 16 + 40 + 56;

  const edges = [];
  for (const a of shown.values()) {
    for (const d of a.deps) {
      const from = pos.get(d.number);
      const to = pos.get(a.number);
      if (!from || !to) continue;
      const x1 = from.x + colW;
      const y1 = from.y + nodeH / 2;
      const x2 = to.x;
      const y2 = to.y + nodeH / 2;
      const dash = d.closed ? ' stroke-dasharray="4 3"' : '';
      edges.push(
        `<path data-edge="${d.number}-${a.number}" class="arr" fill="none"${dash} marker-end="url(#arrow)" d="M${x1} ${y1} C${x1 + 24} ${y1}, ${x2 - 24} ${y2}, ${x2} ${y2}"/>`,
      );
    }
  }

  const nodes = [];
  for (const a of shown.values()) {
    const p = pos.get(a.number);
    if (!p) continue;
    const title = clip(`${a.ma} · ${shortStatus(a.status)}`, titleChars);
    const sub = clip((a.command ?? a.action).split(' or ')[0], subChars);
    const click =
      a.command && a.command.startsWith('/')
        ? `sendPrompt('${esc(a.command.split(' or ')[0])}')`
        : `openLink('${ISSUE_URL}${a.number}')`;
    const opacity = a.ghost ? ' opacity="0.55"' : '';
    nodes.push(
      `<g class="node ${ramp(a)}" data-issue="${a.number}" onclick="${click}"${opacity}><rect x="${p.x}" y="${p.y}" width="${colW}" height="${nodeH}" rx="4" stroke-width="0.5"/>` +
        `<text x="${p.x + 8}" y="${p.y + 18}" class="th">${esc(title)}</text><text x="${p.x + 8}" y="${p.y + 34}" class="ts">${esc(sub)}</text></g>`,
    );
  }

  const legendY = y - 16 + 20;
  const legend = [
    ['c-gray', 'Todo, Defined'],
    ['c-purple', 'Ready, Planned'],
    ['c-teal', 'In flight'],
    ['c-coral', 'Drift, Blocked'],
  ]
    .map(([c, t], i) => {
      const x = left + i * 150;
      return `<g class="${c}"><rect x="${x}" y="${legendY}" width="138" height="26" rx="4" stroke-width="0.5"/><text x="${x + 8}" y="${legendY + 17}" class="ts">${t}</text></g>`;
    })
    .join('');

  return (
    `<svg width="100%" viewBox="0 0 680 ${height}" role="img"><title>MoneyApp board</title><desc>Open tickets grouped by parent, columns by dependency depth, the next action on each node. Click a node to run its command.</desc>` +
    `<defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>` +
    parts.join('') +
    edges.join('') +
    nodes.join('') +
    legend +
    `</svg>\n`
  );
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
  } else if (opts.format === 'svg') {
    process.stdout.write(svgReport(result));
  } else {
    process.stdout.write(textReport(result));
  }
}

main();
