import { spawnSync } from 'node:child_process';
import path from 'node:path';

const script = path.join(__dirname, '..', '..', 'scripts', 'board_server.mjs');

function check(command: string): { status: number | null; argv: string[][] | null } {
  const r = spawnSync('node', [script, '--check', command], { encoding: 'utf8' });
  return { status: r.status, argv: r.status === 0 ? (JSON.parse(r.stdout) as string[][]) : null };
}

describe('what the board page may run', () => {
  test('status, promote and add with literal arguments, chained with &&', () => {
    expect(
      check('bash scripts/board.sh status 112 Done && bash scripts/board.sh promote 113').argv,
    ).toEqual([
      ['status', '112', 'Done'],
      ['promote', '113'],
    ]);
    expect(check('bash scripts/board.sh status 115 "Ready For Development"').argv).toEqual([
      ['status', '115', 'Ready For Development'],
    ]);
    expect(check('bash scripts/board.sh add 130').argv).toEqual([['add', '130']]);
  });

  test('a placeholder, an unknown column, a shell trick or any other command is refused', () => {
    for (const bad of [
      'bash scripts/board.sh status 122 <column>',
      'bash scripts/board.sh status 122 Shipped',
      'bash scripts/board.sh promote 113; rm -rf /',
      'bash scripts/board.sh promote 113 && gh issue close 378',
      'gh issue close 378 --reason completed',
      '/ship 104',
      'fix the header line',
      '',
    ])
      expect(check(bad).status).toBe(2);
  });
});
