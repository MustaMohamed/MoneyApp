# MobX Store Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace all runtime Zustand usage with MobX for shared/domain/application stores and Preact Signals for screen/component-local state.

**Architecture:** Shared stores become class-based MobX singletons with direct fields, computed getters, repository injection, and `makeAutoObservable`. Screen and component state that naturally resets with its owner becomes hook-based Signals state returning `{ state, ...actions }`. Components that read MobX observable fields during render are auto-observed by `mobx-react-observer`; use explicit `observer(...)` only for render boundaries the Babel transform cannot infer.

**Tech Stack:** Expo React Native, TypeScript strict, MobX, `mobx-react-lite`, `mobx-react-observer`, Preact Signals for local state, Jest logic tests, oxlint/oxfmt.

---

## Coordination Rules

- Work on branch `refactor/mobx-store-migration`.
- The approved design is `docs/superpowers/specs/2026-06-03-mobx-stores-signals-local-state-design.md`.
- Do not introduce a long-term Zustand-shaped adapter over MobX.
- Do not edit database schema, repositories, navigation structure, UI design, HeroUI components, secure store, or native config for this migration.
- Do not remove `zustand` until `rg "from 'zustand'|from \"zustand\"|zustand/react/shallow|zustand_selectors" src __tests__` returns no required runtime/test imports.
- When multiple workers run in parallel, each worker owns only the files listed in its task. If a consumer file must be shared, route it through the coordinator before editing.
- Preserve root `src/store/*.store.ts` compatibility files as thin re-exports only.

## Parallel Execution Map

Run tasks in these waves:

- **Wave 1:** Task 1 only. It adds dependencies and shared MobX conventions.
- **Wave 2:** Tasks 2, 3, 4, and 5 can run in parallel after Task 1. These migrate shared stores and their direct tests.
- **Wave 3:** Tasks 6, 7, 8, 9, and 10 can run in parallel after Wave 2. These migrate local state and screen consumers using the new shared-store APIs.
- **Wave 4:** Task 11 only. It removes Zustand and performs final verification.

## Shared MobX Store Pattern

All MobX shared stores should follow this pattern:

```ts
import { makeAutoObservable, runInAction } from 'mobx';

export class ExampleStore {
  rows: Example[] = [];
  loaded = false;
  private loadRequestId = 0;

  constructor(private readonly repository: IExampleRepository = exampleRepository) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  async load() {
    const requestId = ++this.loadRequestId;
    const rows = await this.repository.getAll();
    runInAction(() => {
      if (requestId !== this.loadRequestId) return;
      this.rows = rows;
      this.loaded = true;
    });
  }

  reset() {
    this.loadRequestId += 1;
    this.rows = [];
    this.loaded = false;
  }
}

export const exampleStore = new ExampleStore(exampleRepository);

export function useExampleStore(): ExampleStore {
  return exampleStore;
}
```

MobX tests should instantiate the class directly:

```ts
const store = new ExampleStore(repo);
await store.load();
expect(store.rows).toEqual(expectedRows);
```

Local Signals state should follow this pattern:

```ts
import { batch, useSignal } from '@preact/signals-react';

export function useExampleState() {
  const visible = useSignal(false);
  const selectedId = useSignal<string | undefined>(undefined);

  function open(id: string) {
    batch(() => {
      visible.value = true;
      selectedId.value = id;
    });
  }

  function reset() {
    batch(() => {
      visible.value = false;
      selectedId.value = undefined;
    });
  }

  return {
    state: { visible, selectedId },
    open,
    reset,
  };
}
```

## Task 1: Add MobX Dependencies And Shared Conventions

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Read: `docs/superpowers/specs/2026-06-03-mobx-stores-signals-local-state-design.md`

- [ ] **Step 1: Install dependencies from the approved spec**

Run:

```bash
npm install mobx mobx-react-lite
npm install mobx-react-observer@1.1.0
```

Expected: `package.json` contains `mobx`, `mobx-react-lite`, and `mobx-react-observer`; `babel.config.js` runs the auto-observer plugin before `react-native-worklets/plugin`; and `package-lock.json` is updated.

