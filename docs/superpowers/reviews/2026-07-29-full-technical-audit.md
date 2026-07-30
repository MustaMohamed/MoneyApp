# MoneyApp — Full Technical Audit

**Date:** 2026-07-29
**Scope:** Whole codebase — 475 TS/TSX files, ~41,900 LOC, 11 modules, 18 migrations, 96 test files, plus build/CI/harness tooling.
**Method:** 15 independent audit lenses run in parallel, each restricted to evidence it read itself; every finding then passed through an adversarial verification pass that re-opened each cited line. All severities below are **verifier-corrected**, not as-claimed.
**Status:** Review only. No production code changed.
**Branch:** `main` (report untracked).

## How to read this report

- IDs are `H`/`M`/`L` + number, assigned by verifier-corrected severity. There are **no critical findings**: four were raised as critical and the verification pass downgraded all four.
- Each finding is tagged **CONFIRMED** (accurate as claimed) or **ADJUSTED** (real defect, but the original claim overstated something — the corrected framing is used here, and the correction is recorded inline).
- Where several lenses independently found the same defect, the findings are merged and the corroboration is noted. That convergence is the strongest signal in this report.

---

## Executive verdict

This is a well-architected codebase with a disciplined skeleton and a soft centre. The structural decisions are right and were followed: the module tree matches the documented shape, the New Architecture and React Compiler are on, migrations are append-only and individually sound, the SQLite layer is parameterised throughout with no injection surface, the HeroUI/`Sheet` migration genuinely completed, and the recent remediation waves (`80747111`, `cf00b272`, `7447a2f4`, the transactions series) fixed what they claimed to fix. The problems found here are not architectural drift. They concentrate in three places: **domain logic written once and never re-examined**, **verification machinery that reports success while measuring almost nothing**, and **a long tail of derived-state and formatting bugs that show the user a wrong number without corrupting the ledger underneath**.

The single most damaged subsystem is **commitments**. Payment rows are stamped with a lifecycle status at generation time and no code path ever ages them (H1, corroborated independently by the database lens as H4) — `rg 'UPDATE commitment_payments' src` returns exactly three statements, none of which is a time transition. Compounding it, generation is anchored to `start_date` with a hard 64-occurrence cap that is never re-windowed to today (H2), so a daily commitment stops producing payments after 64 days and never resumes. The two defects interact: the schedule silently runs dry *and* the rows that exist never move out of `upcoming`. Editing a commitment then leaves orphaned `overdue` rows on the old schedule (M10, M17), and `after_count` commitments deactivate on paid rows only, so one skipped cycle strands them permanently (L9). This subsystem needs a deliberate rework of its lifecycle model, not a patch.

The second theme is **destructive operations never tested against their own foreign keys**. Deleting a custom category that has a budget or commitment row throws `FOREIGN KEY constraint failed`, and the rejection is discarded by a `void` handler with no error surface — found independently by the database, small-modules and type-safety lenses (H5, corroborated as H8/H13). The reassign escape hatch has the same hole: it migrates `transactions`, `commitments` and `spending_plan_categories` but never `budgets` (H9). The pre-delete guard counts only `transactions`, which is why nothing catches it. A related class runs through the whole app — `void handler()` in JSX props satisfies `no-floating-promises` while discarding the rejection (M42), and several catch blocks are comment-only (H14) against state shapes that have no error field at all.

Third, **the verification gates are decorative**. Coverage thresholds of 80/95/100 are enforced over 267 of 41,881 source lines — 0.6% — because `collectCoverageFrom` is a stale allowlist in which 20 of 55 files are re-export stubs with zero instrumented statements, and four globs match nothing at all post-migration (H10). No gate executes them anyway: neither CI nor `verify:pr` runs coverage. `runMigrations` — the code that upgrades every real user's database — is called by no test (H11), because all 35 SQLite tests bypass it by string-concatenating `MIGRATIONS.map(m => m.up)`. The lint gate exits 0 with 6,008 warnings (L31). The harness's own 531 tests run in no gate (M38). And `npm run verify:pr` is **red on current main**: `react-native` is exact-pinned two patches below what Expo SDK 55.0.28 requires, so the husky pre-push hook blocks every push and every PR is red (H12). That is a hard blocker and must clear before anything else can land.

Fourth, and most visible to a user: **the Cairo Nights typography has never actually rendered**. `font-sora` and `font-inter` are used across 349 sites in 91 files, but no `--font-sora`/`--font-inter` variable is declared in `global.css`'s `@theme inline` block, so Tailwind v4 emits no rule and the utilities are inert. This was verified empirically by compiling the project's own entry with its own `tailwindcss@4.3.0`. The app has been shipping in Roboto/San Francisco (H15). CI cannot see it; only a device can. Alongside it sits a family of preview-string money bugs where the displayed number is wrong but the persisted number is right — the commitment Pay sheet multiplies by the FX rate and labels the product with the wrong currency, overstating a confirmation by up to 50x (H6), and the transaction form does the same on EGP→USD transfers (M18). No ledger data is corrupted by these, which is precisely why they survived: the tests assert the write path, and the write path is correct.

A note on how to weigh what follows. The medium and low tiers were severity-corrected but **not pruned** — read them as a backlog, not a defect list. See "Limits of this audit".

## Severity summary

| Severity | Count | Dominant themes |
| --- | ---: | --- |
| Critical | 0 | Four raised, all four downgraded by the verification pass |
| High | 15 (12 after cross-lens merge) | Commitment payment lifecycle · category-delete FK integrity · decorative coverage gates · red push gate · inert typography · wrong money previews |
| Medium | 44 | Money formatting/rounding divergence · focus-reload churn · swallowed async errors · test-suite quality |
| Low | 41 | Query-index defeats · eager render work · legacy compat rot · UI standards drift |

**Category distribution:** bug 24 · performance 18 · financial-correctness 17 · architecture 10 · testing 8 · ui-standards 8 · refactor 8 · tooling 6 · type-safety 1.

---

## High-severity findings

### H1. Payment status is stamped once at row-insert time and never transitions — Overdue/Due Today are permanently empty for normally-created commitments

**Dimension:** `commitments-module` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED · **Independently corroborated as** H4 (`database-layer` lens)

**Evidence**

- src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:58 — `status: dueDate < today ? CommitmentPaymentStatus.Overdue : dueDate === today ? CommitmentPaymentStatus.Due : CommitmentPaymentStatus.Upcoming,` — this is inside the row-construction literal for NEW rows only.
- src/modules/commitments/repositories/commitment.repository.ts:146 — `await db.withExclusiveTransactionAsync(async (transactionDb) => { ... await insertPaymentRows(transactionDb, payments); await deactivateExpiredCommitments(transactionDb, asOfDate, timestamp); });` — housekeeping only INSERTs missing rows and deactivates expired commitments. There is no status-aging UPDATE.
- src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:44 — `for (const dueDate of dates) { if (existing.has(dueDate)) continue;` — any due date that already has a row is skipped entirely, so an existing row's status is never revisited.
- src/modules/commitments/database/commitment_payments.ts:143 and :261 and :301 — these are the ONLY three `UPDATE commitment_payments` statements in the entire src tree (verified by `rg -n "UPDATE commitment_payments" src`). They implement skip, mark-as-paid, and transaction-id linking. None sets `due` or `overdue`.
- src/modules/commitments/screens/commitments/commitments.hook.ts:125 — `const overdue = filteredPayments.filter((p) => p.status === CommitmentPaymentStatus.Overdue);` — the list sections read the persisted column verbatim; no date-vs-today derivation anywhere.
- src/modules/commitments/screens/commitments/components/commitment_row.tsx:45 — `const statusColor = STATUS_COLORS[payment.status];` — the row badge also reads the stored column, so nothing recovers the correct state at render time.
- src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:244 — `case CommitmentPaymentStatus.Overdue: counts.overdue++;` — the dashboard commitment tile inherits the same stale column.
- *(via H4)* src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:58 — status is computed once, at insert time: `status: dueDate < today ? CommitmentPaymentStatus.Overdue : dueDate === today ? CommitmentPaymentStatus.Due : CommitmentPaymentStatus.Upcoming`
- *(via H4)* src/utils/compute_due_dates.ts:24 — the generator emits up to `maxCount = 64` future occurrences in one pass (`for (let i = 0; i < limit; i++)`), so a fresh monthly commitment writes ~5 years of rows all stamped `upcoming`

**Failure path.** On 2026-07-29 the user creates a monthly rent commitment starting 2026-08-01. Housekeeping immediately inserts 64 rows (Aug 2026 → Nov 2031), every one stamped `upcoming` because every due date is > today at insert time. On 2026-08-01 the rent payment still shows under "Upcoming", not "Due Today". On 2026-08-05 — five days late — it is still `upcoming`: it does not appear in the Overdue section, the Overdue filter pill shows 0, the red overdue Stat in SummaryHeader shows 0, and the Dashboard commitment summary reports 0 overdue. The only way any row ever becomes `overdue` is if it is created *after* its due date has already passed (i.e. backfill for a commitment entered with a past start_date), or if the user happens to edit the commitment, which deletes and regenerates unpaid rows as an accidental side effect.

**Impact.** The module's headline capability — telling the user which recurring obligations are due or late — is non-functional for every commitment created in the normal forward-looking way. Three of the six status filter pills (Overdue, Due Today, and implicitly Upcoming) misclassify, and the Dashboard silently tells the user nothing is late when rent, loan instalments and subscriptions are past due. This is a silent misreport of financial obligation state with no user-visible symptom that would prompt a bug report.

**Recommendation.** Add a status-aging step to `runHousekeeping` inside the same exclusive transaction, before `insertPaymentRows`: `UPDATE commitment_payments SET status = CASE WHEN due_date < ?asOf THEN 'overdue' WHEN due_date = ?asOf THEN 'due' ELSE 'upcoming' END, updated_at = ? WHERE status IN ('upcoming','due','overdue') AND transaction_id IS NULL AND status <> (that CASE value)`. Keep `paid`/`skipped` untouched via the status IN filter. Because housekeeping is memoised per UTC day (commitment.store.ts:146), this costs one extra statement per day. Add a repository test that inserts an `upcoming` row with a past due_date and asserts it becomes `overdue` after `runHousekeeping`.

> **Verification correction.** Accurate claim: payment status is stamped once at insert and never re-evaluated, so a payment's status is frozen at whatever it was relative to the insert day. Consequence is not that Due Today is permanently empty — a commitment whose first occurrence is created on its due date is stamped 'due' and then stays 'due' forever (it never ages to 'overdue'), and every later occurrence stays 'upcoming' forever. Net effect: the Overdue section/filter/Dashboard overdue count only ever reflect rows backfilled with an already-past due date; forward-generated occurrences never transition. Recommendation (aging UPDATE inside the existing exclusive transaction in runHousekeeping) is sound and CLAUDE.md-compatible — no migration needed, statuses paid/skipped protected by the status IN filter.


### H2. Payment generation is anchored to start_date with a hard 64-occurrence cap and never re-windowed to today, so short-period and long-count commitments permanently stop producing payments

**Dimension:** `commitments-module` · **Category:** bug · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:34 — `const dates = computeDueDates({ startDate: commitment.start_date, ... maxCount: 64 });` — the window origin is always `commitment.start_date`, never `now`, and the caller passes no other bound.
- src/utils/compute_due_dates.ts:17 — `const limit = durationType === DurationType.AfterCount && endAfterCount !== undefined ? Math.min(endAfterCount, maxCount) : maxCount;` — `endAfterCount` is silently clamped to 64.
- src/utils/compute_due_dates.ts:24 — `for (let i = 0; i < limit; i++) { ... const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + every * i));` — occurrence i is always measured from the start date, so the generated set is a fixed prefix of the schedule that never advances.
- src/modules/commitments/screens/commitments/components/duration_picker.tsx:91 — `maxLength={4}` on the "stop after N payments" input, and src/modules/commitments/screens/commitments/commitment_form.shared.ts:39 — `endAfterCount: z.number().int().min(1).optional(),` — no upper bound, so N up to 9999 is accepted and silently truncated to 64.
- src/modules/commitments/database/commitments.ts:142 — `(duration_type = 'after_count' AND end_after_count IS NOT NULL AND (SELECT COUNT(*) ... AND status = 'paid') >= end_after_count)` — auto-deactivation requires paid_count >= end_after_count, which is unreachable when only 64 rows were ever generated.

**Failure path.** Case A (short period): user creates a daily commitment (recurrence_every=1, period=days, duration forever) starting 2026-01-01. Housekeeping generates exactly 64 rows, 2026-01-01 through 2026-03-05. From 2026-03-06 onward every housekeeping run recomputes the same 64 dates, finds all of them in `existing`, and inserts nothing. The commitment silently disappears from every month view from March onward while `is_active` stays 1. A weekly commitment hits the same wall after ~15 months. Case B (long count): user sets a weekly commitment to "stop after 100 payments". Only 64 rows are generated; after the 64th is paid, no more rows exist, and `deactivateExpiredCommitments` never fires because paid_count tops out at 64 < 100 — the commitment is stuck active forever with nothing to pay.

**Impact.** Recurring obligations vanish from the Commitments list, the month totals, and the Dashboard summary with no error, no empty-state explanation and no way for the user to diagnose it. The user stops being reminded of a real recurring payment. Monthly/annual commitments are unaffected (64 months ≈ 5.3 years), which is why the bug hides in the most common configuration and only bites daily/weekly/high-count users.

**Recommendation.** Stop anchoring the window at start_date. Pass a rolling horizon into `computeDueDates` — e.g. add a `fromDate`/`throughDate` pair and generate only occurrences in `[max(start_date, today - 1 period), today + HORIZON]` (a 12–18 month forward horizon is enough for the month-scoped UI), computing the starting occurrence index arithmetically rather than iterating from i=0. Separately, cap `endAfterCount` in COMMITMENT_SCHEMA at the value the generator can actually honour, or drive after_count completion off generated-row count rather than the clamped loop. Add tests for: daily/forever commitment 200 days after start still generates the next 30 days; after_count=100 weekly eventually generates and deactivates all 100.


### H3. Creating a budget whose name matches an existing one in the same category+month silently overwrites the existing budget's limit instead of creating a new envelope

**Dimension:** `database-layer` · **Category:** financial-correctness · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/modules/budget/database/budgets.ts:56 — `setBudgetRow` issues a single upsert with TWO conflict targets: `ON CONFLICT(id) DO UPDATE SET ...` followed by `ON CONFLICT(category_id, effective_from, name) DO UPDATE SET name = excluded.name, limit_amount = excluded.limit_amount, updated_at = excluded.updated_at`
- src/database/migrations/013_named_monthly_budgets.ts:12 — `UNIQUE(category_id, effective_from, name)` and line 7 `name TEXT NOT NULL COLLATE NOCASE`, so the natural key match is case-insensitive
- src/modules/budget/repositories/budget.repository.ts:328 — `const id = input.id ?? String(uuid.v4());` a *new* budget always gets a fresh uuid, so the `ON CONFLICT(id)` arm can never fire and the natural-key arm is the one that matches
- src/utils/schemas/budget.schema.ts:10 — `nameText: z.string().trim().min(1, Strings.budgetNameRequired)` is the only name validation; there is no duplicate-name check in the schema, the sheet, or the repository (`rg 'duplicate|already exists' src/modules/budget` returns nothing but the copy helper)
- src/modules/budget/screens/budget/components/set_budget_sheet.hook.ts:143 — `await setBudget({ id: isEdit ? editingRow?.id : undefined, categoryId: resolvedCategoryId, name: values.nameText, limit: parseLimit(values.limitText), ... })`

**Failure path.** July 2026, category Groceries already has budget A = {id 'A', name 'Weekly', limit 500}. User opens the Set Budget sheet in add mode, picks Groceries, types name 'weekly', limit 200, saves. Verified against a schema replica with sqlite3: the row set afterwards is `A|cat_groceries|weekly|200.0|2026-07|t0|t1` — one row, id still 'A', limit changed from 500 to 200. No new budget is created and no error is raised; the sheet closes as if the save succeeded. The user's July grocery envelope silently shrank by 300 EGP, and every transaction already carrying `budget_id = 'A'` is now reported against the wrong limit by `getBudgetSpendByMonth`. The mirror case is also broken: renaming an existing budget onto a sibling's name hits the id arm first, whose UPDATE then violates the same UNIQUE index — sqlite3 returns `UNIQUE constraint failed: budgets.category_id, budgets.effective_from, budgets.name`, which the sheet swallows into the generic `Strings.budgetSaveError`.

**Impact.** Silent destruction of a user's budget limit — the single most money-visible number on the Budget screen — with no confirmation, no error, and no undo. Spend-vs-limit progress, remaining-to-spend, and the Dashboard budget card all render against the overwritten limit. Severity is data corruption, not UX.

**Recommendation.** Split the two behaviours. Keep `ON CONFLICT(id) DO UPDATE` for the edit path only, and for the create path either (a) drop the natural-key upsert arm so a duplicate name raises a constraint error that the sheet maps to a field-level 'a budget with this name already exists this month' message, or (b) pre-check with the existing `getBudgetRowsForCategoryMonth(db, categoryId, yearMonth)` inside the same `withExclusiveTransactionAsync` in `BudgetRepository.setBudget` and throw a typed `BudgetNameConflictError`. Add the same case-insensitive uniqueness rule to `budgetFormSchema` for immediate feedback, and add a repository test covering both create-collides and rename-collides.

> **Verification correction.** Accurate as a defect, but 'critical' is inflated. The blast radius is one editable numeric field (limit_amount) on one budget row per collision: row identity, created_at, linked transactions (transactions.budget_id) and all history survive, nothing is deleted, and the user can restore the value by editing. It also requires the user to type a name that matches an existing budget in the same category AND same month case-insensitively — not an incidental state. Rate it high (silent, unconfirmed mutation of a money-visible value, plus a generic error on the rename-collide mirror case), not critical.


### H5. Deleting a custom category that has any budget row fails with FOREIGN KEY constraint failed on both delete paths, and the rejection is unhandled

**Dimension:** `database-layer` · **Category:** bug · **Effort:** M · **Verdict:** CONFIRMED · **Independently corroborated as** H8 (`small-modules` lens), H13 (`type-safety` lens)

**Evidence**

- src/database/migrations/013_named_monthly_budgets.ts:6 — `category_id TEXT NOT NULL REFERENCES categories(id),` with no `ON DELETE` clause; migration 013 rebuilt `budgets` and kept the restrictive FK
- src/database/client.ts:10 — `await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');` so the constraint is enforced immediately at statement time
- src/modules/categories/repositories/category.repository.ts:87 — `delete()` runs `deleteSoleCategorySpendingPlans` then `await deleteCategory(db, id)` and never touches `budgets`
- src/modules/categories/repositories/category.repository.ts:119 — `reassignAndDelete()` reassigns `transactions`, `commitments`, and `spending_plan_categories`, then `await db.runAsync('DELETE FROM categories WHERE id = ?', [fromId]);` — `budgets.category_id` is never reassigned
- src/modules/categories/screens/settings/categories/categories.hook.ts:148 — the branch is chosen purely on `const count = await getCategoryTransactionCount(category.id);`, which counts transactions only, so a budget-only category takes the plain `delete()` path
- src/modules/categories/screens/settings/categories/index.tsx:158 — `void handleDeleteConfirm();` discards the rejected promise, and `closeDeleteFlow()` at categories.hook.ts:171 is never reached
- *(via H8)* src/database/client.ts:10 — `await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');` — FK enforcement is on for every statement.
- *(via H8)* src/database/migrations/006_create_commitments.ts:23 — `FOREIGN KEY (category_id) REFERENCES categories(id)` with NO `ON DELETE` clause → NO ACTION, i.e. the delete is rejected.
- *(via H13)* src/modules/categories/screens/settings/categories/categories.hook.ts:148 — `const count = await getCategoryTransactionCount(category.id);` … `:151 if (count > 0) { openReassignSheet(category); } else { openDeleteConfirm(category); }` — the branch gate counts ONLY transactions.
- *(via H13)* src/modules/categories/database/categories.ts:91 — `db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM transactions WHERE category_id = ?', [id])` — commitments and budgets are not counted.

**Failure path.** User creates a custom expense category 'Gym' (custom categories are the only deletable ones — src/modules/categories/screens/settings/categories/components/category_row.tsx:31 gates on `category.is_default === 1`). On the Budget screen they set a July budget for Gym; `budgetableCategories` (src/modules/budget/screens/budget/budget.hook.ts:291) includes every expense category, custom ones included. They then delete Gym from Settings -> Categories. With 0 transactions the confirm dialog calls `CategoryRepository.delete`; with transactions it calls `reassignAndDelete`. Both end in `DELETE FROM categories WHERE id = 'gym'`. Reproduced against a schema replica with sqlite3: `Runtime error near line 16: FOREIGN KEY constraint failed (19)`. The whole `withTransactionAsync` rolls back, so in the reassign case the transaction/commitment reassignments are discarded too. Because the handler is fired with `void`, the user sees the confirm dialog simply sit there with nothing happening; the rejection becomes an unhandled promise rejection.

**Impact.** Any category the user ever budgeted becomes permanently undeletable, with a dead-silent UI. In the reassign path the user is also told nothing about why the reassignment they just confirmed did not happen. This is the only user-facing category-management operation and it is broken for a very common state.

**Recommendation.** Decide the semantic and enforce it in one place. Preferred: in `reassignAndDelete` add `UPDATE budgets SET category_id = ? WHERE category_id = ?` before the DELETE (and reconcile the resulting `UNIQUE(category_id, effective_from, name)` collisions the same way the budget upsert does), and in `delete()` either delete the category's budget rows or refuse with a typed error when `SELECT COUNT(*) FROM budgets WHERE category_id = ?` is non-zero. Broaden `handleDeletePress` so the branch is chosen on all linked-row counts, not just transactions. Regardless of which path is taken, wrap `handleDeleteConfirm` in try/catch and surface the failure — `void`-ing a money-mutating promise hides real errors.


### H6. Commitment Pay sheet's "converted total" multiplies by the rate and labels the result with the account currency — overstates the real debit by up to 2,500x

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:60 — `const convertedTotal =` / `:62 ? amountWatch * state.exchangeRateValue` — always multiplies by the EGP-per-USD rate, which is only a valid conversion when the typed amount is USD.
- src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:147 — `{commitment.currency}` — the suffix pill on the amount input proves `amountWatch` is denominated in the COMMITMENT currency, not USD.
- src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:221 — `= {numberFmt.format(convertedTotal)} {state.selectedAccount?.currency}` — an EGP-valued product is rendered with the ACCOUNT's currency code.
- src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts:85 — `return commitment.currency === Currency.USD || selectedAccount.currency === Currency.USD;` — `requiresRate` (and therefore this line) is true whenever EITHER side is USD, including USD→USD and EGP→USD.
- src/modules/transactions/domain/transaction_amounts.ts:95 — `const accountNativeAmount = input.accountCurrency === Currency.USD ? input.commitmentCurrency === Currency.USD ? roundMoney(input.amount) : roundMoney(egpAmount / (exchangeRate ?? 0)) : egpAmount;` — the amount actually deducted from the account, which the preview contradicts.

**Failure path.** Case A (USD commitment, USD account, rate 50): user types 100 (USD). requiresRate=true, so the sheet renders `= 5,000 USD` (100 x 50). `resolveCommitmentPaymentAmounts` actually debits `accountNativeAmount = roundMoney(100) = 100 USD` — the confirmation number is 50x the real cost. Case B (EGP commitment, USD account, rate 50): user types 5,000 (EGP). Sheet renders `= 250,000 USD` (5,000 x 50). The real debit is `roundMoney(egpAmount / rate) = 5,000 / 50 = 100 USD` — the confirmation number is 2,500x the real cost and in the wrong direction (it should divide, not multiply). Only the third combination (USD commitment paid from an EGP account) happens to be right.

**Impact.** The single number the user reads to confirm what a commitment payment will cost their account is wrong in two of the three USD combinations, by 50x and 2,500x respectively, and carries a currency code that does not match the value shown. A user reconciling a USD subscription against a USD account is told the payment is 5,000 USD when it is 100 USD.

**Recommendation.** Derive the preview from the same domain function that performs the write instead of an inline multiply: call `resolveCommitmentPaymentAmounts({ amount: amountWatch, commitmentCurrency: commitment.currency, accountCurrency: selectedAccount.currency, exchangeRate: state.exchangeRateValue })` and render `accountNativeAmount` with `accountCurrency` (optionally also `egpAmount` with `EGP`). Add unit tests over the three currency pairs asserting preview === persisted `accountNativeAmount`.

> **Verification correction.** Accurate as written on mechanics, currency pairs and magnitudes. Reclassified critical -> high: the defect is confined to the pre-confirm preview string; resolveCommitmentPaymentAmounts still persists the correct accountNativeAmount/egpAmount, so no ledger data is corrupted and the error is self-correcting once the user sees the updated balance.


### H7. Sheet children mount eagerly — the Budget screen instantiates 10 bottom sheets and their full content trees whether open or not

