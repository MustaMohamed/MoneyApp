import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * `moneyapp/no-formstate-off-prop` is the only automated guard for the MA-007
 * defect class — reading `formState` off a `UseFormReturn` prop, which under
 * React Compiler leaves field errors invisible while validation still blocks
 * the submit. No render test can catch that defect (React Compiler is gated on
 * a Metro-only Babel caller flag that Jest never sets), so the rule is load
 * bearing, and a rule that silently stops matching would fail open.
 *
 * This drives the rule over `scripts/__fixtures__/formstate_cases.tsx` and
 * asserts the diagnostics land on exactly the lines marked `// EXPECT-ERROR`.
 */

const ROOT = path.resolve(__dirname, '..');
const FIXTURE = path.join('scripts', '__fixtures__', 'formstate_cases.tsx');
const CONFIG = path.join('scripts', '__fixtures__', 'oxlintrc.json');
const RULE = 'moneyapp(no-formstate-off-prop)';

function expectedErrorLines(): number[] {
  const source = readFileSync(path.join(ROOT, FIXTURE), 'utf8');
  return (
    source
      .split('\n')
      // Anchored: the fixture's own docstring mentions the marker in prose, and an
      // `includes` match counted that as a case.
      .map((line, i) => (/\/\/ EXPECT-ERROR$/.test(line.trimEnd()) ? i + 1 : 0))
      .filter((n) => n > 0)
  );
}

function runRule(): { output: string; lines: number[] } {
  let output: string;
  try {
    output = execFileSync('npx', ['oxlint', '-c', CONFIG, FIXTURE], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    // oxlint exits non-zero when it reports errors, which is the expected path.
    const e = error as { stdout?: string; stderr?: string };
    output = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  }

  const lines = output
    .split('\n')
    .filter((line) => line.includes(RULE))
    .map((line) => {
      const match = /formstate_cases\.tsx:(\d+):/.exec(line);
      return match ? Number(match[1]) : 0;
    })
    .filter((n) => n > 0);

  return { output, lines };
}

describe('moneyapp/no-formstate-off-prop', () => {
  const expected = expectedErrorLines();
  const { output, lines: actual } = runRule();

  it('has fixture cases to check', () => {
    // Guards the guard: an empty marker list would make every assertion vacuous.
    expect(expected.length).toBeGreaterThanOrEqual(6);
  });

  it('loads as an oxlint JS plugin', () => {
    // A plugin that fails to resolve reports nothing, which would otherwise read
    // as "no violations" rather than "rule never ran".
    expect(output).not.toMatch(/Failed to load|Cannot find module|unknown rule/i);
    expect(actual.length).toBeGreaterThan(0);
  });

  it('flags exactly the lines marked EXPECT-ERROR', () => {
    expect([...actual].sort((a, b) => a - b)).toEqual([...expected].sort((a, b) => a - b));
  });

  it('does not flag a form owned by the reading component', () => {
    const source = readFileSync(path.join(ROOT, FIXTURE), 'utf8').split('\n');
    const safeCases = ['OwnsUseForm', 'FormFromScreenHook', 'TheFix', 'UnrelatedFormStateLocal'];

    for (const name of safeCases) {
      const start = source.findIndex((l) => l.includes(`export function ${name}(`));
      expect(start).toBeGreaterThan(-1);
      const end = source.findIndex((l, i) => i > start && l === '}');
      const flagged = actual.filter((n) => n > start && n <= end + 1);
      expect({ case: name, flagged }).toEqual({ case: name, flagged: [] });
    }
  });
});
