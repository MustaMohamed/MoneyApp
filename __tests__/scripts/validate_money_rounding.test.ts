import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const SCRIPT_REL = 'scripts/validate-money-rounding.js';
const LIB_RELS = ['scripts/lib/strip-comments.js', 'scripts/lib/list-src-files.js'];

// The ten helpers check 1 of docs/adr/2026-08-22-money-rounding-layer.md names.
const HELPERS = [
  'roundMoney',
  'toCents',
  'sumAllocations',
  'exceedsToCent',
  'ratioHeldAtTie',
  'wholePercent',
  'wholePercentOf',
  'wholePercentGap',
  'compareToPercent',
  'compareGapToPoints',
];

// Declares all ten helpers, so the list names it under each.
const MONEY = 'src/utils/money.ts';
// Listed for `wholePercent(` and for no other helper.
const BUDGET_CARD = 'src/modules/dashboard/screens/dashboard/components/budget_card.tsx';
// Listed once, under `sumAllocations(` alone.
const BUDGET_SCHEMA = 'src/utils/schemas/budget.schema.ts';
// Three files `src` lacks, so no helper's list names them.
const OUTSIDE = 'src/modules/planted/outside_the_list.ts';
const CONTROL = 'src/modules/planted/control_call.ts';
const GHOST = 'src/modules/planted/never_written.ts';

let fakeRoot = '';
const scratchDirs: string[] = [];
const touched = new Map<string, string | undefined>();

jest.setTimeout(20000);

function fakePath(rel: string): string {
  return path.join(fakeRoot, rel);
}

function remember(rel: string): void {
  if (touched.has(rel)) return;
  const abs = fakePath(rel);
  touched.set(rel, fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : undefined);
}

function writeSource(rel: string, content: string): void {
  remember(rel);
  fs.mkdirSync(path.dirname(fakePath(rel)), { recursive: true });
  fs.writeFileSync(fakePath(rel), content);
}

function removeSource(rel: string): void {
  remember(rel);
  fs.rmSync(fakePath(rel));
}

function restoreTouched(): void {
  for (const [rel, content] of touched) {
    if (content === undefined) {
      fs.rmSync(fakePath(rel), { force: true });
    } else {
      fs.writeFileSync(fakePath(rel), content);
    }
  }
  touched.clear();
  for (const dir of scratchDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function makeScratchDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  scratchDirs.push(dir);
  return dir;
}

// What `git ls-files 'src/*.ts' 'src/*.tsx'` prints for the temp root.
function rootFiles(): string[] {
  const found: string[] = [];
  const walk = (rel: string): void => {
    for (const entry of fs.readdirSync(fakePath(rel), { withFileTypes: true })) {
      const child = `${rel}/${entry.name}`;
      if (entry.isDirectory()) {
        walk(child);
      } else if (/\.tsx?$/.test(entry.name)) {
        found.push(child);
      }
    }
  };
  walk('src');
  return found;
}

// The stub prints `files` from a file beside it and exits with `exitCode`.
function makeStubGit(files: string[], exitCode = 0): string {
  const dir = makeScratchDir('ma172-git-stub-');
  const listingPath = path.join(dir, 'listing');
  fs.writeFileSync(listingPath, files.map((file) => `${file}\n`).join(''));
  const gitPath = path.join(dir, 'git');
  fs.writeFileSync(gitPath, `#!/bin/sh\ncat '${listingPath}'\nexit ${exitCode}\n`);
  fs.chmodSync(gitPath, 0o755);
  return dir;
}

function envWithStub(stubDir: string): NodeJS.ProcessEnv {
  return { ...process.env, PATH: `${stubDir}${path.delimiter}${String(process.env.PATH)}` };
}

// The script takes its root from its own folder, so the copy scans the `src` beside it.
function runCopy(env: NodeJS.ProcessEnv): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [fakePath(SCRIPT_REL)], { encoding: 'utf8', env });
}

function runOverListing(files: string[]): SpawnSyncReturns<string> {
  return runCopy(envWithStub(makeStubGit(files)));
}

function runOverRoot(): SpawnSyncReturns<string> {
  return runOverListing(rootFiles());
}

