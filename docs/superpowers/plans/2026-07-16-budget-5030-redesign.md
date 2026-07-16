# Budget 50/30/20 Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the legacy 50/30/20 cards with the approved monthly summary and single-expand rule ledger while making planning income and category grouping historically month-specific.

**Architecture:** Add one append-only migration for monthly income and group snapshots, expose the profile through focused query/repository APIs, and preserve the budget store's latest-request guard. Build one pure `buildBudgetRuleLens` helper, then render its view model through small HeroUI Native components with expansion owned by `budget.state.ts`.

**Tech Stack:** Expo, React Native, TypeScript strict, expo-sqlite, Zustand v5, HeroUI Native, Uniwind, Jest.

---

## File Map

- Create `src/database/migrations/016_create_budget_month_profiles.ts`: additive DDL and legacy-data seed.
- Create `src/modules/budget/database/budget_month_profiles.ts`: exact-month income and group snapshot queries.
- Modify `src/modules/budget/entities/budget.entity.ts`: profile row types.
- Modify `src/modules/budget/repositories/budget.repository.ts`: load/save/copy month profile operations.
- Modify `src/modules/budget/store/budget.store.ts`: selected-month income/group state and persistence.
- Replace `src/modules/budget/screens/budget/budget_buckets.helpers.ts`: pure summary/bucket/contributor calculations.
- Modify `src/modules/budget/screens/budget/budget.state.ts`: controlled expanded rule group.
- Modify `src/modules/budget/screens/budget/budget.hook.ts`: compose the lens and month-aware income action.
- Create `src/modules/budget/screens/budget/components/fifty_thirty_twenty/`: focused lens UI components.
- Modify income-sheet files, budget screen integration, strings, and skeleton geometry.
- Remove legacy `bucket_card.tsx` after all imports move to the new components.

### Task 1: Persist month profiles

**Files:**
- Create: `src/database/migrations/016_create_budget_month_profiles.ts`
- Modify: `src/database/migrations/index.ts`
- Create: `src/modules/budget/database/budget_month_profiles.ts`
- Modify: `src/modules/budget/entities/budget.entity.ts`
- Test: `__tests__/database/migrations/016_create_budget_month_profiles.test.ts`
- Test: `__tests__/budget_month_profiles.query.test.ts`

- [ ] **Step 1: Write migration tests that fail before migration 016 exists**

Cover table columns, constraints, current-month legacy income seeding, best-effort budget-group seeding, and invalid group/income rejection.

```ts
expect(settingsColumns.map((column) => column.name)).toEqual(
  expect.arrayContaining(['year_month', 'expected_income', 'created_at', 'updated_at']),
);
expect(groupColumns.map((column) => column.name)).toEqual(
  expect.arrayContaining(['year_month', 'category_id', 'budget_group']),
);
```

- [ ] **Step 2: Run the migration test and verify RED**

Run: `npm test -- --runInBand __tests__/database/migrations/016_create_budget_month_profiles.test.ts`

Expected: FAIL because migration 016 and its tables do not exist.

- [ ] **Step 3: Add migration 016 and register it**

Use the approved schema exactly. Seed a positive numeric `expected_monthly_income` into the current migration month using SQLite `strftime('%Y-%m', 'now', 'localtime')`; ignore absent/invalid legacy values. Seed `(effective_from, category_id, budget_group)` from existing budgets joined to grouped categories using `INSERT OR IGNORE`.

```ts
export const migration016 = {
  version: 16,
  up: `
    CREATE TABLE IF NOT EXISTS budget_month_settings (...);
    CREATE TABLE IF NOT EXISTS budget_month_category_groups (...);
    INSERT OR IGNORE INTO budget_month_settings (...)
      SELECT strftime('%Y-%m', 'now', 'localtime'), CAST(value AS REAL), datetime('now'), datetime('now')
      FROM app_settings
      WHERE key = 'expected_monthly_income' AND CAST(value AS REAL) > 0;
    INSERT OR IGNORE INTO budget_month_category_groups (...)
      SELECT DISTINCT budget.effective_from, budget.category_id, category.budget_group,
             datetime('now'), datetime('now')
      FROM budgets budget JOIN categories category ON category.id = budget.category_id
      WHERE category.budget_group IS NOT NULL;
  `,
};
```

- [ ] **Step 4: Write query tests and verify RED**

