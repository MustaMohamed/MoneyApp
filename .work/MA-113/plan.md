# MA-113 — The category swatch list carries a category name
base: 87b13411 · verify: none · flags: none · expected diff: ~8 lines

## Steps
### 1. The swatch list is exported as `CategoryColors` and every code reference reads that name
- File: `src/constants/theme.ts:263` (the definition); `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.state.ts:6`, `:34`; `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:15`, `:130`, `:269`; `__tests__/add_edit_category_sheet.state.test.ts:2`, `:12`, `:86`, `:105`; `__tests__/category_colour_contrast.test.ts:3`, `:49`, `:120`, `:125`, `:157`
- Change: `export const CategoryColors` replaces `export const AccountColors`. Its type stays `readonly ['#5C7FC4', '#A2792C', '#478D6E', '#D5583E', '#B264A7', '#2381DF', '#B67009', '#338D7D', '#A866BA', '#CC602C', '#5D81B6', '#76873A']`, 12 entries in that order, `as const`, none optional and none `null`. The identifier is the only token that changes on each of the 15 lines, which are the 15 references LSP returns at `theme.ts:263:14`. All five files move in one commit, because `tsconfig.json` includes `__tests__` and `typecheck` fails on any subset. No alias or re-export of the old name stays.
- Test: `none` · Acceptance line 4 bars a changed expectation, and a rename adds no behaviour for a new case. The nine identifier lines in the two suites are `owned by implementer`. Guards, identifier only: `__tests__/add_edit_category_sheet.state.test.ts:8-16`, `:82-89`, `:93-108`; `__tests__/category_colour_contrast.test.ts:88-162`, where `:135-161` compares each of the 12 positions with the tone migration 021 writes.

### 2. The category colour ADR names `CategoryColors`
- File: `docs/adr/2026-09-26-category-colour-contrast-floor.md:6`, `:22`
- Change: The backticked identifier on each of the two lines becomes `CategoryColors`, edited in place with no amendment note, as #640 (`dc2cb03a`) and #623 (`85e84a22`) edited the ADRs they touched. No other word on either line changes.
- Test: `none` · a document. `npm run lint` checks it for the banned certification phrases.

## Non-goals
- The swatch values and their order: MA-103 (#564) shipped them.
- No alias, re-export or deprecation shim under the old name.
- The list stays where it is in `src/constants/theme.ts`. It does not move to `src/constants/theme_tokens.ts` or into the categories module, and it gains no comment.
- The test-local `CategoryColour` interface (`__tests__/category_colour_contrast.test.ts:44`), `RETIRED_SWATCHES` (`:23`) and every `it` title keep their text.
- `selectedColor`, `setSelectedColor`, `styles.colorRow`, `styles.colorSwatch` and `Strings.categoriesColorLabel` keep their names.
- The ADR changes on `:6` and `:22` only. Its date, status, ticket line and §4 stay.

## Untested inputs
- The sheet's swatch row and its add-mode default colour (`add_edit_category_sheet.tsx:269`, `:130`): no suite renders the sheet, and `git grep -l add_edit_category_sheet -- __tests__` lists the state and schema suites only. `npm run typecheck` fails on a missed line (step 1).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- The suites pass at base and at head, so these are the checks that differ, each with its base result:
  - `git grep -n AccountColors -- src __tests__ docs/adr`: 17 lines at base, none at head.
  - `git grep -l AccountColors -- . ':!docs/scopes' ':!docs/superpowers' ':!.work'`: 6 files at base, none at head. `.work/MA-113/plan.md` names the old constant until `/ship` removes it.
  - `git grep -n CategoryColors -- src __tests__ docs/adr`: none at base; at head 17 lines, at the positions the first grep prints at base.
  - `git diff --numstat origin/main -- src __tests__ docs/adr`: empty at base; at head six rows with equal added and deleted counts, 1, 2 and 3 for the `src` files in step 1's order, 4 and 5 for the two suites, 2 for the ADR. The longest renamed code line is 77 columns and `.oxfmtrc.json` wraps at 100, so oxfmt reflows nothing.
  - `git diff -U0 origin/main -- src __tests__ docs/adr | grep -E '^[-+]' | grep -vE '^(--- |\+\+\+ )' | sed -E 's/^[-+]//; s/(Account|Category)Colors/X/g' | sort | uniq -c | awk '$1 % 2'`: prints nothing at head, and prints both sides of any changed line where more than the identifier differs (Acceptance line 4). It is empty at base too, so it counts only beside the 17 added and 17 deleted lines of the numstat rows.

## Risks
- A reader of `AccountColors` that lands on `main` before this merges fails `typecheck` after the rebase. It takes the same identifier swap, and the grep and numstat counts above move with it.
- A change on `main` to the list's values or to the sheet's swatch row shifts the cited lines and the type in step 1. The rename carries whatever `main` holds.

## Self-assessment
Step 1's `Test:` line is the part I am least sure about. The implementer charter (`.claude/skills/ship/references/implement.md:58`) keeps the implementer out of `__tests__/` except where a step marks lines `owned by implementer`, and I marked the nine identifier lines so, the way MA-136's plan (`.work/MA-136/plan.md` at `9317835a`) put its test import lines in a step's File list under `Test: none`. The other reading is `Test: first`: the test writer swaps the nine lines, both suites go red on the missing `CategoryColors` export, and the implementer's six `src` lines turn them green. Both readings end at the same 17-line diff. I chose the single commit because the red state shows only that the export is missing, which `typecheck` already reports, and it costs a second dispatch on an 8-line change.
