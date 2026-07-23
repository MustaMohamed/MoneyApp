# Budget and Commitment Workload Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bound Budget reads, eliminate duplicate Budget loads, and replace per-commitment housekeeping queries with one coherent repository-owned workload without changing financial results.

**Architecture:** SQLite query modules expose bounded primitives; repositories own coherent reads and exclusive write transactions; existing Zustand stores own generation-based invalidation, in-flight deduplication, and atomic snapshot publication. Hooks remain the intent boundary, while screens preserve warm content and use the installed HeroUI/project primitives for loading, error, copy, and retry states.

**Tech Stack:** Expo SDK 55 bare workflow with `expo-dev-client`, React Native Fabric, TypeScript strict mode, expo-sqlite, Zustand v5, Expo Router, HeroUI Native v1.0.3, Uniwind/Tailwind v4, Jest, better-sqlite3, oxlint, and oxfmt.

---

## Starting contract and scope

- Implement only after this branch contains merged PR1 from `origin/main` at or after `8074711`.
- PR1 behavior is authoritative: `runAfterInteractions(callback, { onError })`, optional post-ready scheduling, fatal startup ownership, and stale-attempt protection must remain intact.
- Do not add dependencies, native/config changes, routes, migrations, indexes, entities, Signals, or new `.tsx` render tests.
- Do not change recurrence, Budget formulas, payment posting, account deltas, copy outcomes, status rules, or month predicates.
- Use `Screen`/`ScreenScroll`, project `Sheet`, project `Button`, and installed HeroUI `Alert`, `Checkbox`, `Skeleton`, and `PressableFeedback`. Do not create parallel UI primitives.
- A needed index, schema change, or other critical trigger stops this plan and is escalated.

## Exact file map

**Create**

- `src/modules/commitments/repositories/commitment_housekeeping.helpers.ts`
- `__tests__/commitment_housekeeping.helpers.test.ts`
- `__tests__/commitment_housekeeping.repository.test.ts`
- `__tests__/budget.repository.copy_atomic.test.ts`

**Budget production**

- `src/modules/budget/database/budgets.ts`
- `src/modules/budget/repositories/budget.repository.ts`
- `src/modules/budget/store/budget.store.ts`
- `src/modules/budget/screens/budget/budget.helpers.ts`
- `src/modules/budget/screens/budget/budget.state.ts`
- `src/modules/budget/screens/budget/budget.hook.ts`
- `src/modules/budget/screens/budget/index.tsx`
- `src/modules/budget/screens/budget/components/budget_copy_sheet.tsx`

**Commitment production and callers**

