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

const CSS = `.bn{position:relative;font-family:var(--font-sans);font-size:14px;line-height:1.4;color:var(--text-primary)}
.bn-head{display:flex;justify-content:space-between;gap:16px;padding:2px 0 4px;font-size:13px;color:var(--text-secondary)}
.bn-key{font-size:12px;color:var(--text-muted);padding-bottom:10px}
.bn-band{border:0.5px solid var(--border-strong);border-radius:6px;padding:8px 10px 10px;margin-top:10px;background:var(--surface-0)}
.bn-band.nested{margin-top:8px;background:var(--surface-1)}
.bn-band.closed{padding:6px 10px;color:var(--text-muted)}
.bn-bh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;padding-bottom:8px;font-size:13px}
.bn-bh .bn-id{font-size:14px}
.bn-bh .bn-t{color:var(--text-secondary);flex:1 1 160px;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bn-bh .bn-c{color:var(--text-muted);font-size:12px}
.bn-grid{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));column-gap:40px;row-gap:10px;align-items:start}
.bn-wave{font-size:12px;color:var(--text-muted);padding-bottom:2px;border-bottom:0.5px solid var(--border)}
.bn-cell{display:flex;flex-direction:column;gap:12px;min-width:0}
.bn-span{grid-column:1/-1}
.bn-card{position:relative;border:0.5px solid var(--border-strong);border-left:3px solid var(--border-stronger);border-radius:0;padding:6px 8px 8px;background:var(--surface-2);min-width:0}
.bn-card.s-define{border-left-color:var(--border-strong)}
.bn-card.s-ready{border-left-color:var(--border-accent)}
.bn-card.s-flight{border-left-color:var(--border-success)}
.bn-card.s-you{border-left-color:var(--border-warning)}
.bn-card.s-fix{border-left-color:var(--border-danger)}
.bn-card.s-wait{border-left-color:var(--border);background:var(--surface-1)}
.bn-l1{display:flex;justify-content:space-between;gap:8px;align-items:baseline}
.bn-id{font-weight:500;color:var(--text-primary);text-decoration:none;white-space:nowrap}
.bn-id:hover{text-decoration:underline}
.bn-st{font-size:12px;color:var(--text-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.bn-t{font-size:12px;color:var(--text-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:1px 0 5px}
.bn-l3{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.bn-act{font:inherit;font-size:12px;font-weight:500;padding:2px 8px;border-radius:var(--radius);border:0.5px solid var(--border-accent);background:var(--bg-accent);color:var(--text-accent);cursor:pointer;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bn-act:focus-visible{outline:2px solid var(--border-stronger);outline-offset:2px}
.bn-act.you{border-color:var(--border-warning);background:var(--bg-warning);color:var(--text-warning)}
.bn-act.fix{border-color:var(--border-danger);background:var(--bg-danger);color:var(--text-danger)}
.bn-alt{font:inherit;font-size:12px;padding:2px 4px;border:0;background:transparent;color:var(--text-secondary);cursor:pointer;text-decoration:underline}
.bn-why{font-size:12px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0}
.bn-wait{font-size:12px;color:var(--text-muted)}
.bn-arrows{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;overflow:visible}
.bn-arrows path{fill:none;stroke:var(--text-muted);stroke-width:1.2;opacity:0.7}
.bn-arrows path.hi{stroke:var(--text-accent);stroke-width:2;opacity:1}
.bn-arrows .hd{fill:var(--text-muted)}
.bn-card.dim{opacity:0.45}
@media (max-width:560px){.bn-grid{grid-template-columns:1fr}.bn-wave{display:none}.bn-arrows{display:none}}
@media (prefers-reduced-motion:no-preference){.bn-card,.bn-arrows path{transition:opacity .15s}}`;

