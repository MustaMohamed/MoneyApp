# MA-286 — Fourteen branching strings get their branch tests back
base: a8e4ee9c0b4141bbadcccbbb8e6bbec63872ee69 · verify: none · flags: none · expected diff: ~2 lines

## Steps
### 1. Each of the fourteen branches fails a test when removed in either direction
- File: `__tests__/constants/branching.strings.test.ts` (new, logic-only `.ts`, beside `__tests__/constants/spoken_labels.strings.test.ts`). One suite for all fourteen, the six whole files #932 deleted and the four sites in the files it kept, so the next mirror sweep reads them in one place. The kept files stay unchanged: `account_detail_move.strings.test.ts`, `net_worth_breakdown_sheet.helpers.test.ts`, `transactions_copy_note.test.ts`, `transaction_form_copy.test.ts`.
- Change: import `Strings` from `@/constants/strings` only. Three assertion shapes, each an `it.each` over `[name, (n: number) => string]` rows where a table fits:
  - Count in the text, ten rows: `dashboardBreakdownAssetsHeader('X', n)` (`src/constants/strings.ts:267`), `dashboardBreakdownLiabilitiesHeader('X', n)` (`:269`), `listHeroDaysLeft(n)` (`:1381`), `dashMonthSpentTxs(n)` (`:252`), `commitmentsDurationAfterCountOf(n)` (`:1272`), `emptyAccountsArchivedOnlyDescription(n)` (`:1285`), `fixFieldsMarkedAbove(n)` (`:542`), `n4CaptionConverted(n, 'USD')` (`:120`), `n4PillAccounts(n)` (`:127`), `n4PillNeedsRate(n)` (`:130`). Assert `mask(f(1))` not equal to `mask(f(2))`, with `mask = (s: string) => s.replace(/\d+/g, 'N')`, every digit run masked, and `f(2)` contains `'2'`. Every other argument carries no digit, so the mask touches only the count.
  - No count in the text, three rows: `commitmentsEndsStepperUnit(n)` (`:1115`), `n4CaptionCreditOnly(n)` (`:122`), `n4PillOpeningBal(n)` (`:128`). Assert `f(1)` not equal to `f(2)`, no mask, no digit check.
  - Optional argument, one case: `accountDetailMoveCommitmentCaption(amount, cadence, nextDate?)` (`:336`) with `amount = 'X'`, `cadence = 'Y'`, `nextDate = '12 Nov'`. Assert the call with `nextDate` starts with the call without it and ends with `nextDate`, and the call without it does not contain `'undefined'`.
  - No assertion compares a call with a literal of the function's own text; the only literals compared are the inputs (`'2'`, `nextDate`) and `'undefined'` in a `not.toContain`.
- Test: `first` · this step is the test. Each row passes at base; the implementer confirms each shape bites by flipping one branch of each kind locally (always-singular, always-plural, always-append, never-append) and seeing red, then reverts. No `src/` file changes.

### 2. The copy-mirror bar names the relational branch test as allowed
- File: `.claude/rules/tests.md` (`:14`, the `No copy mirrors` bullet)
- Change: append one sentence to the end of that bullet, without narrowing it: a test that compares a `Strings` call with another call of the same function, at a count of one against two or with an argument against without, is not a mirror. The sentence avoids the phrases `scripts/validate-agent-assets.js:201` bans.
- Test: `none` · a rules `.md` line; `npm run lint` (`validate:agent-assets`) checks its prose.

### 3. No copy mirror is left in `__tests__/constants/`
- File: `__tests__/constants/spoken_labels.strings.test.ts` (deleted whole)
- Change: delete the file. Its one `it.each` compares nine `Strings` members with literals of their own text by `toBe` (`:15`), a mirror under `.claude/rules/tests.md:14`, and a mirror block is deleted whole. No other file imports it.
- Test: `none` · the step removes a test; the bar forbids replacing a mirror, and the nine members carry no branch.

## Non-goals
- Branch tests for the fifteen branching strings that never had one (budget, categories, commitments hero and recurrence, income sheet).
- Restoring any #932-deleted test on a string with no branch.
- Any change to the fourteen strings' copy or to any `src/` file.
- Render cases on the consumers (`replacement_account_sheet.tsx`, `net_worth_breakdown_sheet.tsx`, `stat_cards.tsx`, `hero_card.tsx`, `ends_sheet.tsx`, `empty_state.tsx`).
- A count-of-zero case: the Acceptance lines name only the one-form branch.

## Untested inputs
- none

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A future copy edit that adds a digit run besides the count is masked with it, so a removed branch still leaves the masked forms equal and the suite reddens.
- A reviewer reading the ticket's "their sites go in one new suite" as covering only the six deleted-whole files may ask for the four kept-file sites back in their old files; step 1 puts all fourteen in one suite on purpose.

## Amendments
- 2026-11-05 · step 3 · added from /ship triage of PR #934 (quality lens finding 2): `spoken_labels.strings.test.ts` is the one copy mirror left beside the new suite; deleting it adds 0 lines outside tests, so the expected diff stays ~2.

## Self-assessment
Step 1's single-suite choice is the one I am least sure of: the ticket names the four kept files and could be read as wanting those sites restored there, but three of them are not string suites by subject (`net_worth_breakdown_sheet.helpers` tests helpers, `transactions_copy_note` guards one Copy-note departure), and one file with three shapes is what the added rules sentence points a mirror sweep at.