function printed(output: string): string[] {
  return output.split('\n').filter((entry) => entry !== '');
}

// A mention in a file its helper's list lacks: `<path>:<line>: ` then text holding the helper and paren.
function callFindings(stderr: string, rel: string, line: number, helper: string): string[] {
  return printed(stderr).filter(
    (entry) => entry.startsWith(`${rel}:${line}: `) && entry.includes(`\`${helper}(\``),
  );
}

// A list entry with no file or no call: `<path>: ` then text holding the helper and paren.
function entryFindings(stderr: string, rel: string, helper: string): string[] {
  return printed(stderr).filter(
    (entry) => entry.startsWith(`${rel}: `) && entry.includes(`\`${helper}(\``),
  );
}

function findingsNaming(stderr: string, rel: string): string[] {
  return printed(stderr).filter((entry) => entry.startsWith(`${rel}:`));
}

describe('validate-money-rounding.js on the repository (MA-172)', () => {
  // Count asserted non-zero only; a literal count would red on every file `src` gains.
  it('passes on the tree as it is, with the real git, and prints the count of files scanned', () => {
    const result = spawnSync(process.execPath, [path.join(repoRoot, SCRIPT_REL)], {
      encoding: 'utf8',
      env: { ...process.env },
    });

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const out = printed(result.stdout);
    expect(out).toHaveLength(1);
    expect(Number(/\d+/.exec(out[0])?.[0])).toBeGreaterThan(0);
  });
});