const SCRIPT = `(function(){var root=document.getElementById('bn-root');var svg=root.querySelector('.bn-arrows');var edges=JSON.parse(root.getAttribute('data-edges'));
function draw(){var r=root.getBoundingClientRect();var lanes={},laneN=0;var out='<defs><marker id="bnh" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path class="hd" d="M1 1L9 5L1 9z"/></marker></defs>';
for(var i=0;i<edges.length;i++){var A=root.querySelector('[data-issue="'+edges[i][0]+'"]'),B=root.querySelector('[data-issue="'+edges[i][1]+'"]');if(!A||!B)continue;
var ra=A.getBoundingClientRect(),rb=B.getBoundingClientRect();var x1=ra.right-r.left,y1=ra.top+ra.height/2-r.top,x2=rb.left-r.left,y2=rb.top+rb.height/2-r.top;
var key=edges[i][0];if(lanes[key]===undefined){lanes[key]=laneN++;}var gx=x2-28+(lanes[key]%3)*8;if(gx<x1+8){gx=x1+8;}var s=y2>y1?1:-1;var d='M'+x1+' '+y1+' L'+(gx-6)+' '+y1+' Q'+gx+' '+y1+' '+gx+' '+(y1+6*s)+' L'+gx+' '+(y2-6*s)+' Q'+gx+' '+y2+' '+(gx+6)+' '+y2+' L'+x2+' '+y2;
if(Math.abs(y2-y1)<12){d='M'+x1+' '+y1+' L'+x2+' '+y2;}
out+='<path data-from="'+edges[i][0]+'" data-to="'+edges[i][1]+'" marker-end="url(#bnh)" d="'+d+'"/>';}
svg.innerHTML=out;}
draw();if(window.ResizeObserver){new ResizeObserver(draw).observe(root);}
function mark(n){var paths=svg.querySelectorAll('path[data-from]');var rel={};for(var i=0;i<paths.length;i++){var p=paths[i];var on=n&&(p.getAttribute('data-from')===n||p.getAttribute('data-to')===n);p.classList.toggle('hi',!!on);if(on){rel[p.getAttribute('data-from')]=1;rel[p.getAttribute('data-to')]=1;}}
var cards=root.querySelectorAll('.bn-card[data-issue]');for(var j=0;j<cards.length;j++){var c=cards[j];c.classList.toggle('dim',!!n&&!rel[c.getAttribute('data-issue')]&&c.getAttribute('data-issue')!==n);}}
root.addEventListener('mouseover',function(e){var c=e.target.closest?e.target.closest('.bn-card[data-issue]'):null;mark(c?c.getAttribute('data-issue'):null);});
root.addEventListener('mouseleave',function(){mark(null);});})();`;

function actionControl(a) {
  const cmd = a.command ?? '';
  if (a.bucket === 'yours') {
    const pr = /PR #(\d+)/.exec(a.action);
    if (pr)
      return `<button class="bn-act you" onclick="openLink('https://github.com/${REPO}/pull/${pr[1]}')">Open PR #${pr[1]}</button>`;
    return `<button class="bn-act you" onclick="sendPrompt('${esc(cmd)}')">${esc(cmd)}</button>`;
  }
  if (a.bucket === 'drift') {
    if (!cmd.startsWith('/') && !cmd.startsWith('bash ') && !cmd.startsWith('gh '))
      return `<span class="bn-wait">${esc(cmd)}</span>`;
    return `<button class="bn-act fix" onclick="sendPrompt('${esc(cmd)}')">${esc(clip(cmd, 40))}</button>`;
  }
  if (!cmd) return `<span class="bn-wait">waiting</span>`;
  if (cmd.startsWith('/')) {
    const [first, ...rest] = cmd.split(' or ');
    const alt = rest
      .map(
        (r) =>
          `<button class="bn-alt" onclick="sendPrompt('${esc(r)}')">${esc(r.split(' ')[0])}</button>`,
      )
      .join('');
    return `<button class="bn-act" onclick="sendPrompt('${esc(first)}')">${esc(first)}</button>${alt}`;
  }
  return `<button class="bn-act" onclick="sendPrompt('${esc(cmd)}')">${esc(clip(cmd, 40))}</button>`;
}

function shortTitle(a) {
  return (a.title ?? '').replace(/^MA-\d+\s+—\s+/, '');
}

function rowId(a) {
  return /^MA-\d+/.test(a.title ?? '') ? maId(a) : `#${a.number}`;
}

const FRIENDLY = [
  [/^Todo, deps closed$/, 'nothing blocks it'],
  [/^Todo$/, ''],
  [/^Defined, Reviewed none$/, 'not reviewed yet'],
  [/^pullable$/, 'reviewed, nothing blocks it'],
  [/^marked$/, ''],
  [/^marked, every Depends on closed, promote missed$/, 'reviewed, promote missed'],
  [/^parent unmarked, a child at Defined$/, 'parent not reviewed yet'],
];

