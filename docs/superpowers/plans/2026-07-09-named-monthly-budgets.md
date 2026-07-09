# Named Monthly Budgets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow multiple named monthly budgets under the same expense category while keeping transaction spending tracked at category level.

**Architecture:** Rebuild the `budgets` table to add a required `name` and change uniqueness from category/month to category/month/name. Keep the budget store as the source of budget rows, compute grouped category view models in `budget.helpers.ts` / `budget.hook.ts`, and update sheets/copy UI to target budget ids.

**Tech Stack:** Expo SQLite migrations, TypeScript strict, Zustand stores, RHF/Zod, HeroUI Native components, Jest + better-sqlite3 tests.

---

### Task 1: Budget Schema Migration

**Files:**
- Create: `src/database/migrations/013_named_monthly_budgets.ts`
- Modify: `src/database/migrations/index.ts`
- Modify: `src/modules/budget/entities/budget.entity.ts`
- Test: `__tests__/budget.migration.test.ts`
- Test: `__tests__/budgets.query.test.ts`

- [ ] **Step 1: Write failing migration tests**

Add expectations that `budgets` includes `name`, allows two names for one category/month, rejects duplicate category/month/name, and migrates existing rows with the category name.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- __tests__/budget.migration.test.ts __tests__/budgets.query.test.ts --runInBand
```

Expected: tests fail because `name` does not exist and duplicate category/month rows are rejected.

- [ ] **Step 3: Implement migration 013**

Create `budgets_new`, copy old rows with `COALESCE(categories.name, 'Budget')`, drop old table, rename, create indexes, and enforce `UNIQUE(category_id, effective_from, name)`.

- [ ] **Step 4: Update entity/query tests**

Add `name` to test rows and expectations.

- [ ] **Step 5: Run tests to verify green**

Run:

```bash
npm test -- __tests__/budget.migration.test.ts __tests__/budgets.query.test.ts --runInBand
```

Expected: both suites pass.

### Task 2: Repository And Store Budget Identity

**Files:**
- Modify: `src/modules/budget/database/budgets.ts`
- Modify: `src/modules/budget/repositories/budget.repository.ts`
- Modify: `src/modules/budget/store/budget.store.ts`
- Test: `__tests__/budget.repository.test.ts`
- Test: `__tests__/budget.store.test.ts`
- Test: `__tests__/screens/budget/budget_month_actions.hook.test.ts`

- [ ] **Step 1: Write failing repository/store tests**

Cover creating a named budget, updating by budget id, deleting by budget id, copying selected budget ids, and replacing a target row with the same category/name/month.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- __tests__/budget.repository.test.ts __tests__/budget.store.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts --runInBand
```

Expected: tests fail because methods still accept category ids and copy category ids.

- [ ] **Step 3: Implement repository/store API**

Use:

```ts
setBudget(input: { id?: string; categoryId: string; name: string; limit: number; yearMonth?: string }): Promise<void>
removeBudget(id: string): Promise<void>
copyBudgetsToMonth(sourceMonth: string, targetMonth: string, budgetIds: string[]): Promise<void>
```

Keep `getSpendByMonth()` category-keyed.

- [ ] **Step 4: Run tests to verify green**

Run the same command and confirm all listed suites pass.

### Task 3: Budget Helpers And View Models

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.helpers.ts`
- Modify: `src/modules/budget/screens/budget/budget_buckets.helpers.ts`
- Test: `__tests__/budget.helpers.test.ts`
- Test: `__tests__/budget_buckets.helpers.test.ts`

- [ ] **Step 1: Write failing helper tests**

Cover grouping multiple budgets under one category, summing category budgeted amount, spending category total once, summary category count, copy rows by budget id, and 50/30/20 totals using budget sums per category.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- __tests__/budget.helpers.test.ts __tests__/budget_buckets.helpers.test.ts --runInBand
```

Expected: tests fail because helpers resolve one limit per category/month.

- [ ] **Step 3: Implement grouped helpers**

Add types for named budgets and grouped category rows. Replace single-limit resolution with `getBudgetsForCategoryMonth()` and `sumBudgetsForCategoryMonth()`.

- [ ] **Step 4: Run tests to verify green**

