# MA-238 — Commitments suites share one payment and commitment builder
base: cf400c4f · verify: none · flags: none · expected diff: ~0 lines (outside tests; in tests ~230 added, ~480 removed)

## Steps

Every rewrite in steps 1 to 7 holds these:
- A kept local builder keeps its name, its signature (positional arguments in today's order, defaults as today) and every call site. Its body becomes one call of `makeTestCommitment` or `makeTestPayment` (`src/test_helpers/commitment.ts:35`, `:59`). The call passes only the fields whose value today differs from the shared default (`src/test_helpers/commitment.ts:35-77`): positional values first, then `...overrides` last, as today.
- A typed or inline literal becomes one `makeTestCommitment({...})` or `makeTestPayment({...})` call under the same rule. Spreads of it (`{ ...payment, id: 'pay-2' }`) stay.
- No `it`, `describe` or `expect` line changes. No wrapper passes `is_active: 1` or `exchange_rate_snapshot: null`, since both equal the shared default. An import the rewrite leaves unused goes (oxlint, `tsc`).
- The import is `@/test_helpers/commitment`, as `__tests__/screens/commitments/commitment_row.helpers.test.ts:20`.

### 1. The account commitment reference builder builds on the shared commitment builder
- File: `src/test_helpers/commitment.ts` (`makeAccountCommitmentRef`, `:8`)
- Change: returns `{ ...makeTestCommitment({ id: 'commitment-1', name: 'Gym', amount: 500, category_id: 'category-1', account_id: 'account-1' }), next_due_date: '2026-10-01', ...overrides }`. Signature unchanged: `(overrides: Partial<AccountCommitmentRef> = {}): AccountCommitmentRef`, `overrides` optional and never `null`; the return is never `null`. Consumers by `git grep -l makeAccountCommitmentRef -- __tests__`: `__tests__/screens/accounts/account_detail.hook.test.ts`, `delete_confirmation.helpers.test.ts`, `replacement_account_sheet.helpers.test.ts`, `replacement_account_sheet.hook.test.ts`, all unchanged.
- Test: none · test code only; the four consumer suites pass with base's test names (Verification).

### 2. The three query suites build their rows from the pair
- File: `__tests__/commitment_payments.query.test.ts` (`makePayment`, `:116`): the random `id` default goes, every call passes `id`; `makeTx` `:136` stays.
- File: `__tests__/commitment.query.test.ts` (`makeCommitment`, `:91`, random `id` default goes, every call passes `id`; positional `makePayment(id, commitmentId, dueDate, overrides)`, `:561`, keeps `paid_date: dueDate` and `amount_paid: 200`).
- File: `__tests__/commitment_month_aggregate.query.test.ts` (`commitment`, `:47`, `id` required, keeps `name: overrides.id` before `...overrides`; `payment`, `:76`, `id` and `due_date` required; `usdPayment` `:96` already builds on `payment` and stays).
- Change: as the rules above.
- Test: none · test code only; the three suites pass with base's test names, and the scratch equivalence check holds (Verification).

### 3. The repository and housekeeping suites build their rows from the pair
- File: `__tests__/commitment.repository.test.ts` (`baseCommitment`, `:109`; `basePayment`, `:145`): both stay single module-level consts, since `:187` and `:433` assert `toBe` identity on them. `baseInput` `:129` is a `NewCommitmentInput` and stays.
- File: `__tests__/commitment.repository.mark_as_paid.test.ts` (positional `commitmentRow(id, currency, amount)`, `:19`, keeps `name: id`). Its payments go through the raw-SQL `insertPayment` and stay.
- File: `__tests__/commitment_housekeeping.repository.test.ts` (`commitment(id, overrides)`, `:92`, keeps `name: id`; `payment(id, commitmentId, dueDate, status = CommitmentPaymentStatus.Upcoming)`, `:173`, takes no overrides and keeps the status-derived `paid_date` and `amount_paid`).
- File: `__tests__/commitment_writes.repository.test.ts` (`commitment`, `:126`; positional `payment(id, dueDate, overrides)`, `:149`).
- File: `__tests__/commitment_housekeeping.helpers.test.ts` (`commitment`, `:10`). The expected planned rows in the `toEqual` from `:57` stay spelled out.
- Change: as the rules above.
- Test: none · test code only; the five suites pass with base's test names, and the scratch equivalence check holds.

### 4. The store, form and status suites build their rows from the pair
- File: `__tests__/commitment.store.test.ts` (`commitment`, `:20`; `payment`, `:43`); `snapshot()` calls them through its default arguments, unchanged.
- File: `__tests__/commitment_form_shared.test.ts` (`MOCK_COMMITMENT`, `:30`).
- File: `__tests__/screens/commitment_status.test.ts` (`mkPayment`, `:9`; `mkCommitment`, `:29`; both keep `over` required, as today).
- Change: as the rules above.
- Test: none · test code only; the three suites pass with base's test names, and the scratch equivalence check holds.

### 5. The commitments list suites build their rows from the pair
- File: `__tests__/screens/commitments.hook.test.ts` (positional `makePayment(id, state, overrides)`, `:108`, keeps `` commitment_id: `commitment-${id}` `` and `...DATES_BY_STATE[state]` before `...overrides`; `makeCommitment(id, overrides)`, `:134`, keeps `name: id`).
- File: `__tests__/screens/commitments.screen.test.tsx` (`makePayment`, `:183`). No case added, per the Render-suite policy in `.claude/rules/tests.md`.
- File: `__tests__/screens/commitments/filter/filter_helpers.test.ts` (`makeCommitment`, `:18`, keeps `notes: 'Lease memo'`; `makePayment`, `:41`, keeps `notes: 'Payment note'`).
- Change: as the rules above.
- Test: none · test code only; the three suites pass with base's test names, and the scratch equivalence check holds.

### 6. The detail, edit and pay sheet suites build their rows from the pair
- File: `__tests__/screens/commitments_detail.helpers.test.ts` (`makePayment`, `:10`).
- File: `__tests__/screens/commitments_detail.store.test.ts` (`makePayment`, `:10`).
- File: `__tests__/screens/commitments_detail.hook.test.ts` (`commitment`, `:72`; `payment`, `:92`, keeps `commitment_id: commitment.id`). `otherCommitment` and `otherPayment` `:109-114` and the in-case spreads at `:275` and `:665-690` stay.
- File: `__tests__/screens/commitments_edit.hook.test.ts` (`commitment`, `:47`; the in-describe `second`, `:415`).
- File: `__tests__/screens/commitments_pay_sheet.hook.test.ts` (`fixedCommitment`, `:87`; `duePayment`, `:112`). The `egpCommitment` spread `:108` stays.
- File: `__tests__/screens/commitments_pay_sheet_owners.hook.test.ts` (`commitment`, `:43`; `p1`, `:66`). The `p2` spread `:82` stays.
- File: `__tests__/screens/commitments/pay_sheet_converted_total.test.tsx` (`variableCommitment`, `:98`; `duePayment`, `:118`).
- File: `__tests__/screens/commitments/pay_sheet_rate_error.test.tsx` (`variableCommitment`, `:106`; `duePayment`, `:126`), the same values as the converted-total pair. No case added to either `.tsx` suite.
- Change: as the rules above.
- Test: none · test code only; the eight suites pass with base's test names, and the scratch equivalence check holds.

### 7. The dashboard and transaction detail suites build their payments from the pair
- File: `__tests__/screens/dashboard/dashboard_helpers.test.ts` (arrow `makePayment`, `:48`, stays an arrow const).
- File: `__tests__/screens/dashboard/dashboard_hook.test.ts` (the inline row in `commitmentPayments` of `populatedSnapshot()`, `:84`, row at `:151`), which keeps its `updated_at: '2026-07-09T00:00:00.000Z'` apart from `created_at`.
- File: `__tests__/screens/transactions/detail/detail_hook.test.ts` (`paidPayment`, `:385`).
- Change: as the rules above.
- Test: none · test code only; the three suites pass with base's test names, and the scratch equivalence check holds.

## Non-goals
- Ticket Out of scope: none.
- Rows that are not full commitment or payment rows stay: `undoCommitment` in `__tests__/payment_state.test.ts` (a four-field `Pick`), `baseInput` in `__tests__/commitment.repository.round_at_write.test.ts` and `__tests__/commitment.repository.test.ts:129` (`NewCommitmentInput`).
- The raw-SQL helpers (`insertCommitment`, `insertCommitments`, `insertPayment`, `seed`) and the non-commitment builders (`makeTx`, `makeAccount`, `makeCategory`) stay.
- No change to the defaults or signatures of `makeTestCommitment` and `makeTestPayment`, and no new builder in `src/test_helpers/`.
- No case added, removed or renamed in any suite.

## Untested inputs
- The field values every rewritten builder and literal returns: held by the scratch equivalence check in Verification, whose shim compares every call a suite makes, with no committed test, since a committed one would spell the old rows out again. Steps 1 to 7.

## Verification
- Before step 1, at base: `test -f` each of the 30 paths (the 25 suites, the four accounts suites of step 1, `__tests__/screens/commitments/commitment_row.helpers.test.ts`), then `npx jest --ci --json --outputFile=<scratch>/base.json <the 30 paths>`.
- Per step, the scratch equivalence check. For a kept builder: keep today's body as `old<Name>`, name the rewrite `new<Name>`, and bind `<Name>` to a shim over the same arguments (`...args: Parameters<typeof new<Name>>`) that builds `next = new<Name>(...args)`, asserts `expect(next).toStrictEqual(old<Name>(...args))` and returns `next`. Every row the suite builds, in a case or a module-level const, is then compared, overrides included. The two random-id builders (`commitment_payments.query.test.ts:116`, `commitment.query.test.ts:91`) compare equal per call, since every call passes `id` today. For a literal: keep today's literal as `old<Name>` and add one throwaway case asserting `expect(<Name>).toStrictEqual(old<Name>)`. Run the suite once, then delete the copies, the shims and the cases before the commit.
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- After step 7: rerun the jest command at head into `<scratch>/head.json`; per file, the sorted `assertionResults[].fullName` lists and their counts equal base's, all `passed`.
- `git diff -U0 cf400c4f -- __tests__ src/test_helpers`: every `@@ -a,b` hunk's base lines (a to a+b-1; for b = 0, line a or a+1) lie in an `import` statement or in a base range of a site steps 1 to 7 name: `src/test_helpers/commitment.ts` 8-32; under `__tests__/`: `commitment_payments.query.test.ts` 116-134; `commitment.query.test.ts` 91-112, 561-584; `commitment_month_aggregate.query.test.ts` 47-67, 76-94; `commitment.repository.test.ts` 109-127, 145-160; `commitment.repository.mark_as_paid.test.ts` 19-39; `commitment_housekeeping.repository.test.ts` 92-113, 173-195; `commitment_writes.repository.test.ts` 126-147, 149-171; `commitment_housekeeping.helpers.test.ts` 10-31; `commitment.store.test.ts` 20-41, 43-61; `commitment_form_shared.test.ts` 30-48; `screens/commitment_status.test.ts` 9-27, 29-50; `screens/commitments.hook.test.ts` 108-128, 134-155; `screens/commitments.screen.test.tsx` 183-201; `screens/commitments/filter/filter_helpers.test.ts` 18-39, 41-59; `screens/commitments_detail.helpers.test.ts` 10-28; `screens/commitments_detail.store.test.ts` 10-28; `screens/commitments_detail.hook.test.ts` 72-90, 92-107; `screens/commitments_edit.hook.test.ts` 47-65, 415-433; `screens/commitments_pay_sheet.hook.test.ts` 87-105, 112-127; `screens/commitments_pay_sheet_owners.hook.test.ts` 43-61, 66-81; `screens/commitments/pay_sheet_converted_total.test.tsx` 98-116, 118-133; `screens/commitments/pay_sheet_rate_error.test.tsx` 106-124, 126-141; `screens/dashboard/dashboard_helpers.test.ts` 48-64; `screens/dashboard/dashboard_hook.test.ts` 151-166; `screens/transactions/detail/detail_hook.test.ts` 385-400. No range sits in an `it` body (`commitments_edit.hook` 415-433 is in a `describe` body, `dashboard_hook` 151-166 in `populatedSnapshot()`), and `SEEDED_AT` (`commitment_writes.repository.test.ts:39`, not the shared timestamp) and `DATES_BY_STATE` (`commitments.hook.test.ts:84`) stay referenced, so no other hunk is expected. The case overrides at `commitment.query.test.ts:179` and `:185` lie outside every range and stay.
- `git diff --name-only cf400c4f` lists only paths under `__tests__/` and `src/test_helpers/` (Rules), plus `.work/MA-238/plan.md`.
- `git grep -lE "^[[:space:]]+(is_active: 1|exchange_rate_snapshot: null),$" -- __tests__ src/test_helpers` lists 26 files at base and three at head: `__tests__/commitment.query.test.ts` (the case overrides at today's `:179` and `:185`), `__tests__/commitment_housekeeping.helpers.test.ts` (the expected rows), `src/test_helpers/commitment.ts`.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A wrapper that drops a field differing from the shared default (`account_id: null` against `'cib'`, a `start_date`, a `created_at`) can leave its suite green; the scratch equivalence check is the only guard.
- A sibling #777 ticket that edits one of these builders before this merges conflicts on its body; the rebase keeps the shared-builder body and moves the sibling's field change into the overrides.
- A change to the shared pair's defaults landing on main first shifts every wrapper's output; rerun the equivalence check at the rebased head.

## Self-assessment
The scratch equivalence check is the step I am least sure of. It is process, CI never runs it, and nothing committed holds the field values after merge, so an implementer who skips it can ship a green PR that changed a row. Step 6 is the widest, eight suites, but each site there is a plain literal or an overrides builder with no positional arguments.
