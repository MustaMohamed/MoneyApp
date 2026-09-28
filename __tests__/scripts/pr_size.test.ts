import { spawnSync } from 'node:child_process';
import path from 'node:path';

const script = path.join(
  __dirname,
  '..',
  '..',
  '.claude',
  'skills',
  'ship',
  'scripts',
  'pr_size.mjs',
);

function size(files: { filename: string; additions: number }[]): string {
  const r = spawnSync('node', [script, '--stdin'], {
    input: JSON.stringify(files),
    encoding: 'utf8',
  });
  expect(r.status).toBe(0);
  return r.stdout.trim();
}

describe('the delivered size written back on merge', () => {
  test('mocks, jest setup and test helpers count as tests, lockfiles count nowhere', () => {
    expect(
      size([
        { filename: 'src/modules/accounts/store/accounts.store.ts', additions: 40 },
        { filename: '__tests__/accounts/accounts_store.test.ts', additions: 30 },
        { filename: '__mocks__/expo-sqlite.js', additions: 5 },
        { filename: 'jest.setup.js', additions: 2 },
        { filename: 'src/test_helpers/db.ts', additions: 7 },
        { filename: 'package-lock.json', additions: 900 },
        { filename: 'skills-lock.json', additions: 12 },
      ]),
    ).toBe('Delivered: 1 files outside tests, 40 lines, 44 lines in tests');
  });

  test('a side with no files prints 0, not a blank', () => {
    expect(size([{ filename: '.claude/skills/ship/references/merge.md', additions: 2 }])).toBe(
      'Delivered: 1 files outside tests, 2 lines, 0 lines in tests',
    );
    expect(size([{ filename: '__tests__/scripts/pr_size.test.ts', additions: 9 }])).toBe(
      'Delivered: 0 files outside tests, 0 lines, 9 lines in tests',
    );
  });

  test('anything but a PR number or --stdin is a usage error', () => {
    expect(spawnSync('node', [script, 'abc'], { encoding: 'utf8' }).status).toBe(2);
  });
});
