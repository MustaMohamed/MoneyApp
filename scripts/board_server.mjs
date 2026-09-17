#!/usr/bin/env node
// Local board page: serves scripts/board_page, reads the board through board_next.mjs, and runs only what board_run.mjs whitelists. Binds to 127.0.0.1.
import { execFile } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parseRunnable } from './board_run.mjs';

const run = promisify(execFile);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const PAGE = path.join(HERE, 'board_page');
const FILES = {
  '/': ['index.html', 'text/html; charset=utf-8'],
  '/board.css': ['board.css', 'text/css; charset=utf-8'],
  '/board.js': ['board.js', 'text/javascript; charset=utf-8'],
};
const CACHE_MS = 15_000;

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {{ port: number; snapshot: string; check: string; hasCheck: boolean }} */
  const o = { port: 4178, snapshot: '', check: '', hasCheck: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--port') o.port = Number(argv[++i]);
    else if (argv[i] === '--snapshot') o.snapshot = argv[++i];
    else if (argv[i] === '--check') {
      o.check = argv[++i] ?? '';
      o.hasCheck = true;
    }
  }
  return o;
}

const opts = parseArgs(process.argv.slice(2));

if (opts.hasCheck) {
  const argv = parseRunnable(opts.check);
  if (!argv) process.exit(2);
  process.stdout.write(`${JSON.stringify(argv)}\n`);
  process.exit(0);
}

let cache = { key: null, at: 0, body: null };
let offered = new Set();

async function readBoard(scope, fresh) {
  const key = scope ?? 'all';
  if (!fresh && cache.key === key && Date.now() - cache.at < CACHE_MS) return cache.body;
  const args = [path.join(HERE, 'board_next.mjs'), '--format', 'json'];
  if (scope) args.push('--scope', String(scope));
  if (opts.snapshot) args.push('--snapshot', opts.snapshot);
  const { stdout } = await run('node', args, {
    cwd: ROOT,
    timeout: 90_000,
    maxBuffer: 16 * 1024 * 1024,
  });
  const board = JSON.parse(stdout);
  offered = new Set(board.actions.filter((a) => a.runnable).map((a) => a.command));
  cache = {
    key,
    at: Date.now(),
    body: JSON.stringify({ ...board, readOnly: Boolean(opts.snapshot) }),
  };
  return cache.body;
}

function send(res, status, type, body) {
  res.writeHead(status, {
    'Content-Type': type,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; frame-ancestors 'self'",
  });
  res.end(body);
}
const json = (res, status, obj) =>
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(obj));

function localOnly(req) {
  const host = (req.headers.host ?? '').split(':')[0];
  return host === '127.0.0.1' || host === 'localhost';
}

async function handleRun(req, res) {
  if (
    req.headers['x-board-page'] !== '1' ||
    !(req.headers['content-type'] ?? '').startsWith('application/json')
  )
    return json(res, 403, { error: 'not from the board page' });
  if (opts.snapshot) return json(res, 409, { error: 'serving a saved snapshot, nothing is run' });
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 2048) return json(res, 413, { error: 'too large' });
  }
  let command;
  try {
    command = JSON.parse(raw).command;
  } catch {
    return json(res, 400, { error: 'not json' });
  }
  const argvs = parseRunnable(command);
  if (!argvs) return json(res, 400, { error: 'not a command this page may run' });
  if (!offered.has(command))
    return json(res, 409, { error: 'the board did not offer this command; refresh first' });
  let output = '';
  try {
    for (const argv of argvs) {
      const r = await run('bash', [path.join(HERE, 'board.sh'), ...argv], {
        cwd: ROOT,
        timeout: 120_000,
      });
      output += r.stdout + r.stderr;
    }
  } catch (e) {
    cache.at = 0;
    return json(res, 502, {
      error: String(e.stderr || e.message)
        .trim()
        .split('\n')
        .pop(),
      output,
    });
  }
  cache.at = 0;
  return json(res, 200, { ok: true, output: output.trim() });
}

/** @param {import('node:http').IncomingMessage} req @param {import('node:http').ServerResponse} res */
async function handle(req, res) {
  try {
    if (!localOnly(req)) return json(res, 403, { error: 'local only' });
    const url = new URL(req.url, 'http://127.0.0.1');
    if (req.method === 'GET' && FILES[url.pathname]) {
      const [file, type] = FILES[url.pathname];
      return send(res, 200, type, fs.readFileSync(path.join(PAGE, file)));
    }
    if (req.method === 'GET' && url.pathname === '/api/board') {
      const scope = /^\d+$/.test(url.searchParams.get('scope') ?? '')
        ? url.searchParams.get('scope')
        : null;
      try {
        return send(
          res,
          200,
          'application/json; charset=utf-8',
          await readBoard(scope, url.searchParams.has('fresh')),
        );
      } catch (e) {
        return json(res, 502, {
          error: String(e.stderr || e.message)
            .trim()
            .split('\n')
            .pop(),
        });
      }
    }
    if (req.method === 'POST' && url.pathname === '/api/run') return await handleRun(req, res);
    return json(res, 404, { error: 'not found' });
  } catch (e) {
    return json(res, 500, { error: String(e.message) });
  }
}

const server = http.createServer((req, res) => {
  void handle(req, res);
});

server.listen(opts.port, '127.0.0.1', () => {
  process.stdout.write(
    `board page on http://127.0.0.1:${opts.port}${opts.snapshot ? ' (saved snapshot, read only)' : ''}\n`,
  );
});