- [ ] **Step 2: Verify dependency install**

Run:

```bash
npm run typecheck
npm test -- --ci --runInBand
```

Expected: typecheck exits `0`; all Jest suites pass.

- [ ] **Step 3: Inspect dependency diff**

Run:

```bash
git diff -- package.json package-lock.json
```

Expected: only MobX dependency additions and lockfile resolution changes are present.

## Task 2: Migrate App-Flow Shared Stores

**Files:**
- Modify: `src/store/sheet_visibility.store.ts`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/app/(app)/(tabs)/_layout.tsx`
- Modify: `__tests__/store/sheet_visibility.store.test.ts`
- Read/verify only: `src/store/ready.store.ts`
- Read/verify only: `src/modules/onboarding/store/onboarding.store.ts`
- Test: `__tests__/ready.store.test.ts`
- Test: `__tests__/onboarding.store.test.ts`
- Test: `__tests__/onboarding_store_restart.test.ts`
- Test: `__tests__/use_layout_init.test.ts`

- [ ] **Step 1: Write/adjust failing tests for MobX sheet visibility**

Change `__tests__/store/sheet_visibility.store.test.ts` to import the MobX singleton/class API and assert direct fields:

```ts
beforeEach(() => sheetVisibilityStore.reset());

expect(sheetVisibilityStore.count).toBe(0);
sheetVisibilityStore.increment();
expect(sheetVisibilityStore.count).toBe(1);
expect(sheetVisibilityStore.anyOpen).toBe(true);
```

Run:

```bash
npm test -- --runTestsByPath __tests__/store/sheet_visibility.store.test.ts --runInBand
```

Expected: fails because the store still exposes Zustand APIs.

- [ ] **Step 2: Implement MobX sheet visibility**

Replace Zustand in `src/store/sheet_visibility.store.ts` with a MobX class:

- `count = 0`
- computed getter `anyOpen`
- `increment()`
- `decrement()` floors at `0` and preserves the existing dev warning behavior
- `reset()`
- exported singleton `sheetVisibilityStore`
- facade `useSheetVisibilityStore()` returning the singleton
- facade `useAnySheetOpen()` for MobX reads that happen inside an auto-observed or explicitly observed render boundary

- [ ] **Step 3: Update sheet consumers**

Update `src/components/ui/sheet.tsx` and `src/app/(app)/(tabs)/_layout.tsx` to stop calling the Zustand hook form. Components that read `anyOpen` during render must be covered by the auto-observer transform, or use an explicit observer subcomponent if the transform cannot infer the boundary.

- [ ] **Step 4: Verify focused app-flow tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/store/sheet_visibility.store.test.ts __tests__/ready.store.test.ts __tests__/onboarding.store.test.ts __tests__/onboarding_store_restart.test.ts __tests__/use_layout_init.test.ts --runInBand
npm run typecheck
```

Expected: all listed tests pass and typecheck exits `0`.

## Task 3: Migrate Account, Category, And Currency Shared Stores

**Files:**
- Modify: `src/modules/accounts/store/account.store.ts`
- Modify: `src/modules/categories/store/category.store.ts`
- Modify: `src/modules/currency/store/currency.store.ts`
- Keep thin: `src/store/account.store.ts`
- Keep thin: `src/store/category.store.ts`
- Keep thin: `src/store/currency.store.ts`
- Modify: `__tests__/account.store.test.ts`
- Modify: `__tests__/category.store.test.ts`
- Modify: `__tests__/currency.store.test.ts`

- [ ] **Step 1: Write failing MobX tests**

Update store tests to instantiate classes directly:

```ts
const store = new CategoryStore(repo);
expect(store.categories).toEqual([]);
expect(store.hasLoaded).toBe(false);
await store.loadCategories();
expect(store.categories).toEqual(mockCategories);
expect(store.hasLoaded).toBe(true);
```

For accounts, assert `EMPTY_ACCOUNTS` identity on reset and stale request protection. For currency, assert defaults, persistence keys, manual override behavior, and that manual rate does not update `lastFetched`.

Run:

```bash
npm test -- --runTestsByPath __tests__/account.store.test.ts __tests__/category.store.test.ts __tests__/currency.store.test.ts --runInBand
```

Expected: fails because the stores still expose Signals/Zustand shapes.

- [ ] **Step 2: Convert `AccountStore` to MobX**

In `src/modules/accounts/store/account.store.ts`, remove `signal(...)` state and use direct MobX fields:

- `accounts: Account[] = EMPTY_ACCOUNTS`
- `makeAutoObservable(this, {}, { autoBind: true })`
- preserve `loadRequestId` stale-load protection
- preserve `init`, `addAccount`, `updateAccount`, `archiveAccount`, `adjustBalance`, `reset`
- keep repository injection
- export `accountStore` singleton and `useAccountStore()`

- [ ] **Step 3: Convert `CategoryStore` to MobX**

In `src/modules/categories/store/category.store.ts`, replace `createMoneyAppSelectors(create(...))` with:

- exported `CategoryStore` class
- fields `categories: Category[] = []`, `hasLoaded = false`
- methods `loadCategories`, `addCategory`, `updateCategory`, `deleteCategory`, `reassignAndDelete`, `getCategoryTransactionCount`, `reset`
- error logging and rethrow behavior preserved
- singleton `categoryStore` and facade `useCategoryStore()`

- [ ] **Step 4: Convert `CurrencyStore` to MobX**

In `src/modules/currency/store/currency.store.ts`, replace Zustand with:

- exported `CurrencyStore` class
- fields `rate = 50`, `lastFetched: string | null = null`, `isManualOverride = false`, `rate_updated_at: string | null = null`
- methods `loadRate`, `fetchRate`, `setManualRate`, `reset`
- repository injection
- persistence keys unchanged
- `runInAction` after async persistence/fetch work

- [ ] **Step 5: Verify focused shared-store tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/account.store.test.ts __tests__/category.store.test.ts __tests__/currency.store.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 4: Migrate Budget And Dashboard Shared Stores