- `src/modules/commitments/database/commitments.ts`
- `src/modules/commitments/database/commitment_payments.ts`
- `src/modules/commitments/repositories/commitment.repository.ts`
- `src/modules/commitments/store/commitment.store.ts`
- `src/modules/commitments/screens/commitments/commitments.hook.ts`
- `src/modules/commitments/screens/commitments/index.tsx`
- `src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts`
- `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts`
- `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- `src/utils/use_layout_init.hook.ts`
- `src/constants/strings.ts`
- `src/constants/theme.ts`

**Logic tests to modify**

- `__tests__/budgets.query.test.ts`
- `__tests__/budget.repository.test.ts`
- `__tests__/budget.store.test.ts`
- `__tests__/budget.helpers.test.ts`
- `__tests__/budget.state.test.ts`
- `__tests__/screens/budget/budget_month_actions.hook.test.ts`
- `__tests__/screens/budget/budget_month_rollover.hook.test.ts`
- `__tests__/commitment.query.test.ts`
- `__tests__/commitment_payments.query.test.ts`
- `__tests__/commitment.repository.test.ts`
- `__tests__/commitment.store.test.ts`
- `__tests__/screens/commitments.hook.test.ts`
- `__tests__/screens/commitments_add.hook.test.ts`
- `__tests__/screens/commitments_pay_sheet.hook.test.ts`
- `__tests__/screens/transactions/detail/detail_hook.test.ts`
- `__tests__/use_layout_init.test.ts`

**Existing `.tsx` fixture maintenance only**

- `__tests__/screens/budget/budget_copy_sheet.test.tsx`
- `__tests__/screens/budget/budget_screen.test.tsx`
- `__tests__/screens/commitments.screen.test.tsx`

---

### Task 0: Verify the merged PR1 foundation

**Files:**

- Verify only: `src/utils/run_after_interactions.ts`
- Verify only: `src/utils/use_layout_init.hook.ts`
- Verify only: `src/modules/commitments/screens/commitments/commitments.hook.ts`

- [ ] **Step 1: Verify branch, scope, and ancestry**

Run:

```bash
git branch --show-current
git status --short
git merge-base --is-ancestor 8074711 HEAD
```

Expected: branch is `perf/budget-commitment-workload`, status contains only intentional work, and ancestry exits 0. If ancestry fails, stop; the branch owner must update from merged `origin/main` before implementation. Do not implement against the pre-PR1 hook/startup contract.

- [ ] **Step 2: Lock the inherited behavior with focused tests**

Run:

```bash
npm test -- --runInBand __tests__/run_after_interactions.test.ts __tests__/use_layout_init.test.ts __tests__/screens/commitments.hook.test.ts
```

Expected: PASS before feature changes.

---

### Task 1: Add bounded Budget reads and a coherent repository snapshot

**Files:**

- Modify: `__tests__/budgets.query.test.ts`
- Modify: `__tests__/budget.repository.test.ts`
- Modify: `src/modules/budget/database/budgets.ts`
- Modify: `src/modules/budget/repositories/budget.repository.ts`

- [ ] **Step 1: Write failing bounded-query tests**

Add cases proving:

- `getBudgetRowsForMonths(db, [])` returns `[]` without calling SQLite.
- A 12-month request returns only those explicit months; seeded months 13 and 24 are excluded.
- Duplicate requested months are normalized before placeholders/arguments are built.
- `EXPLAIN QUERY PLAN` for the same predicate uses existing `idx_budgets_month`; the test must not create an index.

Run:

```bash
npm test -- --runInBand __tests__/budgets.query.test.ts
```

Expected: FAIL because `getBudgetRowsForMonths` does not exist.

- [ ] **Step 2: Implement the explicit-month query**

Add:

```ts
export async function getBudgetRowsForMonths(
  db: SQLiteDatabase,
  months: string[],
): Promise<Budget[]> {
  const uniqueMonths = [...new Set(months)];
  if (uniqueMonths.length === 0) return [];

  return db.getAllAsync<Budget>(
    `SELECT *
       FROM budgets
      WHERE year_month IN (${uniqueMonths.map(() => '?').join(', ')})
      ORDER BY year_month ASC, created_at ASC`,
    ...uniqueMonths,
  );
}
```

Keep the existing single-row/category query APIs unchanged.

- [ ] **Step 3: Write failing repository snapshot and preview tests**

Specify:

```ts
export interface BudgetMonthSnapshot {
  loadedMonth: string;
  rows: Budget[];
  spendByMonth: Record<string, number>;
  spendByBudgetId: Record<string, number>;
  expectedIncome: number | null;
  budgetGroupByCategoryId: Record<string, string>;
  spendingPlans: SpendingPlan[];
  spendingPlanSpendById: Record<string, number>;
  incomeSuggestion: number | null;
}
```

Test that `getMonthSnapshot('2026-07')`:

- opens one DB handle;
- requests exactly the selected month plus its 11 predecessors;
- preserves existing expected-income, spend, grouping, plan, and suggestion formulas;
- never calls the old full-history Budget read.

Test `getCopyPreview(sourceMonth, targetMonth)` for source-only, target-only, source/target overlap, and empty source. It must fetch only the two requested months and return source rows still eligible under the current copy matching rule.

Run:

```bash
npm test -- --runInBand __tests__/budget.repository.test.ts
```

Expected: FAIL on the missing repository APIs.

- [ ] **Step 4: Implement snapshot and targeted preview**

Add `getMonthSnapshot(yearMonth)` and `getCopyPreview(sourceMonth, targetMonth)` to `BudgetRepository`. Reuse existing pure formula helpers; do not duplicate financial math. Capture one DB from `getDb()` per method, call `getBudgetRowsForMonths`, and assemble the returned object only after all reads succeed.

- [ ] **Step 5: Verify**

Run:

```bash
npm test -- --runInBand __tests__/budgets.query.test.ts __tests__/budget.repository.test.ts
```

Expected: PASS, including formula parity and bounded-read assertions.

- [ ] **Step 6: Commit**

```bash
git add src/modules/budget/database/budgets.ts src/modules/budget/repositories/budget.repository.ts __tests__/budgets.query.test.ts __tests__/budget.repository.test.ts
git commit -m "perf(budget): bound monthly snapshot reads"
```

---

### Task 2: Make both Budget copy paths atomic and serial

**Files:**

- Modify: `src/modules/budget/repositories/budget.repository.ts`
- Modify: `__tests__/budget.repository.test.ts`
- Create: `__tests__/budget.repository.copy_atomic.test.ts`

- [ ] **Step 1: Write failing transaction tests**

For both `copyBudgetsToMonth` and `copyBudgetLimitsToMonth`, assert:

- one `withExclusiveTransactionAsync` boundary;
- source and target are read inside that boundary using `getBudgetRowsForMonths`;
- writes are awaited serially, never through `Promise.all`;
- copy result/count matches current semantics;
- an injected failure on write 2 rolls back write 1 in a real better-sqlite3-backed test;
- no repository method opens a second DB handle inside the transaction.

Run:

```bash
npm test -- --runInBand __tests__/budget.repository.test.ts __tests__/budget.repository.copy_atomic.test.ts
```

Expected: FAIL because the limits path is non-atomic and copy reads are not targeted.

- [ ] **Step 2: Implement one private transaction helper**

Use this shape for both public APIs:

```ts
async function copyRowsInExclusiveTransaction(
  db: SQLiteDatabase,
  sourceMonth: string,
  targetMonth: string,
  selectedIds: ReadonlySet<string> | undefined,
  copyMode: 'budgets' | 'limits',
): Promise<number> {
  return db.withExclusiveTransactionAsync(async (transactionDb) => {
    const rows = await getBudgetRowsForMonths(transactionDb, [
      sourceMonth,
      targetMonth,
    ]);
    const writes = buildBudgetCopyWrites(
      rows,
      sourceMonth,
      targetMonth,
      selectedIds,
      copyMode,
    );

    for (const write of writes) {
      await setBudgetRow(transactionDb, write);
    }
    return writes.length;
  });
}
```

`buildBudgetCopyWrites` must preserve existing IDs/defaults/matching/overwrite behavior; move existing logic rather than redesigning it.

- [ ] **Step 3: Verify and commit**

```bash
npm test -- --runInBand __tests__/budget.repository.test.ts __tests__/budget.repository.copy_atomic.test.ts
git add src/modules/budget/repositories/budget.repository.ts __tests__/budget.repository.test.ts __tests__/budget.repository.copy_atomic.test.ts
git commit -m "fix(budget): make copy writes atomic"
```

Expected: PASS; rollback leaves no partial target rows.

---

### Task 3: Move Budget load ownership into the store

**Files:**

- Modify: `__tests__/budget.store.test.ts`
- Modify: `src/modules/budget/store/budget.store.ts`

- [ ] **Step 1: Replace repository fixtures with snapshot fixtures**

Define one local test fixture:

```ts
const emptySnapshot: BudgetMonthSnapshot = {
  loadedMonth: '2026-07',
  rows: [],
  spendByMonth: {},
  spendByBudgetId: {},
  expectedIncome: null,
  budgetGroupByCategoryId: {},
  spendingPlans: [],
  spendingPlanSpendById: {},
  incomeSuggestion: null,
};
```

Mock `getMonthSnapshot` and `getCopyPreview`; remove assertions for the old store fan-out.

- [ ] **Step 2: Write failing ownership tests**

Cover:

- same `{month, generation}` concurrent loads share one promise;
- different months do not share;
- A/B and A/B/A completion order publishes only the latest owner;
- successful mutation increments generation before reload, so old work cannot publish;
- refresh error retains the last successful snapshot and records an error;
- reset clears snapshots, errors, generation ownership, and in-flight maps;
- preview source changes cannot publish old rows;
- preview empty success is distinct from preview failure.

Run:

```bash
npm test -- --runInBand __tests__/budget.store.test.ts
```

Expected: FAIL on missing generation/deduplication behavior.

- [ ] **Step 3: Implement store state and actions**

Keep writable values top-level per the project’s Zustand law. Add:

```ts
interface BudgetStoreState extends BudgetMonthSnapshot {
  generation: number;
  loading: boolean;
  loadError: boolean;
  copyPreviewRows: Budget[];
  copyPreviewSourceMonth: string | undefined;
  copyPreviewTargetMonth: string | undefined;
  copyPreviewLoaded: boolean;
  copyPreviewLoading: boolean;
  copyPreviewError: boolean;
  load(yearMonth: string): Promise<void>;
  loadCopyPreview(sourceMonth: string, targetMonth: string): Promise<void>;
}
```

Use closure-owned maps keyed by `${generation}:${month}` and `${generation}:${source}:${target}`. Publish only when the request key is still current. Every successful Budget persistence/copy must increment generation before requesting fresh data. Actions remain top-level; consumers use grouped `useShallow` reads.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- --runInBand __tests__/budget.store.test.ts
git add src/modules/budget/store/budget.store.ts __tests__/budget.store.test.ts
git commit -m "perf(budget): centralize snapshot ownership"
```

