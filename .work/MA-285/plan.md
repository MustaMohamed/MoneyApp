# MA-285 — Six commitments tests fail when their code is reverted
base: fadaa567b5179badff1027309d45b97250a74403 · verify: none · flags: none · expected diff: ~0 lines

## Steps
### 1. The revert table and the base test count exist, run at the PR's base
- File: none in the repo. Write the table to `~/.ship/MoneyApp/MA-285/reverts.md` for the PR body.
- Change: at base, before any deletion, run `npm test -- --ci` once and record the `Tests:` and `Test Suites:` totals. Then apply each revert below alone, run the named suites, record the deleted block's result (green or red) and the covering test's title and result, and restore with `git checkout -- src` and `git diff --exit-code -- src` before the next. `test -f` each suite path first (`.claude/rules/review.md` § Gates). One row per revert:
  - M1 · `src/modules/commitments/screens/commitments/components/commitment_row.helpers.ts:193-196`, the `leg === undefined ? undefined :` branch dropped · blocks "prints the due day alone on an EGP row", "draws no leg on an unpaid USD row before the live rate loads", "draws no leg on a USD row with no amount" · covering `__tests__/screens/commitments/commitment_row.helpers.test.ts:326` "speaks the name, account, status, due day, amount with its code, then the day indicator" (its label reads `captionLeg`, `commitment_row.helpers.ts:215`), plus the 4 amount and 5 label blocks of the same suite the ticket Context counts.
  - M2 · `src/modules/commitments/domain/commitment_section_sums.ts:57`, `|| rate === undefined` dropped · block "draws no leg on an unpaid USD row before the live rate loads" · covering `__tests__/commitment_section_sums.test.ts:215` "an %s USD row gives no leg before the rate loads".
  - M3 · same line, `amount === undefined ||` dropped · block "draws no leg on a USD row with no amount" · covering `__tests__/commitment_section_sums.test.ts:225`.
  - M4 · `commitment_section_sums.ts:55`, the `payment.currency !== Currency.USD` guard dropped · block "prints the due day alone on an EGP row" · covering `__tests__/commitment_section_sums.test.ts:166`.
  - R2a · `src/modules/commitments/screens/commitments/detail/components/pay_sheet.state.ts:64-73`, `open` keeps the prior entry's `postCloseAction` · block "starts every entry with no hand-off pending" · covering `__tests__/screens/commitments/pay_sheet.state.test.ts:63`.
  - R2b · `pay_sheet.state.ts:48`, `postCloseAction: undefined` dropped from `INITIAL_PAY_SHEET_ENTRY` · same block · covering `pay_sheet.state.test.ts:63` and `:36`.
  - R3 · `src/modules/commitments/screens/commitments/commitments.store.ts:33-36`, `INITIAL_STATE` emptied · block "starts holding no read and no failure" · covering `__tests__/screens/commitments/commitments.store.test.ts:275`.
  - R5 · `src/utils/use_debounced_value.hook.ts:8`, `return () => clearTimeout(handle);` removed · block "cleans up the timer on unmount" · covering `__tests__/use_debounced_value.hook.test.ts:35` and `:109`.
  A row where the block is the only red test stops the run: that block is kept (Rules), and the step reports it as a discrepancy.
- Test: none · this step measures the blocks; it changes no file.

### 2. The three row helper blocks are gone
- File: `__tests__/screens/commitments/commitment_row.helpers.test.ts` (`describe('buildCommitmentRowPresentation USD leg')`, `:502`)
- Change: delete the `it` blocks "prints the due day alone on an EGP row" (`:507`), "draws no leg on an unpaid USD row before the live rate loads" (`:538`), "draws no leg on a USD row with no amount" (`:544`). `usdRow`, `usdCommitment`, `present` and `AmountType` keep other users (`:376`, `:428`, `:513`), so no import changes.
- Test: none · the step deletes tests.

### 3. The pay sheet block and its import are gone
- File: `__tests__/screens/commitments/pay_sheet.state.test.ts` (`:16`, import `:2`)
- Change: delete "starts every entry with no hand-off pending" and drop `INITIAL_PAY_SHEET_ENTRY` from the import at `:1-4`; it has no other use in the file. The `beforeEach` at `:14` stays.
- Test: none · the step deletes a test.

### 4. The screen store block is gone
- File: `__tests__/screens/commitments/commitments.store.test.ts` (`describe('createCommitmentsScreenStore on a fake repository')`, `:63`)
- Change: delete "starts holding no read and no failure" (`:64`). `fakeRepo` and `createCommitmentsScreenStore` keep other users.
- Test: none · the step deletes a test.

### 5. The debounce unmount block is gone and the count matches
- File: `__tests__/use_debounced_value.hook.test.ts` (`describe('useDebouncedValue')`, `:61`)
- Change: delete "cleans up the timer on unmount" (`:61-75`), its one-line comment with it. Run `npm test -- --ci` and record `Tests:` and `Test Suites:`: six fewer tests than step 1, the same suite count. `git diff --stat origin/main -- ':!__tests__' ':!.work'` prints nothing. The PR body carries step 1's table and both counts.
- Test: none · the step deletes a test.

## Non-goals
- Copy-mirror blocks (MA-283, #927); the #904 double read at `__tests__/screens/commitments/commitments.hook.test.ts:1998` (MA-284, #928).
- `__tests__/screens/transactions.screen.test.tsx:448` "MA-213: a model with no lead…" stays byte-identical.
- No other block in the four suites changes; no `.claude/rules/tests.md` line; no `src/` change, reverts included, once step 1 restores them.
- R1 (`captionLeg` forced undefined) is not a revert of what the row blocks assert; it gets no table row.

## Untested inputs
- none

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A revert in step 1 whose result differs from the ticket's spike (a block red alone, or a covering test green) invalidates that block's deletion; it is a discrepancy, not a judgement call.
- `oxlint` flags an unused import if step 3 leaves `INITIAL_PAY_SHEET_ENTRY` in place.
- A `src/` revert left applied after step 1 breaks Rules line 1; `git diff --exit-code -- src` after each restore guards it.

## Self-assessment
Step 1 is the least sure: M1 "dropped" is read here as `captionLeg` computed unconditionally from `leg`, and what `formatDisplayAmount(undefined, …)` does then (throw or print) decides whether the row blocks go red by assertion or by error; either counts as red, but the PR row should say which.
