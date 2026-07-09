# Budget Phase 1 Monthly Core Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 monthly Budget workspace with month-aware category allocations, copy-from-previous-month selection, and a dashboard Budget summary card.

**Architecture:** Keep the existing `budgets` effective-dated table and make selected month a first-class UI/store input. Budget screen UI remains presentational; month, sheet visibility, and sheet-local selections live in Zustand state files; persistence stays in repository/store layers. Dashboard reads current-month budget totals from the same store data shape and renders a compact HeroUI-backed card matching the existing dashboard summary cards.

**Tech Stack:** Expo React Native, TypeScript strict, Zustand, expo-sqlite, HeroUI Native (`Button`, `Card`, `Skeleton`, `PressableFeedback`, `Checkbox`, `BottomSheet` via `Sheet` wrapper), existing Cairo Nights tokens.

---

## File Map

- Modify `src/modules/budget/repositories/budget.repository.ts`: month-aware write methods and copy selected limits.
- Modify `src/modules/budget/store/budget.store.ts`: month-aware load/write/copy actions.
- Modify `src/modules/budget/screens/budget/budget.state.ts`: selected month and copy sheet visibility.
- Modify `src/modules/budget/screens/budget/components/set_budget_sheet.state.ts`: move group selection out of component state.
- Modify `src/modules/budget/screens/budget/budget.helpers.ts`: copy checklist and dashboard summary helper VMs.
- Modify `src/modules/budget/screens/budget/budget.hook.ts`: derive selected-month state, tool actions, copy VM, and no local `useState`.
- Modify `src/modules/budget/screens/budget/index.tsx`: compact monthly layout, month rail, tool rail, skeletons, copy sheet.
- Modify `src/modules/budget/screens/budget/components/set_budget_sheet.tsx`: write selected month and use sheet state for group value.
- Create `src/modules/budget/screens/budget/components/budget_tool_rail.tsx`: Copy / Category / Plan icon rail.
- Create `src/modules/budget/screens/budget/components/budget_copy_sheet.tsx`: previous-month checklist sheet.
- Create `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`: summary/rail/rows loading footprint.
- Create `src/modules/dashboard/screens/dashboard/components/budget_card.tsx`: compact current-month dashboard card.
- Modify `src/modules/dashboard/screens/dashboard/dashboard.store.ts`: store current-month budget summary and loading flag.
- Modify `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`: load budget summary, refresh it, and navigate to Budget.
- Modify `src/modules/dashboard/screens/dashboard/index.tsx`: render Budget card between Transactions and Commitments.
- Modify `src/constants/strings.ts`: Budget tool/copy/dashboard labels.
- Modify tests under `__tests__/budget*.test.ts`, `__tests__/screens/budget/*.test.ts`, and `__tests__/screens/dashboard/*.test.tsx`.

## Task 1: Month-Aware Budget Persistence

**Files:**
- Modify: `src/modules/budget/repositories/budget.repository.ts`
- Modify: `src/modules/budget/store/budget.store.ts`
- Test: `__tests__/budget.store.5030.test.ts`
- Test: `__tests__/budget.store.test.ts`

- [ ] **Step 1: Write failing store tests for month-aware writes**

Add expectations that `setLimit`, `removeBudget`, and `copyLimitsToMonth` pass explicit months:

```ts
await store.getState().setLimit('cat-1', 5000, '2026-07');
expect(budgetRepository.setLimit).toHaveBeenCalledWith('cat-1', 5000, '2026-07');

await store.getState().removeBudget('cat-1', '2026-07');
expect(budgetRepository.removeBudget).toHaveBeenCalledWith('cat-1', '2026-07');

await store.getState().copyLimitsToMonth('2026-06', '2026-07', ['cat-1']);
expect(budgetRepository.copyLimitsToMonth).toHaveBeenCalledWith('2026-06', '2026-07', ['cat-1']);
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- __tests__/budget.store.5030.test.ts --runInBand`

Expected: FAIL because the store/repository methods do not accept the selected month or copy action yet.

- [ ] **Step 3: Implement month-aware repository and store**

Add optional `yearMonth = currentYearMonth()` parameters to repository write methods, add `copyLimitsToMonth(sourceMonth, targetMonth, categoryIds)`, and reload using the target/selected month.

Keep `lastMonths(anchorMonth, HISTORY_MONTHS)` as the spend window and make `load(anchorMonth = currentYearMonth())` accept an anchor month.

- [ ] **Step 4: Run green tests**

Run: `npm test -- __tests__/budget.store.5030.test.ts __tests__/budget.store.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/modules/budget/repositories/budget.repository.ts src/modules/budget/store/budget.store.ts __tests__/budget.store.5030.test.ts __tests__/budget.store.test.ts
git commit -m "feat: make budget limits month aware"
```