---

### Task 4: Shift Budget hook and UI to matching snapshots and stable copy state

**Files:**

- Modify: `src/modules/budget/screens/budget/budget.helpers.ts`
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_copy_sheet.tsx`
- Modify: `src/constants/strings.ts`
- Modify: `src/constants/theme.ts`
- Modify: `__tests__/budget.helpers.test.ts`
- Modify: `__tests__/budget.state.test.ts`
- Modify: `__tests__/screens/budget/budget_month_actions.hook.test.ts`
- Modify: `__tests__/screens/budget/budget_month_rollover.hook.test.ts`
- Maintain fixtures: `__tests__/screens/budget/budget_copy_sheet.test.tsx`
- Maintain fixtures: `__tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 1: Write failing presentation and UI-state tests**

Add a pure selector:

```ts
type BudgetPresentation =
  | 'coldLoading'
  | 'coldError'
  | 'content'
  | 'contentWithError';

resolveBudgetPresentation({
  hasMatchingSnapshot: loadedMonth === selectedMonth,
  loadError,
});
```

Assert no matching snapshot gives cold loading/error, while a matching snapshot remains content/content-with-error during refresh.

In `budget.state.test.ts`, add top-level `copyBusy` and `copyError`; `closeCopy()` must clear both and selected IDs. Remove `incomeSuggestion` from the UI state store.