**Files:**
- Modify: `src/modules/budget/store/budget.store.ts`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.store.ts`
- Keep thin: `src/store/budget.store.ts`
- Modify: `__tests__/budget.store.test.ts`
- Modify: `__tests__/budget.store.5030.test.ts`
- Modify: `__tests__/dashboard.store.test.ts`

- [ ] **Step 1: Write failing MobX tests**

Update tests to use direct class instances:

```ts
const store = new BudgetStore(appSettingsRepo);
store.setData(rows, spendByMonth, 12_000);
expect(store.rows).toEqual(rows);
expect(store.loaded).toBe(true);
expect(store.expectedIncome).toBe(12_000);
```

Run:

```bash
npm test -- --runTestsByPath __tests__/budget.store.test.ts __tests__/budget.store.5030.test.ts __tests__/dashboard.store.test.ts --runInBand
```

Expected: fails because current tests still assume Zustand `.getState()`.

- [ ] **Step 2: Convert budget store to MobX**

In `src/modules/budget/store/budget.store.ts`, implement `BudgetStore` class:

- fields `rows`, `spendByMonth`, `loaded`, `expectedIncome`
- methods `setData`, `load`, `setLimit`, `removeBudget`, `setExpectedIncome`, `setExpectedIncomeLocal`, `reset`
- preserve `HISTORY_MONTHS = 12`, `EXPECTED_INCOME_KEY`, `currentYearMonth()`, `lastMonths(...)`
- preserve persistence-then-reload behavior

- [ ] **Step 3: Convert dashboard store to MobX**

In `src/modules/dashboard/screens/dashboard/dashboard.store.ts`, implement direct MobX fields and methods equivalent to the current store:

- `statsMap`
- `currentMonthCommitmentPayments`
- `currentMonthSpend`
- `previousMonthSpend`
- setters and `reset`

- [ ] **Step 4: Verify focused budget/dashboard tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/budget.store.test.ts __tests__/budget.store.5030.test.ts __tests__/dashboard.store.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 5: Migrate Transaction And Commitment Shared Stores

**Files:**
- Modify: `src/modules/transactions/store/transaction.store.ts`
- Modify: `src/modules/commitments/store/commitment.store.ts`
- Keep thin: `src/store/transaction.store.ts`
- Keep thin: `src/store/commitment.store.ts`
- Modify: `__tests__/transaction.store.test.ts`
- Modify: `__tests__/commitment.store.test.ts`

- [ ] **Step 1: Write failing MobX transaction tests**

Convert `__tests__/transaction.store.test.ts` from `.getState()` to direct class usage:

```ts
const store = new TransactionStore(repo);
await store.setQuery({});
expect(store.hasLoaded).toBe(true);
expect(store.transactions).toHaveLength(5);
```

Keep tests for stale request protection, `hasMore`, `loading`, `mutationVersion`, mutation refresh swallowing, `getById`, and `reset`.

- [ ] **Step 2: Write failing MobX commitment tests**

Convert `__tests__/commitment.store.test.ts` from `.getState()` to direct class usage:

```ts
const store = new CommitmentStore(repo);
await store.loadCommitments();
expect(store.commitmentsLoaded).toBe(true);
expect(store.commitments).toEqual(commitments);
```

Keep tests for payment race guard, month switching, generated payment status, mutation reload order, derived payment groups/counts, and error rethrow behavior.

Run:

```bash
npm test -- --runTestsByPath __tests__/transaction.store.test.ts __tests__/commitment.store.test.ts --runInBand
```

Expected: fails because stores still expose Zustand APIs.

- [ ] **Step 3: Convert transaction store to MobX**

In `src/modules/transactions/store/transaction.store.ts`, implement `TransactionStore` class:

- fields `transactions`, `hasMore`, `loading`, `hasLoaded`, `query`, `mutationVersion`
- `PAGE_SIZE` preserved
- private `requestId` stale-load guard
- private `fetchPage(filters, offset, mode)`
- methods `setQuery`, `refresh`, `loadMore`, `getById`, `addTransaction`, `deleteTransaction`, `updateTransaction`, `reset`
- mutations bump `mutationVersion`, then attempt refresh, swallowing/logging refresh failures exactly as before

- [ ] **Step 4: Convert commitment store to MobX**

In `src/modules/commitments/store/commitment.store.ts`, implement `CommitmentStore` class:

- fields `commitments`, `payments`, `selectedMonth`, `commitmentsLoaded`, `paymentsLoaded`
- private `paymentRequestId`
- methods matching the current public API
- computed getters or methods for `getOverdue`, `getDueToday`, `getUpcoming`, `getPaid`, `getSkipped`, `getPaidCount`, `getTotalCount`, `getTotalMonthlyCommitted`
- preserve `makePayments`, `today`, `currentMonth`, `computeDueDates`, generated statuses, reload order, and stale month-load behavior

- [ ] **Step 5: Verify focused transaction/commitment tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/transaction.store.test.ts __tests__/commitment.store.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 6: Migrate Currency And Category Settings Local State

**Files:**
- Modify: `src/modules/currency/screens/currency/currency.state.ts`
- Modify: `src/modules/currency/screens/currency/currency.hook.ts`
- Modify: `src/modules/currency/screens/currency/index.tsx`
- Modify: `src/modules/categories/screens/settings/categories/categories.state.ts`
- Modify: `src/modules/categories/screens/settings/categories/categories.store.ts`
- Modify: `src/modules/categories/screens/settings/categories/categories.hook.ts`
- Modify: `src/modules/categories/screens/settings/categories/index.tsx`
- Modify: `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.state.ts`
- Modify: `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx`
- Modify: `src/modules/categories/screens/settings/categories/components/reassign_category_sheet.state.ts`
- Modify: `src/modules/categories/screens/settings/categories/components/reassign_category_sheet.tsx`
- Modify: `__tests__/settings_currency.state.test.ts`
- Modify: `__tests__/screens/settings_currency.hook.test.ts`
- Modify: `__tests__/categories.state.test.ts`
- Modify: `__tests__/categories.store.test.ts`
- Modify: `__tests__/add_edit_category_sheet.state.test.ts`
- Modify: `__tests__/reassign_category_sheet.state.test.ts`
- Modify: `__tests__/screens/settings_categories.hook.test.ts`
- Modify: `__tests__/screens/settings/categories/categories_hook.test.ts`

- [ ] **Step 1: Write failing Signals tests**

Convert local state tests to `renderHook(...)` and `.value` assertions:

```ts
const { result } = renderHook(() => useCategoriesScreenState());
act(() => result.current.setActiveTab(CategoryType.Income));
expect(result.current.state.activeTab.value).toBe(CategoryType.Income);
```

Run focused state tests. Expected: fail against current Zustand state.

- [ ] **Step 2: Convert local state/store files to Signals hooks**

Replace each local Zustand state/store file with hook-owned Signals:

- local state refs returned under `state`
- flat actions returned next to `state`
- use `batch(...)` when multiple refs change together
- preserve `null` only where existing DB/entity-null semantics or tests already use it
- preserve add/edit category selected type/icon/color behavior
- preserve reassign selected/loading reset behavior

- [ ] **Step 3: Update hooks/components for MobX shared stores and Signals local state**

Remove `useShallow` imports. Use:

```ts
const categoryStore = useCategoryStore();
const categories = categoryStore.categories;
```

Screens/components that read MobX fields in render must be auto-observed by the Babel plugin or explicitly observed for exceptional boundaries.

- [ ] **Step 4: Verify focused settings tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/settings_currency.state.test.ts __tests__/screens/settings_currency.hook.test.ts __tests__/categories.state.test.ts __tests__/categories.store.test.ts __tests__/add_edit_category_sheet.state.test.ts __tests__/reassign_category_sheet.state.test.ts __tests__/screens/settings_categories.hook.test.ts __tests__/screens/settings/categories/categories_hook.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 7: Migrate Budget And Dashboard Local State And Consumers

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `src/modules/budget/screens/budget/category_detail/category_detail.hook.ts`
- Modify: `src/modules/budget/screens/budget/components/set_budget_sheet.state.ts`
- Modify: `src/modules/budget/screens/budget/components/set_budget_sheet.tsx`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.state.ts`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.tsx`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.state.ts`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `src/modules/dashboard/screens/dashboard/index.tsx`
- Modify: `__tests__/budget.state.test.ts`
- Modify: `__tests__/budget.state.5030.test.ts`
- Modify: `__tests__/income_sheet.state.test.ts`
- Modify: `__tests__/screens/budget/budget_month_rollover.hook.test.ts`
- Modify: `__tests__/screens/dashboard/dashboard_state.test.ts`
- Modify: `__tests__/screens/dashboard/dashboard_hook.test.ts`