Run the same command and confirm both suites pass.

### Task 4: Budget Hook And Screen UI

**Files:**
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `src/modules/budget/screens/budget/components/category_budget_row.tsx`
- Test: `__tests__/screens/budget/budget_screen.test.tsx`

- [ ] **Step 1: Write failing screen tests**

Cover grouped rendering: one Food & Dining category with multiple budget names, Add Budget tool label, edit/delete budget id payload, and add button enabled when the category already has a budget.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- __tests__/screens/budget/budget_screen.test.tsx --runInBand
```

Expected: tests fail because rows are keyed by category id and budgetable categories exclude already-budgeted categories.

- [ ] **Step 3: Implement grouped screen**

Render category groups. Category header uses summed total and category spend. Child budget rows show budget name and amount, and child actions call edit/delete with budget id.

- [ ] **Step 4: Run tests to verify green**

Run the same command and confirm the suite passes.

### Task 5: Add/Edit Budget Sheet

**Files:**
- Modify: `src/utils/schemas/budget.schema.ts`
- Modify: `src/modules/budget/screens/budget/components/set_budget_sheet.state.ts`
- Modify: `src/modules/budget/screens/budget/components/set_budget_sheet.tsx`
- Modify: `src/constants/strings.ts`
- Test: `__tests__/budget.schema.test.ts`
- Test: `__tests__/screens/budget/set_budget_sheet.test.tsx`
- Test: `__tests__/screens/budget/set_budget_sheet.state.test.ts`

- [ ] **Step 1: Write failing sheet/schema tests**

Cover required budget name, compact name input, add mode submitting category/name/amount/month, and edit mode pre-filling and saving name/amount for budget id.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- __tests__/budget.schema.test.ts __tests__/screens/budget/set_budget_sheet.test.tsx __tests__/screens/budget/set_budget_sheet.state.test.ts --runInBand
```

Expected: tests fail because the form only has `limitText`.

- [ ] **Step 3: Implement sheet changes**

Add `nameText` to the Zod schema and form, add compact `Budget name` input, keep the amount input compact, and call `setBudget()`.

- [ ] **Step 4: Run tests to verify green**

Run the same command and confirm the suites pass.

### Task 6: Copy Budgets Sheet

**Files:**
- Modify: `src/modules/budget/screens/budget/components/budget_copy_sheet.tsx`
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Test: `__tests__/screens/budget/budget_copy_sheet.test.tsx`
- Test: `__tests__/screens/budget/budget_month_actions.hook.test.ts`

- [ ] **Step 1: Write failing copy tests**

Cover copy rows identified by budget id, row label containing category and budget name, selected budget ids, clear/select all, and copy action passing budget ids.

- [ ] **Step 2: Run tests to verify red**

Run:

```bash
npm test -- __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_month_actions.hook.test.ts --runInBand
```

Expected: tests fail because copy state uses category ids.

- [ ] **Step 3: Implement copy state/hook/sheet changes**

Rename state fields conceptually to selected budget ids while preserving local store shape only where broad renames create churn. UI copy says `Copy budgets`.

- [ ] **Step 4: Run tests to verify green**

Run the same command and confirm both suites pass.

### Task 7: Verification

**Files:**
- Review all modified files.

- [ ] **Step 1: Run focused budget tests**

```bash
npm test -- __tests__/budget.migration.test.ts __tests__/budgets.query.test.ts __tests__/budget.repository.test.ts __tests__/budget.store.test.ts __tests__/budget.helpers.test.ts __tests__/budget_buckets.helpers.test.ts __tests__/screens/budget/budget_screen.test.tsx __tests__/screens/budget/set_budget_sheet.test.tsx __tests__/screens/budget/budget_copy_sheet.test.tsx __tests__/screens/budget/budget_month_actions.hook.test.ts --runInBand
```

- [ ] **Step 2: Run formatting and typecheck**

```bash
npm run format:check
npm run typecheck
```

- [ ] **Step 3: Run full test suite**

```bash
npm test -- --ci
```

- [ ] **Step 4: Report status**

Summarize what changed, list verification commands and results, and note that changes are not pushed unless the user explicitly asks.