- [ ] **Step 2: Write failing hook tests**

Prove:

- changing selected month changes only UI selection; the focused effect owns `load(selectedMonth)`;
- focus plus pull-to-refresh for the same key joins store work;
- categories reload only when they have no successful data;
- formulas use only a matching `loadedMonth`;
- opening/changing copy source clears selection and requests targeted preview;
- preview Retry repeats only preview loading;
- Apply is ignored while busy;
- persistence failure leaves the sheet and selection open and shows an operational error;
- successful persistence followed by reload failure still closes once and does not copy twice.

Run:

```bash
npm test -- --runInBand __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts
```

Expected: FAIL on the new contracts.

- [ ] **Step 3: Implement hook/state ownership**

Remove direct DB income-suggestion work from `budget.hook.ts`; read it from the matching store snapshot. Keep initialization/load in the focus boundary inherited from PR1. Return flat actions and a `state` object as current screen anatomy requires.

Serialize copy with:

```ts
if (copyBusy) return;
setCopyBusy(true);
setCopyError(false);
try {
  await copyBudgetsToMonth(selectedIds);
  closeCopy();
} catch {
  setCopyError(true);
} finally {
  setCopyBusy(false);
}
```

Keep selection intact on failure.

- [ ] **Step 4: Implement stable HeroUI presentation**

