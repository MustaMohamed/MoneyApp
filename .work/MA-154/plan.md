# MA-154 — The state-screen geometry check runs as rows of the structural guards check
base: 95079fde4c7dbab4c05d89c6e6e8061745324655 · verify: none · flags: none · expected diff: ~32 lines

## Steps
### 1. The two state-screen components are named rows of the structural guards check, and the suite proves each of their six guards fires
- File: `scripts/validate-structural-guards.js` (`herouiImport` at `:57-68`, `NAMED_ROWS` at `:90-248`, `reportBanned` at `:304-311`, the named-file loops at `:349-365`)
- Change: Add two path constants under the `UI` block, `src/components/ui/empty_state.tsx` and `src/components/ui/error_state.tsx`. Generalise the import matcher: `namedImport(module: string, name: string): Requirement`, both arguments required strings, never `null`; it builds the `HEROUI_IMPORT` regex with `escapeRegExp(module)` in place of `heroui-native` (keep the `g` flag, `matchAll` needs it) and the `missing` text `no named import of \`${name}\` from '${module}'`; `herouiImport(name)` becomes `namedImport('heroui-native', name)` so every existing row's message is unchanged. Add `RAW_SCALE = /(?<![\w.])ms\s*\(/` as the banned pattern (no `g` flag; the lookbehind keeps `items(` and `theme.ms(` out and the paren keeps a bare `ms` import out, `scripts/validate-state-screen-geometry.js:45-54`). Add one row per component, each `{ files: [<one path>], banned: [RAW_SCALE], rule, required: [namedImport('@/components/ui/state_screen.geometry', 'resolveStateScreenLayout'), holds(/resolveStateScreenLayout\(\s*['"]<kind>['"]\s*\)/, "no `resolveStateScreenLayout('<kind>')` call")], needs }` with kind `empty` for `empty_state.tsx` and `error` for `error_state.tsx`; `rule` is one shared string, `is a raw scale call; state-screen geometry belongs in src/components/ui/state_screen.geometry.ts and other sizes in src/constants/theme.ts (#338)`, and `needs` is `a state-screen component draws its layout from the shared resolver with its own kind`. A helper that returns the row from `(path, kind)` is the implementer's call. Nothing else in the file changes: the missing-file line `${rel}: not in the tree; move its rows in ${SCRIPT}` (`:352`) already covers both paths once they are in `NAMED_ROWS`, and `load` strips comments so `error_state.tsx:47`'s prose `ms()` stays clean.
- Test: `first` · `__tests__/scripts/validate_structural_guards.test.ts`. Add `EMPTY_STATE` and `ERROR_STATE` path constants. BANNED: one seed on `EMPTY_STATE`, text `const seeded = ms(80);`, token `ms(`. REQUIRED, four seeds, two per file, each with distinct text: `EMPTY_STATE` drops the import name (`replaceOnce(EMPTY_STATE, '  resolveStateScreenLayout,\n', '')`, words `no named import of \`resolveStateScreenLayout\``) and swaps the kind (`replaceEvery(EMPTY_STATE, "resolveStateScreenLayout('empty')", "resolveStateScreenLayout('error')")`, words `no \`resolveStateScreenLayout('empty')\``); `ERROR_STATE` drops the import (`replaceOnce(ERROR_STATE, 'import { resolveStateScreenLayout }', 'import { seeded }')`, same import words) and swaps the kind to `'empty'` (words `no \`resolveStateScreenLayout('error')\``). Named files: extend `it.each([SCREEN, LAYOUT])` to `[SCREEN, LAYOUT, EMPTY_STATE]`; add `names every raw ms() line in a state-screen component` (two `appendLine` calls on `ERROR_STATE`, `const a = ms(11);` then `const b = ms(22);`, `expectReported` with `lineAt` for both lines); add `exits 0 on \`items(\` and a member \`.ms(\` in a state-screen component` (`appendLine(EMPTY_STATE, 'const seeded = items(1) + theme.ms(2);')`, `expectClean`). The existing `exits 0 with one stdout line on the unseeded tree` case is the proof that the real components, including `error_state.tsx:47`'s comment, pass.

### 2. `npm run lint` no longer runs the geometry check
- File: `package.json` (`scripts.lint`, `package.json:13`)
- Change: Remove ` && node scripts/validate-state-screen-geometry.js` from `scripts.lint`; the chain reads `… && oxlint --type-aware --type-check && node scripts/validate-structural-guards.js`.
- Test: `none` · the suite's `npm run lint` case already asserts the structural script is in the chain; a `not.stringContaining` case would name the removed script, which Acceptance forbids. The implementer proves this step with `git grep -n "validate-state-screen-geometry\|validate_state_screen_geometry" -- . ':(exclude)docs/scopes' ':(exclude)docs/superpowers'` returning nothing after step 4.

### 3. The geometry check and its suite are gone
- File: `scripts/validate-state-screen-geometry.js` and `__tests__/scripts/validate_state_screen_geometry.test.ts`
- Change: `git rm` both. Both in one step: the suite's first case runs the script at its real path, so neither survives the other.
- Test: `none` · deletions; `npm test -- --ci` passes with the suite gone and step 1's cases present.

### 4. The suite's scratch-fixture entry leaves `.gitignore`
- File: `.gitignore` (`:75-76`)
- Change: Remove the comment line `# scratch fixtures for __tests__/scripts/validate_state_screen_geometry.test.ts` and the entry `.s338-guard-fixtures/`. The `.ma017-guard-fixtures/` pair above it (`:72-73`) belongs to the money-formatting suite and stays.
- Test: `none` · a gitignore line has no test layer; the step-2 grep covers it.

## Non-goals
- The money-formatting check (`scripts/validate-money-formatting.js`) and its chain link stay as they are: a tree-wide scan with an allowlist, not a named-file check.
- `scripts/lib/strip-comments.js` is not touched; how it reads an unpaired quote in JSX text is #367, closed as accepted.
- No app source file changes: `src/components/ui/empty_state.tsx`, `error_state.tsx` and `state_screen.geometry.ts` are read by the check and the suite, never edited.
- The existing `NAMED_ROWS`, `TREE_ROWS`, `DELETED_PATHS` and `reportLayout` are not reworded or reordered; the only edit outside the two new rows is the `namedImport` generalisation.
- No `docs/adr/` file is added: the ticket carries no Flag and the ADR at `docs/adr/2026-09-01-empty-error-state-stay-separate.md:30` names #338's type guard, not the script.

## Untested inputs
- A double-quoted call, `resolveStateScreenLayout("empty")`, and a double-quoted module specifier, `from "@/components/ui/state_screen.geometry"`, which the step 1 call matcher and `namedImport`'s `['"]` (kept from `HEROUI_IMPORT`, `scripts/validate-structural-guards.js:57`) accept and no seed exercises; left untested because oxfmt normalises to single quotes and `format:check` runs before `lint` in the chain, so either `"` alternative only ever meets a locally unformatted file. Each of the six guards has a seed in step 1, the missing file has its `it.each` entry, and the clean tree has the existing `expectClean` case.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Once, before hand-off: `git grep -n -i "validate-state-screen-geometry\|validate_state_screen_geometry\|s338-guard" -- . ':(exclude)docs/scopes' ':(exclude)docs/superpowers'` prints nothing (Acceptance line 3).

## Risks
- The REQUIRED run seeds every file at once; if `herouiNames` or another helper is later made to run over `EMPTY_STATE` or `ERROR_STATE`, the two seeds on one file would collide. Today no other seed touches them.
- `replaceOnce` throws on a non-unique target: if `empty_state.tsx`'s import list is reformatted so `'  resolveStateScreenLayout,\n'` is absent, the seed fails before the run, which is the intended failure, not a silent pass.
- Generalising `herouiImport` must leave its message byte-identical; the `withoutImport` seeds match `no named import of \`${name}\`` only, so a changed prefix would still pass them while changing what the developer reads.
- The old suite's case 1 ran the real script at its real path; the new suite runs only from the fakeroot. The fakeroot copies `src/` wholesale, so the real tree is still what `expectClean` sees.

## Self-assessment
Step 1 is the one I am least sure about, on one point: whether to add two rows or one row with a shared `banned` and `required` import plus two call-only rows. I chose two rows because `rule` and `needs` are per row and the call differs per file, so one row per component reads as the table the ticket describes; the cost is a repeated `rule` string behind a const, and a helper hides it. The matchers themselves are the old script's regexes moved verbatim, and the call matcher widens from a substring to either quote style, consistent with the import regex's own `['"]` rationale at `validate-state-screen-geometry.js:48-51`.