**Dimension:** `render-performance` · **Category:** performance · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/components/ui/sheet.tsx:289 — `return (<BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}><BottomSheet.Portal>…<BottomSheet.Content …>{children}</BottomSheet.Content>` — there is no gate on `isOpen`; `children` is handed to the sheet unconditionally. Only heroui's `BottomSheetOverlay` returns null when closed (node_modules/heroui-native/src/components/bottom-sheet/bottom-sheet.tsx:165); `BottomSheetContentContainer` renders `<BottomSheetView>{children}</BottomSheetView>` unconditionally, and gorhom's `BottomSheet` (v5.2.14, BottomSheet.tsx:1835) renders `{children}` even at `index={-1}`.
- src/modules/budget/screens/budget/index.tsx:117,261,284,288,292,302,312 — MonthFilter, BudgetCopySheet, SetBudgetSheet, SpendingPlanSheet, BudgetDeleteConfirmSheet, SpendingPlanDeleteConfirmSheet, IncomeSheet are all rendered on every Budget mount.
- src/modules/budget/screens/budget/components/set_budget_sheet.tsx:240 and src/modules/budget/screens/budget/spending_plan_sheet/index.tsx:81 — each nests a further `<CategoryPickerSheet …>`; src/modules/budget/screens/budget/components/budget_copy_sheet.tsx:109 nests a further `<MonthFilter …>` (another Sheet). Total = 10 gorhom BottomSheet instances alive on the Budget tab.
- src/modules/categories/components/category_picker_sheet.tsx:55,77,98 — `const rows = chunk(categories, NUM_COLUMNS);` then `rows.map(… row.map((cat) => <PressableFeedback …>` — a non-virtualized grid of one `PressableFeedback` + 1–2 icons + 1 text per category. Seeded expense categories are 23 (src/database/migrations/003_create_categories.ts:17-38 plus 012_add_budget_group.ts:31) and can reach 53 (30-custom cap, src/modules/categories/screens/settings/categories/categories.hook.ts:72).
- src/components/ui/month_filter.tsx:77,108 — the picker `Sheet` and its `pickerMonths.map(...)` 12-cell grid plus 3 `IconButton` PressableFeedbacks are always mounted.
- Each `PressableFeedback` (node_modules/heroui-native/src/components/pressable-feedback/pressable-feedback.tsx:33,60) is an `Animated.createAnimatedComponent(Pressable)` backed by `usePressableFeedbackRootAnimation` → 3 `useSharedValue` + a `useAnimatedStyle` + 2 context providers per instance.

**Failure path.** User taps the Budget tab with default seed data. Before anything is visible, React mounts 10 gorhom bottom sheets (each with its own pan/tap GestureDetectors, animated container and shared values) plus their bodies: 2 × 23-cell category grids, 2 × 12-cell month grids, 3 RHF form trees (SetBudgetSheet, SpendingPlanSheet, IncomeSheet) and 2 confirm sheets — roughly 74 `PressableFeedback` instances (~220 Reanimated shared values, ~74 animated host components) that the user cannot see. With 30 custom categories that rises to ~134 PressableFeedback instances. The same pattern repeats on every remount of the Budget route.

**Impact.** Large fixed mount cost and native view/shared-value footprint on Budget tab entry, paid entirely for UI that is invisible. It also makes every Budget screen re-render walk these subtrees, and it inflates memory on low-end Android.

**Recommendation.** Gate the sheet body inside the shared primitive: in `src/components/ui/sheet.tsx`, track a `hasEverOpened` ref/state and render `{hasEverOpened ? children : null}` inside `BottomSheet.Content` (keeping the sheet shell mounted so open/close animation and the sheet_visibility counter are unaffected). That single change defers every sheet body in the app until first open. For the largest bodies (CategoryPickerSheet, add/edit icon grid) also consider unmounting on `onCloseComplete`.


### H9. reassignAndDelete never migrates budgets.category_id, so the reassign escape hatch also fails with a raw SQLite error

**Dimension:** `small-modules` · **Category:** bug · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/modules/categories/repositories/category.repository.ts:110 — `await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', ...)`
- src/modules/categories/repositories/category.repository.ts:114 — `await db.runAsync('UPDATE commitments SET category_id = ? WHERE category_id = ?', ...)`
- src/modules/categories/repositories/category.repository.ts:118 — `await reassignSpendingPlanCategoryRows(db, fromId, toId);` — then `:119` `await db.runAsync('DELETE FROM categories WHERE id = ?', [fromId]);`. `budgets` is never touched, despite `budgets.category_id` being a NOT NULL FK to `categories(id)` (src/database/migrations/011_create_budgets.ts:6).
- src/modules/categories/screens/settings/categories/components/reassign_category_sheet.tsx:58 — `setErrorMessage(error instanceof Error ? error.message : Strings.categoriesReassignError);` — the raw SQLite message is rendered directly to the user, bypassing `Strings` (CLAUDE.md: "All user-visible copy in src/constants/strings.ts").

**Failure path.** User creates custom category "Gym", sets a monthly budget limit on it (writes a `budgets` row via `setBudgetRow`), and logs one transaction against it. Deleting "Gym" now takes the reassign branch (transaction count = 1). The user picks "Other" and confirms. The transaction is reassigned, the commitment is reassigned, plan rows are reassigned — then `DELETE FROM categories` is rejected because the orphaned `budgets` row still points at "Gym". The whole transaction rolls back and the sheet displays the literal string `FOREIGN KEY constraint failed`. The category can never be removed by any route.

**Impact.** The one designed escape hatch for deleting a referenced category is itself broken once a budget limit exists, and it leaks an untranslated database error string into the UI. Combined with the finding above, custom categories are effectively undeletable for any user who uses Budget or Commitments.

**Recommendation.** Add `UPDATE budgets SET category_id = ? WHERE category_id = ?` inside the same `withTransactionAsync`, handling the `UNIQUE(category_id, effective_from)` (and the migration-013 `(category_id, effective_from, name)`) collision explicitly — merge or drop the source row when the target already has a budget for that month, mirroring the existing `reassignSpendingPlanCategoryRows` merge logic. Also map repository throws to `Strings` copy before rendering in the sheet.


### H10. Coverage thresholds are enforced over 267 of 41,881 src lines (0.6%) — and no gate ever runs them

**Dimension:** `testing` · **Category:** testing · **Effort:** M · **Verdict:** CONFIRMED · **Independently corroborated as** M37 (`tooling-ci-harness` lens)

**Evidence**

- jest.config.js:36-58 — `collectCoverageFrom: ['src/store/**/*.ts', ... 'src/repositories/**/*.ts', 'src/database/**/*.ts', ... 'src/screens/**/*.store.ts', 'src/screens/**/*.state.ts', 'src/app/**/*.helpers.ts', 'src/app/**/*.store.ts']` — an allowlist written for the pre-modules layout.
- jest.config.js:63-65 — `coverageThreshold: { global: { lines: 80, functions: 95, branches: 100 } }`. Measured `npx jest --coverage` total for that allowlist: `lines {total:267, covered:267, pct:100}`, `functions {total:89}`, `branches {total:114}` — against 41,881 LOC of `src/**/*.{ts,tsx}` (34,606 of it under `src/modules/**`).
- 20 of the 55 files in the denominator contribute ZERO instrumented statements because they are pure re-export stubs, e.g. `src/store/budget.store.ts:1-2` — `// Backward-compat stub — canonical in modules/budget/` / `export { useBudgetStore, createBudgetStore } from '@/modules/budget/store/budget.store';`. Same for all 5 `src/repositories/*.repository.ts` (except `app_settings`) and 8 `src/database/*.ts` files. `src/store/**` reports 100% while `account.store.ts`, `budget.store.ts`, `transaction.store.ts` each report 0/0/0/0.
- Four of the globs match zero files post-migration: `src/screens/` contains only `src/screens/dev/primitives/index.tsx` (no `.store.ts`/`.state.ts`/`.hook.ts`), and `find src/app -name '*.helpers.ts' -o -name '*.store.ts'` returns nothing. jest.config.js:59-60 `'!src/screens/**/*.hook.ts'` and the 10-line justification comment at jest.config.js:27-35 are therefore no-ops describing files that no longer exist.
- No gate runs coverage. harness/manifest.json:281-283 — `"id": "test", "local": ["npm", "test", "--", "--ci"]`; .github/workflows/pr-checks.yml:95 — `npm test -- --ci --cacheDirectory .jest-cache`. `rg -n "coverage" .github/workflows/*.yml` returns nothing. Yet CLAUDE.md:315 advertises `npm run test:coverage   # thresholds: 80% lines / 95% functions / 100% branches` as the verification contract.
- *(via M37)* CLAUDE.md:315 advertises the gate: `npm run test:coverage   # thresholds: 80% lines / 95% functions / 100% branches`
- *(via M37)* harness/manifest.json:282 — the registered `test` check is `"local": ["npm", "test", "--", "--ci"]` (no `--coverage`); .github/workflows/pr-checks.yml:95 — `run: npm test -- --ci --cacheDirectory .jest-cache` (no `--coverage`). No job or verify:pr check anywhere runs `test:coverage`, so jest.config.js:63-65 `coverageThreshold: { global: { lines: 80, functions: 95, branches: 100 } }` never gates anything.

**Failure path.** A developer deletes the body of `applyBudgetRollover`, `commitment.store` payment generation, or any transaction amount computation under `src/modules/**`. `npm test` still runs those files' tests, but if a test is also removed or weakened in the same change, `npm run test:coverage` cannot detect the drop: none of `src/modules/{budget,transactions,commitments,accounts,dashboard}` except 6 explicitly listed files is in the denominator, so lines/functions/branches stay pinned at 100/100/100. And because neither `verify:pr` nor CI invokes `test:coverage`, even a real regression inside those 267 lines never blocks a PR.

**Impact.** The single most-cited quality metric in CLAUDE.md is decorative. Measured over the whole tree the suite is genuinely decent — `src/**/*.{ts,tsx}` scores 77.39% lines / 69.67% functions / 64.37% branches — but that is 30 points below the advertised functions bar and 36 below the branches bar, and nothing surfaces the gap. Teams and agents reading CLAUDE.md:315 will believe branch coverage is 100%.

**Recommendation.** Replace the allowlist with a denylist anchored on the real tree: `collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.anim.ts', '!src/database/entities/**', '!**/__mocks__/**', '!src/screens/dev/**']`. Delete the four dead globs (jest.config.js:52-55), the dead exclusion (jest.config.js:59), and the stale Task-4.8 comment block (jest.config.js:27-35). Then set thresholds to the measured baseline (e.g. 77/69/64) with a ratcheting policy, and register `npm run test:coverage` as a seventh check in harness/manifest.json so verify:pr actually executes it. Until the thresholds are honest, correct CLAUDE.md:315 to state what is measured.


### H11. `runMigrations` — the code that upgrades every real user database — is never called by any test

**Dimension:** `testing` · **Category:** testing · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/database/client.ts:16-40 — `export async function runMigrations(db)` creates `schema_migrations`, reads applied versions, and loops `for (const migration of MIGRATIONS) { if (!appliedVersions.has(migration.version)) { await db.withTransactionAsync(async () => { await db.execAsync(migration.up); await db.runAsync('INSERT INTO schema_migrations ...') }) } }`.
- Measured coverage for `src/database/client.ts`: `{st: 40%, br: 0%, fn: 40%}`. The `if (!appliedVersions.has(...))` decision at client.ts:30 has both arms uncovered.
- All 35 better-sqlite3 test files bypass the runner by concatenating the SQL, e.g. `__tests__/schema.test.ts:5` — `const SCHEMA_SQL = MIGRATIONS.map((m) => m.up).join('\n');`, `__tests__/transaction.repository.test.ts:55` — `realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));`. `rg -n 'runMigrations' __tests__` returns zero hits.
- The runner is on the app's only startup path: CLAUDE.md Database Layer — "`runMigrations(db)` called once at startup from `src/utils/use_layout_init.hook.ts`".

**Failure path.** A future change reorders `MIGRATIONS` in `src/database/migrations/index.ts:25-43`, or moves the `INSERT INTO schema_migrations` outside the `withTransactionAsync` block at client.ts:31-38, or drops the `appliedVersions.has` guard. Every test still passes, because tests build the schema by string-concatenating all 18 `up` bodies onto a fresh `:memory:` DB — a path that exercises neither ordering-by-applied-set nor version bookkeeping nor per-migration transaction boundaries. On a real device the first user with an existing v1..v17 database either re-runs migration 013 (`DROP TABLE budgets` at 013_named_monthly_budgets.ts:29, destroying live budget rows) or records a version whose `up` threw, permanently skipping it.

**Impact.** The highest-blast-radius code in the app — the only thing that mutates an existing user's on-device schema — has no test at all, while the individual DDL strings it executes have 100%. That inverts the risk ordering: the tested part cannot lose data; the untested part can.

**Recommendation.** Add `__tests__/database/migration_runner.test.ts` that drives `runMigrations(bridgedDb)` against better-sqlite3 through the existing `src/test_helpers/sqlite.ts` bridge (the pattern in `__tests__/transaction.repository.test.ts:57-77` already wires real BEGIN/COMMIT/ROLLBACK). Assert: (1) a fresh DB ends with all 18 rows in `schema_migrations` and the same `sqlite_master` shape `__tests__/schema.test.ts` asserts today; (2) a second `runMigrations` call is a no-op (no new rows, no DDL re-executed); (3) seeding `schema_migrations` with versions 1..17 applies only 018; (4) a migration whose `up` throws leaves no `schema_migrations` row and no partial DDL.


### H12. `npm run verify:pr` and the CI `doctor` job are RED on current main — react-native is exact-pinned two patches behind what Expo SDK 55.0.28 requires

**Dimension:** `tooling-ci-harness` · **Category:** tooling · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- package.json:60 — `"react-native": "0.83.6",` (exact pin, no range, so `npm install` will never correct it; installed version confirmed 0.83.6, expo 55.0.28)
- Verbatim `npx --yes expo-doctor` output on current HEAD:
```
Running 19 checks on your project...
17/19 checks passed. 2 checks failed. Possible issues detected:

✖ Check that packages match versions required by installed Expo SDK

🔧 Patch version mismatches
package       expected  found
react-native  0.83.10   0.83.6

1 package out of date.
```
Shell exit code: `exit=1`.
- harness/manifest.json:286-288 — `"id": "doctor", "local": ["npx", "--yes", "expo-doctor"], "ci": { "job": "doctor", "run": "npx --yes expo-doctor" }`
- .github/workflows/pr-checks.yml:68-78 — the `doctor` job runs the identical command with `CI: true`; the SDK-version check is platform-independent so ubuntu fails the same way (the second failure, CocoaPods, is macOS-local only).
- .husky/pre-push:1 — `npm run verify:pr`; scripts/harness/lib/verification.js:20-23 — `if (result.status !== 0) { ... return { ok: false, failedCheck: check.id ...` stops the whole run at the first non-zero exit.
- Verified the four checks that run before `doctor` are green locally: `format:check` exit=0, `lint` exit=0, `typecheck` exit=0, `jest` 221 suites / 2049 tests passed. `doctor` is the sole blocker.

**Failure path.** Any developer or agent runs `git push` on a branch → husky pre-push fires `npm run verify:pr` → checks 1-4 pass → check 5 (`doctor`) exits 1 → `PR verification failed at doctor` and the push is aborted. The same command is a required CI job, so every PR is also red. Because the failure is unrelated to the branch's own changes, the only way to ship is `git push --no-verify`, which skips all six checks including lint, typecheck and tests — exactly the outcome CLAUDE.md:320-322 ("Never push hoping CI will catch it") is written to prevent.

**Impact.** The single mandated publish-readiness gate is permanently failing for reasons unrelated to any change under review, which trains the team to bypass it wholesale. Every branch inherits a red CI. Blast radius is the entire verification contract.

**Recommendation.** Either bump `react-native` to `0.83.10` in package.json (run `npx expo install --check`, refresh package-lock.json, re-run `npx expo-doctor` to confirm exit 0), or — if 0.83.6 is pinned deliberately — record it in `expo.install.exclude` in package.json so expo-doctor stops flagging it, and note the reason. Do not leave the gate red; a permanently-failing required check is equivalent to having no gate.


### H14. Commitment write failures (mark-as-paid, add, deactivate) are swallowed by comment-only catch blocks with no user-visible error state

**Dimension:** `type-safety` · **Category:** bug · **Effort:** M · **Verdict:** CONFIRMED · **Independently corroborated as** M11 (`commitments-module` lens)

**Evidence**

- src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts:165 — `} catch {` / `:166  // error logged by store` / `:167 } finally { setSaving(false); }` — the mark-as-paid failure is dropped.
- src/modules/commitments/screens/commitments/detail/components/pay_sheet.state.ts:5 — `interface PaySheetStateShape { visible; saving; accountPickerVisible; rateOverride; }` — there is no error field at all, so the sheet is structurally incapable of showing the failure.
- src/modules/commitments/store/commitment.store.ts:270 — `} catch (error) { console.error('[commitmentStore] markAsPaid failed:', error); throw error; }` — the store rethrows; the caller is the only place that could surface it.
- src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts:65 — `} catch {` / `:66  // error logged by store` — and `add_commitment/index.tsx:11` renders `<CommitmentFormBody … />` with no `errorMessage` prop, unlike `edit_commitment/index.tsx:20` `errorMessage={state.saveError}`.
- src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts:111 — `} catch {` / `:112  // error logged by store` in `confirmDeactivate`, even though `setSaveError` already exists in the same hook and is used correctly for `onValid` at `:92`.
- *(via M11)* src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts:165 — `} catch { // error logged by store } finally { setSaving(false); }` — the submit handler swallows every failure and only stops the spinner.
- *(via M11)* src/modules/commitments/screens/commitments/detail/components/pay_sheet.state.ts:5 — `interface PaySheetStateShape { visible: boolean; saving: boolean; accountPickerVisible: boolean; rateOverride: boolean; }` — there is no error field at all, so the sheet has no way to render a failure (contrast edit_commitment.hook.ts:93 which sets `saveError`).

**Failure path.** On the commitment detail Pay sheet the user enters an amount and taps the confirm button. `markAsPaid` → `repo.markAsPaid` fails (SQLite busy/locked, FK violation on a since-archived account, disk error). The store logs and rethrows; `onValid` swallows the throw and `finally` clears `saving`. The sheet stays open with the spinner gone, the payment is still unpaid, and no message appears. The user cannot distinguish "failed" from "nothing happened" and will tap again.

**Impact.** Mark-as-paid writes a real ledger transaction and mutates account balances, so a silent failure on this path leaves the user believing money moved when it did not (or double-tapping a partially-applied write). Add-commitment and deactivate have the same silent behaviour. The Edit screen already proves the intended pattern exists, so this is inconsistency, not an architectural constraint.

**Recommendation.** Add a `saveError?: string` field + setter to `pay_sheet.state.ts` and `add_commitment.state.ts`, set it in the catch blocks (mirroring `edit_commitment.hook.ts:92`), and render it — `CommitmentFormBody` already accepts `errorMessage`, and the Pay sheet footer can host a `FormErrorText`. Do the same for `confirmDeactivate`, which already has `setSaveError` in scope.


### H15. `font-sora` / `font-inter` Tailwind utilities generate no CSS — Cairo Nights typography is silently not applied in 91 files

**Dimension:** `ui-standards` · **Category:** ui-standards · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- global.css:85 — `@theme inline {` block (lines 85–128) exposes only `--color-*` variables. There is **no** `--font-sora`, `--font-inter`, `--font-soraBold`, `--font-interSemi`, or `--font-soraExtra` anywhere in the repo (`grep -rn -- "--font-" src global.css` → 0 hits).
- node_modules/tailwindcss/theme.css:2,5,6 — Tailwind v4's default theme ships only `--font-sans`, `--font-serif`, `--font-mono`. Tailwind v4 emits a `font-<name>` utility only for a declared `--font-<name>` theme variable, and there is no `tailwind.config.js` (CLAUDE.md: "Tailwind v4 is CSS-first") to add one.
- Verified empirically by compiling the project's own entry with the project's own `tailwindcss@4.3.0` (`compile(global.css)` + `build([...candidates])`, resolving `tailwindcss`, `uniwind`, `heroui-native/styles` exactly as metro.config.js does): `font-sans` GENERATED, `text-[15px]` GENERATED, `bg-accent` GENERATED, `bg-accent/15` GENERATED, `text-danger` GENERATED — but `font-sora` MISSING, `font-inter` MISSING, `font-soraBold` MISSING, `font-interSemi` MISSING, `font-soraExtra` MISSING.
- `grep -rli 'fontfamily|font-family' node_modules/uniwind` → 0 files. Uniwind has no font-family fallback of its own; it consumes the compiled Tailwind CSS, so a utility that produces no rule produces no style.
- src/components/ui/text.tsx:10 — `hero: 'font-sora text-[32px] font-bold leading-tight',` (and `:11`–`:20`: h1/h2/h3/title/body/label/hint/caption/numLg/numMd all carry `font-sora`/`font-inter`). This is the project's own shared Text primitive, imported by 74 files.
- src/components/ui/stack_header.tsx:37 — `className="font-sora text-foreground flex-1 text-center font-semibold"` — every stack screen title.
- src/modules/onboarding/screens/onboarding/welcome/index.tsx:32 — `<Text variant="hero" className="font-soraExtra text-center">` — the first-launch hero headline.
- src/app/_layout.tsx:41–48 — `useFonts({ Inter_400Regular, ..., Sora_800ExtraBold })` loads the families, and `src/constants/theme.ts:67–75` names them in `FontFamily`, so the assets are present and unusable via className.
- Scale: `rg -o "font-(sora|inter)(Bold|Semi|Extra|Regular|Medium)?\b" src` → 349 occurrences across 91 files. Only 34 sites use the mechanism that actually works (`rg -o "fontFamily: FontFamily\.[a-zA-Z]+" src` → 34).

**Failure path.** Launch the app on any device. `src/app/_layout.tsx:41` loads Sora + Inter and gates render on `fontsLoaded`, but every element whose only font declaration is `className="font-sora"`/`font-inter` (349 sites) receives no `fontFamily` at all and falls back to the platform default — Roboto on Android, SF Pro on iOS. The onboarding hero (welcome/index.tsx:32), every stack header title (stack_header.tsx:37), and every `<Text variant="...">` from src/components/ui/text.tsx render in system font, while the ~34 components that set `fontFamily: FontFamily.soraBold` inline (e.g. src/modules/budget/screens/budget/category_detail/components/stat_tiles.tsx:50, src/components/ui/fab.tsx menuLabel) render in real Sora/Inter. Result: the same screen mixes system font and Sora side by side — e.g. the Budget category-detail stat tile values are Sora while their labels and the screen header are Roboto. CI cannot catch this: the classes are valid strings, typecheck and lint pass, and no test asserts rendered font.

**Impact.** The entire Cairo Nights typography system ("Sora for numbers/headings/CTAs, Inter for body" — CLAUDE.md Design System) is inoperative on ~90% of text in the app, and the failure is invisible to every automated check. Fixing it will change the rendered metrics of 349 text nodes at once (Sora/Inter have different advance widths than Roboto/SF), so line-wrap, truncation, and `numberOfLines={1}` ellipsis behaviour will shift app-wide — the longer this stays unfixed, the larger the eventual visual-regression blast radius.

**Recommendation.** Add the font families to `global.css` inside `@theme inline` so Tailwind emits the utilities: `--font-sora: Sora_400Regular; --font-inter: Inter_400Regular;` plus explicit weight families (`--font-sora-bold: Sora_700Bold;` etc. — note Tailwind lowercases utility names, so `font-soraBold` must be renamed to a kebab-case token such as `font-sora-bold`). React Native does not synthesize weights from one family, so `font-semibold`/`font-bold` beside `font-sora` will NOT produce Sora SemiBold — each weight needs its own `--font-*` token mapped to the matching `@expo-google-fonts` family, and the ~110 `font-semibold` / 54 `font-bold` co-occurrences must be audited during the swap. Then add a guard: a build-time assertion (or an oxlint restricted-class rule) that fails when a `font-*` class has no matching `--font-*` variable, so this class of silent no-op cannot recur. Re-run device QA on onboarding, headers, and all list rows after the change.

> **Verification correction.** All technical claims are confirmed verbatim and independently reproduced. Severity lowered critical -> high: the defect is purely presentational — no crash, data loss, security, or functional-correctness impact, and the app renders fully in system fonts. It is pervasive and invisible to CI, which justifies high, but 'critical' is reserved for functional/data/security failure in this audit.


---

## Medium-severity findings

### M1. No shared money-formatting layer: 13 ad-hoc Intl.NumberFormat sites diverge from formatAmount, so the same amount renders differently on different screens