Test `getBudgetMonthIncome`, `setBudgetMonthIncome`, `getBudgetMonthCategoryGroups`, `snapshotBudgetMonthCategoryGroups`, `setBudgetMonthCategoryGroup`, and `copyBudgetMonthCategoryGroups`. Verify that snapshot insertion does not overwrite existing historical rows and explicit set does update the selected month.

Run: `npm test -- --runInBand __tests__/budget_month_profiles.query.test.ts`

Expected: FAIL because the query module does not exist.

- [ ] **Step 5: Implement focused query functions and entity types**

Use `BudgetGroup` for mapped group values and `null` only for database-null columns. All setters validate finite positive income and use `ON CONFLICT` upserts.

```ts
export interface BudgetMonthSetting {
  year_month: string;
  expected_income: number;
  created_at: string;
  updated_at: string;
}

export type BudgetMonthGroupMap = Partial<Record<string, BudgetGroup>>;
```

- [ ] **Step 6: Run focused tests and commit**

Run: `npm test -- --runInBand __tests__/database/migrations/016_create_budget_month_profiles.test.ts __tests__/budget_month_profiles.query.test.ts`

Expected: PASS.

Commit: `feat(budget): persist monthly rule profiles`

### Task 2: Integrate profiles into repository and store

**Files:**
- Modify: `src/modules/budget/repositories/budget.repository.ts`
- Modify: `src/modules/budget/store/budget.store.ts`
- Modify: `__tests__/budget.repository.test.ts`
- Modify: `__tests__/budget.store.5030.test.ts`
- Modify: `__tests__/budget.store.test.ts`

- [ ] **Step 1: Add failing repository tests**

Verify that setting monthly income snapshots grouped expense categories, `setBudget` persists the selected-month group and future default atomically, and copying selected budgets copies their month-group snapshots.

```ts
await repository.setExpectedIncome('2026-07', 20_000);
expect(setBudgetMonthIncome).toHaveBeenCalledWith(expect.anything(), '2026-07', 20_000);
expect(snapshotBudgetMonthCategoryGroups).toHaveBeenCalledWith(expect.anything(), '2026-07');
```

- [ ] **Step 2: Run repository tests and verify RED**

Run: `npm test -- --runInBand __tests__/budget.repository.test.ts`

Expected: FAIL because profile repository methods are missing.

- [ ] **Step 3: Extend `IBudgetRepository` and implementation**

Add:

```ts
getExpectedIncome(yearMonth: string): Promise<number | null>;
getCategoryGroups(yearMonth: string): Promise<BudgetMonthGroupMap>;
setExpectedIncome(yearMonth: string, amount: number): Promise<void>;
```

Move category default + month snapshot writes into the existing exclusive `setBudget` transaction. Copy only selected category snapshots to the target month.

- [ ] **Step 4: Add failing store tests**

Replace app-settings fakes with a budget-repository fake. Verify exact-month load/save, group-map storage, stale-load suppression, reset behavior, and reloading the selected month after save.

```ts
await store.getState().load('2026-06');
expect(repo.getExpectedIncome).toHaveBeenCalledWith('2026-06');
await store.getState().setExpectedIncome('2026-07', 25_000);
expect(repo.setExpectedIncome).toHaveBeenCalledWith('2026-07', 25_000);
```

- [ ] **Step 5: Run store tests and verify RED**

Run: `npm test -- --runInBand __tests__/budget.store.5030.test.ts __tests__/budget.store.test.ts`

Expected: FAIL against the global app-setting implementation.

- [ ] **Step 6: Update the store while preserving the request guard**

Add `budgetGroupByCategoryId` to state and `setData`. `load(anchorMonth)` fetches income/groups for `anchorMonth` in the same `Promise.all`. `setExpectedIncome(yearMonth, amount)` persists and reloads that month. Remove the app-settings repository dependency and legacy local key.

- [ ] **Step 7: Run focused tests and commit**

Run: `npm test -- --runInBand __tests__/budget.repository.test.ts __tests__/budget.store.5030.test.ts __tests__/budget.store.test.ts`

Expected: PASS.

Commit: `feat(budget): load month-specific rule profiles`

### Task 3: Build the financial view model

**Files:**
- Replace: `src/modules/budget/screens/budget/budget_buckets.helpers.ts`
- Replace: `__tests__/budget_buckets.helpers.test.ts`

- [ ] **Step 1: Write the full failing calculation matrix**

Cover:

