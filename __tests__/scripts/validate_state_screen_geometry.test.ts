/**
 * Subprocess contract tests for scripts/validate-state-screen-geometry.js (#338).
 *
 * The guard is CLI-only: top-level execution, `process.exit`, no `module.exports`. It is
 * exercised the same way `npm run lint` runs it — as a subprocess, over its
 * stdout/stderr/exit-code contract, never via `require()`.
 *
 * Fixture hygiene is copied wholesale from `validate_money_formatting.test.ts`, for the
 * same reasons: fixtures live under `<repoRoot>/.s338-guard-fixtures/<pid>/` (gitignored),
 * never an OS temp dir, because the guard derives its root from its own `__dirname` and a
 * fixture anywhere else is invisible to it. The per-pid subdir keeps two concurrent test
 * processes from racing each other's writes and cleanup; a `beforeAll` sweep clears any
 * sibling `<pid>/` dir a crashed run left behind; a non-recursive `afterAll` `rmdirSync`
 * removes the parent only when this process is the last one out.
 *
 * Case 1 is the only case coupled to the real tree: it runs the real guard at its real
 * path against the real checkout, which is the actual `npm run lint` contract. A future
 * `ms()` in either component reds this case and `npm run lint` together — that is the
 * invariant, not a defect in this suite.
 *
 * Cases 2-7 build a fakeroot instead, so `src/` is never mutated. The guard is copied into
 * `fakeroot/scripts/` — its `__dirname`-derived root then resolves to the fakeroot — and
 * `scripts/lib/strip-comments.js` is copied alongside, because the copy's
 * `require('./lib/strip-comments')` resolves relative to itself.
 *
 * Case 4 is the one that matters: import and call both survive and only a geometry value
 * is overridden locally. That is the realistic drift, and it is invisible to the import
 * check. Case 5 is its mirror — both components verbatim, including `error_state.tsx`'s
 * prose `ms()` mention in its className note — so comment-stripping is proven load-bearing
 * against the real components, not only against a fixture.
 */
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.join(__dirname, '..', '..');
const scriptRel = 'scripts/validate-state-screen-geometry.js';
const libRel = 'scripts/lib/strip-comments.js';
const scriptPath = path.join(repoRoot, scriptRel);

const fixtureParent = path.join(repoRoot, '.s338-guard-fixtures');
const fixtureRoot = path.join(fixtureParent, String(process.pid));

const EMPTY_REL = 'src/components/ui/empty_state.tsx';
const ERROR_REL = 'src/components/ui/error_state.tsx';

function runGuardAt(guardPath: string): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [guardPath], { encoding: 'utf8' });
}

function readComponent(rel: string): string {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

// Throws rather than returning the source unchanged: a silent no-op replace is how a
// mutation case quietly turns back into a base case and passes for the wrong reason.
function replaceOnce(source: string, search: string, replacement: string): string {
  const first = source.indexOf(search);
  if (first === -1) throw new Error(`fixture mutation target absent: ${search}`);
  if (source.indexOf(search, first + search.length) !== -1) {
    throw new Error(`fixture mutation target not unique: ${search}`);
  }
  return source.slice(0, first) + replacement + source.slice(first + search.length);
}

// `null` content means "do not write this component at all" — case 6's missing-file row.
type ComponentFixture = { rel: string; content: string | null };

function makeFakeRoot(components: ComponentFixture[]): string {
  const fakeRoot = path.join(fixtureRoot, 'fakeroot');
  fs.mkdirSync(path.join(fakeRoot, 'scripts', 'lib'), { recursive: true });
  fs.mkdirSync(path.join(fakeRoot, 'src', 'components', 'ui'), { recursive: true });
  fs.copyFileSync(scriptPath, path.join(fakeRoot, scriptRel));
  fs.copyFileSync(path.join(repoRoot, libRel), path.join(fakeRoot, libRel));
  for (const { rel, content } of components) {
    if (content === null) continue;
    fs.writeFileSync(path.join(fakeRoot, rel), content);
  }
  return path.join(fakeRoot, scriptRel);
}

// Orphan hygiene: a process that crashes mid-suite never reaches its own afterEach/afterAll,
// so its `<pid>/` dir is permanent — and neither oxfmt nor tsconfig's `include` honours
// .gitignore, so a stranded `fakeroot/src/components/ui/*.tsx` reds `format:check` and
// `typecheck` (case 4's fixture writes `ms(80)` into a copy whose `ms` import no longer
// exists — `Cannot find name 'ms'`, a long way from its cause). A dir name that parses as a
// pid and fails `process.kill(pid, 0)` with ESRCH belongs to a process that no longer
// exists; a dir matching this process's own pid is a recycled number and cannot belong to a
// live process, so it is cleared unconditionally.
beforeAll(() => {
  if (!fs.existsSync(fixtureParent)) return;
  for (const entry of fs.readdirSync(fixtureParent)) {
    const pid = Number(entry);
    if (!Number.isInteger(pid) || pid <= 0) continue;
    const entryPath = path.join(fixtureParent, entry);
    if (pid === process.pid) {
      fs.rmSync(entryPath, { recursive: true, force: true });
      continue;
    }
    try {
      process.kill(pid, 0);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ESRCH') {
        fs.rmSync(entryPath, { recursive: true, force: true });
      }
    }
  }
});

beforeEach(() => {
  fs.mkdirSync(fixtureRoot, { recursive: true });
});

afterEach(() => {
  fs.rmSync(fixtureRoot, { recursive: true, force: true });
});

// Non-recursive on purpose: this only succeeds once this process's own afterEach has left
// the parent empty, i.e. this was the last process out. ENOTEMPTY means a concurrent
// process's pid dir is still under the parent — exactly the case where the parent must
// survive. ENOENT means a sibling's afterAll won the same race a moment earlier. Only an
// unexpected code still throws.
afterAll(() => {
  try {
    fs.rmdirSync(fixtureParent);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code !== 'ENOTEMPTY' && code !== 'ENOENT') throw err;
  }
});