## Task 2: Budget Screen State And Pure Helpers

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/components/set_budget_sheet.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.helpers.ts`
- Test: `__tests__/budget.state.test.ts`
- Test: `__tests__/budget.helpers.test.ts`
- Test: `__tests__/screens/commitments_form_body_state.test.ts` only if shared state patterns need reference; do not modify unless required.

- [ ] **Step 1: Write failing state/helper tests**

Cover:

```ts
expect(useBudgetState.getState().selectedMonth).toBe(currentYearMonth());
useBudgetState.getState().setSelectedMonth('2026-06');
expect(useBudgetState.getState().selectedMonth).toBe('2026-06');
useBudgetState.getState().openCopy();
expect(useBudgetState.getState().copySheetVisible).toBe(true);
```

Add helper tests for copy checklist rows:

```ts
const vm = buildBudgetCopyRows({ rows, categories, sourceMonth: '2026-06', targetMonth: '2026-07' });
expect(vm).toEqual([
  expect.objectContaining({ categoryId: 'food', amount: 3000, status: 'will-replace' }),
  expect.objectContaining({ categoryId: 'car', amount: 1200, status: 'new' }),
]);
```

- [ ] **Step 2: Run red tests**

Run: `npm test -- __tests__/budget.state.test.ts __tests__/budget.helpers.test.ts --runInBand`

Expected: FAIL because selected month, copy state, sheet group state, and copy helpers are missing.

- [ ] **Step 3: Implement state and helpers**

Add:

- `selectedMonth`, `setSelectedMonth`, `resetSelectedMonthToCurrent`.
- `copySheetVisible`, `openCopy`, `closeCopy`.
- `groupValue`, `setGroupValue` in `set_budget_sheet.state.ts`.
- `buildBudgetCopyRows`, `previousYearMonth`, and dashboard summary helper shape in `budget.helpers.ts`.

- [ ] **Step 4: Run green tests**

Run: `npm test -- __tests__/budget.state.test.ts __tests__/budget.helpers.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/modules/budget/screens/budget/budget.state.ts src/modules/budget/screens/budget/components/set_budget_sheet.state.ts src/modules/budget/screens/budget/budget.helpers.ts __tests__/budget.state.test.ts __tests__/budget.helpers.test.ts
git commit -m "feat: add monthly budget screen state"
```

## Task 3: Budget Hook Month Selection And Actions

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/budget/screens/budget/components/set_budget_sheet.tsx`
- Test: `__tests__/screens/budget/budget_month_rollover.hook.test.ts`
- Create or modify: `__tests__/screens/budget/budget_month_actions.hook.test.ts`

- [ ] **Step 1: Write failing hook tests**

Cover:

```ts
act(() => result.current.setSelectedMonth('2026-06'));
expect(setSelectedMonthMock).toHaveBeenCalledWith('2026-06');
expect(loadBudgetMock).toHaveBeenCalledWith('2026-06');

await result.current.removeBudgetForMonth({ id: 'cat-food', name: 'Food' });
expect(removeBudgetMock).toHaveBeenCalledWith('cat-food', '2026-06');
```

Update rollover tests so the mocked state exposes selected month actions instead of relying on hook-local `useState`.

- [ ] **Step 2: Run red tests**

Run: `npm test -- __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts --runInBand`

Expected: FAIL because the hook still owns local month/suggestion state and writes current month.

- [ ] **Step 3: Implement hook changes**

Remove `useState` from `budget.hook.ts`. Read `selectedMonth`, `copySheetVisible`, and suggestion from Zustand state/store. Expose:

- `setSelectedMonth(month)`
- `openCopy`
- `closeCopy`
- `copySelectedBudgets(categoryIds)`
- `removeBudgetForMonth(payload)`

Make focus load call `load(currentMonth)` after resetting selected month.

In `set_budget_sheet.tsx`, call `setLimit(resolvedCategoryId, parsedLimit, selectedMonth)` and move `groupValue` to `useSetBudgetSheetState`.

- [ ] **Step 4: Run green tests**

Run: `npm test -- __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/modules/budget/screens/budget/budget.hook.ts src/modules/budget/screens/budget/components/set_budget_sheet.tsx __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts
git commit -m "feat: wire budget actions to selected month"
```

## Task 4: Budget Monthly UI, Tool Rail, Copy Sheet, Skeletons