- Keep `<Screen>`/`<ScreenScroll>` and successful-content geometry mounted during refresh.
- Use HeroUI `Skeleton` only for cold loading.
- Use HeroUI `Alert` plus project `Button` for cold Retry and the fixed-height warm error rail.
- Add user-visible error/Retry text to `src/constants/strings.ts`.
- Add one shared `Size.statusRailMinHeight` token in `src/constants/theme.ts`; do not hardcode screen geometry.
- Keep project `Sheet`; render preview loading/error/empty/content inside it.
- Replace custom footer actions with project `Button`.
- Set `Sheet.isDismissable={!copyBusy}` and disable checkboxes, source changes, Cancel, and Apply while copying.

Do not add a new primitive or new `.tsx` behavior suite.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- --runInBand __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx
git add src/modules/budget/screens/budget src/constants/strings.ts src/constants/theme.ts __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget
git commit -m "fix(budget): preserve warm content and copy state"
```

Expected: PASS; `.tsx` edits are fixture/expectation maintenance only.

---

### Task 5: Add batched Commitment facts and a pure planner

**Files:**

- Modify: `src/modules/commitments/database/commitments.ts`
- Modify: `src/modules/commitments/database/commitment_payments.ts`
- Create: `src/modules/commitments/repositories/commitment_housekeeping.helpers.ts`
- Modify: `__tests__/commitment.query.test.ts`
- Modify: `__tests__/commitment_payments.query.test.ts`
- Create: `__tests__/commitment_housekeeping.helpers.test.ts`

- [ ] **Step 1: Write failing batched-query tests**

Cover:

- one ordered joined read returns `{ commitment_id, due_date }` only for active commitments;
- `insertPaymentRows(db, rows)` performs serial `INSERT OR IGNORE` calls and opens no transaction;
- existing `addPayments` still wraps that low-level helper in its current standalone transaction;
- one expiry update deactivates only active finite commitments satisfying the existing strict completion boundary;
- query-plan assertions use existing commitment/payment indexes and create no index.

- [ ] **Step 2: Write failing pure-planner tests**

For fixed and variable commitments, assert exact output fields, recurrence boundaries, one captured timestamp, injected IDs, suppression of existing due dates, and idempotent empty output on a second pass. Keep `compute_due_dates.test.ts` as the recurrence source of truth.

Run:

```bash
npm test -- --runInBand __tests__/commitment.query.test.ts __tests__/commitment_payments.query.test.ts __tests__/commitment_housekeeping.helpers.test.ts
```

Expected: FAIL on missing APIs.

- [ ] **Step 3: Implement DB primitives**

Add:

```ts
export interface ActiveCommitmentDueDate {
  commitment_id: string;
  due_date: string;
}