- 50/30/20 targets;
- grouped and ungrouped planned totals;
- Needs/Wants actual spend including categories without a budget;
- Savings `actual: undefined`;
- no-income rows with unavailable targets;
- no-plan statuses;
- over-cap and target-met statuses;
- true and clamped percentages;
- contributor ordering and unbudgeted labels;
- ungrouped planned and recorded reconciliation.

```ts
expect(needs.contributors.find((item) => item.categoryId === 'health')).toMatchObject({
  planned: 0,
  spent: 250,
  isUnbudgeted: true,
});
expect(savings.actual).toBeUndefined();
expect(result.notGrouped).toEqual({ planned: 1_000, spent: 300 });
```

- [ ] **Step 2: Run the helper test and verify RED**

Run: `npm test -- --runInBand __tests__/budget_buckets.helpers.test.ts`

Expected: FAIL because the old VM skips unbudgeted spend and exposes Savings spend.

- [ ] **Step 3: Implement `buildBudgetRuleLens`**

Inputs are one object containing income, categories, month budgets, month group map, spend map, selected month, and lifecycle date. Return:

```ts
interface BudgetRuleLensVM {
  summary: BudgetRuleSummaryVM;
  buckets: RuleBucketVM[];
  notGrouped: { planned: number; spent: number } | undefined;
}
```

Use `resolveLimitForMonth` only for category aggregation and sum all matching named budgets exactly once. Clamp visual ratios but retain true percentage labels. Do not mutate inputs.

- [ ] **Step 4: Run the helper tests and commit**

Run: `npm test -- --runInBand __tests__/budget_buckets.helpers.test.ts`

Expected: PASS.

Commit: `feat(budget): compute honest 50/30/20 lens data`

### Task 4: Add controlled rule state and month-aware income sheet

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.state.ts`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.hook.ts`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.tsx`
- Modify: `__tests__/budget.state.5030.test.ts`
- Modify: `__tests__/income_sheet.state.test.ts`
- Modify: `__tests__/screens/budget/income_sheet.hook.test.ts`

- [ ] **Step 1: Write failing state and hook tests**

Verify one expanded `BudgetGroup | undefined`, collapse-on-repeat, reset on month change, sheet stores `yearMonth` and month label, save calls `setExpectedIncome(yearMonth, amount)`, duplicate save is ignored, and failure preserves the value and open state.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --runInBand __tests__/budget.state.5030.test.ts __tests__/income_sheet.state.test.ts __tests__/screens/budget/income_sheet.hook.test.ts`

Expected: FAIL because group expansion and month identity are absent.

- [ ] **Step 3: Implement top-level Zustand fields and flat actions**

Use `expandedBudgetGroup`, `setExpandedBudgetGroup`, and sheet `yearMonth`/`monthLabel`. Keep actions outside render through `.getState()` and keep `index.tsx` state-free.

- [ ] **Step 4: Update the HeroUI sheet copy and save action**

Use selected-month title/description/label from `Strings`; keep existing `Sheet`, `Input`, and loading Button. Do not introduce component-local state.

- [ ] **Step 5: Run focused tests and commit**

Run the three focused suites above. Expected: PASS.

Commit: `feat(budget): control rule expansion and monthly income editing`

### Task 5: Compose the new lens in the screen hook

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `__tests__/screens/budget/budget_month_rollover.hook.test.ts`
- Modify: `__tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 1: Add failing hook tests**

Verify month change reads a different income/group map, stale requests cannot replace the selected month, refresh preserves expanded group, opening income passes the selected month, and managing a bucket switches to Categories and focuses the category group.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 3: Replace `computeBuckets` composition with `buildBudgetRuleLens`**

Return `ruleLens`, `expandedBudgetGroup`, `setExpandedBudgetGroup`, `openMonthlyIncome`, and `manageRuleGroup` through the existing `{ state, ...actions }` hook contract. Render `IncomeSheet` only at the Budget screen root.

- [ ] **Step 4: Run focused tests and commit**

Expected: PASS.

Commit: `feat(budget): compose monthly rule lens in budget hook`

### Task 6: Build the compact HeroUI rule ledger

**Files:**
- Create: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/index.tsx`
- Create: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/monthly_rule_summary.tsx`
- Create: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_ledger.tsx`
- Create: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_bucket_row.tsx`
- Create: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/rule_contributor_row.tsx`
- Create: `src/modules/budget/screens/budget/components/fifty_thirty_twenty/not_grouped_row.tsx`
- Delete: `src/modules/budget/screens/budget/components/bucket_card.tsx`
- Replace: `src/modules/budget/screens/budget/components/fifty_thirty_twenty_lens.tsx` with a compatibility re-export or update all imports and delete it.