**Dimension:** `architecture-debt` · **Category:** architecture · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/utils/format_amount.ts:4 — `export function formatAmount(value: number, decimals = 0): string { return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value); }` → default 0 fraction digits
- src/modules/transactions/screens/transactions/detail/detail.helpers.ts:19 — `const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });` → no maximumFractionDigits, so JS default of 3 applies
- src/modules/transactions/screens/transactions/detail/detail.helpers.ts:150 — `tx.currency === Currency.USD ? `${numberFmt.format(tx.amount)} USD` : undefined`
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:257 — `{formatAmount(account.current_balance)} {account.currency}` → 0 decimals for the same USD value
- src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:51 — `Strings.accountHeroOpening(formatAmount(account.opening_balance), currency)`
- Identical local `const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' })` is re-declared in 11 files: src/modules/transactions/screens/transactions/detail/detail.helpers.ts:19, src/modules/transactions/screens/transactions/transactions.helpers.ts:26, src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts:21, src/modules/transactions/screens/transactions/detail/components/transfer_flow_card.tsx:28, src/modules/commitments/screens/commitments/components/commitment_row.tsx:34, src/modules/commitments/screens/commitments/components/summary_header.tsx:26, src/modules/commitments/screens/commitments/detail/components/detail_hero.tsx:17, src/modules/commitments/screens/commitments/detail/components/current_cycle_card.tsx:22, src/modules/commitments/screens/commitments/detail/components/payment_row.tsx:10, src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:25, src/modules/dashboard/screens/dashboard/components/commitments_card.tsx:36; plus two more inline sites at src/modules/onboarding/screens/onboarding/more_accounts/components/account_row.tsx:41 and src/modules/onboarding/screens/onboarding/ready/ready.hook.ts:21
- src/components/ui/amount_display.tsx:28 — `export function AmountDisplay({ amount, currency, decimals = 0, ... })` — the intended shared money primitive; `rg -c '\bAmountDisplay\b' src __tests__` returns only its own definition file (zero consumers)
- src/modules/accounts/utils/add_account.schema.ts:12 — `balance: z.string().refine((v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0; }` → fractional balances are accepted; src/constants/currency.ts:11 sets USD decimals to 2

**Failure path.** User creates a USD account with opening balance 1234.56 and records a USD transaction of 1234.56. Dashboard AccountCard (account_card.tsx:257) calls formatAmount → renders "1,235 USD"; Account detail hero (balance_hero.helpers.ts:51) also renders "1,235"; the Transaction detail screen (detail.helpers.ts:150) uses the local numberFmt → renders "1,234.56 USD". The same money value is displayed as two different numbers on two screens, and neither site is reachable from a single formatting policy, so any future decimal-policy change must be made in 14 places.

**Recommendation.** Make src/utils/format_amount.ts the single formatting authority: add `formatMoney(value, currency)` that derives decimals from CURRENCY_CONFIG (src/constants/currency.ts:9) instead of defaulting to 0. Delete every local `numberFmt` and route all 13 sites through formatMoney / formatWithCurrencyCode. Either revive `AmountDisplay` as the mandatory render primitive for amount+currency pairs or delete src/components/ui/amount_display.tsx. Add a lint rule or unit test asserting `new Intl.NumberFormat` appears only in src/utils/format_amount.ts.

> **Verification correction.** 14 (not 13) ad-hoc Intl.NumberFormat sites diverge from formatAmount; the 11 identical `const numberFmt` declarations, the 2 inline onboarding sites, and exchange_rate_row.tsx:29 are all confirmed. The user-visible divergence is real and reachable (fractional USD amounts pass both schemas): dashboard/account-detail render formatAmount → 0 decimals, transaction detail renders numberFmt → up to 3 decimals. However the shared layer the recommendation proposes already exists: format_amount.ts:11 `formatCurrencyAmount(value, currency, decimals?)` already derives decimals from CURRENCY_CONFIG and has zero src consumers, as does formatWithCurrencyCode and formatExchangeRate. The correct action is adoption + a lint/test guard, not authoring a new formatMoney. Note also src/utils/money.ts (roundMoney) as a pre-existing money util. Severity medium: presentation-only, no persistence or aggregation impact.


### M2. All 10 module barrels declare a public API and are bypassed by 32 deep imports into layers the barrels explicitly call internal

**Dimension:** `architecture-debt` · **Category:** architecture · **Effort:** L · **Verdict:** ADJUSTED

**Evidence**

- src/modules/budget/index.ts:2 — `// Public API — store and shared types only.` / `// BudgetRepository and database helpers are internal;` / `// access budget data through the store.`
- src/modules/transactions/index.ts:2 — same contract: `// TransactionRepository and database helpers are internal;`
- src/modules/accounts/index.ts:2 — `// AccountRepository and database helpers are internal; access account data through the store.`
- Only one import in the whole repo goes through a barrel — `rg -n "from '@/modules/[a-z_]+'" src __tests__` yields exactly: src/modules/accounts/screens/accounts/add_account/index.tsx:16 `import { CurrencySelector } from '@/modules/currency';`
- Cross-module deep imports into declared-internal layers (32 total): src/modules/transactions/repositories/transaction.repository.ts:11 `import { getBudgetRowById } from '@/modules/budget/database/budgets';`
- src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts:10 `import { budgetRepository } from '@/modules/budget/repositories/budget.repository';` (also edit_transaction.hook.ts:9, detail/detail.hook.ts:8)
- src/modules/categories/repositories/category.repository.ts:9 `} from '@/modules/budget/database/spending_plan_categories';`
- src/modules/budget/repositories/budget.repository.ts:47 `import { getCategoriesByType, setCategoryGroup } from '@/modules/categories/database/categories';`
- src/modules/commitments/database/commitment_payments.ts:5 `import { insertTransactionRow } from '@/modules/transactions/database/transactions';` and :4 `import { applyAccountDelta } from '@/modules/accounts/database/accounts';`
- Breakdown by target layer (cross-module only): accounts/database 8, transactions/screens 7, budget/screens 5, budget/repositories 3, transactions/database 2, categories/database 2, budget/database 2, transactions/repositories 1, commitments/repositories 1, commitments/database 1

**Failure path.** A developer changes the signature of `insertTransactionRow` in src/modules/transactions/database/transactions.ts believing it is transactions-internal (the barrel says so). The build breaks in src/modules/commitments/database/commitment_payments.ts:5, which writes transaction rows directly for commitment payments. Conversely, renaming `getCategoriesByType` in categories/database breaks budget's repository. Because there is no enforced boundary, every 'internal' database/repository symbol is effectively public API with an unknown blast radius, and the module graph is bidirectional (commitments↔transactions, categories↔budget, accounts↔transactions).

**Recommendation.** Pick one and enforce it. Recommended: (a) move the genuinely shared kernel out of transactions — src/modules/transactions/domain/transaction_policy.ts and transaction_amounts.ts are imported by accounts/database/accounts.ts:3 and commitments/repositories/commitment.repository.ts:7-8; relocate to src/domain/ledger/; (b) for the remaining cross-module needs, widen the barrels to export the specific symbols other modules legitimately need (e.g. budget's `getBudgetRowById`, accounts' `applyAccountDelta`) and mark them as cross-module contract; (c) add an oxlint `no-restricted-imports` rule banning `@/modules/*/database/*` and `@/modules/*/repositories/*` from outside the owning module, so violations fail CI instead of accruing. If the barrels are not going to be enforced, delete all 10 rather than keep a contract nothing honours.

> **Verification correction.** 5 of the 10 module barrels (accounts, budget, categories, commitments, transactions) declare an explicit public-API/internal contract; goals/index.ts exports nothing and currency/settings/dashboard declare no contract. The 32 cross-module deep imports (20 into database/repositories layers, 12 into screens layers) and the single barrel-routed import out of 809 are confirmed exactly. Note src/modules/accounts/index.ts already violates its own comment by exporting getAccountsStats from ./database/account_stats. The recommendation's src/domain/ledger/ relocation introduces an undeclared top-level folder; keep shared kernel under src/modules/ per CLAUDE.md. Severity medium — maintainability only, no correctness or user-facing impact.


### M3. Legacy compatibility roots have rotted: 15 stub files are fully dead, 5 more are kept alive only by tests importing legacy paths, and prior audit L2 (app layout compat imports) is still unfixed

**Dimension:** `architecture-debt` · **Category:** architecture · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- CLAUDE.md declares these as retirement surfaces: `src/store/ backward-compat re-exports; avoid new consumers` / `src/repositories/ backward-compat re-exports` / `do not add new module consumers to those roots`
- ZERO consumers anywhere (src + __tests__) — 15 files: src/store/budget.store.ts, src/store/transaction.store.ts, src/repositories/budget.repository.ts, src/repositories/category.repository.ts, src/repositories/commitment.repository.ts, src/repositories/transaction.repository.ts, src/database/accounts.ts, src/database/budget_stats.ts, src/database/budgets.ts, src/database/commitment_payments.ts, src/database/commitments.ts, src/database/entities/app_setting.entity.ts, src/database/entities/budget.entity.ts, src/database/entities/commitment.entity.ts, src/database/entities/commitment_payment.entity.ts, plus src/components/sheets/account_picker_sheet.tsx and src/components/sheets/category_picker_sheet.tsx
- TEST-ONLY (0 src consumers, kept alive by legacy test imports) — 5 files: src/store/account.store.ts (4 tests), src/store/onboarding.store.ts (2), src/repositories/account.repository.ts (2), src/database/account_stats.ts (1), src/database/categories.ts (3), src/database/transactions.ts (4). Example: __tests__/transaction.query_executor.test.ts:12 imports from '@/database/transactions' rather than the canonical '@/modules/transactions/database/transactions'
- STILL-LIVE src consumers of compat roots (prior audit finding L2, docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md:334, NOT remediated): src/app/(app)/_layout.tsx:4 `import { useCategoryStore } from '@/store/category.store';` and :5 `import { useCurrencyStore } from '@/store/currency.store';`
- src/utils/use_layout_init.hook.ts:8 `import { useCommitmentStore } from '@/store/commitment.store';`
- Modules importing the compat repositories root: src/modules/currency/store/currency.store.ts:7 and src/modules/onboarding/repositories/onboarding.repository.ts:8 both `} from '@/repositories/app_settings.repository';`
- Modules importing compat entity stubs (9 sites): src/modules/budget/screens/budget/budget_buckets.helpers.ts:4, src/modules/commitments/screens/commitments/components/commitment_form_body.tsx:26-27, .../commitment_row.tsx:11, .../detail/components/detail_hero.tsx:9, .../detail/components/details_card.tsx:4, .../detail/components/pay_sheet.hook.ts:7, .../filter/components/account_accordion.tsx:8, .../filter/components/category_accordion.tsx:6, src/utils/group_transactions_by_date.ts:2
- Modules importing the compat component stub (6 sites): src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:7, .../filter/components/account_accordion.tsx:4, src/modules/commitments/screens/commitments/components/commitment_form_body.tsx:10, .../detail/components/pay_sheet.tsx:9, .../filter/components/account_accordion.tsx:4 — all `from '@/components/account_type_pill'`, itself a 3-line re-export at src/components/account_type_pill.tsx:2
- src/utils/schemas/add_account.schema.ts:1 is another undeclared compat stub, still consumed by src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts:12
- Real (non-stub) code stranded in compat roots: src/store/ready.store.ts, src/store/sheet_visibility.store.ts, src/repositories/app_settings.repository.ts, src/database/app_settings.ts — these are canonical implementations, not re-exports, living in folders CLAUDE.md defines as re-export-only

**Failure path.** A developer opens src/store/ expecting only thin re-exports (as CLAUDE.md states) and finds ready.store.ts and sheet_visibility.store.ts, which are the real startup and sheet-visibility stores with live consumers at src/utils/use_layout_init.hook.ts:9 and src/components/ui/sheet.tsx:66. Meanwhile 15 files there and in src/database/ resolve to nothing anyone imports, and the test suite pins 5 more legacy paths in place, so 'delete the compat roots' looks unsafe when 20 of the 35 files could be removed today with no production impact.

**Recommendation.** Three-step retirement, each independently mergeable. Step 1 (zero risk): delete the 15 zero-consumer stubs listed above plus src/components/sheets/. Step 2: repoint the 6 test files off legacy paths (__tests__ imports of '@/database/transactions', '@/database/categories', '@/database/account_stats', '@/store/account.store', '@/store/onboarding.store', '@/repositories/account.repository') to the canonical '@/modules/...' paths, then delete those 5 stubs. Step 3: repoint the 18 live src consumers — the 9 '@/database/entities/*' type imports to '@/modules/<domain>/entities/*', the 6 '@/components/account_type_pill' imports to '@/modules/accounts/components/account_type_pill', the 2 '@/repositories/app_settings.repository' imports and src/app/(app)/_layout.tsx:4-5 — then promote the four real implementations (ready.store.ts, sheet_visibility.store.ts, app_settings.repository.ts, database/app_settings.ts) into a new src/modules/app_shell/ (or src/modules/settings/) and delete src/store/, src/repositories/, and the src/database/ domain stubs entirely, leaving only client.ts and migrations/ as CLAUDE.md's Database Layer section describes.

> **Verification correction.** 17 files (15 stubs + 2 src/components/sheets/) have zero consumers anywhere; 6 more (not 5) are pinned solely by legacy test imports — removable today is 23, not 20. Live compat consumers (app/(app)/_layout.tsx:4-5, use_layout_init.hook.ts:8, currency.store.ts:7, onboarding.repository.ts:8, 9 entity imports, 6 account_type_pill imports) are confirmed, as is prior-audit L2 at reviews/2026-07-23-...:334 being unremediated. Correction: src/repositories/app_settings.repository.ts is explicitly sanctioned by CLAUDE.md ('plus shared app settings repo') and src/database/'s compat query/entity stubs are explicitly declared there too — only src/store/ready.store.ts, src/store/sheet_visibility.store.ts, src/database/app_settings.ts and src/utils/schemas/ are genuinely undeclared placements. Severity medium: dead code plus a half-finished migration, zero runtime risk.


### M4. Modules import each other's screen-layer components and view-model helpers, so screen refactors in transactions and budget silently break commitments and dashboard

**Dimension:** `architecture-debt` · **Category:** architecture · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/modules/commitments/screens/commitments/index.tsx:16 — `import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';`
- src/modules/commitments/screens/commitments/detail/components/details_card.tsx:5 — `import { DetailRow } from '@/modules/transactions/screens/transactions/detail/components/detail_row';` and :6 `import { DetailRowsCard } from '@/modules/transactions/screens/transactions/detail/components/detail_rows_card';`
- src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:17 — `import { ExchangeRateRow } from '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row';`
- src/modules/dashboard/screens/dashboard/components/budget_card.tsx:10 — `import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';` and :11 `import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';`
- src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:3 and dashboard.hook.ts:7 and src/modules/dashboard/repositories/dashboard.repository.ts:5 — same `BudgetDashboardSummaryVM` import from budget's 510-line screen helper file
- CLAUDE.md Project Structure: `src/components/ui/ shared UI primitives and wrappers`; `src/modules/<domain>/ canonical feature code` — screen-layer components are not declared a cross-module surface

**Failure path.** A transactions-screen refactor renames or changes the props of DetailRow / DetailRowsCard / ExchangeRateRow / DateHeader — all of which live under transactions/screens/ and read as private screen internals. The Commitments list, Commitment detail card, and the Pay sheet break, in a module the author was not editing. Symmetrically, dashboard's repository layer (dashboard.repository.ts:5) depends on a type declared inside budget's screen helpers, so the dashboard data layer cannot be touched without reading a budget screen file.

**Recommendation.** Promote the four genuinely shared components to src/components/ui/ — DateHeader → src/components/ui/date_header.tsx, DetailRow + DetailRowsCard → src/components/ui/detail_rows_card.tsx, ExchangeRateRow → src/components/ui/exchange_rate_row.tsx — and update the 4 commitments call sites. Move `BudgetDashboardSummaryVM` and `budgetBandColor` out of src/modules/budget/screens/budget/budget.helpers.ts into src/modules/budget/entities/budget.entity.ts (type) and a new src/modules/budget/budget_presentation.ts (function), then export both from src/modules/budget/index.ts so dashboard consumes them through the barrel.


### M5. add_transaction.hook.ts and edit_transaction.hook.ts duplicate ~157 lines including the entire race-guarded budget-lookup effect

**Dimension:** `architecture-debt` · **Category:** refactor · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- Line-level diff of the two hooks yields 157 identical lines in blocks of 8+ lines (add is 589 lines, edit is 454)
- src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts:335-391 vs src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts:228-291 — the same budget-lookup effect: `const budgetRequestRef = useRef(0); useEffect(() => { const request = ++budgetRequestRef.current; if (!semantics.usesBudget || !categoryId) { ... } ... void budgetRepository.getBudgetsForCategoryMonth(categoryId, date.slice(0, 7)).then(...).catch(...).finally(() => { if (active && request === budgetRequestRef.current) setBudgetsLoading(false); });`, differing only in whether a preserved budget id / preserveNull is threaded through
- add_transaction.hook.ts:393-402 vs edit_transaction.hook.ts:296-305 — byte-identical guard: `const formState = useAddTransactionState.getState(); if (effectiveDataStatus !== 'ready' || formState.saving || formState.budgetsLoading || formState.budgetLookupError) return; setErrorMessage(undefined); setSaving(true);`
- add_transaction.hook.ts:404-416 vs edit_transaction.hook.ts:307-319 — identical currency/rate/amount resolution block calling resolveTransactionAmounts
- add_transaction.hook.ts:434-454 vs edit_transaction.hook.ts:338-358 (21 lines), :489-511 vs :367-389 (23 lines), :555-571 vs :424-440 (17 lines)
- A shared layer already exists in the same folder and is the obvious home: transaction_form.helpers.ts, budget_assignment.helpers.ts, transaction_form_prerequisites.hook.ts, transaction_form_session.hook.ts

**Failure path.** The budget-lookup effect carries a request-generation race guard (`request !== budgetRequestRef.current`). Fixing a race or error-handling defect in one copy — e.g. changing what happens on a rejected getBudgetsForCategoryMonth — leaves the other copy with the old behaviour, so Add-transaction and Edit-transaction diverge in how they recover from a failed budget lookup. The same applies to the save guard: adding a new precondition to onValid in one hook does not protect the other.

**Recommendation.** Extract into the existing shared folder: (1) `use_budget_lookup.hook.ts` taking `{ categoryId, date, usesBudget, budgetLookupVersion, resolvePreserved }` and owning the request-generation guard, with add passing a no-preserve strategy and edit passing the isSameBudgetEligibility strategy; (2) `can_submit_transaction.ts` for the shared onValid precondition guard; (3) `resolve_submit_amounts.ts` for the currency/rate/resolveTransactionAmounts block. Target: both hooks under ~250 lines with no duplicated async control flow.


### M6. useBudget is a 495-line hook owning three unrelated screen concerns and returning 27 actions plus 26 state fields

**Dimension:** `architecture-debt` · **Category:** refactor · **Effort:** L · **Verdict:** ADJUSTED

**Evidence**

- src/modules/budget/screens/budget/budget.hook.ts:48-542 — single `export function useBudget()` spanning 495 lines, the largest function in src/
- budget.hook.ts:59-97 — one useShallow selector reading 17 fields off useBudgetStore; :122-137 — a second reading 12 fields off useBudgetState; :104-151 — 21 separate `getState().action` bindings
- Concern A (copy-budgets sheet): budget.hook.ts:295-322 (hasMatchingCopyPreview, copyRows, copyPreviewIsLoading, copyPreviewHasError, the selection-sync useEffect) and :358-405 (openCopy, setCopySourceMonth, retryCopyPreview, copySelectedBudgets, selectAllCopyBudgets)
- Concern B (spending plans): budget.hook.ts:217-232 (spendingPlanRows, spendingPlansSummary), :261-264 (editingPlan), :414-437 (removeSpendingPlanForMonth, openPlanTool, openPlanDetails)
- Concern C (50/30/20 rule lens): budget.hook.ts:266-286 (ruleLens) and :448-477 (manageRuleGroup)
- Return object budget.hook.ts:479-541 — 26 fields under `state` plus 27 top-level actions
- Its own helper files are also oversized: budget_buckets.helpers.ts is 700 lines, spending_plans.helpers.ts 651, budget.helpers.ts 510

**Failure path.** Any change to the budget-copy sheet — for example altering when copyPreviewIsLoading is true (budget.hook.ts:311-315) — requires reading and re-reviewing a 495-line hook that also owns the spending-plan lens and the 50/30/20 rule lens. The dependency arrays at :392-400 and :467-476 already list 7-8 entries each; adding one more concern makes correct dependency reasoning impractical, and a mistake there silently breaks month navigation or copy-selection state on an unrelated tab.

**Recommendation.** Split into three sibling hooks composed by useBudget, matching the module screen anatomy already used elsewhere in the folder: `budget_copy.hook.ts` (lines 295-322 + 358-405, ~90 lines), `budget_plans.hook.ts` (217-232, 261-264, 414-437), `budget_rule_lens.hook.ts` (266-286, 448-477). useBudget keeps the focus effect, snapshot gating (166-179), category ledger memos (181-215) and month navigation, dropping to ~200 lines. Separately, split budget_buckets.helpers.ts by following the pattern the same folder already uses in spending_plans.types.ts: move lines 13-163 (15 exported types) into budget_rule.types.ts and lines 188-250/385-531 (presentation tables and builders) into budget_rule_presentation.ts, leaving the lens computation in budget_buckets.helpers.ts.

> **Verification correction.** useBudget is 495 lines (budget.hook.ts:48-542) returning 29 state fields (not 26) plus 27 actions; the two useShallow selectors read 17 and 12 store fields. All three concern line ranges and the helper-file sizes are confirmed. The claim that it is 'the largest function in src/' is unverified and should be dropped.


### M7. Month-boundary and year-month helpers are implemented three to four times across modules, and budget's date utilities live inside its repository

**Dimension:** `architecture-debt` · **Category:** refactor · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- Canonical helper exists: src/modules/budget/database/spending_plans.ts:5 — `export function monthRange(yearMonth: string): { start: string; endExclusive: string } { const [year, month] = yearMonth.split('-').map(Number); const nextMonth = month === 12 ? 1 : month + 1; const nextYear = month === 12 ? year + 1 : year; return { start: `${yearMonth}-01`, endExclusive: `${nextYear}-${String(nextMonth).padStart(2, '0')}-01` }; }`
- Re-implemented inline at src/modules/transactions/database/transactions.ts:31-35 — `const monthStart = `${yearMonth}-01`; const [year, month] = yearMonth.split('-').map(Number); const nextMonth = month === 12 ? 1 : month + 1; const nextYear = month === 12 ? year + 1 : year; const nextMonthStart = ...`
- Re-implemented inline at src/modules/commitments/database/commitments.ts:17-21 (identical)
- Re-implemented inline at src/modules/commitments/database/commitment_payments.ts:65-69 (identical, variable named nextMonthStr)
- Re-implemented again at src/modules/budget/screens/budget/budget.helpers.ts:434-446 as previousYearMonth/nextYearMonth
- `currentYearMonth` exists twice: src/utils/year_month.ts:18 `return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;` and src/modules/budget/repositories/budget.repository.ts:50 `return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;`
- The budget module imports its date util from a repository, not a util: src/modules/budget/screens/budget/budget.state.ts:4, category_detail.hook.ts:6, category_detail.state.ts:3, budget.hook.ts:11 all `import { currentYearMonth } from '@/modules/budget/repositories/budget.repository';` while commitments/dashboard/transactions/month_filter import from '@/utils/year_month'
- `MONTHS_SHORT` is declared twice with identical contents: src/utils/year_month.ts:3 and src/utils/format_date.ts:1

**Failure path.** A month-boundary fix — for example switching the exclusive upper bound to an inclusive last-day-of-month, or handling a locale/timezone edge — applied to monthRange in budget/database/spending_plans.ts leaves getMonthExpenseStats (transactions), getCommitmentsForMonthSnapshot (commitments) and getPaymentsByMonth (commitment_payments) on the old boundary. The result is a month where budget spend, transaction totals, and commitment payments each select a different date range, so the same month reports inconsistent figures across Budget, Transactions and Commitments.

