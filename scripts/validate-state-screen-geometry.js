// Invariant (#338): EmptyState and ErrorState draw their layout from the one shared module,
// `src/components/ui/state_screen.geometry.ts`, and never re-inline it. Before this guard all
// three ways of breaking that — deleting the import, dropping or mis-kinding the resolver
// call, overriding a slot with a raw `ms()` literal — left the whole CI parity chain green.
//
// The list below is fixed on purpose, not a glob over `src/components/ui/*.tsx`: the
// invariant is these two files bound to that one module, and a glob would fire on every
// component that legitimately scales a value of its own.
//
// The `ms()` ban is total for these two files. Any future legitimately-scaled value there
// must land in the geometry module or in `src/constants/theme.ts` — which is what the
// message says, because that constraint is the point rather than a side effect.
//
// An unpaired quote character in JSX text — `'` in `Don't`, `"` in `a 5" screen` — reads as a
// string opener to `scripts/lib/strip-comments.js`, so the rest of that physical line — a
// trailing `{/* … ms(80) … */}` included — survives stripping and reds the `ms()` check at a
// value that exists only in prose: keep any comment naming `ms(` on a line of its own.
//
// The reverse edge, accepted rather than fixed: `stripComments` removes comments, not string
// contents, so BOTH text checks are satisfied by their own text sitting inside a string literal.
// The call check is a substring test (`const hint = "see resolveStateScreenLayout('empty')";`),
// and IMPORT is no stronger — its regex runs against the joined stripped source, so a component
// whose real import line is replaced by a string literal holding that same import text still
// matches, and this guard exits 0 printing `validated (2 components)`.
//
// Excluding string literals needs a scanner this guard deliberately does not own. What closes
// the hole is `tsc` in the same parity chain, not a second text check: neither fake declares
// anything, so `npm run typecheck` exits 2. The import fake reds
// `empty_state.tsx(13,16): error TS2304: Cannot find name 'resolveStateScreenLayout'.`; the call
// fake reds seven `TS2304: Cannot find name 'LAYOUT'`, six of them inside `StyleSheet.create`.
const fs = require('fs');
const path = require('path');
const { stripComments } = require('./lib/strip-comments');

const root = path.join(__dirname, '..');
const errors = [];

const BOUND_COMPONENTS = [
  { path: 'src/components/ui/empty_state.tsx', kind: 'empty' },
  { path: 'src/components/ui/error_state.tsx', kind: 'error' },
];

// No `g` flag on either: with one, RegExp#test carries lastIndex between calls and silently
// skips roughly every other match. IMPORT is tested against the whole joined source rather
// than line by line, so `[^}]*` spans newlines and an oxfmt-wrapped named-import list still
// matches. The `['"]` around the module specifier is not redundant with oxfmt normalising to
// single quotes: `format:check` runs first in the parity chain, but a locally-edited file is
// double-quoted until it is formatted, and this check's failure message sends the developer
// looking for an import that is right there. RAW_SCALE's negative lookbehind keeps `forms(`,
// `items(` and any `x.ms(` out, and the required open paren is what keeps the bare
// `import { ms } …` line from ever matching.
const IMPORT =
  /import\s*\{[^}]*\bresolveStateScreenLayout\b[^}]*\}\s*from\s*['"]@\/components\/ui\/state_screen\.geometry['"]/;
const RAW_SCALE = /(?<![\w.])ms\s*\(/;

for (const component of BOUND_COMPONENTS) {
  const abs = path.join(root, component.path);

  // A guarded path that is not on disk must not scan as zero clean files — that is the
  // silent pass this repo keeps shipping.
  if (!fs.existsSync(abs)) {
    errors.push(
      `${component.path}: listed in scripts/validate-state-screen-geometry.js but does not exist — update the guard's component list`,
    );
    continue;
  }

  // Comments are stripped before matching, so prose *about* the geometry cannot red the
  // guard: `error_state.tsx` names `ms()` in its className note, and that is the only `ms(`
  // in either component — prose or code. Lines are blanked, not deleted, so the reported
  // line number is the real file's.
  const stripped = stripComments(fs.readFileSync(abs, 'utf8').split('\n'));

  // All three checks run for every component and every violation is collected — the process
  // exits once, after printing all of them, never on the first.
  if (!IMPORT.test(stripped.join('\n'))) {
    errors.push(
      `${component.path}: does not import \`resolveStateScreenLayout\` from '@/components/ui/state_screen.geometry' — the shared state-screen geometry must not be re-inlined (#338)`,
    );
  }

  const call = `resolveStateScreenLayout('${component.kind}')`;
  if (!stripped.some((line) => line.includes(call))) {
    errors.push(`${component.path}: does not call \`${call}\` (#338)`);
  }

  // Every offending line, not just the first: an N-violation change otherwise costs N runs of
  // the full parity chain to find them all, and the header above promises all of them.
  stripped.forEach((line, index) => {
    if (RAW_SCALE.test(line)) {
      errors.push(
        `${component.path}:${index + 1}: raw \`ms()\` call — state-screen geometry belongs in src/components/ui/state_screen.geometry.ts and other sizes in src/constants/theme.ts (#338)`,
      );
    }
  });
}

if (errors.length > 0) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`State-screen geometry binding validated (${BOUND_COMPONENTS.length} components)`);