describe('validate-state-screen-geometry.js — subprocess CLI contract (#338)', () => {
  // §3 row 1. No fixture — the real guard, the real tree, exactly what `npm run lint` runs.
  it('validates clean at HEAD with no fixture — the real CLI contract', () => {
    const result = runGuardAt(scriptPath);
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/^State-screen geometry binding validated \(2 components\)$/m);
    expect(result.stderr).toBe('');
  });

  // §3 row 2. The import line goes; the resolver call stays, so only the import check fires.
  it('exits 1 when a component no longer imports the resolver', () => {
    const guard = makeFakeRoot([
      {
        rel: EMPTY_REL,
        content: replaceOnce(
          readComponent(EMPTY_REL),
          "import { resolveStateScreenLayout } from '@/components/ui/state_screen.geometry';\n",
          '',
        ),
      },
      { rel: ERROR_REL, content: readComponent(ERROR_REL) },
    ]);
    const result = runGuardAt(guard);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${EMPTY_REL}: does not import`);
  });

  // §3 row 3. The import survives and the call is present — but with the other kind, which
  // is the rename-by-copy-paste shape the substring check exists to catch.
  it('exits 1 when a component calls the resolver with the other kind', () => {
    const guard = makeFakeRoot([
      { rel: EMPTY_REL, content: readComponent(EMPTY_REL) },
      {
        rel: ERROR_REL,
        content: replaceOnce(
          readComponent(ERROR_REL),
          "resolveStateScreenLayout('error')",
          "resolveStateScreenLayout('empty')",
        ),
      },
    ]);
    const result = runGuardAt(guard);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${ERROR_REL}: does not call`);
  });

  // §3 row 4 — the case that matters. Import and call both intact; one slot is overridden
  // locally with raw `ms()` calls, which no import check can see.
  it('exits 1 naming the line when geometry is re-inlined with the import and call intact', () => {
    const mutated = replaceOnce(
      readComponent(EMPTY_REL),
      '    ...LAYOUT.iconCircle,\n',
      '    width: ms(80),\n    height: ms(80),\n    borderRadius: ms(40),\n',
    );
    // Derived from the fixture, never a literal: the line moves whenever the component does.
    const expectedLine =
      mutated.split('\n').findIndex((line) => line.includes('width: ms(80),')) + 1;
    expect(expectedLine).toBeGreaterThan(0);

    const guard = makeFakeRoot([
      { rel: EMPTY_REL, content: mutated },
      { rel: ERROR_REL, content: readComponent(ERROR_REL) },
    ]);
    const result = runGuardAt(guard);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${EMPTY_REL}:${expectedLine}: raw \`ms()\` call`);
    expect(result.stderr).not.toContain('does not import');
    expect(result.stderr).not.toContain('does not call');
  });

  // §3 row 5. Both components verbatim through the fakeroot. `error_state.tsx` names `ms()`
  // in its className note — the only `ms(` in either component, prose or code. Without
  // comment-stripping the guard reds that file at base.
  it('exits 0 when the only `ms()` mentions are inside comments', () => {
    const result = runGuardAt(
      makeFakeRoot([
        { rel: EMPTY_REL, content: readComponent(EMPTY_REL) },
        { rel: ERROR_REL, content: readComponent(ERROR_REL) },
      ]),
    );
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });

  // §3 row 6. A guarded path that is not on disk must fail loudly, never scan zero files
  // into a silent pass.
  it('exits 1 when a listed component is missing from disk', () => {
    const guard = makeFakeRoot([
      { rel: EMPTY_REL, content: readComponent(EMPTY_REL) },
      { rel: ERROR_REL, content: null },
    ]);
    const result = runGuardAt(guard);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${ERROR_REL}: listed in ${scriptRel} but does not exist`);
  });

  // Not a §3 row — added at P8 for the raw-`ms()` check specifically. The guard's header
  // promises "every violation is collected", which was true of the import and call checks
  // and false of this one: it reported the first offending line and stopped, so an
  // N-violation change cost N runs of the whole parity chain to surface them all. Reverting the
  // guard to `findIndex` fails at the SECOND `toContain` below, not at the length assertion:
  // only the first offending line is printed, so the second line's substring is absent and the
  // length assertion never runs. The length assertion earns its own keep on the other side — it
  // is what catches one offending line being reported twice.
  it('names every raw `ms()` line in a component, not only the first', () => {
    const anchor = "const LAYOUT = resolveStateScreenLayout('empty');\n";
    const mutated = replaceOnce(
      readComponent(EMPTY_REL),
      anchor,
      `${anchor}const A = ms(11);\nconst B = ms(22);\n`,
    );
    const lines = mutated.split('\n');
    const firstLine = lines.findIndex((line) => line.includes('const A = ms(11);')) + 1;
    const secondLine = lines.findIndex((line) => line.includes('const B = ms(22);')) + 1;
    expect(firstLine).toBeGreaterThan(0);
    expect(secondLine).toBe(firstLine + 1);

    const guard = makeFakeRoot([
      { rel: EMPTY_REL, content: mutated },
      { rel: ERROR_REL, content: readComponent(ERROR_REL) },
    ]);
    const result = runGuardAt(guard);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(`${EMPTY_REL}:${firstLine}: raw \`ms()\` call`);
    expect(result.stderr).toContain(`${EMPTY_REL}:${secondLine}: raw \`ms()\` call`);
    expect(
      result.stderr.split('\n').filter((line) => line.includes('raw `ms()` call')),
    ).toHaveLength(2);
  });
});