- [ ] **Step 1: Add architecture assertions before production UI**

Extend the existing budget styling architecture test to require HeroUI `Accordion`/`Card`, shared summary parts, `className` styling, focused component files, and no `StyleSheet.create`, `useState`, or `useSharedValue` in the template files.

- [ ] **Step 2: Run architecture test and verify RED**

Run: `npm test -- --runInBand __tests__/screens/budget/budget_categories_styling_architecture.test.ts`

- [ ] **Step 3: Implement the summary and ledger components**

Use:

- HeroUI `Card` and shared `BudgetSummaryHeader`, `BudgetSummaryMetricsRow`, `BudgetSummarySpentRow`, `BudgetSummaryStatusRow`;
- controlled HeroUI `Accordion` with single selection;
- existing `BudgetRing` for planned/target progress;
- MaterialCommunityIcons for domain icons;
- Uniwind classes and theme tokens for static styling;
- runtime styles only for category colors and ring progress/color props.

Keep collapsed row dimensions stable. Expanded contributors are unframed rows; do not nest cards. Savings displays `Actual not tracked` everywhere.

- [ ] **Step 4: Run architecture, typecheck, and focused screen tests**

Run: `npm test -- --runInBand __tests__/screens/budget/budget_categories_styling_architecture.test.ts __tests__/screens/budget/budget_screen.test.tsx && npm run typecheck`

Expected: PASS.

- [ ] **Step 5: Commit**

Commit: `feat(budget): add expandable 50/30/20 rule ledger`

### Task 7: Integrate strings, skeletons, and screen states

**Files:**
- Modify: `src/constants/strings.ts`
- Modify: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `__tests__/screens/budget/budget_screen.test.tsx`
- Modify: `__tests__/screens/budget/budget_categories_styling_architecture.test.ts`

- [ ] **Step 1: Add failing state-coverage assertions**

Cover no income, no budgets, over planned, Not grouped, loading, refreshing, and load error. Assert tabs remain visible and only one root `IncomeSheet` import/render exists.

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- --runInBand __tests__/screens/budget/budget_screen.test.tsx __tests__/screens/budget/budget_categories_styling_architecture.test.ts`

- [ ] **Step 3: Add centralized copy and geometry-matched skeleton**

Add every visible label to `Strings`. Build one 50/30/20 skeleton with the final summary height and three fixed collapsed ledger rows. Refresh and initial load use identical geometry; selected tabs never disappear.

- [ ] **Step 4: Wire the lens into `index.tsx`**

Pass the VM and flat actions only. Do not read stores, create state, or calculate financial values in the template.

- [ ] **Step 5: Run focused tests and commit**

Expected: PASS.

Commit: `feat(budget): complete rule lens states and skeletons`

### Task 8: Regression and CI parity

**Files:**
- Modify only files required by failures caused by this feature.

- [ ] **Step 1: Run budget regression tests**

Run:

```bash
npm test -- --runInBand \
  __tests__/budget_buckets.helpers.test.ts \
  __tests__/budget.store.5030.test.ts \
  __tests__/budget.repository.test.ts \
  __tests__/budget.state.5030.test.ts \
  __tests__/screens/budget/budget_screen.test.tsx \
  __tests__/screens/budget/budget_month_rollover.hook.test.ts \
  __tests__/screens/budget/income_sheet.hook.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full local CI parity**

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android
```

Expected: all commands exit zero.

- [ ] **Step 3: Inspect the final diff**

Run: `git diff --check && git status --short && git diff --stat`

Confirm no generated `android/` files are tracked, no prototype artifact is tracked, no custom UI duplicates a HeroUI primitive, and Categories/Plans behavior is unchanged.

- [ ] **Step 4: Commit verification fixes if required**

Commit: `fix(budget): resolve 50/30/20 verification findings`

## Device QA Gate

After automated review and before merge, the user must verify on a development build:

1. Switch among Categories, Plans, and 50/30/20 without layout shift.
2. Set different income for two months and confirm each is retained.
3. Expand each bucket and confirm only one stays open.
4. Confirm unbudgeted Needs/Wants spending appears in contributors.
5. Confirm Savings says `Not tracked` and never counts transfers.
6. Pull to refresh while a bucket is open and confirm stable geometry.
7. Test no-income, no-budget, and over-plan months.
8. Confirm dynamic type and RTL do not overlap right-aligned amounts or chevrons.