function friendly(action) {
  const base = action.replace(/,? ?waits on #\d+(, #\d+)*/, '').trim();
  for (const [re, text] of FRIENDLY) if (re.test(base)) return text;
  return base;
}

function stageClass(a) {
  if (a.bucket === 'yours') return 's-you';
  if (a.bucket === 'drift') return 's-fix';
  if (a.bucket === 'wait') return 's-wait';
  if (a.bucket === 'flight') return 's-flight';
  if (a.bucket === 'pull') return 's-ready';
  return 's-define';
}

function htmlReport(result) {
  const { ctx } = result;
  const inScope = new Map(result.actions.map((a) => [a.number, a]));
  const leaves = result.actions.filter((a) => a.state === 'open' && !a.isParent);
  const leafSet = new Set(leaves.map((a) => a.number));

  const wave = new Map();
  const waveOf = (n, seen = new Set()) => {
    if (wave.has(n)) return wave.get(n);
    if (seen.has(n)) return 0;
    seen.add(n);
    const a = inScope.get(n);
    const blockers = new Set(
      (a?.deps ?? []).filter((d) => !d.closed && leafSet.has(d.number)).map((d) => d.number),
    );
    for (const m of blockedOn(ctx.byNumber.get(n)?.comments ?? []))
      if (leafSet.has(m) && !ctx.isClosed(m)) blockers.add(m);
    const v = blockers.size ? 1 + Math.max(...[...blockers].map((b) => waveOf(b, seen))) : 0;
    wave.set(n, v);
    return v;
  };
  for (const a of leaves) waveOf(a.number);
  const cols = Math.max(1, ...wave.values()) + (leaves.length ? 1 : 0) || 1;

  const edges = [];
  for (const a of leaves) {
    const from = new Set(
      a.deps.filter((d) => !d.closed && leafSet.has(d.number)).map((d) => d.number),
    );
    for (const m of blockedOn(ctx.byNumber.get(a.number)?.comments ?? []))
      if (leafSet.has(m) && !ctx.isClosed(m)) from.add(m);
    for (const b of from) edges.push([b, a.number]);
  }

  const card = (a) => {
    const outside = a.deps
      .filter((d) => !d.closed && !leafSet.has(d.number))
      .map((d) => `#${d.number}`);
    const note = [friendly(a.action), outside.length ? `after ${outside.join(', ')}` : '']
      .filter(Boolean)
      .join(', ');
    const control = a.bucket === 'wait' && !a.command ? '' : actionControl(a);
    const noteHtml = note ? `<span class="bn-why" title="${esc(note)}">${esc(note)}</span>` : '';
    return (
      `<div class="bn-card ${stageClass(a)}" data-issue="${a.number}" style="grid-column:${(wave.get(a.number) ?? 0) + 1}">` +
      `<div class="bn-l1"><a class="bn-id" href="${ISSUE_URL}${a.number}">${esc(rowId(a))}</a><span class="bn-st">${esc(shortStatus(a.status))}</span></div>` +
      `<div class="bn-t" title="${esc(shortTitle(a))}">${esc(shortTitle(a))}</div>` +
      `<div class="bn-l3">${control}${noteHtml}</div></div>`
    );
  };

  const childrenOf = (n) => (ctx.byNumber.get(n)?.children ?? []).map((c) => c.number);
  const placed = new Set();
  const band = (n, depth) => {
    const it = ctx.byNumber.get(n);
    const a = inScope.get(n);
    placed.add(n);
    const kids = childrenOf(n);
    const done = (it?.children ?? []).filter((c) => c.state === 'closed').length;
    const cls = `bn-band${depth ? ' nested' : ''}`;
    const label = it ? rowId(it) : `#${n}`;
    const title = it ? shortTitle(it) : '';
    const status = a
      ? shortStatus(a.status)
      : shortStatus(it?.status ?? (it?.state === 'closed' ? 'Done' : null));
    if (it?.state === 'closed' || (kids.length && done === kids.length)) {
      for (const k of kids) placed.add(k);
      return `<section class="${cls} closed bn-span" data-issue="${n}"><div class="bn-bh"><a class="bn-id" href="${ISSUE_URL}${n}">${esc(label)}</a><span class="bn-t">${esc(title)}</span><span class="bn-c">${esc(status)}, ${kids.length} children</span></div></section>`;
    }
    const control = a && a.command ? actionControl(a) : '';
    const why =
      a && a.bucket !== 'wait' ? `<span class="bn-c">${esc(friendly(a.action))}</span>` : '';
    const head = `<div class="bn-bh"><a class="bn-id" href="${ISSUE_URL}${n}">${esc(label)}</a><span class="bn-t" title="${esc(title)}">${esc(title)}</span><span class="bn-c">${esc(status)}${kids.length ? `, ${done} of ${kids.length} done` : ''}</span>${why}${control}</div>`;
    const leafKids = kids.filter((k) => leafSet.has(k)).map((k) => inScope.get(k));
    const parentKids = kids
      .filter((k) => !leafSet.has(k) && (ctx.byNumber.get(k)?.children ?? []).length > 0)
      .sort(
        (x, y) =>
          Number(ctx.byNumber.get(x)?.state === 'closed') -
          Number(ctx.byNumber.get(y)?.state === 'closed'),
      );
    const cells = Array.from({ length: cols }, () => []);
    for (const k of leafKids) cells[Math.min(wave.get(k.number) ?? 0, cols - 1)].push(k);
    const waveRow =
      depth === 0 && leaves.length
        ? cells.map((_, i) => `<div class="bn-wave">Wave ${i + 1}</div>`).join('')
        : '';
    const cellHtml = cells
      .map(
        (list, i) =>
          `<div class="bn-cell" style="grid-column:${i + 1}">${list.map(card).join('')}</div>`,
      )
      .join('');
    const nested = parentKids.map((k) => band(k, depth + 1)).join('');
    return `<section class="${cls}${depth ? ' bn-span' : ''}" data-issue="${n}">${head}<div class="bn-grid" style="--cols:${cols}">${waveRow}${cellHtml}${nested}</div></section>`;
  };

  const roots = [];
  for (const a of result.actions) {
    if (!a.isParent) continue;
    const parent = a.parent;
    if (parent && inScope.has(parent) && inScope.get(parent).isParent) continue;
    roots.push(a.number);
  }
  if (result.scope && !roots.includes(result.scope) && inScope.get(result.scope)?.isParent)
    roots.unshift(result.scope);
  roots.sort(
    (x, y) => (ctx.byNumber.get(x)?.boardIndex ?? 0) - (ctx.byNumber.get(y)?.boardIndex ?? 0),
  );
  let body = roots.map((n) => band(n, 0)).join('');
  const stray = leaves
    .filter((a) => !a.parent || !placed.has(a.parent))
    .filter((a) => !placed.has(a.number));
  if (stray.length) {
    const cells = Array.from({ length: cols }, () => []);
    for (const a of stray) cells[Math.min(wave.get(a.number) ?? 0, cols - 1)].push(a);
    const waveRow = !roots.length
      ? cells.map((_, i) => `<div class="bn-wave">Wave ${i + 1}</div>`).join('')
      : '';
    body += `<section class="bn-band"><div class="bn-bh"><span class="bn-t">No parent</span></div><div class="bn-grid" style="--cols:${cols}">${waveRow}${cells.map((list, i) => `<div class="bn-cell" style="grid-column:${i + 1}">${list.map(card).join('')}</div>`).join('')}</div></section>`;
  }

  const count = (b) => leaves.filter((a) => a.bucket === b).length;
  const runnable = count('flight') + count('pull') + count('define');
  const needs = result.actions.filter((a) => a.bucket === 'yours' || a.bucket === 'drift').length;
  const waiting = count('wait');
  const head = `<div class="bn-head"><span>${runnable} to run, ${needs} need you, ${waiting} waiting</span><span>${esc(localStamp(result.fetchedAt))}</span></div>`;
  const key = `<div class="bn-key">A box is a ticket with its children. A card's column is its wave: an arrow into it comes from a ticket that must close first. The button is the next step; hover a card to trace its arrows.</div>`;
  return `<style>${CSS}</style><div class="bn" id="bn-root" data-edges='${JSON.stringify(edges)}'>${head}${key}${body}<svg class="bn-arrows" aria-hidden="true"></svg><script>${SCRIPT}</script></div>\n`;
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
    process.stdout.write(htmlReport(result));
  } else {
    process.stdout.write(textReport(result));
  }
}

main();