- [ ] **Step 1: Write failing Signals tests**

Convert state tests to `renderHook(...)`:

```ts
const { result } = renderHook(() => useBudgetState());
act(() => result.current.openEdit('cat_food'));
expect(result.current.state.sheetVisible.value).toBe(true);
expect(result.current.state.targetCategoryId.value).toBe('cat_food');
```

Run focused state tests. Expected: fail against current Zustand state.

- [ ] **Step 2: Convert budget/dashboard local state to Signals**

Preserve:

- budget `openAdd`, `openEdit`, `close`, `setLensTab`, `reset`
- `lensTab` reset to `'categories'`
- income sheet `open(suggestion, currentIncome)` preference order: current income, then suggestion, then empty string
- dashboard `isBreakdownVisible`, `refreshing`, `selectedSegment`, and reset to overview

- [ ] **Step 3: Update budget/dashboard hooks and screens**

Remove `useShallow`. Read MobX stores directly from `useBudgetStore()`, `useCategoryStore()`, `useDashboardStore()`, `useAccountStore()`, `useCurrencyStore()`, and `useCommitmentStore()`. Let the auto-observer transform cover normal render readers.

- [ ] **Step 4: Verify focused budget/dashboard tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/budget.state.test.ts __tests__/budget.state.5030.test.ts __tests__/income_sheet.state.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/dashboard/dashboard_state.test.ts __tests__/screens/dashboard/dashboard_hook.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 8: Migrate Transaction List, Filter, Detail, And Form Local State