describe('validate-money-rounding.js on a copy of src in a temp root (MA-172)', () => {
  beforeAll(() => {
    fakeRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ma172-money-rounding-'));
    fs.cpSync(path.join(repoRoot, 'src'), fakePath('src'), { recursive: true });
    fs.mkdirSync(fakePath('scripts/lib'), { recursive: true });
    for (const rel of LIB_RELS) {
      fs.copyFileSync(path.join(repoRoot, rel), fakePath(rel));
    }
    fs.copyFileSync(path.join(repoRoot, SCRIPT_REL), fakePath(SCRIPT_REL));
  }, 30000);

  afterEach(restoreTouched);

  afterAll(() => {
    if (fakeRoot !== '') fs.rmSync(fakeRoot, { recursive: true, force: true });
  });

  it('passes on the copy as it is and prints the count of files the listing gave', () => {
    const files = rootFiles();
    const result = runOverListing(files);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    const out = printed(result.stdout);
    expect(out).toHaveLength(1);
    expect(out[0].match(/\d+/g)).toContain(String(files.length));
  });

  it.each(HELPERS)(
    'fails a %s( call planted in a file its list lacks, at that line and for that helper alone',
    (helper) => {
      writeSource(OUTSIDE, `export const before = 1;\nexport const planted = ${helper}(1, 2);\n`);
      const result = runOverRoot();

      expect(callFindings(result.stderr, OUTSIDE, 2, helper)).toHaveLength(1);
      expect(findingsNaming(result.stderr, OUTSIDE)).toHaveLength(1);
      expect(result.status).toBe(1);
    },
  );

  it('fails wholePercentOf( planted in a file listed for wholePercent( only', () => {
    const source = fs.readFileSync(fakePath(BUDGET_CARD), 'utf8');
    const body = source.endsWith('\n') ? source : `${source}\n`;
    const line = body.split('\n').length;
    writeSource(BUDGET_CARD, `${body}export const planted = wholePercentOf(0.29, 2);\n`);
    const result = runOverRoot();

    expect(callFindings(result.stderr, BUDGET_CARD, line, 'wholePercentOf')).toHaveLength(1);
    expect(findingsNaming(result.stderr, BUDGET_CARD)).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it.each([
    {
      shape: 'a call with a space before its paren',
      source: 'export const before = 1;\nexport const planted = toCents (1);\n',
      helper: 'toCents',
    },
    {
      shape: 'a call through a namespace import',
      source:
        "import * as money from '@/utils/money';\nexport const planted = money.wholePercentOf(0.29, 2);\n",
      helper: 'wholePercentOf',
    },
  ])('fails $shape in a file outside the list, at that line', ({ source, helper }) => {
    writeSource(OUTSIDE, source);
    const result = runOverRoot();

    expect(callFindings(result.stderr, OUTSIDE, 2, helper)).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('fails a listed file the listing leaves out, once for each helper it is listed under', () => {
    const result = runOverListing(rootFiles().filter((file) => file !== MONEY));

    for (const helper of HELPERS) {
      expect(entryFindings(result.stderr, MONEY, helper)).toHaveLength(1);
    }
    expect(findingsNaming(result.stderr, MONEY)).toHaveLength(HELPERS.length);
    expect(result.status).toBe(1);
  });

  it('fails the declaring file the listing prints and the root lacks, on its ten entries alone', () => {
    const files = rootFiles();
    removeSource(MONEY);
    const result = runOverListing(files);

    for (const helper of HELPERS) {
      expect(entryFindings(result.stderr, MONEY, helper)).toHaveLength(1);
    }
    expect(findingsNaming(result.stderr, MONEY)).toHaveLength(HELPERS.length);
    expect(result.stderr).not.toContain('ENOENT');
    expect(result.stderr).not.toMatch(/^\s+at /m);
    expect(result.stderr).not.toContain('snapToZero');
    expect(result.status).toBe(1);
  });

  it('fails a path listed twice under one helper, on that path and for that helper', () => {
    const script = fs.readFileSync(fakePath(SCRIPT_REL), 'utf8');
    const entry = `    '${BUDGET_SCHEMA}',\n`;
    expect(script.split(entry)).toHaveLength(2);
    writeSource(SCRIPT_REL, script.replace(entry, `${entry}${entry}`));
    const result = runOverRoot();

    expect(entryFindings(result.stderr, BUDGET_SCHEMA, 'sumAllocations')).toHaveLength(1);
    expect(findingsNaming(result.stderr, BUDGET_SCHEMA)).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('fails an import specifier alone in a file outside the list, once for each name', () => {
    writeSource(
      OUTSIDE,
      [
        "import { roundMoney, wholePercentOf } from '@/utils/money';",
        'import {',
        '  compareToPercent,',
        '  toCents,',
        "} from '@/utils/money';",
        '',
        'export const nothingHere = 1;',
        '',
      ].join('\n'),
    );
    const result = runOverRoot();

    expect(callFindings(result.stderr, OUTSIDE, 1, 'roundMoney')).toHaveLength(1);
    expect(callFindings(result.stderr, OUTSIDE, 1, 'wholePercentOf')).toHaveLength(1);
    expect(callFindings(result.stderr, OUTSIDE, 3, 'compareToPercent')).toHaveLength(1);
    expect(callFindings(result.stderr, OUTSIDE, 4, 'toCents')).toHaveLength(1);
    expect(findingsNaming(result.stderr, OUTSIDE)).toHaveLength(4);
    expect(result.status).toBe(1);
  });

  it.each([
    {
      shape: 'a helper imported under another name and called by it',
      source:
        "import { wholePercentOf as pct } from '@/utils/money';\nexport const planted = pct(1, 2);\n",
      line: 1,
      helper: 'wholePercentOf',
    },
    {
      shape: 'a helper passed as a value with no paren after it',
      source: 'export const amounts = [1, 2];\nexport const planted = amounts.map(toCents);\n',
      line: 2,
      helper: 'toCents',
    },
  ])('fails $shape in a file outside the list, at that line', ({ source, line, helper }) => {
    writeSource(OUTSIDE, source);
    const result = runOverRoot();

    expect(callFindings(result.stderr, OUTSIDE, line, helper)).toHaveLength(1);
    expect(findingsNaming(result.stderr, OUTSIDE)).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  it('fails an exported function of the declaring file that no list and no exemption names', () => {
    const source = fs.readFileSync(fakePath(MONEY), 'utf8');
    const body = source.endsWith('\n') ? source : `${source}\n`;
    const line = body.split('\n').length;
    writeSource(MONEY, `${body}export function eleventh(n: number): number {\n  return n;\n}\n`);
    const result = runOverRoot();

    expect(findingsNaming(result.stderr, MONEY)).toEqual([
      expect.stringMatching(new RegExp(`^${MONEY}:${line}: .*\`eleventh\``)),
    ]);
    expect(result.status).toBe(1);
  });

  it('fails an exempt name the declaring file no longer exports as a function', () => {
    const source = fs.readFileSync(fakePath(MONEY), 'utf8');
    const unexported = source.replace('export function snapToZero(', 'function snapToZero(');
    expect(unexported).not.toBe(source);
    writeSource(MONEY, unexported);
    const result = runOverRoot();

    expect(findingsNaming(result.stderr, MONEY)).toEqual([
      expect.stringMatching(new RegExp(`^${MONEY}: .*\`snapToZero\``)),
    ]);
    expect(result.status).toBe(1);
  });

  it('fails a listed file the listing prints and the root lacks, with no read error', () => {
    const files = rootFiles();
    removeSource(BUDGET_CARD);
    const result = runOverListing(files);

    expect(entryFindings(result.stderr, BUDGET_CARD, 'wholePercent')).toHaveLength(1);
    expect(result.stderr).not.toContain('ENOENT');
    expect(result.status).toBe(1);
  });

  it('skips a file outside the list that the listing prints and the root lacks, and passes', () => {
    const result = runOverListing([...rootFiles(), GHOST]);

    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  });

  it('fails a listed file whose call is removed, though its import specifier stays', () => {
    const source = fs.readFileSync(fakePath(BUDGET_CARD), 'utf8');
    const withoutCall = source.split('wholePercent(').join('percentLabel(');
    expect(withoutCall).not.toBe(source);
    expect(withoutCall).toContain('wholePercent');
    writeSource(BUDGET_CARD, withoutCall);
    const result = runOverRoot();

    expect(entryFindings(result.stderr, BUDGET_CARD, 'wholePercent')).toHaveLength(1);
    expect(result.status).toBe(1);
  });

  const quiet = [
    {
      shape: 'a helper named in a line comment, a block comment and a JSDoc block',
      source: [
        '// roundMoney(amount) keeps two decimals.',
        '/* toCents(amount) is the integer form. */',
        '/**',
        ' * wholePercentOf(part, whole) rounds a half up.',
        ' */',
        'export const nothingHere = 1; // exceedsToCent(spent, limit)',
        '',
      ].join('\n'),
    },
    {
      shape: 'a longer name whose tail spells a helper exactly',
      source: 'export const first = _toCents(1);\nexport const second = preroundMoney(2);\n',
    },
  ];

  // The second run adds a file that fails, so a quiet result is not the planted folder going unread.
  it.each(quiet)('passes $shape in a file outside the list', ({ source }) => {
    writeSource(OUTSIDE, source);
    const alone = runOverRoot();

    expect(alone.stderr).toBe('');
    expect(alone.status).toBe(0);

    writeSource(CONTROL, 'export const planted = roundMoney(1);\n');
    const beside = runOverRoot();

    expect(callFindings(beside.stderr, CONTROL, 1, 'roundMoney')).toHaveLength(1);
    expect(findingsNaming(beside.stderr, OUTSIDE)).toEqual([]);
    expect(beside.status).toBe(1);
  });

  const brokenListings = [
    {
      shape: 'a listing that returns no file',
      env: (): NodeJS.ProcessEnv => envWithStub(makeStubGit([])),
    },
    {
      shape: 'a git that prints the files and exits non-zero',
      env: (): NodeJS.ProcessEnv => envWithStub(makeStubGit(rootFiles(), 1)),
    },
    {
      shape: 'a git that cannot start, with PATH holding no git',
      env: (): NodeJS.ProcessEnv => ({ ...process.env, PATH: makeScratchDir('ma172-no-git-') }),
    },
  ];

  // A run that scanned nothing would report every list entry; this failure reports none.
  it.each(brokenListings)('exits 1 on $shape, before it reads the list', ({ env }) => {
    const result = runCopy(env());

    expect(result.status).toBe(1);
    expect(printed(result.stderr)).not.toEqual([]);
    expect(printed(result.stderr).filter((entry) => entry.startsWith('src/'))).toEqual([]);
    expect(result.stderr).not.toMatch(/^\s+at /m);
  });
});
