// The board page. Reads /api/board (board_next.mjs --format json) and draws it; the only write is POST /api/run with a command the board offered.
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"]/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c],
    );
  const set = (id, html) => {
    $(id).innerHTML = html;
  };
  const WHO = { you: 'you', session: 'a session', page: 'this page', nobody: 'nothing to run' };
  const SHORT = { 'Ready For Development': 'Ready', 'Awaiting Human': 'Awaiting you' };
  const COL_CLASS = {
    'Awaiting Human': 'human',
    'Ready For Development': 'ready',
    Planned: 'ready',
    'In Progress': 'ready',
    'In Review': 'ready',
    Blocked: 'hold',
    Done: 'done',
  };

  let board = null;
  let open = [];
  let byN = new Map();
  let focus = null;
  let filter = '';
  let actorF = 'all';

  const title = (a) => (a.title ?? '').replace(/^MA-\d+\s+—\s+/, '');
  const ids = (a) => `<b class="tc-ma">${esc(a.ma)}</b><span class="tc-num">#${a.number}</span>`;
  const label = (n) => {
    const a = byN.get(n);
    return a ? `${esc(a.ma)} <span class="inum">#${n}</span>` : `<span class="inum">#${n}</span>`;
  };
  const colPill = (a) => {
    const name = a.status ?? 'off board';
    return `<span class="tc-col ${COL_CLASS[name] ?? 'define'}">${esc(SHORT[name] ?? name)}</span>`;
  };

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => {
      el.hidden = true;
    }, 1800);
  }
  const copy = (text) =>
    navigator.clipboard.writeText(text).then(
      () => toast(`Copied: ${text}`),
      () => toast(text),
    );

  // line three of the card: who acts, then the command, the PR link, the Fix button, or the reason nothing runs
  function actionLine(a) {
    const who = `<span class="td-who">${WHO[a.actor]}</span>`;
    if (a.actor === 'you' && a.pr?.state === 'OPEN' && /^merge PR/.test(a.action))
      return `${who}<a href="${a.pr.url}" target="_blank" rel="noopener">${esc(a.action)}</a>`;
    if (a.runnable)
      return `${who}<span class="td-text">${esc(a.action)}</span><button class="fix" data-run="${a.number}">Fix</button>`;
    if (a.command && /^(\/|gh |bash )/.test(a.command))
      return `${who}<code data-copy="${esc(a.command)}" title="Click to copy">${esc(a.command)}</code>`;
    return `${who}<span class="td-text">${esc(a.command ?? a.action)}</span>`;
  }

  function card(n, kind = '') {
    const a = byN.get(n);
    if (!a) return '';
    const parent = a.parent ? byN.get(a.parent) : null;
    const waits = a.waitsOn?.length ?? 0;
    const pr =
      a.pr && !(a.actor === 'you' && /^merge PR/.test(a.action))
        ? `<a class="td-pr" href="${a.pr.url}" target="_blank" rel="noopener">PR #${a.pr.number}${a.pr.state === 'MERGED' ? ' merged' : ''}</a>`
        : '';
    const prog = a.progress;
    const segs = prog
      ? `<div class="td-segs" title="${prog.closed} of ${prog.total} children closed">${Array.from({ length: prog.total }, (_, i) => `<i class="${i < prog.closed ? 'done' : 'blocked'}"></i>`).join('')}</div>`
      : '';
    return `<article class="tc dense ${kind} who-${a.actor}" data-focus="${n}" tabindex="0" title="${esc(title(a))}">
      <div class="td-1">${ids(a)}${a.parent ? `<span class="td-in">in ${parent ? esc(parent.ma) : `#${a.parent}`}</span>` : ''}${colPill(a)}</div>
      <div class="td-2">${esc(title(a))}</div>
      <div class="td-3">${prog && a.actor === 'nobody' ? `<span class="td-who">${WHO.nobody}</span><span class="td-text"><b>${prog.closed} of ${prog.total}</b> children closed</span>` : actionLine(a)}<span class="td-badges">${pr}${waits ? `<span class="hold">waits ${waits}</span>` : ''}${a.unblocks ? `<span class="free">frees ${a.unblocks}</span>` : ''}</span></div>
      ${segs}
    </article>`;
  }

  // ---------- the three views: real cards over a layer of curves ----------
  const CH = 74;
  const curve = (xa, ya, xb, yb, cls, tip = '') => {
    const dx = Math.max(40, (xb - xa) * 0.55);
    return `<path class="flow ${cls}" d="M${xa},${ya} C${xa + dx},${ya} ${xb - dx},${yb} ${xb},${yb}">${tip ? `<title>${esc(tip)}</title>` : ''}</path>`;
  };
  const place = (n, x, yMid, w, kind) =>
    `<div class="slot" style="left:${x}px;top:${yMid - CH / 2}px;width:${w}px;height:${CH}px">${card(n, kind)}</div>`;
  const fold = (count, x, yMid, w) =>
    `<div class="slot" style="left:${x}px;top:${yMid - 17}px;width:${w}px;height:34px"><div class="tc-fold">${count} done</div></div>`;
  const paint = (el, W, H, paths, body) => {
    el.style.height = `${H}px`;
    el.innerHTML = `<div class="canvas" style="width:${W}px;height:${H}px"><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${paths}</svg>${body}</div>`;
  };
  const widthOf = (el) => Math.max(980, el.clientWidth - 2);
  const kindOf = (n, f) =>
    !f
      ? ''
      : n === f.number
        ? 'me'
        : f.waitsOn.includes(n)
          ? 'in'
          : f.frees.includes(n)
            ? 'out'
            : '';
  const nothing = (el, text) => {
    el.style.height = 'auto';
    el.innerHTML = `<p class="empty">${text}</p>`;
  };

  function drawFocus() {
    const el = $('v-focus');
    const f = byN.get(focus);
    if (!f) return nothing(el, 'No open ticket to show.');
    const left = f.waitsOn.filter((n) => byN.has(n));
    const right = f.frees;
    const W = widthOf(el);
    const cw = Math.min(340, (W - 252) / 3);
    const gy = 10;
    const rows = Math.max(1, left.length, right.length);
    const H = 40 + rows * (CH + gy);
    const xs = [16, W / 2 - cw / 2, W - cw - 16];
    const cy = 40 + (rows * (CH + gy)) / 2 - gy / 2;
    const ys = (k) => Array.from({ length: k }, (_, i) => cy + (i - (k - 1) / 2) * (CH + gy));
    let paths = '';
    let body = `<span class="lab" style="left:${xs[0]}px">it waits on ${left.length || 'nothing'}</span><span class="lab" style="left:${xs[1]}px">the ticket you picked</span><span class="lab" style="left:${xs[2]}px">closing it frees ${right.length ? `${right.length} directly, ${f.unblocks} in all` : 'nothing'}</span>`;
    ys(left.length).forEach((y, i) => {
      paths += curve(xs[0] + cw, y, xs[1], cy, 'in');
      body += place(left[i], xs[0], y, cw, 'in');
    });
    ys(right.length).forEach((y, i) => {
      paths += curve(xs[1] + cw, cy, xs[2], y, 'out');
      body += place(right[i], xs[2], y, cw, 'out');
    });
    body += place(f.number, xs[1], cy, cw, 'me');
    paint(el, W, H, paths, body);
  }

  function drawTree() {
    const el = $('v-tree');
    if (!open.length) return nothing(el, 'No open ticket on the board.');
    const f = byN.get(focus);
    const openSet = new Set(open.map((a) => a.number));
    const kidsOf = (n) =>
      open
        .filter((a) => a.parent === n)
        .sort((a, b) => Number(b.isParent) - Number(a.isParent) || a.boardIndex - b.boardIndex);
    const roots = open
      .filter((a) => !a.parent || !openSet.has(a.parent))
      .sort((a, b) => Number(b.isParent) - Number(a.isParent) || a.boardIndex - b.boardIndex);
    const nodes = [];
    let row = 0;
    let deepest = 0;
    const walk = (a, depth) => {
      deepest = Math.max(deepest, depth);
      const kids = kidsOf(a.number);
      const done = a.progress?.closed ?? 0;
      const start = row;
      const childRows = kids.map((k) => walk(k, depth + 1));
      if (done) {
        deepest = Math.max(deepest, depth + 1);
        childRows.push({ fold: done, depth: depth + 1, row: row++ });
      }
      const mine = childRows.length ? (start + row - 1) / 2 : row++;
      const node = { n: a.number, depth, row: mine, kids: childRows };
      nodes.push(node);
      return node;
    };
    const top = roots.map((r) => walk(r, 0));
    const W = widthOf(el);
    const gap = 70;
    const cw = Math.min(340, (W - gap * deepest - 8) / (deepest + 1));
    const rh = CH + 8;
    const pitch = deepest ? Math.min((W - cw - 8) / deepest, cw + 320) : 0;
    const x = (d) => d * pitch;
    const y = (r) => 30 + r * rh + CH / 2;
    let paths = '';
    let body = ['top level', 'its tasks', 'children of a split task', 'split again']
      .slice(0, deepest + 1)
      .map((t, d) => `<span class="lab" style="left:${x(d)}px">${t}</span>`)
      .join('');
    const draw = (node) => {
      for (const k of node.kids) {
        paths += curve(
          x(node.depth) + cw,
          y(node.row),
          x(k.depth),
          y(k.row),
          k.fold ? 'fold' : 'hier',
        );
        if (k.fold) body += fold(k.fold, x(k.depth), y(k.row), cw);
        else draw(k);
      }
      body += place(node.n, x(node.depth), y(node.row), cw, kindOf(node.n, f));
    };
    top.forEach(draw);
    paint(el, W, 30 + row * rh, paths, body);
  }

  function drawGraph() {
    const el = $('v-graph');
    if (!open.length) return nothing(el, 'No open ticket on the board.');
    const f = byN.get(focus);
    const maxD = Math.max(...open.map((a) => a.depth));
    const cols = Array.from({ length: maxD + 1 }, (_, d) => open.filter((a) => a.depth === d));
    const linked = (a) => a.waitsOn.length || a.frees.length;
    const rowOf = {};
    cols[0].sort(
      (a, b) =>
        Number(Boolean(linked(b))) - Number(Boolean(linked(a))) ||
        b.unblocks - a.unblocks ||
        a.boardIndex - b.boardIndex,
    );
    cols[0].forEach((a, i) => {
      rowOf[a.number] = i;
    });
    for (let d = 1; d <= maxD; d++) {
      const bary = (a) =>
        a.waitsOn.reduce((s, n) => s + (rowOf[n] ?? 0), 0) / Math.max(1, a.waitsOn.length);
      cols[d].sort((a, b) => bary(a) - bary(b) || a.boardIndex - b.boardIndex);
      cols[d].forEach((a, i) => {
        rowOf[a.number] = i;
      });
    }
    const W = widthOf(el);
    const gap = 80;
    const cw = Math.min(340, (W - gap * maxD - 8) / (maxD + 1));
    const rh = CH + 8;
    const tall = Math.max(...cols.map((c) => c.length));
    const pitch = maxD ? Math.min((W - cw - 8) / maxD, cw + 320) : 0;
    const xOf = (d) => d * pitch;
    const yOf = (a) => 30 + (rowOf[a.number] + (tall - cols[a.depth].length) / 2) * rh + CH / 2;
    let paths = '';
    let body = cols
      .map(
        (c, d) =>
          `<span class="lab" style="left:${xOf(d)}px">${d === 0 ? `nothing holds these ${c.length}` : `${c.length} held by tickets to the left`}</span>`,
      )
      .join('');
    for (const a of open)
      for (const n of a.waitsOn) {
        const b = byN.get(n);
        if (!b || b.state !== 'open') continue;
        paths += curve(
          xOf(b.depth) + cw,
          yOf(b),
          xOf(a.depth),
          yOf(a),
          a.number === focus ? 'in' : n === focus ? 'out' : 'dim',
          `${a.ma} #${a.number} waits on ${b.ma} #${n}`,
        );
      }
    for (const a of open) body += place(a.number, xOf(a.depth), yOf(a), cw, kindOf(a.number, f));
    paint(el, W, 30 + tall * rh, paths, body);
  }

  // ---------- heroes, table, drawer, rail ----------
  function heroes() {
    const one = (n, lead, cls) => {
      const a = byN.get(n);
      if (!a)
        return `<div class="hero-card ${cls}"><div class="lead">${lead}</div><div class="big">Nothing</div><p>No ticket waits on ${cls === 'mine' ? 'you' : 'a session'} right now.</p></div>`;
      const big = a.command && a.command.startsWith('/') ? a.command : a.action;
      const why = a.unblocks
        ? `it frees ${a.unblocks} ticket${a.unblocks > 1 ? 's' : ''}`
        : 'it is first in board order';
      const btn =
        a.pr?.state === 'OPEN' && cls === 'mine'
          ? `<a class="b sm" href="${a.pr.url}" target="_blank" rel="noopener">Open PR #${a.pr.number}</a>`
          : a.command
            ? `<button class="b sm" data-copy="${esc(a.command)}">Copy</button>`
            : '';
      return `<div class="hero-card ${cls}"><div class="lead">${lead}</div><div class="big">${esc(big)}</div><p>${label(a.number)} ${esc(title(a))}. Ranked ${a.rank}: ${why}.</p><div class="rowb">${btn}<button class="b sm" data-focus="${a.number}">Show it</button></div></div>`;
    };
    set(
      'heroes',
      one(board.next.you, 'Yours next', 'mine') + one(board.next.session, 'A session next', 'sess'),
    );
  }

  const rowBtn = (a) =>
    a.runnable
      ? `<button class="b sm danger" data-run="${a.number}">Fix</button>`
      : a.actor === 'you' && a.pr?.state === 'OPEN'
        ? `<a class="b sm" href="${a.pr.url}" target="_blank" rel="noopener">Open PR</a>`
        : a.command && /^(\/|gh |bash )/.test(a.command)
          ? `<button class="b sm" data-copy="${esc(a.command)}">Copy</button>`
          : '';

  function table() {
    const f = filter.trim().toLowerCase();
    const list = [...board.actions]
      .sort((a, b) => (a.rank ?? 1e6) - (b.rank ?? 1e6) || a.boardIndex - b.boardIndex)
      .filter(
        (a) =>
          (actorF === 'all' || a.actor === actorF) &&
          (!f ||
            [a.ma, `#${a.number}`, a.title, a.status, a.bucket, a.action, a.command, WHO[a.actor]]
              .join(' ')
              .toLowerCase()
              .includes(f)),
      );
    const count = (who) => board.actions.filter((a) => a.actor === who).length;
    set(
      'chips',
      [
        ['all', 'Everyone', board.actions.length],
        ['you', 'You', count('you')],
        ['session', 'A session', count('session')],
        ['page', 'This page', count('page')],
        ['nobody', 'Nothing to run', count('nobody')],
      ]
        .map(
          ([v, l, n]) =>
            `<button data-actor="${v}" aria-pressed="${v === actorF}">${l} <span>${n}</span></button>`,
        )
        .join(''),
    );
    set(
      'rows',
      list
        .map(
          (
            a,
          ) => `<tr data-focus="${a.number}" class="${a.number === focus ? 'on' : ''}"><td class="rk">${a.rank ?? ''}</td>
        <td><b>${esc(a.ma)}</b> <span class="inum">#${a.number}</span><small>${esc(title(a).slice(0, 60))}</small></td>
        <td>${colPill(a)}</td><td><span class="actor ${a.actor}">${WHO[a.actor]}</span></td>
        <td>${a.pr ? `<a href="${a.pr.url}" target="_blank" rel="noopener">#${a.pr.number}</a><small>${a.pr.state.toLowerCase()}, checks ${String(a.pr.checks).toLowerCase()}</small>` : '<span class="dim">none</span>'}</td>
        <td class="num">${a.waitsOn?.length || ''}</td><td class="num">${a.unblocks || ''}</td>
        <td>${a.command ? `<code>${esc(a.command)}</code><small>${esc(a.action)}</small>` : `<span class="dim">${esc(a.action)}</span>`}</td><td>${rowBtn(a)}</td></tr>`,
        )
        .join(''),
    );
    set(
      'count',
      list.length === board.actions.length
        ? `${list.length}`
        : `${list.length} of ${board.actions.length}`,
    );
    $('none').hidden = list.length > 0;
  }

  function drawer() {
    const a = byN.get(focus);
    if (!a) return set('drawer', '<p class="dim">Pick a ticket to see its details.</p>');
    const li = (n) =>
      `<li data-focus="${n}">${label(n)} <span class="dim">${esc(title(byN.get(n) ?? {}).slice(0, 36))}</span></li>`;
    set(
      'drawer',
      `<div class="dr-h"><b>${esc(a.ma)}</b> <span class="inum">#${a.number}</span>${colPill(a)}</div><p class="dr-t">${esc(title(a))}</p>
      <dl><dt>Rank</dt><dd>${a.rank ? `${a.rank}${a.unblocks ? `, frees ${a.unblocks}` : ''}` : 'not ranked, nothing to run'}</dd>
      <dt>Who acts</dt><dd>${WHO[a.actor]}</dd><dt>Why</dt><dd>${esc(a.action)}</dd>
      <dt>Next</dt><dd>${a.command ? `<code>${esc(a.command)}</code>` : '<span class="dim">nothing</span>'}</dd>
      <dt>PR</dt><dd>${a.pr ? `<a href="${a.pr.url}" target="_blank" rel="noopener">#${a.pr.number}</a>, ${a.pr.state.toLowerCase()}, checks ${String(a.pr.checks).toLowerCase()}${a.pr.reviewDecision ? `, ${a.pr.reviewDecision.toLowerCase().replace(/_/g, ' ')}` : ''}` : 'none'}</dd>
      <dt>Reviewed</dt><dd>${esc(a.reviewed ?? 'no field')}</dd><dt>Checks on a device</dt><dd>${a.verify ? 'yes, needs an emulator slot' : 'no'}</dd><dt>Flags</dt><dd>${esc(a.flags)}</dd>
      ${a.parent ? `<dt>Parent</dt><dd data-focus="${a.parent}" style="cursor:pointer">${label(a.parent)}</dd>` : ''}
      ${a.progress ? `<dt>Children</dt><dd>${a.progress.closed} of ${a.progress.total} closed</dd>` : ''}</dl>
      <h3>Waits on ${a.waitsOn?.length || 'nothing'}</h3><ul class="mini">${(a.waitsOn ?? []).map(li).join('')}</ul>
      <h3>Closing it frees ${a.frees?.length ? `${a.frees.length}${a.unblocks > a.frees.length ? `, ${a.unblocks} in all` : ''}` : 'nothing'}</h3><ul class="mini">${(a.frees ?? []).map(li).join('')}</ul>
      <div class="rowb">${rowBtn(a)}<a class="b sm" href="${a.url}" target="_blank" rel="noopener">Open issue #${a.number}</a></div>`,
    );
  }

  function rail() {
    const drift = board.actions.filter((a) => a.bucket === 'drift');
    set('driftN', drift.length);
    set(
      'drift',
      drift.length
        ? drift
            .map(
              (a) =>
                `<li><span><b>${esc(a.ma)}</b> <span class="inum">#${a.number}</span><small>${esc(a.action)}</small></span>${rowBtn(a)}</li>`,
            )
            .join('')
        : '<li class="dim">The board and GitHub agree.</li>',
    );
    const can = open.filter((a) => a.actor !== 'nobody').length;
    set(
      'load',
      `<li><span>Open tickets</span><b>${open.length}</b></li><li><span>Can move now</span><b>${can}</b></li><li><span>Nothing to run</span><b>${open.length - can}</b></li><li><span>Longest chain</span><b>${board.deepestChain + 1} deep</b></li>`,
    );
  }

  const drawAll = () => {
    heroes();
    drawFocus();
    drawTree();
    drawGraph();
    table();
    drawer();
    rail();
  };

  function pick(n) {
    if (!byN.has(n) || n === focus) return;
    focus = n;
    const a = byN.get(n);
    $('focusnote').textContent =
      a.state === 'open'
        ? `${a.ma} #${n}: ${a.action}`
        : `${a.ma} #${n} is closed; the graphs show open tickets.`;
    if (a.state === 'open') {
      drawFocus();
      drawTree();
      drawGraph();
    }
    table();
    drawer();
  }

  function logRun(command, ok, output) {
    const l = $('log');
    if (l.dataset.used !== '1') {
      l.innerHTML = '';
      l.dataset.used = '1';
    }
    l.insertAdjacentHTML(
      'afterbegin',
      `<li class="${ok ? '' : 'bad'}"><time>${new Date().toTimeString().slice(0, 5)}</time><code>${esc(command)}</code><pre>${esc(output || (ok ? 'done' : 'failed'))}</pre></li>`,
    );
  }

  function ask(a) {
    $('dlgP').textContent =
      `${a.ma} #${a.number}: ${a.action}. This writes to Project #2 on GitHub.`;
    $('dlgC').textContent = a.command;
    $('dlgYes').onclick = async () => {
      $('dlg').close();
      toast('Running…');
      try {
        const r = await fetch('/api/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Board-Page': '1' },
          body: JSON.stringify({ command: a.command }),
        });
        const j = await r.json();
        logRun(a.command, r.ok, j.output || j.error);
        toast(r.ok ? 'Done. Re-reading the board.' : `Failed: ${j.error}`);
        if (r.ok) void load(true);
      } catch (e) {
        logRun(a.command, false, String(e.message));
      }
    };
    $('dlg').showModal();
  }

  async function load(fresh) {
    $('fetched').textContent = 'reading Project #2, about five seconds…';
    try {
      const r = await fetch(`/api/board${fresh ? '?fresh=1' : ''}`);
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      board = j;
      byN = new Map(board.actions.map((a) => [a.number, a]));
      open = board.actions.filter((a) => a.state === 'open');
      if (!byN.has(focus)) focus = board.next.you ?? board.next.session ?? open[0]?.number ?? null;
      const b = $('banner');
      b.hidden = !board.readOnly;
      b.className = 'banner info';
      b.textContent = 'Serving a saved snapshot. Nothing is run from this page.';
      $('fetched').textContent =
        `Read at ${new Date(board.fetchedAt).toLocaleString('en-GB', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}`;
      drawAll();
    } catch (e) {
      const b = $('banner');
      b.hidden = false;
      b.className = 'banner';
      b.textContent = `Could not read the board: ${e.message}. Check the connection and press Refresh.`;
      $('fetched').textContent = 'not read';
    }
  }

  document.addEventListener('click', (e) => {
    const t = e.target.closest('[data-run],[data-copy],[data-actor],[data-focus]');
    if (!t || (e.target.closest('a') && !t.dataset.run)) return;
    if (t.dataset.run) ask(byN.get(Number(t.dataset.run)));
    else if (t.dataset.copy) void copy(t.dataset.copy);
    else if (t.dataset.actor) {
      actorF = t.dataset.actor;
      table();
    } else pick(Number(t.dataset.focus));
  });
  $('q').addEventListener('input', (e) => {
    filter = e.target.value;
    table();
  });
  $('dlgNo').onclick = () => $('dlg').close();
  $('refresh').onclick = () => {
    void load(true);
  };
  $('theme').onclick = () => {
    const dark = document.documentElement.dataset.look !== 'light';
    document.documentElement.dataset.look = dark ? 'light' : 'dark';
    $('theme').textContent = dark ? 'Dark' : 'Light';
    try {
      localStorage.setItem('board.look', dark ? 'light' : 'dark');
    } catch {
      /* storage is a convenience */
    }
  };
  try {
    if (localStorage.getItem('board.look') === 'light') $('theme').click();
  } catch {
    /* storage is a convenience */
  }
  // the views are laid out in px from the stage width, so a stage that changes width (window, page scrollbar) is redrawn
  let resizeTimer;
  let drawnAt = 0;
  const stages = ['v-focus', 'v-tree', 'v-graph'].map($);
  new ResizeObserver(() => {
    const w = stages[0].clientWidth;
    if (!board || w === drawnAt) return;
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      drawnAt = w;
      drawFocus();
      drawTree();
      drawGraph();
    }, 100);
  }).observe(stages[0]);
  void load(false);
})();