**Files:**
- Modify: `src/modules/transactions/screens/transactions/transactions.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transactions.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.store.ts`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.state.ts`
- Modify: `src/modules/transactions/screens/transactions/filter/filter.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.store.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.state.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/detail.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/detail/index.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.store.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.state.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.state.ts`
- Modify: transaction tests listed in the command below

- [ ] **Step 1: Write failing Signals tests for transaction local state**

Convert tests to hook-owned Signals. Preserve tests for:

- transaction list search/filter/period/applied filter draft behavior
- refresh state
- filter draft toggles and amount fields
- add transaction `pendingOpen`, `visible`, open-time `transaction_time`, saving/picker/rate override flags
- edit transaction selected transaction and amount/numpad behavior
- detail transaction data, confirm visibility, deleting, reload bump

Run:

```bash
npm test -- --runTestsByPath __tests__/add_transaction.store.test.ts __tests__/edit_transaction.store.test.ts __tests__/screens/transactions/transactions_store.test.ts __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/filter/filter_store.test.ts __tests__/screens/transactions/filter/filter_state.test.ts __tests__/screens/transactions/detail/detail_store.test.ts __tests__/screens/transactions/detail/detail_state.test.ts __tests__/screens/transactions/transaction_form/add_transaction_state.test.ts __tests__/screens/transactions/transaction_form/edit_transaction_state.test.ts __tests__/screens/transactions/transaction_form/transaction_form_body_state.test.ts --runInBand
```

Expected: fail against current Zustand local state.

- [ ] **Step 2: Convert transaction local state/store files to Signals hooks**

Use hook-owned Signals and preserve every public action name used by hooks/components. Do not globalize local state that was previously per-hook, and do not collapse `pendingOpen` into `visible`.

- [ ] **Step 3: Update transaction hooks/screens for MobX shared stores**

Remove `useShallow`. Use MobX stores directly and rely on the auto-observer transform for normal render readers. Update all `.getState()` and `.useState.*()` calls to the new direct store or hook-local Signals APIs.

- [ ] **Step 4: Verify focused transaction tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/transaction.store.test.ts __tests__/add_transaction.store.test.ts __tests__/edit_transaction.store.test.ts __tests__/screens/transactions/transactions_store.test.ts __tests__/screens/transactions/transactions_state.test.ts __tests__/screens/transactions/filter/filter_store.test.ts __tests__/screens/transactions/filter/filter_state.test.ts __tests__/screens/transactions/detail/detail_store.test.ts __tests__/screens/transactions/detail/detail_state.test.ts __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/add_transaction_state.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction_state.test.ts __tests__/screens/transactions/transaction_form/transaction_form_body_state.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 9: Migrate Commitment Local State And Consumers

**Files:**
- Modify: `src/modules/commitments/screens/commitments/commitments.state.ts`
- Modify: `src/modules/commitments/screens/commitments/commitments.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/index.tsx`
- Modify: `src/modules/commitments/screens/commitments/add_commitment/add_commitment.state.ts`
- Modify: `src/modules/commitments/screens/commitments/add_commitment/add_commitment.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state.ts`
- Modify: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/components/commitment_form_body.state.ts`
- Modify: `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx`
- Modify: `src/modules/commitments/screens/commitments/components/decimal_amount_input.state.ts`
- Modify: `src/modules/commitments/screens/commitments/detail/detail.state.ts`
- Modify: `src/modules/commitments/screens/commitments/detail/detail.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/detail/index.tsx`
- Modify: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.state.ts`
- Modify: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts`
- Modify: commitment tests listed in the command below

- [ ] **Step 1: Write failing Signals tests**

Convert local state tests to hook-owned Signals. Preserve:

- list refresh/status filter behavior
- add/edit saving states
- form body local visibility/selection behavior
- decimal input per-hook isolation through `useRef`
- detail and pay sheet local state

Run focused state tests. Expected: fail against current Zustand local state.

- [ ] **Step 2: Convert commitment local state files to Signals hooks**

Use `useSignal(...)` inside hook boundaries. Keep `useDecimalInputState` isolated per hook instance and preserve decimal input formatting behavior.

