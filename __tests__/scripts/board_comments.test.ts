import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const moduleUrl = pathToFileURL(
  path.join(__dirname, '..', '..', 'scripts', 'board_comments.mjs'),
).href;

interface Call {
  query: string;
  variables: Record<string, unknown>;
}

const RECORD = 'Question: open\nAsks: Which screen owns the tally?\nLeft: Defined';

// Keyed by the cursor a call sends: the newer page first, then the older one holding the record.
const PAGES: Record<string, { nodes: string[]; hasPreviousPage: boolean; startCursor: string }> = {
  'start-of-snapshot-page': {
    nodes: ['Scope note three', 'Scope note four'],
    hasPreviousPage: true,
    startCursor: 'start-of-newer-page',
  },
  'start-of-newer-page': {
    nodes: [RECORD, 'Scope note two'],
    hasPreviousPage: false,
    startCursor: 'start-of-older-page',
  },
};

const driver = `
import { earlierComments } from ${JSON.stringify(moduleUrl)};
const pages = ${JSON.stringify(PAGES)};
const calls = [];
const graphql = (query, variables = {}) => {
  calls.push({ query, variables });
  const page = pages[variables.cursor];
  if (!page) throw new Error('no page for cursor ' + variables.cursor);
  const comments = {
    pageInfo: { hasPreviousPage: page.hasPreviousPage, startCursor: page.startCursor },
    nodes: page.nodes.map((body) => ({ body })),
  };
  const alias = /(\\w+)\\s*:\\s*issue\\s*\\(/.exec(query)?.[1] ?? 'issue';
  return { repository: { [alias]: { comments } } };
};
const result = await earlierComments(graphql, 146, 'start-of-snapshot-page');
process.stdout.write(JSON.stringify({ result, calls }));
`;

function runDriver(): { status: number | null; stdout: string; stderr: string } {
  const r = spawnSync('node', ['--input-type=module', '-e', driver], { encoding: 'utf8' });
  return { status: r.status, stdout: r.stdout, stderr: r.stderr };
}

describe('earlierComments', () => {
  const r = runDriver();

  test('the module loads and the driver exits clean', () => {
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  test('pages back until hasPreviousPage is false and returns the bodies oldest first', () => {
    const out = JSON.parse(r.stdout || '{}') as { result?: string[]; calls?: Call[] };
    expect(out.result).toEqual([RECORD, 'Scope note two', 'Scope note three', 'Scope note four']);
    expect(out.calls).toHaveLength(2);
    expect(out.calls?.[0]?.variables.cursor).toBe('start-of-snapshot-page');
    expect(out.calls?.[1]?.variables.cursor).toBe('start-of-newer-page');
  });

  test('the number is written into the query text, never sent as a variable', () => {
    const out = JSON.parse(r.stdout || '{}') as { calls?: Call[] };
    expect(out.calls).toHaveLength(2);
    for (const call of out.calls ?? []) {
      expect(call.query).toContain('issue(number: 146)');
      expect(call.variables).not.toHaveProperty('number');
    }
  });
});