**Files:**
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Create: `src/modules/budget/screens/budget/components/budget_tool_rail.tsx`
- Create: `src/modules/budget/screens/budget/components/budget_copy_sheet.tsx`
- Create: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Modify: `src/constants/strings.ts`
- Test: create `__tests__/screens/budget/budget_tool_rail.test.tsx`
- Test: create `__tests__/screens/budget/budget_copy_sheet.test.tsx`
- Test: create or modify `__tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 1: Write failing component tests**

Cover:

- Tool rail renders Copy, Category, and disabled Plan actions.
- Category action calls `openAdd`.
- Copy action calls `openCopy`.
- Copy sheet renders selected checklist rows and calls apply with selected ids.
- Loading state renders skeleton slots instead of spinner.

- [ ] **Step 2: Run red tests**

Run: `npm test -- __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx --runInBand`

Expected: FAIL because components are missing.

- [ ] **Step 3: Implement UI components**

Use HeroUI primitives where available:

- `MonthFilter` for month selector.
- `Button` / `PressableFeedback` for icon actions.
- `Sheet` wrapper for copy sheet.
- `Checkbox` for checklist rows.
- `Skeleton` for loading placeholders.

Do not use local `useState` in `index.tsx`. If copy sheet selection needs state, use a colocated `.state.ts` file or existing Budget state.

- [ ] **Step 4: Run green tests**

Run: `npm test -- __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/modules/budget/screens/budget/index.tsx src/modules/budget/screens/budget/components/budget_tool_rail.tsx src/modules/budget/screens/budget/components/budget_copy_sheet.tsx src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx src/constants/strings.ts __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx
git commit -m "feat: redesign monthly budget workspace"
```

## Task 5: Dashboard Budget Card

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.store.ts`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `src/modules/dashboard/screens/dashboard/index.tsx`
- Create: `src/modules/dashboard/screens/dashboard/components/budget_card.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/screens/dashboard/dashboard_hook.test.ts`
- Test: `__tests__/screens/dashboard/dashboard_screen.test.tsx`
- Create: `__tests__/screens/dashboard/budget_card.test.tsx`

- [ ] **Step 1: Write failing dashboard tests**

Cover:

```ts
expect(result.current.state.budget.loading).toBe(true);
expect(result.current.state.budget.summary).toEqual({
  budgeted: 5000,
  spent: 1500,
  left: 3500,
  pct: 0.3,
  categoryCount: 2,
});
```

Budget card component tests should verify loaded values, skeleton values, natural card frame, and press navigation.

- [ ] **Step 2: Run red tests**

Run: `npm test -- __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/dashboard/dashboard_screen.test.tsx __tests__/screens/dashboard/budget_card.test.tsx --runInBand`

Expected: FAIL because dashboard budget state/card are missing.

- [ ] **Step 3: Implement dashboard budget summary**

Add `currentBudgetSummary` and `budgetSummaryLoaded` to dashboard store. In dashboard hook, load Budget data for `currentYearMonth`, derive summary using the budget helpers, include it in `refresh`, and expose `goToBudget`.

Render `BudgetCard` in overview after `TransactionsCard` and before `CommitmentsCard`.

- [ ] **Step 4: Run green tests**

Run: `npm test -- __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/dashboard/dashboard_screen.test.tsx __tests__/screens/dashboard/budget_card.test.tsx --runInBand`

Expected: PASS.

- [ ] **Step 5: Commit**

Run:

```bash
git add src/modules/dashboard/screens/dashboard/dashboard.store.ts src/modules/dashboard/screens/dashboard/dashboard.hook.ts src/modules/dashboard/screens/dashboard/index.tsx src/modules/dashboard/screens/dashboard/components/budget_card.tsx src/constants/strings.ts __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/dashboard/dashboard_screen.test.tsx __tests__/screens/dashboard/budget_card.test.tsx
git commit -m "feat: add dashboard budget summary"
```

## Task 6: Integration Verification And Polish

**Files:**
- Review all modified Budget and Dashboard files.

- [ ] **Step 1: Run focused Budget and Dashboard tests**

Run:

```bash
npm test -- __tests__/budget.store.5030.test.ts __tests__/budget.store.test.ts __tests__/budget.state.test.ts __tests__/budget.helpers.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_screen.test.tsx __tests__/screens/dashboard/dashboard_hook.test.ts __tests__/screens/dashboard/dashboard_screen.test.tsx __tests__/screens/dashboard/budget_card.test.tsx --runInBand
```

Expected: PASS.

- [ ] **Step 2: Run standards checks**

Run:

```bash
npm run format:check
npm run lint
npm run typecheck
```

Expected: PASS.

- [ ] **Step 3: Run full tests**

Run: `npm test -- --ci`

Expected: PASS.

- [ ] **Step 4: Commit polish if needed**

If format/lint/typecheck required changes, commit them:

```bash
git add <changed-files>
git commit -m "chore: polish budget phase 1"
```

## Completion Gate

Before pushing or opening a PR, run full CI parity from the repo instructions:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android
```

Expected: PASS. Do not push until this is green.