- [ ] **Step 3: Update commitment hooks/screens for MobX shared stores**

Remove `useShallow`. Use direct MobX stores from `useCommitmentStore()`, `useCategoryStore()`, `useAccountStore()`, and `useCurrencyStore()`. Let the auto-observer transform cover normal render readers.

- [ ] **Step 4: Verify focused commitment tests**

Run:

```bash
npm test -- --runTestsByPath __tests__/commitment.store.test.ts __tests__/screens/commitments.hook.test.ts __tests__/screens/commitments.state.test.ts __tests__/screens/commitments_add.hook.test.ts __tests__/screens/commitments_add_edit.state.test.ts __tests__/screens/commitments_edit.hook.test.ts __tests__/screens/commitments_detail.hook.test.ts __tests__/screens/commitments_detail.state.test.ts __tests__/screens/commitments_detail_screen_data.state.test.ts __tests__/screens/commitments_pay_sheet.hook.test.ts __tests__/screens/commitments_form_body_state.test.ts __tests__/decimal_amount_input.state.test.ts --runInBand
npm run typecheck
```

Expected: focused tests pass and typecheck exits `0`.

## Task 10: Remove Cross-Domain Zustand Consumers

**Files:**
- Modify any remaining files reported by the search command under `src/`
- Modify corresponding tests under `__tests__/`

- [ ] **Step 1: Search for remaining runtime Zustand imports/usages**

Run:

```bash
rg "from 'zustand'|from \"zustand\"|zustand/react/shallow|zustand_selectors|\\.getState\\(|\\.useState\\." src __tests__ -g '*.{ts,tsx}'
```

Expected: any matches are reviewed. Runtime Zustand imports and selector helpers must be removed. `.getState()` and `.useState.*()` matches may remain only for non-Zustand APIs if intentionally documented in the diff.

- [ ] **Step 2: Update remaining consumers**

For each leftover runtime consumer:

- replace shared store reads with direct MobX store fields/actions
- replace local state reads with returned Signals refs and `.value`
- ensure MobX render reads are inside an auto-observed or explicitly observed boundary
- remove no-longer-needed `jest.mock('zustand/react/shallow', ...)`

- [ ] **Step 3: Verify no runtime Zustand imports remain**

Run:

```bash
rg "from 'zustand'|from \"zustand\"|zustand/react/shallow|zustand_selectors" src __tests__ -g '*.{ts,tsx}'
```

Expected: no matches except files that will be deleted in Task 11.

## Task 11: Remove Zustand Dependency And Finalize

**Files:**
- Delete: `src/utils/zustand_selectors.ts`
- Delete: `__tests__/zustand_selectors.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: Remove Zustand selector helper and tests**

Delete `src/utils/zustand_selectors.ts` and `__tests__/zustand_selectors.test.ts` after the search command proves there are no imports.

- [ ] **Step 2: Remove Zustand dependency**

Run:

```bash
npm uninstall zustand
```

Expected: `package.json` no longer lists `zustand`; lockfile is updated.

- [ ] **Step 3: Run formatter**

Run:

```bash
npm run format
```

Expected: formatting completes without changing unrelated files.

- [ ] **Step 4: Run final local verification**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --ci
npx --yes expo-doctor
npx expo prebuild --no-install --platform android
test -d android
```

Expected: every command exits `0`.

- [ ] **Step 5: Final audit searches**

Run:

```bash
rg "from 'zustand'|from \"zustand\"|zustand/react/shallow|zustand_selectors" src __tests__ package.json package-lock.json
rg "@preact/signals-react" src/modules src/store -g '*.{store,state}.ts'
```

Expected: first command has no matches. Second command only reports local screen/component state files and already-approved Signals local state; no shared/domain store imports `@preact/signals-react`.

## Sarah Approval

Sarah approves this plan for implementation under autonomous team mode because:

- the MobX dependency and architecture pivot were already escalated and approved in the design doc;
- the plan is split into independently verifiable waves;
- workers have disjoint write ownership after the shared-store wave;
- final repository integration, push, merge, and device QA remain user-controlled gates.
