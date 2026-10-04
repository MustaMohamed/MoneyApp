import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const script = path.join(repoRoot, 'scripts', 'board_server.mjs');
const fixture = path.join(__dirname, 'fixtures', 'board_next.snapshot.json');

const LT = '\uE000';

// Stands in for gh: answers three issues, renders with the mask characters left in, and logs every call.
const FAKE_GH = `#!/bin/sh
echo "$*" >> "$GH_FAKE_DIR/calls.log"
case "$2" in
  markdown)
    [ -f "$GH_FAKE_DIR/fail-render" ] && exit 1
    cat > "$GH_FAKE_DIR/render-input.json"
    printf '<p>Nothing recorded in \\356\\200\\200Month&gt;</p>'
    ;;
  repos/MustaMohamed/MoneyApp/issues/7)
    printf '{"number":7,"title":"MA-007 \\342\\200\\224 Fresh title","body":"Nothing recorded in <Month>"}'
    ;;
  repos/MustaMohamed/MoneyApp/issues/8)
    printf '{"number":8,"title":"Big","body":"'
    head -c 400000 /dev/zero | tr '\\0' 'a'
    printf '"}'
    ;;
  repos/MustaMohamed/MoneyApp/issues/9)
    printf '{"number":9,"title":"No body","body":null}'
    ;;
  *)
    echo "gh: Not Found (HTTP 404)" >&2
    exit 1
    ;;
esac
`;

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => resolve(port));
    });
  });
}

function get(port: number, url: string): Promise<{ status: number; body: string }> {
  return new Promise((resolve, reject) => {
    http
      .get({ host: '127.0.0.1', port, path: url }, (res) => {
        let body = '';
        res.setEncoding('utf8');
        res.on('data', (chunk: string) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
      })
      .on('error', reject);
  });
}

async function serve(dir: string, extra: string[]): Promise<{ port: number; child: ChildProcess }> {
  const port = await freePort();
  const child = spawn(process.execPath, [script, '--port', String(port), ...extra], {
    cwd: repoRoot,
    env: { ...process.env, PATH: `${dir}${path.delimiter}${process.env.PATH}`, GH_FAKE_DIR: dir },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((resolve, reject) => {
    child.once('exit', (code) => reject(new Error(`the server exited ${code} before listening`)));
    child.stdout?.once('data', () => resolve());
  });
  return { port, child };
}

describe('GET /api/issue on the board server', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'board-server-'));
  const calls = () =>
    fs.existsSync(path.join(dir, 'calls.log'))
      ? fs.readFileSync(path.join(dir, 'calls.log'), 'utf8').trim().split('\n')
      : [];
  let live: { port: number; child: ChildProcess };
  let saved: { port: number; child: ChildProcess };

  beforeAll(async () => {
    fs.writeFileSync(path.join(dir, 'gh'), FAKE_GH, { mode: 0o755 });
    live = await serve(dir, []);
    saved = await serve(dir, ['--snapshot', fixture]);
  });
  afterAll(() => {
    live.child.kill();
    saved.child.kill();
    fs.rmSync(dir, { recursive: true, force: true });
  });
  beforeEach(() => {
    for (const f of ['calls.log', 'render-input.json', 'fail-render'])
      fs.rmSync(path.join(dir, f), { force: true });
  });

  test.each(['abc', '0', '7/comments', '', '1/../2'])(
    'n=%s is refused before gh is called',
    async (n) => {
      const r = await get(live.port, `/api/issue?n=${encodeURIComponent(n)}`);
      expect([r.status, JSON.parse(r.body)]).toEqual([400, { error: 'not an issue number' }]);
      expect(calls()).toEqual([]);
    },
  );

  test('a body goes to the renderer masked and reaches the page with its placeholder as text', async () => {
    const r = await get(live.port, '/api/issue?n=7');
    expect([r.status, JSON.parse(r.body)]).toEqual([
      200,
      {
        number: 7,
        title: 'MA-007 — Fresh title',
        html: '<p>Nothing recorded in &lt;Month&gt;</p>',
      },
    ]);
    expect(calls()).toEqual(['api repos/MustaMohamed/MoneyApp/issues/7', 'api markdown --input -']);
    expect(JSON.parse(fs.readFileSync(path.join(dir, 'render-input.json'), 'utf8'))).toEqual({
      text: `Nothing recorded in ${LT}Month>`,
      mode: 'gfm',
      context: 'MustaMohamed/MoneyApp',
    });
  });

  test('a second read of the same issue asks GitHub again', async () => {
    await get(live.port, '/api/issue?n=7');
    await get(live.port, '/api/issue?n=7');
    expect(calls().filter((c) => c.endsWith('issues/7'))).toHaveLength(2);
  });

  test('an issue with no body is not sent to the renderer', async () => {
    const r = await get(live.port, '/api/issue?n=9');
    expect([r.status, JSON.parse(r.body)]).toEqual([
      200,
      { number: 9, title: 'No body', html: '' },
    ]);
    expect(calls()).toEqual(['api repos/MustaMohamed/MoneyApp/issues/9']);
  });

  test('an issue GitHub does not have is a 502 carrying the last line gh printed', async () => {
    const r = await get(live.port, '/api/issue?n=404');
    expect([r.status, JSON.parse(r.body)]).toEqual([502, { error: 'gh: Not Found (HTTP 404)' }]);
  });

  test('a renderer that exits before reading a large body is a 502, and the server answers the next read', async () => {
    fs.writeFileSync(path.join(dir, 'fail-render'), '');
    const failed = await get(live.port, '/api/issue?n=8');
    expect(failed.status).toBe(502);
    fs.rmSync(path.join(dir, 'fail-render'));
    const next = await get(live.port, '/api/issue?n=9');
    expect(next.status).toBe(200);
    expect(live.child.exitCode).toBeNull();
  });

  test('a saved snapshot reads no body: 409, and gh is never called', async () => {
    const r = await get(saved.port, '/api/issue?n=102');
    expect([r.status, JSON.parse(r.body)]).toEqual([
      409,
      { error: 'serving a saved snapshot, ticket bodies are not in it' },
    ]);
    expect(calls()).toEqual([]);
  });

  test('the page it serves carries the reader dialog', async () => {
    const r = await get(saved.port, '/');
    expect(r.status).toBe(200);
    expect(r.body).toContain('<dialog id="reader"');
  });
});