**Recommendation.** Promote `monthRange` from src/modules/budget/database/spending_plans.ts:5 into src/utils/year_month.ts and have transactions/database/transactions.ts:31, commitments/database/commitments.ts:17 and commitments/database/commitment_payments.ts:65 call it. Delete `currentYearMonth` and `lastMonths` from src/modules/budget/repositories/budget.repository.ts:50-64 (a repository is not a date-utility home per CLAUDE.md's Database Layer rules), re-export from src/utils/year_month.ts, and repoint the 4 budget consumers. Delete budget.helpers.ts:434-446 in favour of shiftYearMonth (src/utils/year_month.ts:34). Delete the duplicate MONTHS_SHORT at src/utils/format_date.ts:1 and import from year_month.ts.

> **Verification correction.** Confirmed 4 identical month-range implementations, 2 currentYearMonth implementations with a split import convention, and 2 MONTHS_SHORT literals — but the format_date.ts:1 copy is a non-exported local const, and all four month-range copies are presently identical, so the cross-module figure mismatch is a latent divergence risk on the next edit, not a currently reproducible defect.


### M8. "Unassigned income" on the default Categories tab clamps over-allocation to 0 and ignores spending plans

**Dimension:** `budget-module` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/budget/screens/budget/budget.helpers.ts:307 — `const unassignedIncome =\n    expectedIncome === null ? undefined : Math.max(expectedIncome - planned, 0);` — the `Math.max(..., 0)` discards the sign, so an over-allocated month is indistinguishable from a perfectly allocated one.
- src/modules/budget/screens/budget/budget.helpers.ts:338 — `unassignedIncomeLabel:\n      unassignedIncome === undefined ? Strings.budgetCategoriesSetIncome : formatAmount(unassignedIncome),` — renders the clamped value with no over/under qualifier.
- src/modules/budget/screens/budget/components/summary_card.tsx:66 — `{ key: 'unassigned-income', label: Strings.budgetCategoriesSummaryUnassignedIncome, value: summary.unassignedIncomeLabel, ... }` — no `tone` is passed, unlike the sibling `unbudgeted-spend` metric on line 80 which does set `tone: summary.unbudgetedSpend > 0 ? 'warning' : 'default'`. The over-budget case renders in default tone.
- src/constants/strings.ts:240 — `budgetCategoriesSummaryUnassignedIncome: 'Unassigned income'`.
- src/modules/budget/screens/budget/budget.helpers.ts:302 — `const planned = rows.reduce((total, row) => total + row.planned, 0);` where `rows` comes only from `buildCategoryBudgetRows`; spending-plan totals (`spendingPlansSummary.planned`, built separately at src/modules/budget/screens/budget/spending_plans_summary.helpers.ts:15) are never subtracted from income.
- src/modules/budget/screens/budget/budget_buckets.helpers.ts:485 — the 50/30/20 lens does it correctly: `const balanceMetaLabel = isOver ? Strings.budget5030OverIncome : Strings.budget5030LeftToPlan;` with `balanceColor: isOver ? Colors.dark.negative : Colors.dark.positive` (line 502), proving the app already knows how to express the over case.
- src/modules/budget/screens/budget/budget.state.ts:69 — `lensTab: 'categories'` is the default tab, so the clamped metric is what the user sees first.

**Failure path.** Expected income for July = 20,000. The user creates category budgets totalling 25,000 (or 10,000 in budgets plus a 15,000 spending plan covering July). The Budget tab opens on the Categories lens and shows the metric "Unassigned income: 0" in default (non-warning) tone — the same value and styling it would show for a perfectly balanced 20,000 plan. Only by switching to the 50/30/20 tab (which requires income to be configured and categories to be grouped) does the user ever see "5,000 EGP over planned income" in red. In the spending-plan variant the Categories tab reports "Unassigned income: 10,000", actively telling the user they have 10,000 of headroom that is already committed.

**Recommendation.** Stop clamping: keep the signed value in `BudgetCategoriesSummaryVM.unassignedIncome` and reuse the existing `remainingLabel()` helper (src/modules/budget/screens/budget/budget.helpers.ts:130) to produce `{ magnitude, label }`. Render "X over income" with `Colors.dark.negative` and `tone: 'warning'` in `summary_card.tsx` exactly as the 50/30/20 summary does. Separately, decide and document whether spending-plan totals count against income; if they do, subtract `spendingPlansSummary.planned` (restricted to the selected month) from the income headroom, and if they do not, rename the metric so it does not read as total remaining income.

> **Verification correction.** Real but medium, not high. `buildBudgetCategoriesSummary` clamps unassigned income to 0 (budget.helpers.ts:306-308) and `summary_card.tsx` renders it with no warning tone, so an over-allocated month is visually identical to a perfectly allocated one on the default Categories lens — magnitude and direction of over-allocation are concealed. It does not display a false positive surplus from category budgets, and it does not corrupt stored data. The spending-plan clause should be dropped from the defect and raised separately as an open product question (do spending plans consume expected income?), since no code or spec establishes the intended relationship.


### M9. Editing a budget in any month silently rewrites the category's global budget_group, leaking the classification into every other month

**Dimension:** `budget-module` · **Category:** financial-correctness · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/modules/budget/repositories/budget.repository.ts:341 — `if (input.categoryGroup !== undefined) {\n        await setBudgetMonthCategoryGroup(tx, yearMonth, input.categoryId, input.categoryGroup);\n        await setCategoryGroup(tx, input.categoryId, input.categoryGroup);\n      }` — the second call is month-agnostic.
- src/modules/categories/database/categories.ts:64 — `await db.runAsync('UPDATE categories SET budget_group = ?, updated_at = ? WHERE id = ?', ...)` — an unconditional global overwrite.
- src/modules/budget/screens/budget/components/set_budget_sheet.hook.ts:149 — `categoryGroup: groupValue ?? undefined,` — the group is always resubmitted, even when the user only edited the limit amount.
- src/modules/budget/screens/budget/components/set_budget_sheet.hook.ts:106 — `initialized = initEditMode(editingRow?.categoryGroup ?? null, sessionKey);` — `groupValue` is pre-seeded from the *edited month's* profile (src/modules/budget/screens/budget/budget.hook.ts:245 resolves it via `resolveBudgetRuleGroup(category, activeBudgetGroupByCategoryId, hasConfiguredIncome)`), so a past-month value is what gets written globally.
- src/modules/budget/screens/budget/budget_buckets.helpers.ts:182 — `return budgetGroupByCategoryId[category.id] ?? (hasIncome ? undefined : (category.budget_group ?? undefined));` — every month without a profile row falls back to the now-overwritten global column.
- src/modules/budget/database/budget_month_profiles.ts:64 — `INSERT OR IGNORE INTO budget_month_category_groups ... SELECT ?, id, budget_group, ?, ? FROM categories WHERE type = 'expense' AND budget_group IS NOT NULL` — run from `setExpectedIncome` (budget.repository.ts:320), this later freezes the corrupted global value into a month profile permanently.

**Failure path.** Groceries is globally classified `need`. In March the user reclassified it to `want` for that month only (March profile row = want). It is now July; the user switches the month picker to March, taps Edit on the Groceries budget and changes only the amount from 3,000 to 3,500, then saves. `setBudget` writes `categories.budget_group = 'want'` globally. The user then switches to August (no income set, so no profile rows exist): the 50/30/20 lens now files Groceries under Wants instead of Needs, changing both bucket totals and the over-cap/within-cap status. If the user later sets August's expected income, `snapshotBudgetMonthCategoryGroups` writes `want` into August's profile row permanently — the corruption becomes durable and is no longer traceable to the March amount edit.

**Recommendation.** Only write the global `categories.budget_group` when the user actually changed the group in the sheet and the edited month is the current month (or make the global column write an explicit, separate user action on the Categories screen). Concretely: have the sheet report the group as `undefined` when `groupValue` equals the value it was initialised with, and drop the `setCategoryGroup` call from `setBudget` entirely so `budget_month_category_groups` remains the sole per-month authority. Add a repository test asserting that editing a past-month budget's limit leaves `categories.budget_group` untouched.

> **Verification correction.** Real cross-month leak, medium not high. Editing any budget in any month rewrites categories.budget_group globally (budget.repository.ts:343), and the value written is the group resolved for the *edited* month, so a past-month edit can overwrite the global default; a later setExpectedIncome then freezes it into that month's profile row via INSERT OR IGNORE. Money amounts are unaffected — only 50/30/20 grouping for months lacking a profile row. Fix must keep a writer for the global column: gate the write on the sheet actually changing the group (report categoryGroup as undefined when unchanged) and/or restrict the global write to the current month. Do not delete the setCategoryGroup call outright — it is the sole writer of categories.budget_group in the codebase, and the no-income fallback plus snapshotBudgetMonthCategoryGroups depend on it.


### M10. Editing a commitment deletes only 'upcoming'/'due' rows, so 'overdue' rows on the old schedule survive and duplicate against the regenerated schedule — and no DB constraint prevents the duplicate

**Dimension:** `commitments-module` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/commitments/database/commitment_payments.ts:178 — the doc comment claims `"Only deletes where status IN ('upcoming', 'due') — preserves paid/skipped."` — it does not acknowledge that `overdue` is also preserved.
- src/modules/commitments/database/commitment_payments.ts:186 — `DELETE FROM commitment_payments WHERE commitment_id = ? AND status IN ('upcoming', 'due')` — `overdue` rows, which have no transaction and represent un-acted-on obligations, are left behind.
- src/modules/commitments/store/commitment.store.ts:223 — `await repo.deleteUnpaidPayments(id);` is the only cleanup step before regeneration on edit.
- src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:44 — `if (existing.has(dueDate)) continue;` — dedupe is keyed on the exact due-date string, so a surviving row on the OLD date does not suppress generation of a new row on the NEW date; both coexist.
- src/database/migrations/007_create_commitment_payments.ts:4 — the `commitment_payments` table declares only `id TEXT PRIMARY KEY` plus three non-unique indexes; there is no `UNIQUE(commitment_id, due_date)` (compare src/database/migrations/011_create_budgets.ts:11 `UNIQUE(category_id, effective_from)`), so the `INSERT OR IGNORE` at src/modules/commitments/database/commitment_payments.ts:111 documented as "idempotent" (line 102) provides zero database-level protection — every row carries a fresh uuid, so OR IGNORE can never fire.
- src/modules/commitments/screens/commitments/commitments.hook.ts:190 — `totalsByCurrency` sums `p.amount_due` over every non-skipped payment in the month, so duplicated rows double-count directly into the header total.

**Failure path.** User adds a commitment on 2026-07-29 with start_date 2026-03-10 (past dates are selectable). Housekeeping backfills rows for Mar 10, Apr 10, May 10, Jun 10, Jul 10 — all stamped `overdue` because they are < today at insert time. The user then edits the commitment and changes the payment day to the 15th. `deleteUnpaidPayments` removes only the future `upcoming` rows; the five `overdue` rows on the 10th survive. Housekeeping regenerates the full schedule from 2026-03-15, and because those due dates differ from the surviving ones, it inserts five MORE `overdue` rows on the 15th. March through July now each show two overdue payments for the same commitment: the Overdue count doubles and the "Total committed" line in SummaryHeader reports twice the real obligation for those months.

**Recommendation.** Change `deleteUnpaidPaymentsByCommitment` to `DELETE FROM commitment_payments WHERE commitment_id = ? AND transaction_id IS NULL AND status IN ('upcoming','due','overdue')` — transaction_id IS NULL is the real invariant (paid rows own a transaction; skipped rows are an explicit user decision worth preserving, but overdue rows are not). Independently, add a migration creating `UNIQUE INDEX idx_cp_commitment_due ON commitment_payments(commitment_id, due_date)` so the `INSERT OR IGNORE` at commitment_payments.ts:111 actually delivers the idempotency its comment promises, and fix that comment. Add a repository test: backfilled overdue rows + edited start_date must yield exactly one row per due date.

> **Verification correction.** Real and correctly described, but medium in current code: 'overdue' rows only arise from backfilled past-dated commitments, and only date-shifting edits duplicate. Note this becomes high the moment status aging is fixed, since overdue rows would then be routine — fix it together with the aging change. One correction to the recommendation: a new migration adding UNIQUE INDEX(commitment_id, due_date) will fail outright on any device that already holds duplicate rows from this bug; the migration must dedupe first (DELETE the losing rows) before creating the index.


### M12. Archiving a credit card silently erases its debt from net worth — and the confirmation copy promises the opposite

**Dimension:** `dashboard-accounts` · **Category:** financial-correctness · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/constants/strings.ts:165 — `accountDetailArchiveCCWarning: 'Outstanding credit card balance will still affect net worth.'` — this is the only extra warning shown when archiving a credit card (src/modules/accounts/screens/accounts/detail/components/archive_confirmation_dialog.tsx:38-42).
- src/modules/accounts/database/accounts.ts:9 — `'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC'` — the only list query the dashboard uses.
- src/modules/dashboard/repositories/dashboard.repository.ts:55 — `const accounts = await getAccounts(db);` — the snapshot's account list is the archived-excluding list.
- src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:24 — `if (a.type === AccountType.CreditCard) { liabilitiesEgp += balanceEgp; }` and :31 `const netWorthEgp = assetsEgp - liabilitiesEgp;` — an archived card is simply never iterated, so its debt vanishes rather than persisting.
- src/modules/accounts/database/accounts.ts:106-115 — `archiveAccount` only ever runs `UPDATE accounts SET is_archived = 1`; no query anywhere in src/ sets `is_archived = 0` (grep over src for `is_archived` returns only reads, the `= 1` write, and the insert default), and `IAccountRepository` (src/modules/accounts/repositories/account.repository.ts:27-36) exposes no unarchive method.

**Failure path.** User has a credit card with 20,000 EGP outstanding. On Account Detail they tap Archive; the confirm dialog states 'Outstanding credit card balance will still affect net worth.' They confirm. `archiveAccount` sets is_archived = 1, the dashboard refetches via `getAccounts` (is_archived = 0), `computeNetWorth` no longer sees the card, and the Net Worth stat card plus the breakdown sheet jump upward by 20,000 EGP. There is no UI anywhere to unarchive, so the state is permanent.

**Recommendation.** Pick one semantics and make code and copy agree. Either (a) keep archived credit cards in the liability side of `computeNetWorth` by giving the dashboard snapshot an archived-inclusive credit-card read, or (b) block archiving a credit card whose `current_balance != 0` and change `accountDetailArchiveCCWarning` to say the debt will be removed from net worth. Independently, add an unarchive path (`setAccountArchived(db, id, 0)` + an archived-accounts list) so the action is recoverable, since it currently is not.

> **Verification correction.** Real but narrower than stated: `Strings.accountDetailArchiveCCWarning` ('Outstanding credit card balance will still affect net worth.') directly contradicts both the dialog's own primary body copy and the actual behaviour — an archived credit card is dropped from `getAccounts` and therefore from `computeNetWorth`, so net worth rises by the card's outstanding balance. Compounding this, there is no unarchive path anywhere (no `is_archived = 0` write, no repository method, no UI), so the action cannot be undone in-app. The fix is a copy correction (or a block on archiving a card with a non-zero balance) plus an unarchive path, not a change to `computeNetWorth`.


### M13. Every Dashboard tab focus publishes status 'refreshing', so the pull-to-refresh spinner appears on every visit; the freshness gate cf00b272 added is dead code

**Dimension:** `dashboard-accounts` · **Category:** performance · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/modules/dashboard/screens/dashboard/dashboard.hook.ts:86-90 — the focus-effect cleanup runs `useDashboardStore.getState().invalidate();` on every blur.
- src/modules/dashboard/screens/dashboard/dashboard.store.ts:128-133 — `invalidate: () => { generation += 1; freshKey = undefined; inFlight = undefined; ... }` — the freshness key is discarded unconditionally on blur.
- src/modules/dashboard/screens/dashboard/dashboard.store.ts:54 — `if (!force && freshKey === input.yearMonth && currentSnapshot?.key === input.yearMonth) return Promise.resolve();` — unreachable in production: `ensureSnapshot` has exactly one caller (dashboard.hook.ts:83, the focus effect), and every focus is preceded by a blur that cleared `freshKey`.
- src/modules/dashboard/screens/dashboard/dashboard.store.ts:62-67 — when a same-month snapshot exists the store sets `status: 'refreshing'`.
- src/modules/dashboard/screens/dashboard/dashboard.presentation.ts:33 — `isRefreshing: hasSnapshot && input.status === 'refreshing'` — no distinction between user-pulled and focus-triggered revalidation.
- src/modules/dashboard/screens/dashboard/index.tsx:152-160 — `<RefreshControl refreshing={presentation.isRefreshing} ... />`; setting `refreshing` programmatically renders the platform spinner and offsets the scroll content.
- src/modules/dashboard/repositories/dashboard.repository.ts:31 and :83 — `loadedAt` is written into every snapshot but grep over src shows it is never read, so no staleness policy exists.

**Failure path.** User taps Transactions, then taps Dashboard again two seconds later. Blur ran `invalidate()`, so `ensureSnapshot` cannot short-circuit; it finds a same-month snapshot, sets status 'refreshing', `isRefreshing` becomes true, and the RefreshControl spinner drops in and pushes the content down for the duration of the 5-query snapshot load, then springs back — even though nothing changed. Repeat on every single tab switch back to Dashboard.

**Recommendation.** Split the refresh cause from the refresh state: keep a `refreshSource: 'focus' | 'user'` (or a separate `isUserRefreshing` flag) and bind `RefreshControl.refreshing` only to the user-initiated one. Replace the unconditional blur `invalidate()` with a staleness check that actually consumes `snapshot.loadedAt` (plus the existing transaction `mutationVersion` and equivalent invalidation signals from the account/budget/commitment stores), so a warm snapshot inside the staleness window short-circuits at dashboard.store.ts:54 instead of re-querying.


### M14. Account Detail renders `null` — no header, no back affordance — whenever the account is not in the active-account store; archiving blanks the screen for the whole back transition

**Dimension:** `dashboard-accounts` · **Category:** ui-standards · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:18 — `const accounts = useAccountStore((s) => s.accounts);` and :65 `const account = accounts.find((a) => a.id === id);` — resolved only from the non-archived in-memory list, even though `accountRepository.getByIdIncludingArchived` exists (src/modules/accounts/repositories/account.repository.ts:49-52).
- src/modules/accounts/screens/accounts/detail/index.tsx:57 — `if (!account) return null;` — the entire screen, including `StackHeader` and its back button, disappears. There is no loading, not-found, or error branch.
- src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:121-131 — `handleArchive` awaits `archiveAccount(id)` and only then calls `router.back()`.
- src/modules/accounts/store/account.store.ts:103-111 — `archiveAccount` awaits `repo.archive(id)` then `await get().loadAccounts()`, which publishes an `accounts` array that no longer contains the archived id while the detail route is still mounted.

**Failure path.** User taps Archive and confirms. `loadAccounts()` republishes the account list without the archived row, the detail screen re-renders, `account` is undefined, and `index.tsx:57` returns null — the header, hero, and action list all vanish. The route stays mounted for the full back-navigation animation, so the user watches a completely blank screen slide away. The same `return null` is the terminal state for any other id-resolution miss (stale navigation, a not-yet-loaded store), leaving a route with no back button at all.

**Recommendation.** Load the detail account by id including archived (`getByIdIncludingArchived`) with request ownership rather than deriving it from the active-account list, and replace `return null` with explicit loading / not-found states that always keep `StackHeader` mounted. For the archive path specifically, navigate back before or in the same commit as the store republish so the screen never renders without its account.


### M15. Account opening balance and Adjust Balance parse money with `parseFloat`, bypassing the project's strict decimal parser

**Dimension:** `dashboard-accounts` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/accounts/utils/add_account.schema.ts:12-18 — `balance: z.string().refine((v) => { const n = parseFloat(v); return Number.isFinite(n) && n >= 0; }, ...)` — validation itself is `parseFloat`, so any prefix-numeric string passes.
- src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:63 — `opening_balance: parseFloat(data.balance),` and :67-72 — `credit_limit`, `revolving_balance`, `minimum_payment`, `apr` are all `parseFloat` with no validation at all beyond a presence check on `credit_limit`.
- src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers.ts:9-13 — `const n = parseFloat(raw); if (!Number.isFinite(n) || n < 0) return { ok: false }; return { ok: true, value: n };`
- src/utils/parse_decimal.ts:1-8 — the project already has the strict parser: `const DECIMAL_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;` … `Number(normalized.replace(/,/g, ''))`. Transactions use it via `parsePositiveDecimal` (src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts), so the two money-entry surfaces disagree.
- src/modules/accounts/repositories/account.repository.ts:61 — `current_balance: data.opening_balance` — whatever `parseFloat` produced becomes both the opening and current balance.

**Failure path.** User pastes or types '12,500' into the opening-balance field (the app renders balances with thousands separators via `formatAmount`, so this is the shape the user sees everywhere). `parseFloat('12,500')` is 12; the Zod refine also uses `parseFloat`, so 12 is 'valid'. The account is created with opening_balance = current_balance = 12 EGP. The same happens in Adjust Balance: entering '12,500' rewrites `current_balance` to 12 via `setAccountBalance` (src/modules/accounts/database/accounts.ts:117-132), destroying the previous value with no undo. `parseFloat('5000abc')` → 5000 and `parseFloat('1.5.0')` → 1.5 pass the same way.

**Recommendation.** Replace `parseFloat` with `parseNonNegativeDecimal` in `add_account.schema.ts` (both the refine and the value derivation), in `add_account.hook.ts` for `credit_limit` / `revolving_balance` / `minimum_payment` / `apr`, and in `parseAdjustInput`. Validate `credit_limit`, `min_payment`, `apr`, and `due_day` in the Zod schema instead of coercing unvalidated strings at submit time.

> **Verification correction.** Accurate version: the account opening-balance field, the four credit-card numeric fields, and the Adjust Balance input all parse with `parseFloat` instead of the project's `parseNonNegativeDecimal`, and the Zod refine uses `parseFloat` too, so any prefix-numeric string is accepted and silently truncated. Both inputs are `decimal-pad` and the Adjust sheet seeds the raw `String(currentBalance)` (no separators), so the realistic reachable cases are a pasted or comma-locale value ('12,500' -> 12) and a typo with two decimal points ('1.5.0' -> 1.5), not a value the app itself prefilled. `credit_limit`, `revolving_balance`, `minimum_payment`, `apr` and `due_day` have no numeric validation at all beyond a presence check on credit_limit. Recommendation stands.


### M16. Adjust Balance rewrites `current_balance` on a credit card but never reconciles `revolving_balance`

**Dimension:** `dashboard-accounts` · **Category:** financial-correctness · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- src/modules/accounts/database/accounts.ts:117-132 — `setAccountBalance` runs `UPDATE accounts SET current_balance = ?, balance_review_required = 0, updated_at = ? WHERE id = ?` — `revolving_balance` is untouched, and this path applies to every account type including credit cards (see the comment in src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers.ts:4-5: 'Applies to ALL account types including credit cards').
- src/modules/transactions/domain/transaction_policy.ts:204-214 — the cc_payment revolving delta is derived from the stored value: `const calculatedDelta = normalizeMoney(-Math.min(Math.max(0, destinationAmount - minimumPayment), Math.max(0, destination.revolvingBalance ?? 0)));`
- src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:68-69 — `revolving_balance` is user-entered at account creation, so it is meaningful data, not a derived cache.
- src/database/migrations/017_add_account_balance_review.ts:8-16 — migration 017 flags exactly these accounts (`type = 'credit_card'` with transactions) for review, and the review CTA routes the user into this same adjust flow (src/modules/accounts/screens/accounts/detail/index.tsx:104-113).

**Failure path.** Credit card with current_balance 5,000 and revolving_balance 5,000, minimum_payment 500. The user pays 4,000 at the bank and uses Adjust Balance to set the card to 1,000. `setAccountBalance` writes current_balance = 1,000 and leaves revolving_balance = 5,000. The user later records an in-app cc_payment of 1,000: `calculatedDelta = -min(max(0, 1000-500), max(0, 5000)) = -500`, so current_balance becomes 0 (card fully paid) while revolving_balance is still 4,500. Every subsequent cc_payment computes its revolving delta from that phantom figure.

**Recommendation.** Make the balance adjustment credit-card aware: clamp `revolving_balance` to the new `current_balance` in `setAccountBalance` (e.g. `revolving_balance = MIN(COALESCE(revolving_balance, 0), ?)` when the row is a credit card), or expose a revolving field in the Adjust Balance sheet for card accounts so the user reconciles both figures together. Add a query-level test covering adjust-down on a card with a non-null revolving balance.


### M17. Commitment edit is a two-statement non-atomic sequence and its cleanup query deliberately spares 'overdue' rows, leaving phantom payments for dates outside the new schedule

**Dimension:** `database-layer` · **Category:** bug · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- src/modules/commitments/database/commitment_payments.ts:186 — `DELETE FROM commitment_payments WHERE commitment_id = ? AND status IN ('upcoming', 'due')`, while the doc comment at :180 claims it 'preserves paid/skipped' — it silently preserves `overdue` too
- src/modules/commitments/store/commitment.store.ts:222 — `await repo.update(id, data); await repo.deleteUnpaidPayments(id);` — two autocommit round trips with no enclosing transaction, unlike every other multi-write path in the module
- src/modules/commitments/repositories/commitment.repository.ts:190 — `deleteUnpaidPayments` calls `deleteUnpaidPaymentsByCommitment(db, commitmentId)` directly on the shared handle, no `withExclusiveTransactionAsync`
- src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:45 — regeneration only fills gaps (`if (existing.has(dueDate)) continue;`), so a surviving row for a date that is no longer part of the schedule is never reconciled or removed

**Failure path.** On 2026-07-29 the user adds a monthly commitment with start_date 2026-01-01. Housekeeping backfills 2026-01-01 … 2026-07-01 as `overdue` (they are in the past at generation time). The user realises the start date was wrong and edits it to 2026-06-01. `updateCommitment` writes the new start_date, then `deleteUnpaidPayments` removes only `upcoming`/`due` rows — the five `overdue` rows for Jan–May survive. The next housekeeping pass sees those due dates as already existing and leaves them alone. The Commitments list and the Dashboard overdue counter permanently show five phantom overdue payments for months before the commitment now starts, and the user can only clear them by paying or skipping each one. Separately, if `deleteUnpaidPayments` throws after `repo.update` succeeded, the commitment carries the new recurrence while the old schedule's payment rows remain, with no rollback.

**Recommendation.** Move the pair into one repository method wrapped in `withExclusiveTransactionAsync` (matching `runHousekeeping`), and inside it delete every unsettled row rather than a status subset: `DELETE FROM commitment_payments WHERE commitment_id = ? AND transaction_id IS NULL AND status NOT IN ('paid','skipped')`. That is status-independent and therefore also correct once the status-aging fix lands. Fix or delete the misleading doc comment at :180, and regenerate inside the same transaction so the screen never observes a commitment with zero scheduled payments.


### M18. Transaction form's "≈ N EGP" rate preview multiplies an EGP-denominated amount by the rate on EGP→USD transfers and CC payments

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED · **Independently corroborated as** M40 (`transactions-module` lens)

**Evidence**

- src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx:29 — `const egp = roundMoney(amount * rate);` — unconditionally treats `amount` as USD.
- src/constants/strings.ts:1029 — `addTxEgpPreview: '≈ {amount} EGP',` — the product is always labelled EGP.
- src/modules/transactions/screens/transactions/transaction_form/components/transaction_exchange_rate_row.tsx:12 — `const amount = parseFloat(useTransactionAmount(mode)) || 0;` — this is the raw amount typed into `AmountHero`, which is denominated in the SOURCE account's currency (src/modules/transactions/screens/transactions/transaction_form/components/amount_hero.tsx:61 renders `{currency}` = source currency next to it).
- src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts:291 — `const requiresRate = isUSD || (isTransferOrCC && isToUSD);` — the rate row is shown when only the DESTINATION is USD, i.e. when the typed amount is EGP.
- src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx:320 — `{isUSD ? (` / `:321 <TransactionExchangeRateRow` — `isUSD` is bound to `requiresRate`, so the row renders for EGP-source transfers.
- src/modules/transactions/domain/transaction_amounts.ts:61 — `const toAmount = input.destinationCurrency === Currency.EGP ? egpAmount : input.sourceCurrency === Currency.USD ? roundMoney(input.amount) : roundMoney(egpAmount / (exchangeRate ?? 0));` — the real destination amount divides by the rate.
- *(via M40)* src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx:28 — `const egp = roundMoney(amount * rate);` — the preview unconditionally multiplies the entered amount by the rate, with no knowledge of source/destination currency.
- *(via M40)* src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx:120 — `{Strings.addTxEgpPreview.replace('{amount}', formatPreviewAmount(amount, value))}` where `addTxEgpPreview: '≈ {amount} EGP'` (src/constants/strings.ts:1029) — the result is labelled EGP.

**Failure path.** User adds a Transfer from an EGP bank account to a USD account with the stored rate 50 and types 5,000. `requiresRate` is true (destination is USD), so the rate row renders `≈ 250,000.00 EGP` (5,000 x 50). What is actually persisted is `egp_amount = 5,000` and `to_amount = roundMoney(5000 / 50) = 100 USD`. The form overstates the EGP value of the transfer by 50x and never surfaces the 100 USD the destination account will receive — the only conversion feedback in the form is the wrong one. The same happens for a CC payment from an EGP account to a USD credit card.

**Recommendation.** Pass the source currency into `ExchangeRateRow` and branch: when the typed amount is already EGP, show `≈ amount / rate {destinationCurrency}` (or reuse `resolveTransactionAmounts` and render both `egpAmount` and `toAmount` with their own currency codes). Cover EGP→USD transfer and EGP→USD cc_payment in the preview tests, not just USD-source expenses.

> **Verification correction.** Mechanics and reachability confirmed; error magnitude is one factor of the rate (50x), not rate-squared. Reclassified high -> medium: display-only caption on the EGP->USD subset of transfers/cc_payments, with correct values still written to the ledger.


### M19. Dashboard account card hardcodes "EGP" on a credit card's limit and available credit, which are stored in the card's native currency

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/dashboard/screens/dashboard/components/account_card.tsx:56 — `const limit = account.credit_limit ?? 0;` — read straight from the account row; `credit_limit` is never converted (src/database/migrations/001_create_accounts.ts:13 `credit_limit REAL,` sits alongside `opening_balance`/`current_balance`, all native-currency).
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:66 — `value: `${formatAmount(limit)} EGP`,` — currency code hardcoded.
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:70 — `value: isOverLimit ? Strings.cardOverLimit : `${formatAmount(available)} EGP`,` — same hardcode for available credit.
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:257 — `{formatAmount(account.current_balance)} {account.currency}` — the balance two rows above correctly uses `account.currency`, so the same card shows two different currency codes for values in the same unit.
- src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:44 — `text: Strings.accountHeroAvailable(formatAmount(available), currency, formatAmount(limit)),` — the account-detail screen renders the identical numbers with the account's real currency, proving the dashboard label is the defect.
- src/modules/accounts/screens/accounts/add_account/index.tsx:79 — `<CurrencySelector` is rendered for every account type, so USD credit cards are creatable.

**Failure path.** User creates a USD credit card with credit_limit = 5,000 and current_balance = 1,200 (both USD). The dashboard account card renders: balance `1,200 USD`, Limit `5,000 EGP`, Available `3,800 EGP`. At the stored rate of 50 the true EGP limit is 250,000 and true EGP available is 190,000 — the card understates both by 50x while simultaneously showing the balance in USD. Opening the same account's detail screen shows `Available 3,800 USD of 5,000`, directly contradicting the dashboard.

**Recommendation.** Use `account.currency` for the limit/available rows exactly as the balance row and `balance_hero.helpers.ts` do (`${formatAmount(limit)} ${cur}`), or convert with `rate` and keep the EGP label. Add a view-model test with a USD credit card asserting the limit row's currency code matches the balance row's.

> **Verification correction.** Real and reachable, but the values are correct and only the currency suffix is wrong, on the USD-credit-card subset only. The failure-path line 'understates both by 50x' is misleading — nothing is miscalculated; the figures are simply labelled EGP instead of USD. Reclassified high -> medium.


### M20. Credit-card next-due-date skips a full cycle when the statement day does not exist in the current month

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- src/utils/format_date.ts:59 — `const thisMonthDue = new Date(now.getFullYear(), now.getMonth(), dueDay);` — `new Date(2026, 3, 31)` silently rolls over to 2026-05-01; the day is never clamped to the month length (contrast src/utils/compute_due_dates.ts:37 `const d = Math.min(startDay, maxDay);`, which does clamp).
- src/utils/format_date.ts:61 — `thisMonthDue.getDate() < now.getDate() || thisMonthDue.getMonth() < now.getMonth()` — the rolled-over date's small day number is misread as "already passed", pushing the result to the following month.
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:32 — `function nextDueDate(dueDay: number): string {` — a byte-identical copy of the same defect, used at `:75 value: dueDay != null && dueDay > 0 ? nextDueDate(dueDay) : '—',`.
- src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:71 — `statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,` — the day is user-entered with no 1–28 restriction, so 29/30/31 are routinely stored.

**Failure path.** Card with statement_due_day = 31, today = 2026-04-10. `new Date(2026, 3, 31)` overflows to 2026-05-01; `getDate()` is 1, which is < 10, so the code jumps to `new Date(2026, 4, 31)` = 2026-05-31 and renders "May 31". The real next due date is 2026-04-30 (or 2026-05-01) — the card hides a payment due in three weeks and shows one seven weeks out. Verified by execution: dueDay 31 / 2026-04-10 → "May 31"; dueDay 31 / 2026-02-10 → "Mar 31" (should be Feb 28); dueDay 30 / 2026-02-05 → "Mar 30"; dueDay 29 / 2027-02-10 → "Mar 29" (non-leap February).

**Recommendation.** Clamp before constructing: `const maxDay = new Date(y, m + 1, 0).getDate(); const day = Math.min(dueDay, maxDay);` then compare on the clamped date, and delete the duplicate implementation in `account_card.tsx` in favour of the shared `@/utils/format_date` export. Add table tests for dueDay 29/30/31 across February, a 30-day month, and a 31-day month.


### M21. Adjust Balance overwrites a stored account balance from an unsanitised `parseFloat`, with no rounding and no strict parser

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers.ts:9 — `const n = parseFloat(raw);` / `:10 if (!Number.isFinite(n) || n < 0)` — accepts any prefix-parsable string and never applies `roundMoney`.
- src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx:102 — `keyboardType="decimal-pad"` with `onChangeText={(v) => { setInput(v); ... }}` at `:96` — unlike the transaction amount field there is no sanitiser, so a second decimal point or a space is accepted verbatim (contrast src/modules/transactions/screens/transactions/transaction_form/components/amount_hero.tsx:33 `function sanitize(text: string)`, which strips non-numerics and caps at 2 decimals).
- src/utils/parse_decimal.ts:1 — `const DECIMAL_PATTERN = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/;` — the strict parser the rest of the app migrated to (used by the transaction form and, after the currency remediation, by `currency.hook.ts:13`) is bypassed here.
- src/modules/accounts/database/accounts.ts:124 — `UPDATE accounts SET current_balance = ?, balance_review_required = 0, updated_at = ? WHERE id = ?` — the value is written verbatim as the authoritative balance.
- src/modules/accounts/utils/add_account.schema.ts:14 — `const n = parseFloat(v);` — the same lenient pattern gates `opening_balance` (src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:63 `opening_balance: parseFloat(data.balance),`).

**Failure path.** On Android's decimal-pad nothing prevents a second '.', so typing `1.2.3` yields `parseFloat("1.2.3") === 1.2`: the sheet accepts it, `adjustBalance` runs, and the account balance is silently set to 1.2 instead of erroring. `50 000` (a space from a paste) yields 50. `1234.567` is accepted and stored with sub-cent precision, after which `formatAmount(1234.567)` renders `1,235` while `computeNetWorth` sums 1234.567 — the displayed balance and the aggregate no longer agree, and every subsequent `applyAccountDelta` (`accounts.ts:41` `current_balance = current_balance + ?`) carries the residue forward.

**Recommendation.** Replace `parseFloat` with `parseNonNegativeDecimal` from `@/utils/parse_decimal`, apply `roundMoney` before calling `adjustBalance`, and reuse `amount_hero.tsx`'s `sanitize` on the input's `onChangeText`. Do the same for `createAddAccountSchema.balance` and the credit_limit / min_payment / apr `parseFloat` calls in `add_account.hook.ts:67-72`.


### M22. Every USD figure in the app is formatted with 0 decimal places; the currency-aware formatter that knows USD has 2 is dead code

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/utils/format_amount.ts:4 — `export function formatAmount(value: number, decimals = 0): string {` — defaults to 0 fraction digits regardless of currency.
- src/utils/format_amount.ts:11 — `export function formatCurrencyAmount(value: number, currency: Currency, decimals?: number)` and `:16 export function formatWithCurrencyCode` — a repo-wide grep finds zero call sites for either; the `decimals: 2` entry at src/constants/currency.ts:11 (`[Currency.USD]: { code: Currency.USD, label: 'US Dollar', decimals: 2 }`) is therefore never consulted.
- src/modules/dashboard/screens/dashboard/components/stat_cards.tsx:284 — `{formatAmount(monthSpentUsd, 0)}{' '}` followed by `:285 USD` — the native USD spend total is explicitly forced to 0 decimals.
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:129 — `value: `${formatAmount(s.month_in)} ${cur}`,` and `:134` for month_out — a USD bank card's in/out figures lose cents.
- src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx:68 — `{formatAmount(account.current_balance)} {account.currency}` — a USD account's hero balance loses cents.
- src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts:21 — `const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });` — the transaction list uses a *different* formatter (3 fraction digits by default), so the same USD amount renders with cents in the list and without them on the account card.

**Failure path.** A month with two USD expenses of 49.99 and 29.99 produces `usd_native = 79.98`; `formatAmount(79.98, 0)` renders "80 USD" on the dashboard spend card (verified by execution). A month whose only USD expense is 0.49 renders "0 USD", i.e. real spend displayed as zero. A USD savings account holding 1,250.75 renders "1,251 USD" in `balance_hero`, yet a single 1,250.75 transaction in the list renders "1,250.75 USD" via the other formatter — the same money reads differently on two screens.

**Recommendation.** Route USD-denominated displays through `formatCurrencyAmount(value, currency)` (which already reads `CURRENCY_CONFIG[currency].decimals`) instead of bare `formatAmount`, standardise the ad-hoc `new Intl.NumberFormat('en-US', { style: 'decimal' })` instances on the same helper, and delete `formatWithCurrencyCode` if it stays unused.


### M23. Deleting or editing a credit-card payment created before migration 018 recomputes the revolving-balance reversal from the post-payment balance and permanently loses the difference

**Dimension:** `financial-correctness` · **Category:** financial-correctness · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/database/migrations/018_add_transaction_revolving_delta.ts:4 — `ALTER TABLE transactions ADD COLUMN revolving_balance_delta REAL;` — added with no backfill, so every cc_payment row that predates it has NULL.
- src/modules/transactions/repositories/transaction.repository.ts:352 — `revolvingBalanceDelta: existing.revolving_balance_delta ?? undefined,` (delete path) and `:403` (update path) — NULL collapses to `undefined`.
- src/modules/transactions/domain/transaction_policy.ts:210 — `const revolvingBalanceDelta = command.revolvingBalanceDelta === undefined ? calculatedDelta : normalizeMoney(command.revolvingBalanceDelta);` — with `undefined` it falls back to `:204 calculatedDelta = normalizeMoney(-Math.min(Math.max(0, destinationAmount - minimumPayment), Math.max(0, destination.revolvingBalance ?? 0)))`, which reads the account's CURRENT (already-reduced) revolving balance rather than the value at the time of the original payment.
- src/modules/transactions/domain/transaction_policy.ts:304 — `return invertAccountDeltas(resolveUncheckedCreateEffect(command).deltas);` — the delete reversal is derived from that recomputation.
- Pre-018 behaviour confirmed via `git show 287f9232^:src/modules/transactions/database/transactions.ts` line 127 — `const newRevolving = Math.max(0, revolving - revolvingReduction);` — the old writer clamped at zero, so the applied delta was frequently smaller than the naive formula and is unrecoverable without the stored value.

**Failure path.** Credit card with revolving_balance = 200 and minimum_payment = 0. Before migration 018, a cc_payment of 500 ran `newRevolving = Math.max(0, 200 - 500) = 0`, i.e. an applied delta of -200. The user later deletes that transaction. `existing.revolving_balance_delta` is NULL, so `resolveUncheckedCreateEffect` recomputes `calculatedDelta = -min(max(0, 500 - 0), max(0, 0)) = 0` from the current revolving balance of 0, and the inverted reversal is +0. revolving_balance stays 0 instead of being restored to 200 — 200 of tracked revolving debt is destroyed by an operation that is supposed to be a perfect reversal.

**Recommendation.** Either add a migration that backfills `revolving_balance_delta` for existing cc_payment rows using the recorded `minimum_payment_snapshot` and `to_amount` (writing 0 where it cannot be reconstructed), or make the delete/update path refuse to reverse a cc_payment whose `revolving_balance_delta` is NULL and surface a clear "legacy payment cannot be reversed" error instead of guessing. Note migrations are a critical trigger under CLAUDE.md and need sign-off.


### M24. formatAmount constructs a new Intl.NumberFormat on every call — the app's single hottest formatter

**Dimension:** `render-performance` · **Category:** performance · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/utils/format_amount.ts:4 — `export function formatAmount(value: number, decimals = 0): string { return new Intl.NumberFormat('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value); }` — a fresh ICU/JNI-backed formatter object is allocated on *every* invocation, not hoisted and not cached by `decimals`.
- src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts:21 — `const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });` — module-level hoisting is the established pattern in 13 other files (commitment_row.tsx:34, summary_header.tsx:26, pay_sheet.tsx:25, transfer_flow_card.tsx:28, detail_hero.tsx:17, payment_row.tsx:10, current_cycle_card.tsx:22, transactions.helpers.ts:26, detail.helpers.ts:19, commitments_card.tsx:36). `format_amount.ts` — the shared one used by 118 call sites — is the outlier.
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:66,70,87,92,96,110,114,129,134,139,148,153,158,257 — `buildInfoRows` calls `formatAmount` 3–4× per card plus 1× for the balance; every card render therefore allocates 4–5 Intl.NumberFormat objects.
- src/modules/budget/screens/budget/budget_buckets.helpers.ts:332,341,350,351,361,369,392,395,399,411,446,451 — `formatAmount` is called 2–3× *per budgeted category contributor* inside the 50/30/20 lens view-model build (`resultLabel: Strings.budget5030SpentOfPlanned(formatAmount(contributor.spent ?? 0), formatAmount(contributor.planned))`).
- src/modules/budget/screens/budget/spending_plans.helpers.ts — 18 further call sites on the Plans lens view-model.

**Failure path.** User opens Dashboard → Accounts tab with 20 accounts: `AccountCard` renders 20×, each running `buildInfoRows` → ~90 `new Intl.NumberFormat(...)` constructions in one render pass. User switches Budget to the 50/30/20 lens with 25 budgeted categories: `budget_buckets.helpers` builds contributor labels → ~60 more constructions per recompute, repeated on every month switch and every refresh. On Hermes/Android each construction crosses into platform ICU, so this is JS-thread time spent on formatter setup rather than formatting. React Compiler does not help: it memoizes component render bodies, not module-scope helper functions, and these run inside helpers that legitimately recompute whenever rate/stats/budget data change.

**Recommendation.** Hoist and cache the formatters in `src/utils/format_amount.ts`: keep a `Map<number, Intl.NumberFormat>` keyed by `decimals` (in practice only 0, 1 and 2 are used) and return `cache.get(decimals) ?? cache.set(...)`. No call-site changes required — 118 call sites benefit immediately. Optionally collapse the 13 duplicated module-level `numberFmt` constants onto the same shared helper.

> **Verification correction.** formatAmount (src/utils/format_amount.ts:4) allocates a fresh Intl.NumberFormat per call and is the only formatter in the codebase not hoisted to module scope — 113 call sites (not 118) across 23 files. Because React Compiler memoizes the consuming helpers (verified: AccountCard's `buildInfoRows` compiles into a memo block keyed on account/rate/stats), the cost is paid per data-change/snapshot publication, not per render frame: ~90 constructions on a 20-account dashboard refresh, ~60 on a Budget lens recompute. Worth fixing with a decimals-keyed Map cache, but it is a bounded allocation win on data-change paths, not a per-frame render hazard.


### M25. Typing in transaction search rebuilds the totals card on every character

**Dimension:** `render-performance` · **Category:** performance · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- src/modules/transactions/screens/transactions/index.tsx:107 — `const listHeaderComponent = useMemo(() => (<View testID="transactions-list-header"><TotalsStrip …/><SearchRow value={state.searchQuery} …/></View>), [openFilter, setSearchQuery, state.activeFilterCount, state.previousLabel, state.searchQuery, state.totals]);` — `state.searchQuery` is a dependency of a memo that also builds `<TotalsStrip>`, which does not depend on the search text at all.
- src/modules/transactions/screens/transactions/components/totals_strip.tsx:224 — `export function TotalsStrip({ current, previous, previousLabel, isLoading = false }: Props)` — plain export, not wrapped in `React.memo`, so a new element with identical props still forces a full re-render.
- src/modules/transactions/screens/transactions/transactions.hook.ts:106 — `const debouncedSearch = useDebouncedValue(searchQuery, 300);` — only the *query* is debounced; `searchQuery` itself updates the store on every keystroke and is returned in `state` (transactions.hook.ts:436), re-rendering the screen each character.
- src/modules/transactions/screens/transactions/components/totals_strip.tsx:256,303 — the rebuilt subtree contains 3 `MetricValue`s (each with `adjustsFontSizeToFit`), 3 `DeltaValue`s with icons, and the percentage-width progress rail at :280.

**Failure path.** User types an 8-character search term. Each keystroke: store update → whole `TransactionsScreen` re-renders → `listHeaderComponent` memo invalidates on `state.searchQuery` → a new `<TotalsStrip>` element with unchanged props is created → `TotalsStrip` re-renders its ~20-node subtree including three `adjustsFontSizeToFit` texts (which trigger native text re-measurement) and a percentage-width layout → `SectionList` re-renders its header cell. That is 8 full totals-card re-renders and re-measurements for a card whose numbers never changed.

**Recommendation.** Wrap `TotalsStrip` in `React.memo`, and split the header memo so the totals card and the search row are separate memoized elements (only the search row depends on `state.searchQuery`). React Compiler cannot fix this on its own — the dependency is declared explicitly in a manual `useMemo`.


### M26. Add-category duplicate check validates against the parent tab, not the selected type, and the resulting repository throw is surfaced nowhere

**Dimension:** `small-modules` · **Category:** bug · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:72 — `const editingType = editingCategory?.type ?? activeTab;` — in add mode `editingCategory` is null, so uniqueness is checked against the *parent screen tab*.
- src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:125 — `const schema = createCategorySchema(categories, activeTab, editingCategory);` — `type` (the sheet's own controlled value at `:216` `<SegmentedTabs ... value={type} onValueChange={setType} />`) is never fed into the schema.
- src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:166 — `type,` — but the *save* uses the sheet's `type`, so validation and persistence disagree.
- src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx:161 — `setIsLoading(true); try { await onSave({...}); } finally { setIsLoading(false); }` — `try`/`finally` with no `catch`.
- src/modules/categories/screens/settings/categories/categories.hook.ts:120 — comment claims "addCategory throws 'already exists' on name+type collision — caller catches and surfaces as categoriesErrNameDuplicate form error (TC-06)", but `handleSave` at `:115`–`:128` has no try/catch and no caller does either.
- src/modules/categories/repositories/category.repository.ts:58 — `throw new Error(`A category named "${trimmedName}" already exists in ${data.type}`);`
- node_modules/react-hook-form/dist/index.cjs.js (handleSubmit) — `try{await e(a,r)}catch(e){s=e} ... if(s)throw s` — RHF v7 rethrows, so `onPress={() => void handleSave()}` at add_edit_category_sheet.tsx:181 turns the throw into an unhandled rejection.
- __tests__/screens/settings/categories/categories_hook.test.ts:380 — `).rejects.toThrow('already exists');` — the existing test confirms the hook propagates rather than surfaces the error.

**Failure path.** On the Expense tab, tap Add Category, switch the in-sheet type toggle to Income, type "Salary" (a seeded income default from migration 003), tap Save. The Zod refinement compares against expense categories only, so it passes. `CategoryRepository.add` then finds the income duplicate and throws. `handleSave` has no catch, RHF rethrows, `void handleSave()` drops it. The spinner stops, the sheet stays open, and no error message is shown — the Save button simply appears to do nothing. The same silent no-op occurs for *any* repository/DB failure during add or edit.

**Recommendation.** Move `type` into the RHF schema (or pass the sheet's live `type` into `createCategorySchema`) so uniqueness is validated against the type actually being saved, and add a `catch` in `handleSave` that maps a repository throw to `Strings.categoriesErrNameDuplicate` via `setError('name', ...)` and a generic save error for everything else. Remove or correct the misleading comment at categories.hook.ts:120.

> **Verification correction.** Add-category uniqueness is validated against the parent screen tab (activeTab) instead of the sheet's live `type`, so switching the in-sheet type toggle and entering a name that already exists in the target type passes Zod and then throws from CategoryRepository.add (category.repository.ts:58). handleSave (add_edit_category_sheet.tsx:156-172, save payload at :165) is try/finally with no catch and is invoked as `void handleSave()` at :181; RHF v7 rethrows, so the throw becomes an unhandled rejection and the Save button silently no-ops. The same silence covers any repository/DB failure on add or edit. The comment at categories.hook.ts:120-121 claiming the caller catches this is false. Severity medium: recoverable by renaming, and the collision requires the type toggle to be switched.


### M27. Currency rate fetch has no timeout or abort — a hung request pins the background-refresh dedupe promise for the whole session and freezes the screen spinner

**Dimension:** `small-modules` · **Category:** bug · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/currency/store/currency.store.ts:106 — `const res = await fetch(Config.currencyRateUrl);` — no `AbortController`, no `signal`, no timeout race.
- src/modules/currency/store/currency.store.ts:145 — `if (backgroundRefreshPromise) return backgroundRefreshPromise;` — dedupe is keyed on the in-flight promise, and `:149` `.finally(...)` only clears it when `fetchRate` settles.
- src/modules/currency/screens/currency/currency.hook.ts:57 — `setFetching(true); ... try { await fetchRate(); } catch { setFetchError(...) } finally { setFetching(false); }` — the `finally` cannot run while the request hangs.
- node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/modules/network/OkHttpClientProvider.kt:52 — `.connectTimeout(0, TimeUnit.MILLISECONDS)` / `:53` `.readTimeout(0, TimeUnit.MILLISECONDS)` — React Native's Android networking stack disables OkHttp timeouts, so a stalled connection never resolves on its own.

**Failure path.** On Android behind a captive portal or a black-holing network, `refreshRateIfStale()` (called from `src/app/(app)/_layout.tsx:14` on app entry) issues a fetch that never settles. `backgroundRefreshPromise` stays assigned forever, so every later `refreshRateIfStale()` in that app session returns the same dead promise and no refresh is ever retried — even after connectivity is restored, until the process is killed. If the user then opens Settings ▸ Currency and taps "Refresh Rate", `isFetching` is set true and the button spins indefinitely with no error and no cancel, because `finally` never runs. The rate silently stays stale while every rate-dependent value in the app keeps using it.

**Recommendation.** Create an `AbortController` per `fetchRate` call, pass `signal` to `fetch`, and clear a `setTimeout`-based abort (e.g. 10s) in a `finally`. Abort in `reset()` so a lifecycle bump also cancels the in-flight network request. Treat `AbortError` as a non-error outcome so the store neither logs nor rethrows on supersession.

> **Verification correction.** fetchRate (currency.store.ts:106) has no AbortController/timeout, so on a black-holing network the promise never settles: the Settings ▸ Currency 'Refresh Rate' spinner hangs forever (currency.hook.ts:57-67 `finally` never runs) and the background refresh for that app session is not retried. Correction: the dedupe promise IS cleared by `reset()` (:195), and refreshRateIfStale has a single caller ((app)/_layout.tsx:14, once per layout mount), so the 'permanently pinned dedupe' impact is narrower than stated. The fix remains a per-call AbortController plus timeout, treating AbortError as a non-error.


### M28. The N1 base-currency choice is persisted but never read after onboarding; Settings hardcodes "EGP"

**Dimension:** `small-modules` · **Category:** bug · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- src/modules/onboarding/screens/onboarding/welcome/index.tsx:45 — `<SegmentedTabs<Currency> segments={[{ value: Currency.EGP, ... }, { value: Currency.USD, ... }]}` — USD is a real, selectable choice.
- src/modules/onboarding/repositories/onboarding.repository.ts:33 — `await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);` and `:34` `await this.settingsRepository.set('base_currency', currency);` — persisted to two stores.
- src/modules/settings/screens/settings/index.tsx:36 — `{Strings.settingsCurrencyValue('EGP')}` — the Settings row renders the literal string `'EGP'`, never `useOnboardingStore(s => s.baseCurrency)`.
- src/modules/accounts/screens/accounts/add_account/add_account.hook.ts:47 — `currency: Currency.EGP,` — the post-onboarding Add Account form hardcodes EGP, unlike the onboarding variant at src/modules/onboarding/screens/onboarding/add_account/add_account.hook.ts:54 which uses `baseCurrency`.
- `grep -rn "baseCurrency" src` returns hits only inside `src/modules/onboarding/**` and `src/store/onboarding.store.ts` — there is no consumer of `base_currency` anywhere else in the app.

**Failure path.** User selects USD on the N1 welcome step and completes onboarding. Their first account is created in USD. Later they open Settings — the Currency row reads "EGP". They tap Add Account from the FAB — the currency selector defaults to EGP, not USD. Nothing in the app ever reflects the choice they were asked to make on the very first screen.

**Recommendation.** Either (a) read `baseCurrency` from the onboarding store in `settings/index.tsx` and as the default in `accounts/add_account/add_account.hook.ts`, making the value live; or (b) if base currency is intentionally cosmetic for V1, remove the N1 selector, hardcode EGP in one place, and delete the `base_currency` secure-store key and `app_settings` write so no dead state is persisted. Do not leave both a selectable control and a hardcoded display.


### M29. getDb() caches a rejected promise, so the new startup Retry button can never recover from a database-open failure

**Dimension:** `startup-shell` · **Category:** bug · **Effort:** S · **Verdict:** ADJUSTED · **Independently corroborated as** L36 (`type-safety` lens)

**Evidence**

- src/database/client.ts:5 — `let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;`
- src/database/client.ts:8 — `dbPromise ??= (async () => { const db = await SQLite.openDatabaseAsync('moneyapp.db'); await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;'); return db; })();` — if the IIFE rejects, `dbPromise` holds a *rejected* promise, which is non-null, so `??=` never re-runs the opener. Every later `getDb()` returns the same rejection for the whole process lifetime.
- src/utils/use_layout_init.hook.ts:36 — `const db = await getDb();` is the first step of `start()`, and src/utils/use_layout_init.hook.ts:53 — `retry: () => { void start(); }` re-enters that same call.
- __tests__/use_layout_init.test.ts:110 — `mockGetDb.mockReturnValueOnce(firstDb.promise).mockResolvedValueOnce({});` — the retry test mocks `@/database/client` entirely, handing back a fresh promise per call, so it proves retry works only for a behaviour the real singleton does not have. No test exercises retry against the real `getDb`.
- *(via L36)* src/database/client.ts:7 — `export function getDb(): Promise<SQLite.SQLiteDatabase> { dbPromise ??= (async () => { const db = await SQLite.openDatabaseAsync('moneyapp.db'); await db.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;'); return db; })(); return dbPromise; }` — `??=` only reassigns when `dbPromise` is null; a settled-rejected promise is not null.
- *(via L36)* src/utils/use_layout_init.hook.ts:36 — `const db = await getDb();` inside the startup boundary, whose catch calls `useAppReadyStore.getState().rejectFatal(generation, error)` (:45).

**Failure path.** `SQLite.openDatabaseAsync('moneyapp.db')` (or the WAL/foreign_keys PRAGMA) throws once — corrupt db file, exhausted storage, an OS-level restore that left the file unreadable. `start()` catches, calls `rejectFatal`, and StartupError renders. The user taps Retry -> `start()` -> `getDb()` returns the cached rejected promise synchronously -> `rejectFatal` again. The screen flips to spinner and back to error forever; there is no code path that clears `dbPromise`. The only user recovery is uninstall/reinstall, which deletes moneyapp.db and every transaction, account and budget in it.

**Recommendation.** Null out the cache on rejection: assign the in-flight promise to `dbPromise` and attach `.catch((e) => { dbPromise = null; throw e; })` (or wrap the IIFE so a rejection resets the module-level slot) before returning it. Add a test that drives the real `getDb` through a failing then succeeding `openDatabaseAsync` and asserts the second call opens a database.

> **Verification correction.** getDb() caches a rejected promise, so the in-session Retry button cannot recover from a database-*open* failure (migration and preload failures do retry correctly). Recovery does not require uninstall — relaunching the process resets the module-level `dbPromise`. Because the realistic open-failure causes are non-transient, the fix mainly removes a latent footgun and enables recovery from genuinely transient opens rather than un-bricking the app.


### M30. Prior finding H7 only half-fixed: optional preloads (accounts, currency rate, SecureStore onboarding read) are still treated as fatal startup failures

**Dimension:** `startup-shell` · **Category:** architecture · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/utils/use_layout_init.hook.ts:38 — `const [onboarding] = await Promise.all([initOnboarding(), loadAccounts(), loadRate()]);` sits inside the same `try` as `getDb()`/`runMigrations()`, whose only `catch` is src/utils/use_layout_init.hook.ts:45 `useAppReadyStore.getState().rejectFatal(generation, error);`
- src/modules/accounts/store/account.store.ts:56 — `catch (err) { if (requestId === loadRequestId) set({ loadError: true }); console.error(...); throw err; }` — the store already models this failure as recoverable state (`loadError`) and *also* rethrows.
- src/modules/currency/store/currency.store.ts:93 — `catch (err) { ... console.error('[currencyStore] loadRate failed:', err); throw err; }` while `INITIAL_STATE` at src/modules/currency/store/currency.store.ts:24 already defines a usable default `rate: 50` and a `hasLoaded` flag.
- src/modules/onboarding/repositories/onboarding.repository.ts:44 — `await Promise.all([SecureStore.getItemAsync(...), ...])` with no catch; any keystore error propagates straight to `rejectFatal`.
- __tests__/use_layout_init.test.ts:98 — `['accounts', () => mockLoadAccounts.mockRejectedValueOnce(new Error('accounts'))], ['currency', () => mockLoadRate.mockRejectedValueOnce(new Error('currency'))]` asserting `status: 'fatalError'` — the over-broad policy is locked in by test.
- docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md:167 — the prior audit's own remediation item: "Distinguish recoverable optional preload failures from fatal database/migration failures."

**Failure path.** On Android, `SecureStore.getItemAsync` throws when the Keystore entry is unreadable (common after an OS upgrade or a device-to-device restore, since SecureStore values are not backed up). Startup rejects -> fatalError screen. Retry re-reads the same broken Keystore entry and fails identically, so the user is locked out of an app whose SQLite database is perfectly intact and whose onboarding state could safely fall back to the documented defaults (`complete: false`, `step: N1`, `Currency.EGP`). Same shape for a transient `app_settings` read failure in `loadRate()`, which has a working default rate.

**Recommendation.** Keep only `getDb()` + `runMigrations()` (and, if onboarding state must be authoritative, a SecureStore read with an explicit defaults fallback) inside the fatal boundary. Wrap `loadAccounts()`/`loadRate()` in `.catch()` that logs and leaves the stores' existing `loadError`/default state in place, then update the `it.each` cases in __tests__/use_layout_init.test.ts to assert `ready` for those two.

> **Verification correction.** Real design gap: three optional preloads share the fatal boundary with getDb()/runMigrations(). But the two preloads that carry their own recoverable state (loadAccounts, loadRate) fail only if a SQLite read fails immediately after a successful open+migrate — a narrow tail case, not a common one. The reachable trigger is the SecureStore/Keystore read, which the finding itself argues may legitimately stay fatal. Fix is worth doing for degradation quality; it is not a high-severity availability defect.


### M31. Commitment detail re-enters a full-screen loading state (and re-queries) on every commitment-store publish, so marking a payment paid blanks the screen twice

**Dimension:** `state-architecture` · **Category:** bug · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/modules/commitments/screens/commitments/detail/detail.hook.ts:129 — `}, [commitment?.id, payments, setAllPayments, setViewState]);` — `payments` is the whole month-scoped array from `useCommitmentStore`; the effect body never reads it, so it is a pure re-run trigger with no identity/freshness gate. The trailing comment (`commitment?.id captures identity changes; full object dep would cause spurious re-fetches`) guards against the *narrow* dep while leaving the far more volatile one in place.
- src/modules/commitments/screens/commitments/detail/detail.hook.ts:111 — `setViewState('loading');` runs unconditionally at the top of every re-run, before the async fetch is even issued.
- src/modules/commitments/screens/commitments/detail/detail.hook.ts:99 — `if (screenViewState === 'loading') return 'loading';` — the shared `viewState` collapses to `loading` whenever that store flag flips.
- src/modules/commitments/screens/commitments/detail/index.tsx:45 — `{state.viewState === 'loading' ? (<View style={{ flex: 1 }} className="items-center justify-center"><ActivityIndicator .../></View>) : null}` and `index.tsx:59` `{state.viewState === 'ready' && state.commitment ? (<ScreenScroll ...>` — the entire content tree (hero, current-cycle card, history) is unmounted and replaced by a centered spinner, and `index.tsx:28` drops the header Edit action too.
- src/modules/commitments/store/commitment.store.ts:253 — `set((state) => ({ payments: state.payments.map((candidate) => ...` in `markAsPaid` produces a new `payments` array (publish #1).
- src/modules/commitments/store/commitment.store.ts:271 — `revalidateAfterMutation();` → `loadMonthSnapshot` → `commitment.store.ts:185` `set({ ...snapshot, ... })` installs another new `payments` array (publish #2), tens/hundreds of ms later because `loadMonthSnapshot:168` first awaits `ensureHousekeepingCurrent()` (an exclusive SQLite transaction).
- src/modules/commitments/screens/commitments/detail/detail.hook.ts:121 — `.catch((err) => { ...; if (!cancelled) setViewState('ready'); })` — a failed `getPaymentsByCommitment` publishes `ready` while `allPayments` keeps its previous/empty value, so a DB failure renders as a genuine empty payment history.

**Failure path.** On the Commitment Detail screen, tap Mark as paid and confirm in the pay sheet. `markAsPaid` publishes the optimistic `payments` array → the detail effect re-runs → `setViewState('loading')` → the whole detail body unmounts to a spinner and `getPaymentsByCommitment` is issued (result later discarded by the cleanup). `revalidateAfterMutation` then runs housekeeping + the month snapshot and publishes `payments` again → the effect re-runs a second time → the screen blanks to a spinner again and issues a second `getPaymentsByCommitment`. Net: one tap = two full-screen content unmounts, two redundant repository queries, one discarded. The same double-flip occurs for `skipPayment` (`commitment.store.ts:285`). Separately, if `getPaymentsByCommitment` rejects, the screen shows `ready` with an empty payment history instead of an error.

**Recommendation.** Drop `payments` from the dep array and re-derive `allPayments` from an explicit invalidation token instead — e.g. depend on `useCommitmentStore.getState().generation` (already published at `commitment.store.ts:112`) plus `commitment?.id`, and only publish `loading` when there is no warm `allPayments` for the current commitment id (mirror the `initialLoading`/`refreshing`/`refreshErrorWithData` shape already used by `dashboard.store.ts`). Add a distinct `error` view state so a failed `getPaymentsByCommitment` cannot render as an empty history. Guard the resolve with an owner id (`commitment.id`) as well as the `cancelled` flag.

> **Verification correction.** Real and reproducible: `payments` in the detail.hook.ts:129 dep array turns every commitment-store publish into an unconditional setViewState('loading'), so one Mark-as-paid (or Skip) tap unmounts the whole detail body to a spinner twice (optimistic publish, then the post-housekeeping snapshot publish), flashes the header Edit action off and back, resets ScreenScroll scroll position, and issues one redundant getPaymentsByCommitment. The first query's result is applied, not discarded — the second is the wasted one. Separately, the :121-124 catch publishes 'ready' with the stale/empty allPayments, so a failed payments query renders as an authoritative empty history. Impact is transient UI churn plus one extra small query, with no data corruption — medium, not high.


### M32. Budget and Commitments re-run their full month-snapshot loads on every single focus with no staleness gate

**Dimension:** `state-architecture` · **Category:** performance · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- src/modules/budget/screens/budget/budget.hook.ts:153 — `useFocusEffect(useCallback(() => { const task = runAfterInteractions(() => { ... const focusedMonth = useBudgetState.getState().selectedMonth; void load(focusedMonth).catch(() => undefined); });` — unconditional, no check of `loadedMonth`/`loaded`.
- src/modules/budget/store/budget.store.ts:196 — `const snapshot = await getSnapshotRequest(anchorMonth, requestGeneration);` — `getSnapshotRequest` (`:130`) only dedupes *in-flight* requests keyed `${generation}:${month}`; once a load settles the key is deleted at `:136`, so the next focus always issues a fresh one.
- src/modules/budget/repositories/budget.repository.ts:255 — `await Promise.all([getBudgetRowsForMonths, getCategorySpendByMonth, getBudgetSpendByMonth, getBudgetMonthIncome, getBudgetMonthCategoryGroups, getSpendingPlanRows, getTrailingIncomeSuggestion])` plus `:271` `await Promise.all([getSpendingPlanCategoryRows, getSpendingPlanSpend])` — 9 SQLite queries per load, several of them over a 12-month window (`:254` `lastMonths(anchorMonth, historyMonths)` with `historyMonths = 12`).
- src/modules/commitments/screens/commitments/commitments.hook.ts:232 — `useFocusEffect(useCallback(() => { const task = runAfterInteractions(() => { return reloadSelectedMonth(selectedMonthRef.current); }, ...)` — unconditional call into `loadMonthSnapshot`.
- src/modules/commitments/store/commitment.store.ts:165 — `set({ loading: true, loadError: false });` then `:168` `await get().ensureHousekeepingCurrent();` then `:177` `await getSnapshotRequest(yearMonth, generation)`; `commitment.repository.ts:135` `getMonthSnapshot` runs `getCommitmentsForMonthSnapshot` and `getPaymentsByMonth` sequentially (`:137`, `:138`), not in parallel.
- src/modules/budget/screens/budget/category_detail/category_detail.hook.ts:59 — `void load(selectedMonth).catch(() => undefined);` — Category Detail drives the *same* global `useBudgetStore` month slot as the Budget tab, so returning from a category detail leaves the Budget tab to reload again on its own focus.

**Failure path.** Tab sequence Budget → Dashboard → Budget with no mutation in between: the second Budget focus issues all 9 snapshot queries again, including the 12-month `getCategorySpendByMonth`/`getBudgetSpendByMonth` scans, purely because the screen regained focus. Same for Commitments → Dashboard → Commitments (2 sequential queries plus the housekeeping key check). Within a single Budget session, `Budget tab → tap category → back` runs `load(month)` twice for the identical month.

**Recommendation.** Add a staleness gate at each focus loader: skip the load when `loadedMonth === requestedMonth && loaded && generation === lastLoadedGeneration && Date.now() - loadedAt < MAX_AGE`, and rely on the existing `invalidateData()` generation bump (`budget.store.ts:156`, `commitment.store.ts:110`) plus `useTransactionStore.mutationVersion` to force reloads after real mutations. Give Category Detail read-only access to the budget snapshot (or its own scoped slot) instead of letting it drive the shared month slot. Parallelise `commitment.repository.ts:137`/`:138` with `Promise.all`.


### M33. The `reassignAndDelete` atomicity tests are over-mocked to the point of being vacuous — they pass with the transaction body deleted

**Dimension:** `testing` · **Category:** testing · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- __tests__/repositories/category_repository.test.ts:116-118 — the `withTransactionAsync` mock is `async (fn) => { await fn(); }`: it never issues `BEGIN`/`COMMIT`/`ROLLBACK`, so no rollback semantics exist in this suite at all.
- __tests__/repositories/category_repository.test.ts:458 — test titled `'DB state is either fully applied or fully reverted — never mid (TC-09)'`. Line :472 does `mocked.withTransactionAsync.mockRejectedValueOnce(new Error('Simulated DB failure'));` and the comment at :471 states the mechanism outright: `// (withTransactionAsync itself rejects without executing the callback)`. The post-assertions at :477-478 — `expect(countTransactions('from-cat-09c')).toBe(47); expect(countCategories('from-cat-09c')).toBe(1);` — are therefore true because zero SQL ran, not because anything rolled back.
- The other two TC-09 cases are the same shape: :441 asserts only `expect(mocked.withTransactionAsync).toHaveBeenCalledTimes(1)`, and :451-455 injects the same `mockRejectedValueOnce` and asserts the error propagates.
- The file header at :11 nonetheless claims `TC-09: atomicity — withTransactionAsync rejection leaves DB unchanged`, and src/modules/categories/repositories/category.repository.ts:91-100 carries a doc comment asserting "All three SQL statements run inside a single `db.withTransactionAsync` so a failure at any step leaves the database in its pre-operation state (TC-09)."

**Failure path.** Rewrite `CategoryRepository.reassignAndDelete` (src/modules/categories/repositories/category.repository.ts:101-120) so the `DELETE FROM categories WHERE id = ?` at :119 runs *after* the `withTransactionAsync` block instead of inside it. All three TC-09 tests still pass: :441 only counts the wrapper call, and :451/:472 reject the wrapper before the callback runs. On device, a failure between the transaction commit and the delete leaves 47 transactions reassigned to the target category while the source category still exists and is still selectable — exactly the mid-state the test claims to forbid.

**Recommendation.** Replace the mock at :94-98 and :116-118 with the real-transaction bridge already used in `__tests__/transaction.repository.test.ts:69-77` (`realDb.exec('BEGIN')` / `COMMIT` / `ROLLBACK` on throw), then rewrite the TC-09 case to inject the failure *inside* the callback — fail the second `runAsync` — exactly as `__tests__/budget.repository.copy_atomic.test.ts:52-58` already does with `failOnBudgetWrite`. Assert transactions are still on the source category AND the source category still exists after the throw. That file is the correct template; port it.

> **Verification correction.** Same finding, medium not high. The production code is currently correct — all four statements are inside the single `withTransactionAsync` at category.repository.ts:103-120 — and the non-TC-09 cases in the same file (TC-01/TC-02, :300-330) do drive real SQL through the callback against better-sqlite3, so the reassign behaviour itself is genuinely covered. What is vacuous is narrowly the rollback/atomicity assertion class: the three TC-09 cases cannot distinguish 'rolled back' from 'never ran', so exactly one refactor shape (hoisting a statement out of the transaction) escapes detection. That is a real mutation-survivability hole in one function, not a systemic high-severity defect, and it is strictly smaller in blast radius than the untested migration runner. The fix and template cited are correct and should be applied.


### M34. No test covers deleting a category that still has budget or commitment rows — the production FK constraint aborts it

**Dimension:** `testing` · **Category:** testing · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/categories/repositories/category.repository.ts:83-89 — `async delete(id) { ... await db.withTransactionAsync(async () => { await deleteSoleCategorySpendingPlans(db, id); await deleteCategory(db, id); }); }` — spending plans are cleaned up; `budgets` and `commitments` rows are not.
- src/modules/categories/screens/settings/categories/categories.hook.ts:148-152 routes on transactions only: `const count = await getCategoryTransactionCount(category.id); ... if (count > 0) { openReassignSheet(category); } else { openDeleteConfirm(category); }` → :170 `await deleteCategory(categoryToDelete.id)`. A category with a budget limit but zero transactions takes the plain `delete()` branch.
- src/database/migrations/013_named_monthly_budgets.ts:6 — `category_id    TEXT NOT NULL REFERENCES categories(id),` with no `ON DELETE`; src/database/migrations/006_create_commitments.ts:23 — `FOREIGN KEY (category_id) REFERENCES categories(id)` with no `ON DELETE`. src/database/client.ts:10 enables `PRAGMA foreign_keys = ON` in production.
- Reproduced against the shipped DDL: seeding one custom category plus one `budgets` row, then `DELETE FROM categories WHERE id='c1'` throws `FOREIGN KEY constraint failed`. The only `delete()` tests are __tests__/repositories/category_repository.test.ts:339 `await repo.delete('sole-plan-category');` and :357 `await repo.delete('removed-plan-category');` — both fixtures have spending plans only, never a `budgets` or `commitments` row.

**Failure path.** User creates a custom expense category, sets a monthly limit for it on the Budget screen, records no transactions against it, then deletes it from Settings → Categories. `getTransactionCount` returns 0, the confirm dialog appears, `repo.delete()` runs, SQLite aborts on the `budgets` FK, the transaction rolls back and the delete silently fails (or surfaces a raw SQL error). Same for a category referenced by an inactive commitment.

**Recommendation.** Add two cases to `__tests__/repositories/category_repository.test.ts` in the `CategoryRepository.delete` describe block: one where the target category has a `budgets` row, one where it has a `commitments` row. Assert the intended behaviour (either the repository cleans those rows inside the same transaction, or `delete()` rejects with a typed error the hook can route to the reassign sheet). Fix the production path to match, then extend `getTransactionCount`'s routing at categories.hook.ts:148 to a general usage check.

> **Verification correction.** Confirmed and under-stated, not over-stated. The finding scopes the gap to `delete()`, but `reassignAndDelete` (category.repository.ts:101-121) has the same hole: it reassigns transactions, commitments, and spending-plan rows, then runs `DELETE FROM categories WHERE id = ?` at :119 without ever touching `budgets.category_id`. So the count>0 branch at categories.hook.ts:150-151 also aborts on the budgets FK for any category that has both transactions and a budget limit — meaning BOTH delete paths are broken, not just the zero-transaction one, and the failing one rolls back the entire reassignment. The added test cases should therefore cover reassignAndDelete-with-a-budgets-row as well, and the production fix must either reassign or delete `budgets` rows inside the same transaction. Severity medium remains fair for a testing-dimension finding.


### M35. 12 test files assert raw source text instead of behaviour, including exact Tailwind pixel classes — prior audit M8 is unremediated

**Dimension:** `testing` · **Category:** testing · **Effort:** M · **Verdict:** CONFIRMED

**Evidence**

- __tests__/screens/budget/spending_plan_styling_architecture.test.ts:66-91 — `expect(planCard).not.toContain('text-[7.5px]'); expect(planCard).toContain('text-[19px]'); ... expect(detailSummary).toContain('text-[31px]'); expect(detailScreen).toContain('text-[13px]');` where each variable is `readFileSync(resolve(process.cwd(), path), 'utf8')`.
- __tests__/screens/filter_component_architecture.test.ts:1-45 — grep-asserts a hardcoded 12-path `FILTER_COMPONENTS` list against `FORBIDDEN_DOMAIN_IMPORTS` and `FORBIDDEN_INLINE_FILTER_COPY` string literals such as `"'Clear search'"` and `'placeholder="∞"'`.
- __tests__/screens/transactions/transaction_form/transaction_form_architecture.test.ts:22-26 — walks every file under `src/` and asserts `expect(source).not.toContain('transaction_form_v2')`.
- Full set (`rg -l 'readFileSync|readdirSync' __tests__`): app_layout_imports, components/ui/screen_safe_area, components/ui/sheet_dismissibility, screens/budget/budget_categories_styling_architecture (291 lines), screens/budget/spending_plan_styling_architecture (134 lines), screens/filter_component_architecture, screens/filter_rail_usage, screens/shared/confirm_action_consumers, screens/tab_screen_headers, screens/transactions.screen, screens/transactions/detail/detail_screen_actions, screens/transactions/transaction_form/transaction_form_architecture.
- The 2026-07-23 audit flagged exactly this at M8 ("UI standards are enforced inconsistently and sometimes by brittle source tests", citing `spending_plan_styling_architecture.test.ts` and the literals `text-[19px]`/`text-[31px]`) and recommended replacing them. The literals are unchanged.

**Failure path.** A developer extracts the repeated `text-[19px]` into a `tv()` variant in `src/components/ui/` — the correct fix that M8 itself recommends — and `spending_plan_styling_architecture.test.ts:68` fails even though rendered output is byte-identical. Conversely, wrapping the plan card in a parent that overrides font size changes what the user sees while every assertion still passes, because the source string is still present.

**Recommendation.** Delete the two `*_styling_architecture.test.ts` files and re-express the intent as a lint rule (oxlint already runs in CI, harness/manifest.json:275) forbidding arbitrary `text-[Npx]` outside `src/components/ui/`. Keep the genuinely structural ones — `app_layout_imports.test.ts` guards the documented `_layout.*.ts` crash trap, and `transaction_form_architecture.test.ts` guards a one-time migration — but move them out of `__tests__/` into a `scripts/` check so they stop inflating the suite's apparent behavioural coverage.


### M36. The logic-only test policy has fully reverted: 40 `.test.tsx` render files, 80 suites importing @testing-library/react-native

**Dimension:** `testing` · **Category:** testing · **Effort:** L · **Verdict:** ADJUSTED

**Evidence**

- CLAUDE.md Project Structure — "`__tests__/`             snake_case test files (logic layer only)".
- `find __tests__ -name '*.test.tsx' | wc -l` → 40. `rg -l '@testing-library/react-native' __tests__ | wc -l` → 80 of 221 suites.
- Examples: __tests__/screens/dashboard/hero_card.test.tsx, __tests__/screens/dashboard/stat_cards.test.tsx, __tests__/screens/transactions/transaction_row.test.tsx, __tests__/screens/budget/fifty_thirty_twenty_ledger.test.tsx, __tests__/screens/transactions/totals_strip_skeleton.test.tsx.
- These render against the hand-written HeroUI stub in jest.setup.js:63-215, which replaces every HeroUI primitive with a `passThrough(View)` — `Card`, `Surface`, `BottomSheet`, `ListGroup`, `Chip`, `Alert` all collapse to bare `View`s with no styling, no `Surface` defaults, and no real sheet lifecycle. The `BottomSheet` stub at jest.setup.js:200-203 renders children whenever `isOpen` is true and drops `onOpenChange` entirely (`onOpenChange: _onOpenChange`).

**Failure path.** The recorded HeroUI `Card`/`Surface` trap (Card wraps Surface with `bg-surface p-4 rounded-3xl shadow-surface` and no border) is invisible to every one of these 40 files, because `Card` is a naked `View` under the stub. A card migration that visually regresses on device passes all render tests. Separately, `BottomSheet.Content.onClose`-vs-`onOpenChange` close-path bugs — the exact hazard CLAUDE.md's Bottom Sheets section calls out — cannot be caught, since the stub never invokes `onOpenChange`.

**Recommendation.** Do not add device-render testing — reconcile the policy instead. Either update CLAUDE.md to describe the real, intentional policy (logic-first, with a narrow allowance for presentational view-model assertions), or convert the highest-value `.test.tsx` files by extracting their assertions into the already-established `.presentation.ts` pattern — `src/modules/dashboard/screens/dashboard/dashboard.presentation.ts` and `transactions.presentation.ts` are both at 100% branch coverage and are pure functions, so `hero_card.test.tsx` / `stat_cards.test.tsx` / `totals_strip.test.tsx` can assert view models with no renderer at all.

> **Verification correction.** Line refs are wrong: the heroui-native mock spans jest.setup.js:57-231 (the file is 233 lines), not :63-215, and the BottomSheet stub that drops onOpenChange is at :183-202 — specifically the signature at :194 — not :200-203 (which are the compound-component assignments). Impact is also overstated as 'providing no coverage': the stub is a passThrough that forwards props and children, so these 40 files do genuinely assert conditional rendering, testIDs, accessibility labels, and prop wiring — what they cannot assert is HeroUI default styling deltas and sheet close lifecycle, which is a narrower claim than 'no coverage of the failure modes that actually bite'. The substantive defect is documentation drift: CLAUDE.md still advertises a logic-only policy that 40 files and 80 suites contradict, silently reversing an explicit 2026-05-23 user decision. Medium is defensible on governance grounds; there is no correctness risk here.


### M38. 531 tests / 12,347 lines covering the workflow-authority harness run in no gate — not jest, not verify:pr, not CI

**Dimension:** `tooling-ci-harness` · **Category:** testing · **Effort:** S · **Verdict:** CONFIRMED

**Evidence**

- package.json:21 — `"harness:test": "node --test scripts/harness/__tests__/*.test.js"`. `grep -rn 'harness:test\|node --test' .github package.json harness/manifest.json .husky lint-staged.config.mjs` returns exactly one hit: the package.json script definition itself.
- jest.config.js:14-15 — `// Node's test runner owns the harness suites.` / `'<rootDir>/scripts/harness/__tests__/',` in `testPathIgnorePatterns`. Jest deliberately hands ownership to `node --test`, but nothing then invokes `node --test`.
- harness/manifest.json:261-299 — the six registered checks are format, lint, typecheck, test, doctor, prebuild. None is `harness:test`. scripts/harness/lib/repository_facts.js:101 hard-codes `REQUIRED_CHECK_IDS = ['format','lint','typecheck','test','doctor','prebuild']`, so the parity validator actively rejects adding a seventh without also editing that constant.
- The suite is real and currently green — `npm run harness:test` reports `ℹ tests 531 / ℹ pass 530 / ℹ fail 0 / ℹ skipped 1`; `wc -l scripts/harness/__tests__/*.test.js` = 12,347 lines. It covers scripts/harness/lib/workflow/store.js (1,020 lines: ledger append, `withWorkflowLock`, sequence preconditions), verify.js, task packet/scope/graph logic, and the render/structure drift checks.

**Failure path.** Someone edits `scripts/harness/lib/workflow/store.js` (the append-only ledger + lock that CLAUDE.md:76-93 designates as the workflow authority) and breaks the expected-sequence precondition or the lock acquisition. `npm run lint` runs `harness:check`, which validates *structure and rendering* but does not execute the store's concurrency or precondition tests. `npm test` skips the directory by config. CI has no job. The change merges green, and the next `workflow verify` silently records a receipt against the wrong sequence or races a concurrent append.

**Recommendation.** Add `npm run harness:test` to the gate. Cleanest path: add a seventh entry to `harness/manifest.json` `verification.checks` (`{"id":"harness","local":["npm","run","harness:test"],"ci":{"job":"harness","run":"npm run harness:test"}}`), extend `REQUIRED_CHECK_IDS` in scripts/harness/lib/repository_facts.js:101, and add the matching `harness` job to .github/workflows/pr-checks.yml — the existing `validateVerificationContract` will then enforce CI/local parity for it automatically. Cheaper stopgap: chain it into the `lint` script alongside `validate:agent-assets`.


### M39. jest resolves manual mocks non-deterministically across `.worktrees/` — `testPathIgnorePatterns` excludes them but `modulePathIgnorePatterns` does not

**Dimension:** `tooling-ci-harness` · **Category:** tooling · **Effort:** S · **Verdict:** CONFIRMED · **Independently corroborated as** L30 (`testing` lens)

**Evidence**

- jest.config.js:21 — `'<rootDir>/.worktrees/',` is in `testPathIgnorePatterns`, but jest.config.js:23 — `modulePathIgnorePatterns: ['<rootDir>/.claude/'],` omits `.worktrees/` entirely. Test *discovery* skips worktrees; the haste map / module resolver still indexes them.
- Verbatim `npx jest --coverage` stderr on current HEAD:
```
jest-haste-map: duplicate manual mock found: heroui-native
  The following files share their name; please delete one of them:
    * <rootDir>/__mocks__/heroui-native.tsx
    * <rootDir>/.worktrees/startup-async-ownership/__mocks__/heroui-native.tsx

jest-haste-map: duplicate manual mock found: @gorhom/bottom-sheet
  The following files share their name; please delete one of them:
    * <rootDir>/__mocks__/@gorhom/bottom-sheet.tsx
    * <rootDir>/.worktrees/startup-async-ownership/__mocks__/@gorhom/bottom-sheet.tsx
```
and four further pairs for `onboarding-heroui-redesign`, `harness-legacy-bootstrap-imports`, `dashboard-performance-snapshot`.
- `ls .worktrees/` shows 10 live worktrees, 4 of which currently carry `__mocks__/heroui-native.tsx`. They happen to be byte-identical to the root copy today (`diff` exit 0, all 122 lines) — the collision is latent, not yet firing.
- `.gitignore` ignores `.worktrees/`, and `using-git-worktrees` is the mandated execution surface (CLAUDE.md:121), so in-flight branches with divergent mocks are the normal state, not an accident.
- *(via L30)* jest.config.js:23 — `modulePathIgnorePatterns: ['<rootDir>/.claude/']` — `.worktrees` is missing, even though jest.config.js:21 correctly lists `'<rootDir>/.worktrees/'` under `testPathIgnorePatterns`.
- *(via L30)* Every run emits the warning 8 times: `npx jest __tests__/format_amount.test.ts 2>&1 | grep -c 'duplicate manual mock'` → 8. Message: `jest-haste-map: duplicate manual mock found: heroui-native — The following files share their name; please delete one of them: <rootDir>/.worktrees/harness-legacy-bootstrap-imports/__mocks__/heroui-native.tsx, <rootDir>/.worktrees/dashboard-performance-snapshot/__mocks__/heroui-native.tsx`.

**Failure path.** A `@dev` agent working in `.worktrees/onboarding-heroui-redesign/` edits `__mocks__/heroui-native.tsx` to stub a new HeroUI primitive. jest-haste-map in the *main* checkout now sees two different files claiming the same manual mock, warns, and picks one by scan order. `npm test` in the main checkout — which is `verify:pr` check #4 and therefore the pre-push gate — starts passing or failing based on uncommitted content in an unrelated sibling branch. Deleting or re-creating a worktree flips the result again with no source change.

**Recommendation.** Add `'<rootDir>/.worktrees/'` to `modulePathIgnorePatterns` in jest.config.js:23 alongside the existing `.claude/` entry (and keep `haste`/`roots` in mind if more scan roots appear). Add a short comment mirroring the one already at jest.config.js:16-19 explaining why both ignore lists must stay in sync.


### M41. Returning from transaction detail silently discards every loaded page beyond the first, defeating the new scroll restoration

**Dimension:** `transactions-module` · **Category:** bug · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/modules/transactions/store/transaction.store.ts:105 — `const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset: 0 });` inside `replaceSnapshot`, followed by `:108 set({ transactions: rows, ... })` — refresh replaces the whole accumulated list with page 1 only.
- src/modules/transactions/store/transaction.store.ts:149 — `refresh: () => replaceSnapshot(get().query, true)` — the 'preserve' flag only preserves the rows during the in-flight window; the resolution still overwrites with 30 rows.
- src/modules/transactions/screens/transactions/transactions.hook.ts:278 — on every screen focus: `if (snapshotIsUnchanged && transactionState.status !== 'refreshing') { void refresh()... }` — so simply going Transactions -> detail -> back triggers the truncation.
- src/modules/transactions/screens/transactions/transactions.hook.ts:193 — the focus handler simultaneously restores the saved offset: `scrollRestoreFrameRef.current = requestAnimationFrame(() => { listRef.current?.getScrollResponder()?.scrollTo({ y: scrollState.scrollOffset, animated: false }); })`.
- src/modules/transactions/store/transaction.store.ts:206-210 — `updateTransaction` -> `refreshAfterMutation('update')` and `:198-204 deleteTransaction` -> `refresh()` apply the same truncation after any edit or delete.
- __tests__/transaction.store.test.ts:403 — 'it re-fetches page 1 with the current query' asserts `repo.getAll` is called with `{ limit: PAGE_SIZE, offset: 0 }`, confirming the behaviour is unconditional.

**Failure path.** User scrolls the Transactions list through 4 pages (120 rows), taps a row to open detail, then taps back. On focus the hook restores the saved scroll offset against the still-present 120 rows, then `runAfterInteractions` fires `refresh()`, which resolves with 30 rows; the SectionList content height collapses and the user is dumped at the bottom of page 1 with 90 rows gone. Identical outcome when the user swipes-to-edit a row on page 3 and saves: `updateTransaction` -> refresh -> the just-edited row is no longer rendered.

**Recommendation.** Make `replaceSnapshot` refresh the currently materialised window rather than page 1: when `canPreserve` is true, request `limit: Math.max(PAGE_SIZE, currentTransactions.length)` at `offset: 0` and recompute `hasMore` from whether the returned count equals the requested limit. Add a store test that pages twice, refreshes, and asserts the row count is retained.

> **Verification correction.** Confirmed exactly as described; only the severity is overstated. It is a deterministic UX regression (pagination position lost on every list -> detail -> back and after every deep-list edit/delete), not a data or correctness defect: hasMore is recomputed to true and the rows remain retrievable by scrolling again.


### M42. `void handler()` in JSX event props satisfies no-floating-promises while discarding rejections, so mutation failures produce no UI change and no error

**Dimension:** `type-safety` · **Category:** bug · **Effort:** M · **Verdict:** ADJUSTED

**Evidence**

- src/modules/accounts/screens/accounts/detail/index.tsx:185 — `onSave={(newBalance: number) => { void handleAdjustBalance(newBalance); }}` and `:195 onConfirm={() => { void handleArchive(); }}` and `:70 void handleSave();`
- src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:110 — `const handleAdjustBalance = async (newBalance: number) => { if (!id) return; setAdjusting(true); try { await adjustBalance(id, newBalance); setAdjustVisible(false); } finally { setAdjusting(false); } };` — `try`/`finally` with no `catch`.
- src/modules/accounts/store/account.store.ts:111 — `adjustBalance: async (id, newBalance) => { try { … } catch (err) { console.error('[accountStore] adjustBalance failed:', err); throw err; } }` — the store rethrows into the un-caught hook.
- src/modules/accounts/screens/accounts/detail/account_detail.state.ts — the state store carries `balanceReviewError` but no equivalent for save/adjust/archive, so there is no slot to render one.
- src/modules/onboarding/screens/onboarding/ready/index.tsx:80 — `onPress={() => { void handleComplete(); }}`, backed by `ready/ready.hook.ts:42 const handleComplete = async () => { if (complete.isLoading) return; await complete(); };` and `:48 state: { rows, completing: complete.isLoading }` — `useAsync` computes `isError` (`src/utils/use_async.hook.ts:37`) but the hook never returns it.
- src/utils/use_async.hook.ts:37 — `.catch((e: unknown) => { setIsError(true); throw e; })` — rethrows, so every `useAsync` caller must handle the rejection itself.

**Failure path.** Account detail → "Adjust Balance" → save. `repo.adjustBalance` fails (locked DB, FK error against a concurrently archived account). `account.store.ts` logs and rethrows; `handleAdjustBalance` has no catch; `void handleAdjustBalance(newBalance)` discards the rejected promise. Result: the sheet stays open, `isAdjusting` is false, the balance is unchanged, and nothing is displayed. Same shape for Save, Archive, and for onboarding N4 "Open My Dashboard" — if `SecureStore.setItemAsync(OnboardingComplete)` fails, the button simply does nothing forever and the user is stuck in onboarding (Business Rule 1).

**Recommendation.** Treat `void promise` in an event prop as a lint smell: either `.catch(handler)` explicitly or give the handler a `catch` that writes a user-visible error into the screen's `.state.ts` (the currency screen at `currency/currency.hook.ts:62` and the reassign sheet are the two correct in-repo precedents). For onboarding, return `complete.isError` from `useReady` and render it next to the CTA. Consider a shared `useMutationAction` wrapper so the catch cannot be forgotten.

> **Verification correction.** Same defect shape as the commitment finding but rarer: `void handler()` in JSX props on account save/adjust/archive and onboarding N4 discards store-rethrown rejections, and no screen state slot exists to render them (account_detail.state.ts has balanceReviewError only; useReady never returns complete.isError). Reachable only on a genuine SQLite/SecureStore fault — the repository methods perform no validation — and the result is a silent, retryable no-op with the sheet still open and loading state cleared, not a permanently dead control. Lint refs: .oxlintrc.json:40 (no-floating-promises), :51 (no-unnecessary-condition).


### M43. Two conflicting sizing systems: 322 arbitrary-px Tailwind classes bypass the ms()/msFont() token scale they sit next to

**Dimension:** `ui-standards` · **Category:** ui-standards · **Effort:** L · **Verdict:** ADJUSTED

**Evidence**

- src/constants/theme.ts:78–97 — `Type` is entirely `msFont(n)`; `:105–115` `Spacing` is `ms(n)`; `:133–193` `Size` is `ms(n)`. src/utils/responsive.ts:17 — `const SCALE = clamp(SCREEN_WIDTH / 390, 0.85, 1.15);` so every token shifts ±15% with device width. Arbitrary Tailwind values (`text-[11px]`, `h-[42px]`) are fixed pixels and never scale.
- Scale: `rg -o "\b[a-z-]+-\[[0-9.]+px\]" src -g '*.tsx'` → 322 occurrences; 24 files import `@/constants/theme` AND use arbitrary-px classes in the same file.
- src/components/ui/text.tsx:10–20 defines a **second, conflicting** type scale that contradicts `Type`: `hero: 'text-[32px]'` vs `Type.hero = msFont(28)`; `title: 'text-[20px]'` vs `Type.title = msFont(18)`; `body: 'text-[15px]'` vs `Type.body = msFont(14)`; `caption: 'text-[11px]'` vs `Type.caption = msFont(12)` (and `Type.micro = msFont(11)`). 74 files import this Text.
- src/modules/dashboard/screens/dashboard/components/account_card.tsx:212–215 — `<Text variant="title" ... style={{ flex: 1, fontSize: msFont(17) }}>` (scaled) and `:255` `style={{ ..., fontSize: msFont(17) }}`, sitting in the same card as `:229`, `:277`, `:297` `<Text variant="caption">` = fixed `text-[11px]` (unscaled), inside boxes sized `ms(30)`/`ms(15)`/`ms(6)` (scaled) at `:238–247`.
- src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx:281 — `<SkeletonGroup.Item className="h-[42px] w-[42px] rounded-full" />` (also `:210`) is the placeholder for the real ring at src/modules/budget/screens/budget/components/category_budget_row.tsx:44 — `<BudgetRing ... size={Size.budgetCategoryRing}>` where `Size.budgetCategoryRing = ms(42)`.
- src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx:278 — `className="border-separator min-h-[58px] ..."` mirrors `Size.budgetCategoryRowHeight = ms(58)` (theme.ts:160), which is declared but referenced by zero .tsx files — the skeleton hardcoded the number instead of using the token.

**Failure path.** Open the Budget tab on a 360dp Android phone (SCALE = clamp(360/390) = 0.923) or a 320pt device (SCALE clamps to 0.85). The cold-load skeleton draws each category ring at a fixed 42pt and each row at min 58pt; when data lands, the real row draws the ring at `ms(42)` = 39pt (0.923) / 36pt (0.85). Every row therefore jumps 3–6pt at the skeleton→content swap, and with ~12 category rows the whole list shifts ~40–70pt under the user's finger. Separately, on any non-390pt device the Dashboard account card renders its name/balance at `msFont(17)` (14.5pt at 0.85, 18.7pt at 1.10) while the currency pill and every info-row label stay pinned at 11px — the label:value type ratio drifts from 0.76 to 0.59 across the device range, and on small phones the info-row value (account_card.tsx:294–303, `numberOfLines={1}`) loses ~15% of container width while its label refuses to shrink, so balances truncate earlier than designed.

**Recommendation.** 1) Make `src/components/ui/text.tsx` variants emit `style={{ fontSize: Type.x }}` (or add `--text-*` theme vars in global.css generated from the same `msFont` baseline) instead of hardcoding a rival px scale; reconcile the 4 sizes that currently contradict `Type` (hero 32/28, title 20/18, body 15/14, caption 11/12). 2) Replace skeleton geometry with the tokens the real component uses — `budget_screen_skeleton.tsx:210,281` should be `style={{ width: Size.budgetCategoryRing, height: Size.budgetCategoryRing }}` and `:278` `style={{ minHeight: Size.budgetCategoryRowHeight }}`; do the same across the other skeleton files (`category_detail_skeleton.tsx`, `spending_plan_detail_skeleton.tsx`, `detail_skeleton.tsx`). 3) Add an oxlint/regex CI guard rejecting new `-[Npx]` arbitrary values in `src/**/*.tsx` so the count can only go down. Note this supersedes the prior audit's M8 test recommendation: `__tests__/screens/budget/spending_plan_styling_architecture.test.ts` asserts the exact strings `text-[19px]`/`text-[31px]`, which actively locks the violation in place and must be rewritten against the view model, not the class string.

> **Verification correction.** Count is 324, not 322 (`rg -o "\b[a-z-]+-\[[0-9.]+px\]" src -g '*.tsx' | wc -l`). budget_screen_skeleton.tsx is internally inconsistent rather than uniformly hardcoded — line 446 already uses `Size.budgetCategoryRing`, only :210 and :281 hardcode 42px; that strengthens the drift claim but contradicts the framing that skeletons never use tokens. Severity lowered high -> medium: the only user-visible consequence is a few-pt skeleton-to-content shift (~5pt/row at SCALE 0.923) and device-dependent type ratios — cosmetic, no functional or data impact. The '40-70pt under the user's finger' figure is arithmetically defensible but the skeleton->content swap is not an interactive moment, so the described mis-tap risk is speculative.


### M44. Three divergent copies of the boxy icon button; the shared `BackButton` is a 36pt target with no hitSlop and a hardcoded a11y string, while `TouchSize.min` is used exactly once in the codebase

**Dimension:** `ui-standards` · **Category:** ui-standards · **Effort:** S · **Verdict:** ADJUSTED

**Evidence**

- src/components/ui/back_button.tsx:22–29 — `<PressableFeedback onPress={onPress} className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border" accessibilityRole="button" accessibilityLabel="Go back">`. No `hitSlop`. `h-9 w-9` = 36×36pt. Radius is the arbitrary `rounded-[8px]`, not `Radius.sm`.
- src/components/ui/stack_header.tsx:26–33 — the same control, re-implemented inline: `<PressableFeedback onPress={handleBack} hitSlop={8} className="bg-surface border-border h-9 w-9 items-center justify-center border" style={{ borderRadius: Radius.sm }} accessibilityRole="button" accessibilityLabel={Strings.goBackAccessibility}>` — same icon (`chevron-left`, `Size.iconBack`, `CoreTokens.text2`) but WITH hitSlop, WITH the token radius, and WITH the centralised string.
- src/modules/budget/screens/budget/spending_plan_detail/index.tsx:29–33 — a third copy: `className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"`, again `rounded-[8px]`, again no hitSlop.
- src/modules/dashboard/screens/dashboard/index.tsx:115–119 — a fourth variant of the same visual at a different size: `style={{ width: Size.backBtn, height: Size.backBtn }}` where `Size.backBtn = ms(40)` — 40pt, not 36.
- src/constants/theme.ts:199–201 — `export const TouchSize = { min: 44 } as const;` with the comment "Touch-target floor ... never scale it below that". `rg -n "TouchSize" src` outside theme.ts returns exactly ONE consumer: src/modules/budget/screens/budget/components/named_budget_row.tsx:92.
- src/constants/strings.ts:692 — `goBackAccessibility: 'Go back',` already exists; back_button.tsx:26 hardcodes the same literal instead.

**Failure path.** `BackButton` is the back affordance on onboarding Add Account (onboarding/add_account/index.tsx:52), Budget category detail (category_detail/index.tsx:30,53 and its skeleton:11), commitment add/edit headers (commitment_header.tsx:32), and all four Settings stack screens (src/app/(app)/settings/_layout.tsx:38,42,46,50). Its touchable region is exactly 36×36pt with no hitSlop — 8pt under the 44pt floor the codebase itself declares — so a user with reduced motor precision, or anyone tapping one-handed near the screen edge, misses it. The user then hits the same-looking back control in a StackHeader-based screen (transaction detail, add account) and it responds from 52×52pt, because that copy has `hitSlop={8}`. On a 430pt Pro Max the divergence is also visible: `Radius.sm = ms(8) = 9` on the StackHeader button vs a literal 8 on BackButton, and the Dashboard settings button is 40pt while the neighbouring back buttons are 36.

**Recommendation.** Make `src/components/ui/back_button.tsx` the single implementation: add `hitSlop={8}` (or `style={{ minWidth: TouchSize.min, minHeight: TouchSize.min }}`), swap `rounded-[8px]` for `style={{ borderRadius: Radius.sm }}`, size it from `Size.backBtn`, and replace `accessibilityLabel="Go back"` with `Strings.goBackAccessibility`. Then have `stack_header.tsx:26` and `spending_plan_detail/index.tsx:29` render `<BackButton>` / a shared `IconBoxButton` instead of re-declaring the classes, and route the Dashboard settings button (dashboard/index.tsx:115) through the same primitive. Add a lint or review check that any `PressableFeedback` with only an icon child declares hitSlop or a >=44pt box.

> **Verification correction.** Two of the four cited 'copies of the same visual' are different controls: spending_plan_detail/index.tsx:29-33 is a pencil/EDIT button rendered into StackHeader's `right` slot (not a back affordance), and dashboard/index.tsx:115-119 is a HeroUI `Button variant="ghost" isIconOnly` settings control with `rounded-lg` and `Size.backBtn`. The accurate finding is: one shared BackButton plus one inline re-declaration in StackHeader that has already drifted on hitSlop, radius token, and a11y string, with the boxy-icon-button class pattern copy-pasted into a third (edit) site. Severity medium stands — a 36pt no-hitSlop primary nav target on ~10 screens is a genuine sub-floor a11y issue against the codebase's own declared TouchSize.min = 44.


---

## Low-severity findings

Polish tier — individually minor, meaningful in aggregate.

| ID | Title | Dimension | Evidence anchor | Effort |
| --- | --- | --- | --- | ---: |
| L1 | A legacy src/screens/ tree survives solely to serve an orphan (dev) route, and three shared UI primitives plus several exports have zero consumers | `architecture-debt` | `src/screens/dev/primitives/index.tsx is the only file in the entire sr` | S |
| L2 | Prior finding M1 only partially fixed — budget spend queries still wrap transaction_date in substr(), defeating idx_transactions_date on every budget load *(also L13)* | `budget-module` | `src/modules/budget/database/budget_stats.ts:25` | M |
| L3 | All three budget lens view-models (plus the unused per-plan detail VM) are rebuilt on every data change regardless of which tab is visible | `budget-module` | `src/modules/budget/screens/budget/budget.hook.ts:181 `const categoryLe` | M |
| L4 | Category and rule-lens builders re-scan the whole 12-month budget array once per category instead of grouping it once | `budget-module` | `src/modules/budget/screens/budget/budget.helpers.ts:83` | S |
| L5 | A whole pre-named-budgets API surface is retained with zero production callers, including a live SQL write path | `budget-module` | `src/modules/budget/repositories/budget.repository.ts:348` | M |
| L6 | Spending-plan detail re-queries the full category table on every focus while the sibling budget hook guards the same call | `budget-module` | `src/modules/budget/screens/budget/spending_plan_detail/spending_plan_d` | S |
| L7 | budget.hook builds a view-model for every budget in the month, with a nested category lookup, just to find one id that is usually undefined | `budget-module` | `src/modules/budget/screens/budget/budget.hook.ts:234` | S |
| L8 | Every commitment mutation bumps the data generation, forcing a full-table housekeeping re-scan inside an exclusive write transaction — the mutation half of prior finding H5 is still unfixed | `commitments-module` | `src/modules/commitments/store/commitment.store.ts:110` | M |
| L9 | after_count commitments auto-deactivate on paid rows only, so a single skipped cycle leaves the commitment permanently active with zero remaining payments | `commitments-module` | `src/modules/commitments/database/commitments.ts:142` | S |
| L10 | updateCommitment performs the commitment UPDATE and the payment cleanup as two independent writes, and reports failure to the user after the commitment has already been changed | `commitments-module` | `src/modules/commitments/store/commitment.store.ts:220` | S |
| L11 | Roughly a third of the commitment repository/store API is unreachable from the app and exercised only by tests | `commitments-module` | `src/modules/commitments/repositories/commitment.repository.ts:79 `getP` | S |
| L12 | Business rule 8 (unique account names) is enforced only client-side against non-archived accounts, and not at all in the schema | `dashboard-accounts` | `CLAUDE.md Business Rules, rule 8: 'Account names are unique across all` | M |
| L14 | Query files carry cross-module orchestration, domain validation, pure date helpers, and non-standard verbs, and one screen hook bypasses the repository to open the database directly | `database-layer` | `src/modules/commitments/database/commitment_payments.ts:4` | L |
| L15 | Icon picker nests a FlatList inside BottomSheetScrollView — nested VirtualizedList with virtualization disabled (prior M4, unfixed) | `render-performance` | `src/modules/categories/screens/settings/categories/components/add_edit` | S |
| L16 | Every swipeable row eagerly renders its hidden action tiles, doubling native view count in the two largest lists | `render-performance` | `src/components/ui/swipeable_row.tsx:128` | M |
| L17 | AccountCard rebuilds Date objects and an Intl date formatter per render, duplicating the shared util | `render-performance` | `src/modules/dashboard/screens/dashboard/components/account_card.tsx:32` | S |
| L18 | Goals ships as a permanent primary-nav tab backed by a 25-line stub with no data layer and no spec | `small-modules` | `src/modules/navigation/screens/tabs/index.tsx:71` | S |
| L19 | welcome.hook.ts holds UI state in useState (module-anatomy breach) and its Continue handler drops persistence failures *(also L24)* | `small-modules` | `src/modules/onboarding/screens/onboarding/welcome/welcome.hook.ts:2` | S |
| L20 | Nine of the twelve legacy compat re-export files have zero production consumers and can be retired | `small-modules` | `Zero `src/` consumers (tests only): `src/store/account.store.ts`, `src` | S |
| L21 | useFonts error is discarded; a font-load failure hangs the app on the splash screen with the error screen unreachable | `startup-shell` | `src/app/_layout.tsx:41` | S |
| L22 | The (app) route group has no onboarding guard — the redirect is one-directional, so an incomplete user can land in the full tab shell | `startup-shell` | `src/app/(onboarding)/_layout.tsx:15` | S |
| L23 | Startup commitment housekeeping is scheduled on a microtask and takes an exclusive DB transaction while the first screen is still rendering, despite an existing runAfterInteractions helper | `startup-shell` | `src/utils/use_layout_init.hook.ts:13` | S |
| L25 | App route group layout still imports stores from the src/store/ backward-compat roots (prior audit item, unaddressed) | `startup-shell` | `src/app/(app)/_layout.tsx:4` | S |
| L26 | Dashboard invalidates its snapshot on every blur, making the store's own freshness gate dead code and abandoning in-flight snapshot work on fast tab switches | `state-architecture` | `src/modules/dashboard/screens/dashboard/dashboard.hook.ts:86` | M |
| L27 | `accountLookup` is a single global slot with two independent writers and no ownership key, so opening a transaction detail wipes the list's archived-account names *(also L35)* | `state-architecture` | `src/modules/accounts/store/account.store.ts:63` | S |
| L28 | Spending Plan Detail refetches all categories on every focus and reports the plan as failed when only the category query fails | `state-architecture` | `src/modules/budget/screens/budget/spending_plan_detail/spending_plan_d` | S |
| L29 | The CLAUDE.md `.store.ts` (data) vs `.state.ts` (UI) split is inverted in several modules, forcing hand-rolled cross-store request-id coordination | `state-architecture` | `src/modules/commitments/screens/commitments/detail/detail.state.ts:52` | L |
| L31 | The `lint` gate exits 0 with 6,008 warnings — warn-level rules are permanently non-enforcing and new warnings in src/ are invisible | `tooling-ci-harness` | `package.json:13` | M |
| L32 | `npm run typecheck` hard-codes a triple-nested `node_modules` path into an unversioned Expo CLI internal — any hoisting change breaks the typecheck gate before tsc runs | `tooling-ci-harness` | `package.json:11` | S |
| L33 | `patches/` does not exist despite three places wiring it up, and seven direct dependencies are referenced nowhere in the repo | `tooling-ci-harness` | ``ls patches/` → `ls: patches/: No such file or directory`. Yet: packag` | S |
| L34 | Every transaction list query full-scans and full-sorts the whole transactions table (IS NULL OR predicates defeat idx_transactions_date) | `transactions-module` | `src/modules/transactions/database/transactions.ts:231` | M |
| L37 | Three `no-unnecessary-condition` suppressions claim `Category.color` can be null; the entity and migration both say it cannot, and a fourth call site does not defend | `type-safety` | `src/modules/categories/entities/category.entity.ts:8` | S |
| L38 | Onboarding Add Account renders React Native's core `Switch` while the identical field in the in-app Add Account uses HeroUI `Switch` (Team Law 7 critical trigger) | `ui-standards` | `src/modules/onboarding/screens/onboarding/add_account/index.tsx:4` | S |
| L39 | Prior audit L3/M8 not remediated: 7 accessibility labels are still inline literals, one of them duplicating an existing Strings key | `ui-standards` | `src/components/ui/fab.tsx:233` | S |
| L40 | Three components in src/components/ui hand-roll primitives HeroUI already provides, one of them dead outside a dev route | `ui-standards` | `src/components/ui/type_badge.tsx:70–81` | S |
| L41 | The `(dev)/primitives` route ships in production, lives outside the documented module tree, and uses `ScrollView className="flex-1"` as a screen root instead of Screen/ScreenScroll | `ui-standards` | `src/app/(dev)/primitives/index.tsx` | S |

### Themes in the low tier

Four patterns recur and matter in aggregate even though each instance is minor. **Index defeats** — `substr()` wrapped around `transaction_date` in budget queries (L2, also L13) and `IS NULL OR` predicates in the transaction list (L34) mean the app's two heaviest queries cannot use `idx_transactions_date`. **Eager render work** — swipeable rows render hidden action tiles for every row (L16), a `FlatList` nests inside `BottomSheetScrollView` with virtualization disabled (L15), and `AccountCard` rebuilds `Date` objects and an `Intl` formatter per render (L17). **Legacy compat rot** — nine of twelve re-export stubs have zero production consumers (L20), a `src/screens/` tree survives only to serve one orphan `(dev)` route (L1), and `src/app/(app)/_layout.tsx` still imports from the compat roots (L25). **UI standards drift** — hand-rolled primitives HeroUI already provides (L40), a core RN `Switch` where the sibling screen uses HeroUI (L38), and inline accessibility literals (L39).

---

## Performance review

**No runtime profiling was performed.** Everything below is static analysis: the mechanisms are read from code and the reasoning about cost is structural. Magnitudes are unmeasured — treat the ranking as "most likely to matter", not as measured wins.

### What the last three perf waves actually achieved

Give the recent work its due, because it changes where the remaining cost is. `cf00b272` replaced the Dashboard's query fan-out with a single owned snapshot — `DashboardRepository.getSnapshot` (`src/modules/dashboard/repositories/dashboard.repository.ts:52`) now does one accounts read plus one grouped fact query over an explicit half-open indexed date range, and `cardLoading: !hasSnapshot && !showInitialError` (`dashboard.presentation.ts:32`) keeps warm values on screen during refresh. `7447a2f4` made commitment housekeeping a single exclusive transaction with two bulk reads and a chunked `INSERT OR IGNORE`. The account carousel virtualizes above a measured threshold with `getItemLayout` (`account_carousel.tsx:27`). Rows are memoized where it matters — `TransactionRow:207`, `CommitmentRow:142`, `CategoryRow:91`. `enableFreeze(true)` plus `freezeOnBlur` on every Stack and the Tabs navigator (`src/app/_layout.tsx:28`) is consistent and correct. None of that needs redoing.

### Where the time actually goes now

**1. Screen focus, not screen mount.** The dominant remaining cost is that Budget and Commitments re-run their full month-snapshot loads on every single focus with no staleness gate (M32, `budget.hook.ts:153`). The Dashboard has a freshness gate — and then defeats it, because it invalidates its snapshot on every blur (L26, `dashboard.hook.ts:86`), making the gate dead code and abandoning in-flight work. The same file publishes status `refreshing` on every focus (M13), so the pull-to-refresh spinner appears on every tab visit whether or not anything is stale. Tab-switching is therefore a full re-query on three of the four primary tabs.

**2. Mount-time work that is never displayed.** The Budget screen instantiates **ten** bottom sheets and their entire content trees on every render, open or not (H7) — `src/components/ui/sheet.tsx:289` passes `children` straight into `BottomSheet.Content` with no gate on `isOpen`. That is 2×23-cell category grids, 2×12-cell month grids, three RHF form trees and ten gorhom pan/tap `GestureDetector`s constructed before anything is visible. Separately, every swipeable row eagerly renders its hidden action tiles, doubling native view count in the two largest lists (L16).

**3. SQLite predicates that cannot use the indexes that exist.** Budget spend and income-suggestion queries wrap `transaction_date` in `substr()` (L2, `budget_stats.ts:25`), which defeats `idx_transactions_date` — this is the un-fixed remainder of prior finding M1. The transaction list query uses `IS NULL OR` predicates that force a full scan and full sort of the whole table (L34, `transactions.ts:231`). Both are on hot paths, and both are query-shape fixes rather than schema changes.

**4. Formatter churn on the hottest path.** `formatAmount` constructs a new `Intl.NumberFormat` on every call (M24, `format_amount.ts:4`). Notably the codebase *understands* this — 13 row and card helper files correctly hoist their formatters to module scope — it is only the shared util that misses it, so the fix is one line in the single most-called formatting function. `AccountCard` additionally rebuilds `Date` objects and an `Intl` date formatter per render (L17).

**5. Startup contention.** Commitment housekeeping is scheduled on a microtask in the same tick as `resolveReady` and takes an **exclusive** DB transaction while the first screen is mounting (L23, `use_layout_init.hook.ts:13`). `src/utils/run_after_interactions.ts` exists and is not used on this path. Every commitment mutation then bumps the data generation and forces a full-table housekeeping re-scan inside that exclusive transaction (L8).

### What React Compiler does and does not cover

React Compiler is enabled, and the codebase's manual memoization is largely redundant now for component-local derivations — Budget's view-models behind `useMemo` (`budget.hook.ts:181-330`) would be handled without the annotations. But the compiler cannot touch four of the five cost centres above: it does not stop you *mounting* a subtree (H7), it does not memoize module-level utility code (M24, `format_amount.ts`), it has no effect on SQL shape (L2, L34), and it cannot suppress re-renders driven by genuinely new store snapshots arriving from a focus-triggered reload (M13, M32). The wins here are in data ownership and mount gating, not in memoization.

### What to fix first for felt speed

| # | Fix | Where | Why it leads |
| ---: | --- | --- | --- |
| 1 | Gate sheet children behind `hasEverOpened` | `src/components/ui/sheet.tsx:289` | **One file, app-wide.** Every sheet in the app goes through this primitive, so it fixes Budget's ten-sheet mount and every other screen at once. |
| 2 | Add staleness gates on focus; stop invalidating on blur | `budget.hook.ts:153`, `dashboard.hook.ts:86` | Removes a full re-query from every tab switch and makes the existing gate live. |
| 3 | Hoist the `Intl.NumberFormat` in `formatAmount` | `src/utils/format_amount.ts:4` | One line on the most-called function in the app. |
| 4 | Fix the two index-defeating query shapes | `budget_stats.ts:25`, `transactions.ts:231` | Restores `idx_transactions_date` on the two heaviest queries. |
| 5 | Lazy hidden action tiles | `src/components/ui/swipeable_row.tsx:128` | Halves native view count in the transaction and commitment lists. |
| 6 | Move startup housekeeping off the first-paint path | `use_layout_init.hook.ts:13` | Releases the exclusive transaction contended during mount. |

---

## Refactor plan

| # | Refactor | Target files | Shape to move to | Effort | Risk |
| ---: | --- | --- | --- | --- | --- |
| 1 | Single money-formatting layer | `src/utils/format_amount.ts` + 13 ad-hoc `Intl` sites | One currency-aware formatter with module-hoisted per-currency instances | M | Low |
| 2 | Commitment payment lifecycle model | `commitment_housekeeping.helpers.ts`, `commitment_payments.ts`, `compute_due_dates.ts` | Derived status + rolling horizon window | L | **High** |
| 3 | Category deletion integrity | `category.repository.ts`, `categories.ts` | One `getCategoryUsageCount` across all FK sources; reassign `budgets` | M | Med |
| 4 | De-duplicate transaction hooks | `add_transaction.hook.ts`, `edit_transaction.hook.ts` | Shared hook — 157 identical lines incl. the race-guarded budget lookup | M | Low |
| 5 | Decompose `useBudget` | `budget.hook.ts` (495 lines, 27 actions + 26 state fields) | Three hooks by concern | L | Med |
| 6 | Consolidate date/month helpers | 3–4 implementations across modules | One `src/utils/month.ts` | S | Low |
| 7 | Enforce module barrels | 32 deep imports bypassing 10 barrels | Import via `src/modules/<domain>/index.ts` only | M | Low |
| 8 | Retire legacy compat surfaces | `src/store/`, `src/repositories/`, `src/screens/`, compat stubs | Delete; repoint the few live consumers | S–M | Low |
| 9 | Correct the store/state split | `detail.state.ts` and siblings (L29) | `.store.ts` = data, `.state.ts` = UI, per CLAUDE.md | M | Low |
| 10 | Delete dead API surfaces | `budget.repository.ts:348` (live SQL write path, zero callers), ~⅓ of commitment repo/store | Remove; keep only test-reachable code that is also app-reachable | S | Low |

**Ordering note that matters:** refactor 1 must land *before* the money-display fixes in Wave 4, or those fixes touch 13 sites individually and then get re-touched by the consolidation. Refactor 2 is the one genuine redesign in this list — the commitment status column currently stores derived time-state in the same field as durable user actions (paid/skipped), and that conflation is the root cause of H1, M10, M17 and L9 together. Fix the model, not the four symptoms.

### Detail on the two non-obvious ones

**Refactor 2 — commitment lifecycle.** Today `status` is written once at insert (`commitment_housekeeping.helpers.ts:58`) and the only three `UPDATE commitment_payments` statements in `src/` are user actions, not time transitions. Two viable shapes: (a) keep the column but add an aging `UPDATE ... SET status = CASE WHEN due_date < :today ...` inside the existing exclusive transaction in `runHousekeeping`, guarded to skip rows in a terminal user state; or (b) stop storing derived state — keep only `paid`/`skipped` in the column and derive `upcoming`/`due`/`overdue` from `due_date` at read time. (b) is cleaner and makes the whole class of bugs unrepresentable, but touches every read site. Pair either with replacing the `start_date`-anchored 64-occurrence window with a rolling `[max(start_date, today − 1 period), today + horizon]` generation window (H2).

**Refactor 8 — legacy retirement.** Nine of twelve re-export stubs have zero production consumers (L20); five more are kept alive only by tests importing through them (M3); `src/screens/` survives solely to serve one orphan `(dev)` route (L1); and `src/app/(app)/_layout.tsx:4` still imports from the compat roots (L25). This is the cheapest large cleanup available and it also shrinks the coverage denominator problem in H10, since 20 of the 55 files currently measured are these stubs.

---

## What is working well

This is not padding — several of these are load-bearing and should be preserved through the refactors above.

- **Async request ownership is now near-universal and genuinely well built.** Generation guards plus in-flight dedupe in `transaction.store.ts:78/:160`, `budget.store.ts:192-201`, `commitment.store.ts:161-202`, and a `operationGeneration` + `lifecycleGeneration` + serialized `persistenceQueue` in `currency.store.ts:45-70`. `dashboard.store.ts` is a good template for the rest.
- **Prior audit H1 is properly fixed.** Currency no longer auto-fetches over a manual override: `refreshRateIfStale()` replaced the unconditional chain, `shouldRefreshRate` short-circuits on `isManualOverride` with a 24h window, the remote payload goes through Zod, and manual input moved off `parseFloat` onto `parsePositiveDecimal`.
- **Startup failure policy is real.** `useAppReadyStore.begin()/resolveReady()/rejectFatal()` generation-stamps every attempt, migration failure no longer publishes a usable app, and a retryable `StartupError` screen exists.
- **Ledger integrity is centralised.** `transaction_policy.ts` resolves account-type-aware deltas, the repository re-validates rather than trusting the UI (`transaction.repository.ts:155`), commitment-generated rows are ownership-protected (`:241`), and all three mutation paths are atomic.
- **The database layer is clean.** No injection surface anywhere — every dynamic fragment is a placeholder list. No shipped migration has been edited (one commit per file, all 18). Every CHECK constraint still matches `src/constants/enums.ts` exactly. WAL and `foreign_keys = ON` at open.
- **Selector hygiene is excellent.** Every multi-field read goes through `useShallow` (29 files), actions are read outside render, and `createMoneyAppSelectors` structurally partitions data from action selectors.
- **Sheet and Screen discipline is complete.** All 15 `@gorhom/bottom-sheet` importers import only scrollables/footer — the rendering engine, never a hand-rolled wrapper. `safe-area-context` appears in exactly three files. Expo Router file conventions are clean: no colocated non-route files anywhere under `src/app`.
- **Animation files are disciplined.** All 11 `.anim.ts` keep shared-value reads inside worklets; none reads `.value` on the JS thread.

---

## Recommended sequencing

Waves are ordered by dependency first, then by blast radius. Branch names follow the repo convention.

| Wave | Branch | Closes | Why here | Effort |
| --- | --- | --- | --- | --- |
| 1 | `fix/verify-pr-green` | H12, L32, L33, M39/L30, + the `collectCoverageFrom` config half of H10 | **Blocking.** The husky pre-push hook runs `verify:pr`, which is red, so no other branch can be pushed. Fixing the coverage *config* here (not the tests) means every later wave is actually measured. | S |
| 2 | `fix/commitment-payment-lifecycle` | H1/H4, H2, M10, M17, L9, L10, L8 | The most broken subsystem, and the four symptoms share one root cause — fix the model once. | L |
| 3 | `fix/category-delete-integrity` | H5/H8/H13, H9 | A reachable crash path on a destructive operation with no error surface. | M |
| 4 | `refactor/money-formatting` → `fix/money-display` | M1, M24, M22 → H6, M18/M40, M19, M15, M21, M16, M20, M23, M12 | Consolidate the formatter first, then the display fixes are small. Reversing this order doubles the work. | M |
| 5 | `fix/budget-envelope-identity` | H3, M9, M8 | Silent overwrite of an existing envelope on name collision. | M |
| 6 | `fix/typography-tokens` | H15, M43, M44 | Independent of everything else; unblocks the design system actually rendering. | S |
| 7 | `perf/bounded-render-and-queries` | H7, M13, M32, M24, M25, L34, L2/L13, L16, L23, L26, L15 | After correctness, before refactors — the perf fixes are localised and the refactors would otherwise churn them. | M |
| 8 | `test/real-coverage-gate` | H10 (tests), H11, M33, M34, M35, M38, L31 | Deliberately after the correctness waves: instrumenting coverage over known-broken logic just locks the bugs in. | L |
| 9 | `refactor/module-boundaries` | M1–M7, M2, M3, M4, L1, L5, L11, L20, L25, L29 | Last, and only once wave 8's coverage is live to guard it. | L |

### Items needing user sign-off (CLAUDE.md critical triggers)

- **Wave 1 / H12** — bumping `react-native` 0.83.6 → 0.83.10 is a stack/dependency change (trigger 4). The alternative, recording the pin in `expo.install.exclude`, is not; that choice is yours.
- **Wave 3 / H5+H9** — the durable fix likely wants `ON DELETE` semantics on `budgets.category_id` and `commitments.category_id`, which means a schema migration on tables holding user data (trigger 3). A code-only fix (usage count + reassign budgets) avoids the migration and is the safer first move.
- **Wave 6 / H15** — the fix is verifiable only on a device; the Device QA gate is always escalated (trigger 8).
- **Wave 8 / M36** — this one is not a team call at all. The audit found the logic-only test policy has **fully reverted**: 40 `.test.tsx` render files and 80 suites importing `@testing-library/react-native`, against an explicit prior decision of yours to remove all render tests. Reinstating or formally retiring that policy is your decision, and it changes the shape of wave 8 substantially.
- **L18 / goals tab** — Goals ships as a permanent primary-nav tab backed by a 25-line stub with no data layer. Whether that stays visible is a product call.

---

## Limits of this audit

Stated plainly, because several of these bound how much weight the findings can carry.

- **Static analysis only.** No runtime profiling, no device QA, no reproductions were executed. Every performance claim is structural reasoning about code shape. The one empirical check that *was* run is H15's typography failure, which was reproduced by compiling the project's own entry with its own `tailwindcss@4.3.0`.
- **The finding set was severity-corrected but not pruned.** Of 100 findings, the adversarial pass returned 37 CONFIRMED, 63 ADJUSTED and **0 REFUTED**. That is not evidence that all 100 are equally real — the verifiers expressed "this mechanism is real but the claimed impact does not hold" as an ADJUSTED severity downgrade rather than a refutation, which is why all four original criticals became high or lower. Every ADJUSTED finding above carries its correction inline, and the corrected framing is the one used. Read the medium and low tiers as a prioritised backlog, not a defect list.
- **Verification was adversarial re-reading, not execution.** Verifiers re-opened every cited line independently and checked reachability, but did not run the failing scenarios.
- **The planned completeness-critic pass did not run.** The audit workflow hit its session token limit before the critic and the cross-finding consistency check could execute. So no independent agent pass has checked this report end-to-end for internally contradictory findings, mis-ranked severities, or citation drift. Two partial substitutes exist. First, the cross-lens merges (H1+H4, H5+H8+H13, H10+M37, H14+M11, and five in the low tier) are cases where independent lenses converged on the same defect from different starting points. Second, six of the highest-severity citations were spot-checked directly against the working tree while assembling this report:

  | Finding | Check | Result |
  | --- | --- | --- |
  | H15 | `--font-*` declarations in `global.css` | **0** found; ~347 `font-sora`/`font-inter` usages across ~90 `.tsx` files — mechanism confirmed |
  | H1/H4 | `UPDATE commitment_payments` in `src/` | Exactly **3** real statements (`commitment_payments.ts:143`, `:261`, `:301`); two further grep hits are doc-comment lines. None is a time-based transition — claim confirmed |
  | H5 | `ON DELETE` on `budgets`/`commitments`.`category_id` | Absent in both (`013:6`, `006:23`) — confirmed |
  | H7 | `isOpen` gate on sheet children | No gate; `children` passed straight into `BottomSheet.Content` — confirmed |
  | H12 | `react-native` pin | `package.json:60` → `"0.83.6"` exact, vs SDK 55.0.28 requirement — confirmed |
  | M36 | Render-test policy reversion | 40 `.test.tsx` files, 80 suites importing `@testing-library/react-native` — confirmed |

  All six held. That is a sample, not a sweep — the remaining ~83 findings' citations have been verified only by the adversarial pass, not re-checked here.
- **Coverage of the audit itself is uneven by module size.** The 15 lenses each returned their strongest findings rather than an exhaustive enumeration; budget (10.1k LOC), transactions (9.4k) and commitments (5.8k) were explicitly told to report top issues by impact, so absence of a finding in a large module is not evidence of absence.
- **Not assessed:** device/native build behaviour, memory profiles, bundle size, cold-start timings, accessibility on real assistive tech, and any behaviour requiring a running app.