export function getActiveCommitmentDueDates(
  db: SQLiteDatabase,
): Promise<ActiveCommitmentDueDate[]> {
  return db.getAllAsync(
    `SELECT payment.commitment_id, payment.due_date
       FROM commitment_payments payment
       JOIN commitments commitment ON commitment.id = payment.commitment_id
         AND commitment.is_active = 1
      ORDER BY payment.commitment_id, payment.due_date`,
  );
}
```

Extract the existing payment INSERT SQL and parameter mapping into private constants/functions in `commitment_payments.ts`. `insertPaymentRows` loops over them serially; `addPayments` delegates inside its existing transaction.

Add `deactivateExpiredCommitments(db, asOfDate, updatedAt)` as one `UPDATE` using the current strict expiry rule. Do not move the boundary or alter statuses.

- [ ] **Step 4: Implement the pure planner**

Export:

```ts
export function planMissingCommitmentPayments(input: {
  commitments: Commitment[];
  dueDates: ActiveCommitmentDueDate[];
  now: Date;
  createId: () => string;
}): CommitmentPayment[];
```

Index due dates by commitment ID, call existing `computeDueDates`, and map only missing dates to the exact existing payment defaults. No DB access, clock reads, or UUID calls belong inside this helper.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- --runInBand __tests__/commitment.query.test.ts __tests__/commitment_payments.query.test.ts __tests__/commitment_housekeeping.helpers.test.ts __tests__/compute_due_dates.test.ts
git add src/modules/commitments/database src/modules/commitments/repositories/commitment_housekeeping.helpers.ts __tests__/commitment.query.test.ts __tests__/commitment_payments.query.test.ts __tests__/commitment_housekeeping.helpers.test.ts
git commit -m "perf(commitments): batch housekeeping facts"
```

---

### Task 6: Give the Commitment repository and store one housekeeping owner

**Files:**

- Modify: `src/modules/commitments/repositories/commitment.repository.ts`
- Modify: `src/modules/commitments/store/commitment.store.ts`
- Modify: `__tests__/commitment.repository.test.ts`
- Create: `__tests__/commitment_housekeeping.repository.test.ts`
- Modify: `__tests__/commitment.store.test.ts`

- [ ] **Step 1: Write failing repository integration tests**

For 1 and 100 active commitments, instrument SQL and assert housekeeping uses:

- one active-commitment read;
- one joined due-date read;
- serial inserts only for planned missing rows;
- one expiry update;
- one `withExclusiveTransactionAsync`;
- one DB handle;
- no per-commitment count/due-date reads.

Also test exact payment rows, fixed/variable amounts, no duplicate insertion, strict expiry, and rollback after an injected insert failure.

Test `getMonthSnapshot(yearMonth)` returns commitments, month payments, derived counts/totals, and `loadedMonth` from one coherent repository call.

Run:

```bash
npm test -- --runInBand __tests__/commitment.repository.test.ts __tests__/commitment_housekeeping.repository.test.ts
```

Expected: FAIL on missing APIs.

- [ ] **Step 2: Implement repository work units**

Add:

```ts
interface CommitmentMonthSnapshot {
  loadedMonth: string;
  commitments: Commitment[];
  payments: CommitmentPayment[];
}

runHousekeeping(now: Date): Promise<void>;
getMonthSnapshot(yearMonth: string): Promise<CommitmentMonthSnapshot>;
```

`runHousekeeping` captures `asOfDate`, ISO timestamp, and IDs once at the repository boundary, then executes active read → due-date read → pure plan → serial inserts → expiry update inside one exclusive transaction. `getMonthSnapshot` assembles and returns only after all reads succeed.

- [ ] **Step 3: Write failing store ownership tests**

Cover:

- housekeeping key is `${utcDate}:${generation}`;
- concurrent same-key calls join;
- a later key/generation cannot be overwritten by earlier completion;
- successful mutations increment generation before housekeeping/snapshot refresh;
- month snapshot publishes atomically with `loadedMonth`;
- warm snapshot survives refresh failure;
- reset clears stale keys/in-flight ownership;
- existing posting and account-delta behavior remains unchanged.

- [ ] **Step 4: Implement store ownership**

Replace store loops with repository calls. Keep closure-owned in-flight maps and top-level Zustand fields/actions. Expose `ensureHousekeepingCurrent()` and one selected-month load action; do not keep compatibility paths that call the removed loops.

- [ ] **Step 5: Verify and commit**

```bash
npm test -- --runInBand __tests__/commitment.repository.test.ts __tests__/commitment_housekeeping.repository.test.ts __tests__/commitment.store.test.ts
git add src/modules/commitments/repositories src/modules/commitments/store __tests__/commitment.repository.test.ts __tests__/commitment_housekeeping.repository.test.ts __tests__/commitment.store.test.ts
git commit -m "perf(commitments): centralize housekeeping ownership"
```

---

### Task 7: Unify Commitment callers and preserve warm UI

**Files:**

- Modify: `src/modules/commitments/screens/commitments/commitments.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Modify: `src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `src/utils/use_layout_init.hook.ts`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/commitments.hook.test.ts`
- Modify: `__tests__/screens/commitments_add.hook.test.ts`
- Modify: `__tests__/screens/commitments_pay_sheet.hook.test.ts`
- Modify: `__tests__/screens/transactions/detail/detail_hook.test.ts`
- Modify: `__tests__/use_layout_init.test.ts`
- Maintain fixtures: `__tests__/screens/commitments.screen.test.tsx`

- [ ] **Step 1: Write failing caller-ownership tests**

Assert:

- focus schedules one `ensureHousekeepingCurrent()` and one selected-month load through PR1’s `runAfterInteractions(..., { onError })`;
- hook-derived summary/rows are used only when `loadedMonth === selectedMonth`;
- refresh joins store-owned work;
- add no longer generates payments after the mutation;
- pay no longer reloads month payments after the mutation;
- transaction-detail deep link uses the unified selected-month load before navigation;
- layout optional startup calls only `ensureHousekeepingCurrent()` after readiness and reports failure through PR1’s optional warning boundary.

Run:

```bash
npm test -- --runInBand __tests__/screens/commitments.hook.test.ts __tests__/screens/commitments_add.hook.test.ts __tests__/screens/commitments_pay_sheet.hook.test.ts __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/use_layout_init.test.ts
```

Expected: FAIL on duplicate calls and old fan-out expectations.

- [ ] **Step 2: Implement unified callers**

Delete only duplicate generation/reload calls. Preserve mutation order, navigation, PR1 error ownership, and post-ready scheduling. Do not swallow optional errors or turn them into fatal startup errors.

- [ ] **Step 3: Implement stable Commitment presentation**

- Cold load: HeroUI `Skeleton`.
- Cold error: HeroUI `Alert` plus project Retry `Button`.
- Warm refresh: keep summary and list mounted.
- Warm error: fixed-height HeroUI `Alert` rail using `Size.statusRailMinHeight`.
- Keep `Screen`/`ScreenScroll`; add no custom primitive.
- Add operational text to `Strings`.
- Update only mocks/existing expectations in `commitments.screen.test.tsx`; do not add a render-test suite.

- [ ] **Step 4: Verify and commit**

```bash
npm test -- --runInBand __tests__/screens/commitments.hook.test.ts __tests__/screens/commitments_add.hook.test.ts __tests__/screens/commitments_pay_sheet.hook.test.ts __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/use_layout_init.test.ts __tests__/screens/commitments.screen.test.tsx
git add src/modules/commitments/screens src/modules/transactions/screens/transactions/detail/detail.hook.ts src/utils/use_layout_init.hook.ts src/constants/strings.ts __tests__/screens/commitments* __tests__/screens/transactions/detail/detail_hook.test.ts __tests__/use_layout_init.test.ts
git commit -m "fix(commitments): unify refresh and mutation callers"
```

Expected: PASS and warm summaries remain visible during refresh.

---

### Task 8: Prove regression safety and workload bounds

**Files:**

- Verify/modify only the logic tests listed in the exact file map.

- [ ] **Step 1: Run the complete Budget regression group**

```bash
npm test -- --runInBand __tests__/budgets.query.test.ts __tests__/budget.repository.test.ts __tests__/budget.repository.copy_atomic.test.ts __tests__/budget.store.test.ts __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts
```

Expected: PASS with formulas, copy semantics, rollback, races, and warm-state behavior preserved.

- [ ] **Step 2: Run the complete Commitment regression group**

```bash
npm test -- --runInBand __tests__/commitment.query.test.ts __tests__/commitment_payments.query.test.ts __tests__/commitment.repository.test.ts __tests__/commitment_housekeeping.helpers.test.ts __tests__/commitment_housekeeping.repository.test.ts __tests__/commitment.store.test.ts __tests__/compute_due_dates.test.ts __tests__/screens/commitments.hook.test.ts __tests__/screens/commitments_add.hook.test.ts __tests__/screens/commitments_pay_sheet.hook.test.ts
```

Expected: PASS with recurrence, fixed/variable amounts, idempotency, posting, conversion, account deltas, and expiry unchanged.

- [ ] **Step 3: Run structural workload and query-plan assertions**

```bash
npm test -- --runInBand __tests__/budgets.query.test.ts __tests__/commitment_housekeeping.repository.test.ts -t "query plan|100 active commitments"
```

Expected:

- Budget snapshot reads at most 12 explicit months.
- Both copy paths read only source and target.
- One- and 100-commitment housekeeping perform the same two read statements and one expiry update; only necessary insert count scales.
- Existing indexes are used. If a required query plan regresses, stop and escalate an index/migration follow-up instead of adding schema here.

- [ ] **Step 4: Run coverage**

```bash
npm run test:coverage
```

Expected: PASS at 80% lines, 95% functions, and 100% branches.

- [ ] **Step 5: Verify forbidden scope is absent**

```bash
git diff --check
git diff -- package.json package-lock.json app.json src/app src/database/migrations
rg -n "SafeAreaView|@preact/signals" src/modules/budget src/modules/commitments
```

Expected: clean diff; no dependency, config, route, migration, direct `SafeAreaView`, or Signals changes.

---

### Task 9: Run local CI parity and collect device evidence

**Files:**

- Verify only; no new production files.

- [ ] **Step 1: Run exact local CI parity**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Expected: all six jobs pass from the top. Fix failures and rerun the complete chain. Do not push.

- [ ] **Step 2: Record Android performance evidence**

On a mid-range physical Android device using a release-like dev-client build and a seed containing 24 Budget months plus 100 active commitments:

- capture cold start; acceptance remains under 2 seconds;
- capture Budget first load, month switch, same-key focus/refresh, copy preview, copy commit, and injected warm refresh failure;
- capture Commitment post-ready housekeeping, month switch, same-key focus/refresh, add, pay, transaction deep link, and injected warm refresh failure;
- confirm no JS exception, partial copy, duplicate payment, blank warm screen, or content jump;
- compare JS duration/SQLite statement counts to the automated structural assertions.

If the device indicates an index is required, stop and escalate; do not add one in this branch.

- [ ] **Step 3: Hand off the mandatory user device-QA gate**

Provide the green CI evidence, device/build identifier, seed size, timings, query counts, and this manual matrix:

- Budget formulas and 12-month trend parity;
- copy preview selection, Retry, locked busy state, success, and rollback;
- Commitment totals, recurrence, expiry, add/pay/deep-link flows;
- cold/warm loading and error geometry;
- force-close/relaunch startup behavior inherited from PR1.

Merging or pushing requires a separate explicit user request after this gate.

---

## Rollback

No schema/data rewrite is planned. Revert the task commits in reverse order if needed; do not reset the worktree or revert unrelated changes. Budget copy and Commitment housekeeping are atomic, so failed operations must leave persisted data unchanged.
