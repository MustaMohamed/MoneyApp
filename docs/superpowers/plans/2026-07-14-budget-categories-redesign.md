# Budget Categories Redesign Implementation Plan

> **For implementation:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` in the main thread and implement this plan task-by-task without subagents. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Budget Categories tab with the approved compact expandable ledger and add truthful named-budget spending through nullable transaction assignment.

**Architecture:** Add an append-only transaction migration, keep SQL in module database files, validate assignments in the transaction repository, and load category-level plus named-budget spend through the budget store. Pure helpers build complete display view models; Zustand state owns expansion and sheet visibility; screen and component files remain presentational HeroUI Native/Uniwind compositions.

**Tech Stack:** Expo, TypeScript strict, expo-sqlite, Zustand v5, RHF/Zod, HeroUI Native v1.0.3, Uniwind/Tailwind v4, MaterialCommunityIcons, Jest, better-sqlite3.

---

## Working Rules

- Work only on `feat/budget-categories-redesign`; never commit to `main`.
- Follow TDD for every behavior: failing focused test, minimal implementation, passing focused test, commit.
- Use HeroUI Native primitives (`Card`, `Accordion`, `Chip`, `Menu`, `SkeletonGroup`, `PressableFeedback`, project `Sheet`/`Button`) instead of parallel components.
- Use `className` and theme slots for feature styling. Do not add `StyleSheet` declarations to touched Budget Categories or transaction-form presentation files.
- Keep `index.tsx` files presentational. No `useState`, `useSharedValue`, calculations, persistence, or selection logic in templates.
- Keep runtime colors and SVG progress geometry in `style`; keep spacing, typography, radii, and semantic colors in Uniwind classes.
- Put user-visible copy in `src/constants/strings.ts`.
- Do not modify migrations 001-014. Migration 015 is additive, nullable, and has no data backfill.
- Run the complete local CI parity chain before any push.

## File Map

### Create

- `src/database/migrations/015_add_budget_id_to_transactions.ts` — nullable named-budget assignment and index.
- `src/modules/budget/screens/budget/budget_categories.types.ts` — raw and display view-model contracts shared by hook and components.
- `src/modules/budget/screens/budget/components/named_budget_row.tsx` — expanded child row and HeroUI overflow menu.
- `src/modules/budget/screens/budget/components/unassigned_spending_row.tsx` — neutral reconciliation row.
- `src/modules/transactions/screens/transactions/transaction_form/budget_assignment.helpers.ts` — pure matching/default/required-selection rules.
- `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx` — HeroUI-backed budget selection sheet.
- `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.tsx` — add-sheet presentation extracted from the template index.
- `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state.ts` — add-sheet mount-delay/footer UI state.
- `src/modules/budget/screens/budget/components/income_sheet.hook.ts` — income-sheet validation and save orchestration.
- `src/modules/budget/screens/budget/category_detail/category_detail.state.ts` — selected detail month without hook-local state.
- `__tests__/database/migrations/015_add_budget_id.test.ts` — migration preservation and FK behavior.
- `__tests__/screens/budget/budget_categories_styling_architecture.test.ts` — HeroUI/Uniwind/template architecture guardrails.
- `__tests__/screens/budget/summary_card.test.tsx` — Categories summary rendering contract.
- `__tests__/screens/budget/category_budget_row.test.tsx` — controlled ledger and child-action contract.
- `__tests__/screens/transactions/transaction_form/budget_assignment.helpers.test.ts` — form assignment rules.

### Modify

- `src/database/migrations/index.ts` — register migration 015.
- `src/modules/transactions/entities/transaction.entity.ts` — add `budget_id`.
- `src/modules/transactions/database/transactions.ts` — persist assignment on insert/update.
- `src/modules/transactions/repositories/transaction.repository.ts` — validate matching budget/category/month.
- `src/modules/budget/database/budgets.ts` — exact budget lookup and category/month query.
- `src/modules/budget/database/budget_stats.ts` — assigned spend aggregation with mismatch protection.
- `src/modules/budget/repositories/budget.repository.ts` — expose matching budgets and assigned spend.
- `src/modules/budget/store/budget.store.ts` — store `spendByBudgetId` and load it with the monthly window.
- `src/modules/budget/screens/budget/budget.helpers.ts` — summary, status, parent, child, lifecycle, and reconciliation view models.
- `src/modules/budget/screens/budget/budget.state.ts` — controlled expanded category and reset behavior.
- `src/modules/budget/screens/budget/budget.hook.ts` — derive all display view models and actions.
- `src/modules/budget/screens/budget/components/summary_card.tsx` — compact data-rich HeroUI summary.
- `src/modules/budget/screens/budget/components/category_budget_row.tsx` — HeroUI Accordion parent composition.
- `src/modules/budget/screens/budget/components/budget_tool_rail.tsx` — two compact Categories actions using HeroUI/Uniwind.
- `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx` — geometry-matched Categories skeleton.
- `src/modules/budget/screens/budget/components/budget_delete_confirm_sheet.tsx` — assignment-preserving delete explanation.
- `src/modules/budget/screens/budget/components/income_sheet.tsx` — presentational HeroUI/Uniwind income sheet.
- `src/modules/budget/screens/budget/index.tsx` — presentational lens composition and empty/error states.
- `src/modules/budget/screens/budget/category_detail/category_detail.hook.ts` — honor selected month route param.
- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.store.ts` — available budgets and selected ID.
- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.state.ts` — picker/loading UI state.
- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts` — load/default/validate assignment.
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.store.ts` — available budgets and selected ID.
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.state.ts` — picker/loading UI state.
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.helpers.ts` — defaults include assignment.
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts` — preserve valid historical null and re-evaluate changed eligibility.
- `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx` — compact Budget row.
- `src/modules/transactions/screens/transactions/transaction_form/index.tsx` — presentational sheet composition and picker mounting.
- `src/modules/commitments/repositories/commitment.repository.ts` — initialize `budget_id: null` on generated commitment transactions.
- `src/constants/strings.ts` — all new labels, status, error, confirmation, and accessibility copy.
- Existing budget, transaction repository, hook, state, store, screen, and query tests listed in each task.

## Task 1: Add Nullable Transaction Budget Assignment

**Files:**
- Create: `src/database/migrations/015_add_budget_id_to_transactions.ts`
- Create: `__tests__/database/migrations/015_add_budget_id.test.ts`
- Modify: `src/database/migrations/index.ts`
- Modify: `src/modules/transactions/entities/transaction.entity.ts`

- [ ] **Step 1: Write the failing migration tests**

Create the test with these cases:

```ts
import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';
import { migration015 } from '@/database/migrations/015_add_budget_id_to_transactions';

const NOW = '2026-07-14T00:00:00.000Z';

describe('migration015 — named budget transaction assignment', () => {
  it('adds nullable budget_id and an index without changing existing rows', () => {
    const db = new Database(':memory:');
    db.exec(MIGRATIONS.filter((migration) => migration.version <= 14).map((m) => m.up).join('\n'));
    db.prepare(
      `INSERT INTO accounts
       (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc','Cash','bank','EGP',0,0,0,0,0,?,?)`,
    ).run(NOW, NOW);
    db.prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,account_id,category_id,transaction_date,transaction_time,created_at,updated_at)
       VALUES ('tx','expense',100,'EGP',100,'acc','cat_food','2026-07-10','12:00:00',?,?)`,
    ).run(NOW, NOW);

    db.exec(migration015.up);

    const columns = db.prepare('PRAGMA table_info(transactions)').all() as { name: string }[];
    const indexes = db.prepare("PRAGMA index_list('transactions')").all() as { name: string }[];
    const row = db.prepare("SELECT budget_id FROM transactions WHERE id = 'tx'").get() as {
      budget_id: string | null;
    };
    expect(columns.map(({ name }) => name)).toContain('budget_id');
    expect(indexes.map(({ name }) => name)).toContain('idx_transactions_budget_id');
    expect(row.budget_id).toBeNull();
    db.close();
  });

  it('sets linked transaction budget_id to null when the budget is deleted', () => {
    const db = new Database(':memory:');
    db.pragma('foreign_keys = ON');
    db.exec(MIGRATIONS.map((migration) => migration.up).join('\n'));
    db.prepare(
      `INSERT INTO accounts
       (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc','Cash','bank','EGP',0,0,0,0,0,?,?)`,
    ).run(NOW, NOW);
    db.prepare(
      `INSERT INTO budgets
       (id,category_id,name,limit_amount,effective_from,created_at,updated_at)
       VALUES ('budget_food','cat_food','Meals',500,'2026-07',?,?)`,
    ).run(NOW, NOW);
    db.prepare(
      `INSERT INTO transactions
       (id,type,amount,currency,egp_amount,account_id,category_id,budget_id,transaction_date,transaction_time,created_at,updated_at)
       VALUES ('tx','expense',100,'EGP',100,'acc','cat_food','budget_food','2026-07-10','12:00:00',?,?)`,
    ).run(NOW, NOW);

    db.prepare("DELETE FROM budgets WHERE id = 'budget_food'").run();

    const row = db.prepare("SELECT budget_id FROM transactions WHERE id = 'tx'").get() as {
      budget_id: string | null;
    };
    expect(row.budget_id).toBeNull();
    db.close();
  });
});
```

- [ ] **Step 2: Run the migration test and confirm the red state**

Run:

```bash
npm test -- --runInBand __tests__/database/migrations/015_add_budget_id.test.ts
```

Expected: FAIL because migration 015 and `budget_id` do not exist.

- [ ] **Step 3: Add and register migration 015**

```ts
export const migration015 = {
  version: 15,
  up: `
    ALTER TABLE transactions
      ADD COLUMN budget_id TEXT REFERENCES budgets(id) ON DELETE SET NULL;

    CREATE INDEX IF NOT EXISTS idx_transactions_budget_id
      ON transactions(budget_id);
  `,
};
```

Import `migration015` in `src/database/migrations/index.ts` and append it after `migration014`. Add this field beside `category_id` in `Transaction`:

```ts
/** Nullable named monthly budget assignment; expense transactions only. */
budget_id: string | null;
```

- [ ] **Step 4: Run migration and type checks**

Run:

```bash
npm test -- --runInBand __tests__/database/migrations/015_add_budget_id.test.ts __tests__/transaction.migration.test.ts
npm run typecheck
```

Expected: both suites PASS. Add `budget_id: null` to typed transaction factories in `commitment.repository.ts`, `commitment_payments.query.test.ts`, `database_get_transactions_filter.test.ts`, `edit_transaction.store.test.ts`, `format_transaction_title.test.ts`, `group_transactions_by_date.test.ts`, `screens/transactions.screen.test.tsx`, `screens/transactions/transaction_form/edit_transaction.hook.test.ts`, `transaction.query_executor.test.ts`, `transaction.store.test.ts`, and `update_transaction.query_executor.test.ts`; TypeScript then reports no errors.

- [ ] **Step 5: Commit the migration**

```bash
git add src/database/migrations/015_add_budget_id_to_transactions.ts src/database/migrations/index.ts src/modules/transactions/entities/transaction.entity.ts src/modules/commitments/repositories/commitment.repository.ts __tests__/database/migrations/015_add_budget_id.test.ts __tests__/commitment_payments.query.test.ts __tests__/database_get_transactions_filter.test.ts __tests__/edit_transaction.store.test.ts __tests__/format_transaction_title.test.ts __tests__/group_transactions_by_date.test.ts __tests__/screens/transactions.screen.test.tsx __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/transaction.query_executor.test.ts __tests__/transaction.store.test.ts __tests__/update_transaction.query_executor.test.ts
git commit -m "feat: add named budget transaction assignment"
```

## Task 2: Load Assigned Spend Through the Budget Data Layer

**Files:**
- Modify: `src/modules/budget/database/budgets.ts`
- Modify: `src/modules/budget/database/budget_stats.ts`
- Modify: `src/modules/budget/repositories/budget.repository.ts`
- Modify: `src/modules/budget/store/budget.store.ts`
- Modify: `__tests__/budget_stats.query.test.ts`
- Modify: `__tests__/budgets.query.test.ts`
- Modify: `__tests__/budget.repository.test.ts`
- Modify: `__tests__/budget.store.test.ts`
- Modify: `__tests__/budget.store.5030.test.ts`
- Modify: `__tests__/budget.store.spending_plans.test.ts`

- [ ] **Step 1: Add failing database-query tests**

Add tests proving exact lookup, category/month matching, valid assigned-spend aggregation, and mismatch exclusion:

```ts
it('returns named budgets for one category and exact month only', async () => {
  expect(await getBudgetRowsForCategoryMonth(db, 'cat_food', '2026-07')).toEqual([
    expect.objectContaining({ id: 'food_monthly', effective_from: '2026-07' }),
    expect.objectContaining({ id: 'food_trip', effective_from: '2026-07' }),
  ]);
});

it('sums only valid expense assignments by budget id', async () => {
  tx({ id: 'valid', budget_id: 'food_monthly', egp_amount: 300 });
  tx({ id: 'income', budget_id: 'food_monthly', type: 'income', egp_amount: 900 });
  tx({ id: 'wrong_category', budget_id: 'food_monthly', category_id: 'cat_car', egp_amount: 500 });
  tx({ id: 'wrong_month', budget_id: 'food_monthly', transaction_date: '2026-08-01', egp_amount: 700 });

  await expect(getBudgetSpendById(db, ['2026-07'])).resolves.toEqual({
    food_monthly: 300,
    food_trip: 0,
  });
});
```

- [ ] **Step 2: Run focused query tests**

Run:

```bash
npm test -- --runInBand __tests__/budgets.query.test.ts __tests__/budget_stats.query.test.ts
```

Expected: FAIL because `getBudgetRowsForCategoryMonth`, `getBudgetRowById`, and `getBudgetSpendById` do not exist.

- [ ] **Step 3: Implement budget lookup and aggregation**

Add these database signatures:

```ts
export function getBudgetRowById(db: SQLiteDatabase, id: string): Promise<Budget | null>;
export function getBudgetRowsForCategoryMonth(
  db: SQLiteDatabase,
  categoryId: string,
  yearMonth: string,
): Promise<Budget[]>;
export function getBudgetSpendById(
  db: SQLiteDatabase,
  yearMonths: string[],
): Promise<Record<string, number>>;
```

Build `const placeholders = yearMonths.map(() => '?').join(',')` and use this guarded aggregation so stale category/month assignments are not attributed to a child:

```sql
SELECT budget.id AS budget_id,
       COALESCE(SUM(
         CASE WHEN transaction_row.type = 'expense'
                AND transaction_row.category_id = budget.category_id
                AND substr(transaction_row.transaction_date, 1, 7) = budget.effective_from
              THEN transaction_row.egp_amount ELSE 0 END
       ), 0) AS spent
  FROM budgets budget
  LEFT JOIN transactions transaction_row ON transaction_row.budget_id = budget.id
 WHERE budget.effective_from IN (${placeholders})
 GROUP BY budget.id
```

Pass `yearMonths` as the query parameters and return `{}` immediately when the input array is empty.

- [ ] **Step 4: Extend repository and store contracts**

Add:

```ts
interface IBudgetRepository {
  getBudgetsForCategoryMonth(categoryId: string, yearMonth: string): Promise<Budget[]>;
  getSpendByBudget(yearMonths: string[]): Promise<Record<string, number>>;
}
```

Extend `BudgetStoreShape` and `setData` with:

```ts
spendByBudgetId: Record<string, number>;
```

Use this argument order consistently:

```ts
setData(
  rows,
  spendByMonth,
  spendByBudgetId,
  expectedIncome,
  spendingPlans,
  spendingPlanSpendById,
  loadedMonth,
);
```

Load it in the existing `Promise.all` with the same trailing month window. Keep Plans data and existing `spendByMonth` behavior unchanged.

- [ ] **Step 5: Add repository/store expectations and run tests**

Add assertions that repository delegates to the new queries and store keeps assigned spend through load/reset:

```ts
expect(store.getState().spendByBudgetId).toEqual({ food_monthly: 300 });
store.getState().reset();
expect(store.getState().spendByBudgetId).toEqual({});
```

Run:

```bash
npm test -- --runInBand __tests__/budgets.query.test.ts __tests__/budget_stats.query.test.ts __tests__/budget.repository.test.ts __tests__/budget.store.test.ts
```

Then run the two compatibility suites after adding `spendByBudgetId` to their store fixtures:

```bash
npm test -- --runInBand __tests__/budget.store.5030.test.ts __tests__/budget.store.spending_plans.test.ts
```

Expected: all six suites PASS.

- [ ] **Step 6: Commit the budget data layer**

```bash
git add src/modules/budget/database/budgets.ts src/modules/budget/database/budget_stats.ts src/modules/budget/repositories/budget.repository.ts src/modules/budget/store/budget.store.ts __tests__/budget_stats.query.test.ts __tests__/budgets.query.test.ts __tests__/budget.repository.test.ts __tests__/budget.store.test.ts __tests__/budget.store.5030.test.ts __tests__/budget.store.spending_plans.test.ts
git commit -m "feat: aggregate spend by named budget"
```

## Task 3: Build Pure Category Ledger View Models and Controlled State

**Files:**
- Create: `src/modules/budget/screens/budget/budget_categories.types.ts`
- Modify: `src/modules/budget/screens/budget/budget.helpers.ts`
- Modify: `src/modules/budget/screens/budget/budget.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `__tests__/budget.helpers.test.ts`
- Modify: `__tests__/budget.state.test.ts`
- Modify: `__tests__/screens/budget/budget_month_actions.hook.test.ts`

- [ ] **Step 1: Write failing helper tests for reconciliation and summary**

Add complete behavior cases:

```ts
it('builds parent and child values and reconciles unassigned spending', () => {
  const result = buildCategoryBudgetRows({
    categories: [category('food', 'Food & Dining')],
    budgets: [
      row('food', 2000, '2026-07', 'Monthly meals', 'meals'),
      row('food', 500, '2026-07', 'Dining out', 'dining'),
    ],
    spendByMonth: { food: { '2026-07': 1900 } },
    spendByBudgetId: { meals: 1400, dining: 300 },
    yearMonth: '2026-07',
  });

  expect(result.rows[0]).toEqual(
    expect.objectContaining({
      planned: 2500,
      spent: 1900,
      left: 600,
      usedPct: 0.76,
      status: 'on-track',
      unassignedSpend: 200,
    }),
  );
  expect(result.rows[0].budgets).toEqual([
    expect.objectContaining({ planned: 2000, spent: 1400, left: 600, categorySharePct: 0.8 }),
    expect.objectContaining({ planned: 500, spent: 300, left: 200, categorySharePct: 0.2 }),
  ]);
});

it.each([
  [799, 1000, 'on-track'],
  [800, 1000, 'watch'],
  [1000, 1000, 'watch'],
  [1001, 1000, 'over'],
])('maps %s of %s to %s', (spent, planned, expected) => {
  expect(computeBudgetHealth(spent, planned)).toBe(expected);
});

it('separates unbudgeted spend and absent expected income', () => {
  const ledger = buildCategoryBudgetRows({
    categories: [category('food', 'Food & Dining'), category('car', 'Car')],
    budgets: [row('food', 2500, '2026-07', 'Monthly meals', 'meals')],
    spendByMonth: {
      food: { '2026-07': 1900 },
      car: { '2026-07': 450 },
    },
    spendByBudgetId: { meals: 1900 },
    yearMonth: '2026-07',
  });
  const result = buildBudgetCategoriesSummary({
    rows: ledger.rows,
    expectedIncome: null,
    unbudgetedSpend: ledger.unbudgetedSpend,
    selectedMonth: '2026-07',
    today: '2026-07-14',
  });
  expect(result).toEqual(
    expect.objectContaining({
      planned: 2500,
      spent: 1900,
      left: 600,
      usedPct: 0.76,
      unassignedIncome: undefined,
      unbudgetedSpend: 450,
      onTrackCount: 1,
      watchCount: 0,
      overCount: 0,
    }),
  );
});
```

- [ ] **Step 2: Run helper/state tests for the red state**

Run:

```bash
npm test -- --runInBand __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts
```

Expected: FAIL because the new types, builders, and expanded-category state are absent.

- [ ] **Step 3: Define stable raw/display view-model contracts**

Create these core contracts and include preformatted labels/colors/accessibility copy so components do no financial calculations:

```ts
export type BudgetHealth = 'on-track' | 'watch' | 'over';

export interface NamedBudgetVM {
  id: string;
  name: string;
  planned: number;
  spent: number;
  left: number;
  usedPct: number | undefined;
  categorySharePct: number | undefined;
  usedLabel: string;
  shareLabel: string;
  spentPlannedLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  ringColor: string;
  accessibilityLabel: string;
  menuAccessibilityLabel: string;
}

export interface CategoryBudgetRowVM {
  categoryId: string;
  name: string;
  icon: string;
  color: string;
  planned: number;
  spent: number;
  left: number;
  usedPct: number;
  status: BudgetHealth;
  statusLabel: string;
  statusChipColor: 'default' | 'danger';
  spentPlannedUsedLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  ringColor: string;
  unassignedSpend: number;
  unassignedSpendLabel: string;
  budgets: NamedBudgetVM[];
  accessibilityLabel: string;
}

export interface BudgetCategoriesSummaryVM {
  hasPlan: boolean;
  planned: number;
  spent: number;
  left: number;
  usedPct: number | undefined;
  unassignedIncome: number | undefined;
  unbudgetedSpend: number;
  eyebrowLabel: string;
  categoryCountLabel: string;
  balanceAmountLabel: string;
  balanceMetaLabel: string;
  balanceColor: string;
  barColor: string;
  spentPlannedLabel: string;
  usedLabel: string | undefined;
  plannedLabel: string;
  unassignedIncomeLabel: string;
  unbudgetedSpendLabel: string;
  lifecycleLabel: string;
  onTrackCount: number;
  watchCount: number;
  overCount: number;
  statusItems: Array<{
    key: BudgetHealth;
    label: string;
    icon: 'check-circle-outline' | 'alert-circle-outline' | 'alert-octagon-outline';
    color: string;
  }>;
}
```

- [ ] **Step 4: Implement pure builders and state actions**

Add pure functions:

```ts
computeBudgetHealth(spent: number, planned: number): BudgetHealth;
buildCategoryBudgetRows(input: CategoryLedgerInput): {
  rows: CategoryBudgetRowVM[];
  unbudgetedSpend: number;
};
buildBudgetCategoriesSummary(input: BudgetCategoriesSummaryInput): BudgetCategoriesSummaryVM;
```

Extend `budget.state.ts` with top-level state and actions:

```ts
expandedCategoryId: string | undefined;
setExpandedCategoryId: (categoryId: string | undefined) => void;
```

`setSelectedMonth` and `resetSelectedMonthToCurrent` set `expandedCategoryId: undefined`; refresh does not.

- [ ] **Step 5: Make the hook the single composition boundary**

Read `spendByBudgetId`, call the pure builders in `useMemo`, expose `categoriesSummary`, `rows`, `expandedCategoryId`, and `setExpandedCategoryId`, and update detail navigation:

```ts
router.push({
  pathname: '/(app)/(tabs)/budget/[id]',
  params: { id: categoryId, month: selectedMonth },
});
```

Keep Plans and 50/30/20 derivations unchanged.

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm test -- --runInBand __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts
```

Expected: PASS with existing Plans behavior unchanged.

- [ ] **Step 7: Commit the view-model layer**

```bash
git add src/modules/budget/screens/budget/budget_categories.types.ts src/modules/budget/screens/budget/budget.helpers.ts src/modules/budget/screens/budget/budget.state.ts src/modules/budget/screens/budget/budget.hook.ts __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/screens/budget/budget_month_actions.hook.test.ts __tests__/screens/budget/budget_month_rollover.hook.test.ts __tests__/screens/budget/budget_spending_plans_hook.test.ts
git commit -m "feat: derive budget category ledger view models"
```

## Task 4: Validate and Persist Assignments in Transaction Repositories

**Files:**
- Modify: `src/modules/transactions/database/transactions.ts`
- Modify: `src/modules/transactions/repositories/transaction.repository.ts`
- Modify: `src/modules/budget/database/budgets.ts`
- Modify: `__tests__/transaction.query_executor.test.ts`
- Modify: `__tests__/update_transaction.query_executor.test.ts`
- Modify: `__tests__/transaction.repository.test.ts`

- [ ] **Step 1: Add failing repository and executor tests**

Add cases for valid persistence, forced null on non-expense, mismatch rejection, and update:

```ts
it('persists a valid named budget assignment on expense add', async () => {
  const tx = await repo.add({ ...baseInput, budget_id: 'budget_food' });
  expect(tx.budget_id).toBe('budget_food');
  expect(
    (realDb.prepare('SELECT budget_id FROM transactions WHERE id = ?').get(tx.id) as {
      budget_id: string | null;
    }).budget_id,
  ).toBe('budget_food');
});

it('rejects a budget whose category or month does not match the expense', async () => {
  await expect(repo.add({ ...baseInput, budget_id: 'budget_other_category' })).rejects.toThrow(
    'budget assignment',
  );
  await expect(
    repo.add({ ...baseInput, transaction_date: '2026-08-01', budget_id: 'budget_food' }),
  ).rejects.toThrow('budget assignment');
});

it('clears budget_id for income, transfer, and credit-card payment rows', async () => {
  const tx = await repo.add({
    ...baseInput,
    type: TransactionType.Income,
    budget_id: 'budget_food',
  });
  expect(tx.budget_id).toBeNull();
});

it('updates budget_id with the transaction fields', async () => {
  await updateTransaction(mockDb, 'tx-1', {
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    category_id: 'cat_food',
    budget_id: 'budget_food',
    transaction_date: '2026-07-10',
    transaction_time: '12:00:00',
  });
  const updated = realDb.prepare("SELECT budget_id FROM transactions WHERE id = 'tx-1'").get() as {
    budget_id: string | null;
  };
  expect(updated.budget_id).toBe('budget_food');
});
```

- [ ] **Step 2: Run focused transaction tests**

Run:

```bash
npm test -- --runInBand __tests__/transaction.query_executor.test.ts __tests__/update_transaction.query_executor.test.ts __tests__/transaction.repository.test.ts
```

Expected: FAIL because inputs and SQL do not support `budget_id`.

- [ ] **Step 3: Add repository validation and nullable contracts**

Extend inputs:

```ts
export interface NewTransactionInput {
  budget_id?: string;
}

export interface UpdateTransactionInput {
  budget_id?: string | null;
}
```

Add a repository helper that validates every non-null assignment before database mutation:

```ts
export class TransactionBudgetAssignmentError extends Error {}

async function resolveBudgetId(
  db: SQLiteDatabase,
  input: {
    type: TransactionType;
    categoryId: string | null | undefined;
    transactionDate: string;
    budgetId: string | null | undefined;
  },
): Promise<string | null> {
  if (input.type !== TransactionType.Expense || !input.budgetId) return null;
  const budget = await getBudgetRowById(db, input.budgetId);
  const matches =
    budget !== null &&
    budget.category_id === input.categoryId &&
    budget.effective_from === input.transactionDate.slice(0, 7);
  if (!matches) throw new TransactionBudgetAssignmentError(Strings.addTxBudgetMismatchError);
  return budget.id;
}
```

For update, load the existing transaction first and validate against its immutable type plus new category/date.

- [ ] **Step 4: Persist `budget_id` in insert and update SQL**

Add `budget_id` beside `category_id` in both column and parameter lists. Repository-created transactions set the resolved ID; non-expense transactions set null.

- [ ] **Step 5: Run transaction regressions**

Run:

```bash
npm test -- --runInBand __tests__/transaction.query_executor.test.ts __tests__/update_transaction.query_executor.test.ts __tests__/transaction.repository.test.ts __tests__/transaction.store.test.ts
```

Expected: PASS, including existing account-balance behavior.

- [ ] **Step 6: Commit transaction persistence**

```bash
git add src/modules/transactions/database/transactions.ts src/modules/transactions/repositories/transaction.repository.ts src/modules/budget/database/budgets.ts src/constants/strings.ts __tests__/transaction.query_executor.test.ts __tests__/update_transaction.query_executor.test.ts __tests__/transaction.repository.test.ts
git commit -m "feat: validate named budget assignments"
```

## Task 5: Add Budget Selection to Add/Edit Transaction Forms

**Files:**
- Create: `src/modules/transactions/screens/transactions/transaction_form/budget_assignment.helpers.ts`
- Create: `src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.tsx`
- Create: `src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state.ts`
- Create: `__tests__/screens/transactions/transaction_form/budget_assignment.helpers.test.ts`
- Modify: add/edit transaction `.store.ts`, `.state.ts`, `.hook.ts`, `edit_transaction.helpers.ts`, `transaction_form_body.tsx`, and `index.tsx`
- Modify: `__tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts`
- Modify: `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`
- Modify: add/edit transaction store/state tests

- [ ] **Step 1: Write failing pure rule tests**

```ts
function budget(id: string): Budget {
  return {
    id,
    category_id: 'c1',
    name: id,
    limit_amount: 500,
    effective_from: '2026-07',
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
  };
}

describe('resolveBudgetAssignment', () => {
  it('hides and clears assignment when no budget matches', () => {
    expect(resolveBudgetAssignment({ budgets: [], currentBudgetId: undefined, preserveNull: false }))
      .toEqual({ budgetId: undefined, requiresSelection: false, isVisible: false });
  });

  it('auto-selects the only matching budget', () => {
    expect(resolveBudgetAssignment({ budgets: [budget('one')], currentBudgetId: undefined, preserveNull: false }))
      .toEqual({ budgetId: 'one', requiresSelection: false, isVisible: true });
  });

  it('requires a choice for a new expense with multiple budgets', () => {
    expect(resolveBudgetAssignment({ budgets: [budget('a'), budget('b')], currentBudgetId: undefined, preserveNull: false }))
      .toEqual({ budgetId: undefined, requiresSelection: true, isVisible: true });
  });

  it('preserves a historical null on an unchanged edit', () => {
    expect(resolveBudgetAssignment({ budgets: [budget('a'), budget('b')], currentBudgetId: undefined, preserveNull: true }))
      .toEqual({ budgetId: undefined, requiresSelection: false, isVisible: true });
  });
});
```

- [ ] **Step 2: Run helper tests and confirm failure**

Run:

```bash
npm test -- --runInBand __tests__/screens/transactions/transaction_form/budget_assignment.helpers.test.ts
```

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement pure assignment rules**

Export:

```ts
export interface BudgetAssignmentResolution {
  budgetId: string | undefined;
  requiresSelection: boolean;
  isVisible: boolean;
}

export function resolveBudgetAssignment(input: {
  budgets: Budget[];
  currentBudgetId: string | undefined;
  preserveNull: boolean;
}): BudgetAssignmentResolution;

export function isSameBudgetEligibility(
  transaction: Pick<Transaction, 'category_id' | 'transaction_date'>,
  categoryId: string,
  date: string,
): boolean;
```

Retain `currentBudgetId` only when it exists in `budgets`. Never choose the first of multiple budgets.

- [ ] **Step 4: Add form store/state fields**

Both add and edit stores own fetched options and selection:

```ts
availableBudgets: Budget[];
budgetId: string | undefined;
setAvailableBudgets: (budgets: Budget[]) => void;
setBudgetId: (budgetId: string | undefined) => void;
```

Both state files own UI state:

```ts
showBudgetPicker: boolean;
budgetsLoading: boolean;
setShowBudgetPicker: (value: boolean) => void;
setBudgetsLoading: (value: boolean) => void;
```

Reset all fields in the existing reset/close paths.
`add_transaction.store.ts#setType` also clears `availableBudgets` and `budgetId` immediately so a stale expense assignment cannot survive a type switch while the matching query is pending.

- [ ] **Step 5: Add failing hook tests**

Mock `budgetRepository.getBudgetsForCategoryMonth` and cover:

```ts
expect(getBudgetsForCategoryMonth).toHaveBeenCalledWith('c1', '2026-07');
expect(result.current.state.selectedBudget?.id).toBe('only-budget');
expect(addTx).toHaveBeenCalledWith(expect.objectContaining({ budget_id: 'only-budget' }));
expect(result.current.state.errors.budget).toBe(Strings.addTxErrBudgetRequired);
```

For edit, prove unchanged historical null stays valid and category/date changes re-run matching.

- [ ] **Step 6: Implement add/edit hook orchestration**

In effects keyed by `type`, `categoryId`, and `date.slice(0, 7)`:

1. Clear budget state for non-expense or missing category.
2. Set `budgetsLoading` while calling `budgetRepository.getBudgetsForCategoryMonth`.
3. Ignore stale async results with a request counter/ref owned by the hook.
4. Apply `resolveBudgetAssignment`.
5. Add `budgetId` to RHF values and schema.
6. Require selection only for new/changed eligibility with multiple matches.
7. Pass `budget_id` through save payloads.

For edit, `preserveNull` is true only when the initial transaction has null `budget_id` and category/month are unchanged.

- [ ] **Step 7: Build presentational HeroUI picker and compact form row**

`BudgetPickerSheet` composes project `Sheet`, HeroUI `ListGroup`, `ListGroup.Item`, and selected indicator. It receives only:

```ts
interface BudgetPickerSheetProps {
  isOpen: boolean;
  budgets: Budget[];
  selectedId: string | undefined;
  onSelect: (budget: Budget) => void;
  onOpenChange: (open: boolean) => void;
}
```

`TransactionFormBody` receives `showBudgetField`, `selectedBudget`, `budgetsLoading`, `onOpenBudgetPicker`, and `budgetError`. Render the Budget row only for eligible expenses and place it immediately after Category.

Refactor `transaction_form/index.tsx` so it contains no `useState`. Move `AddTransactionSheet` into `components/add_transaction_sheet.tsx` and its `readyToOpen`, `shouldRenderInner`, and footer-presence flags into `components/add_transaction_sheet.state.ts`. Preserve the existing zero-delay open, 350 ms close-unmount delay, and `Button isLoading={saving}` footer behavior.

- [ ] **Step 8: Run all transaction-form tests**

Run:

```bash
npm test -- --runInBand __tests__/screens/transactions/transaction_form __tests__/transaction.repository.test.ts __tests__/transaction.store.test.ts
```

Expected: PASS with loading save buttons, existing currency math, and picker state intact.

- [ ] **Step 9: Commit transaction form assignment**

```bash
git add src/modules/transactions/screens/transactions/transaction_form/budget_assignment.helpers.ts src/modules/transactions/screens/transactions/transaction_form/add_transaction.store.ts src/modules/transactions/screens/transactions/transaction_form/add_transaction.state.ts src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts src/modules/transactions/screens/transactions/transaction_form/edit_transaction.store.ts src/modules/transactions/screens/transactions/transaction_form/edit_transaction.state.ts src/modules/transactions/screens/transactions/transaction_form/edit_transaction.helpers.ts src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx src/modules/transactions/screens/transactions/transaction_form/index.tsx src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.tsx src/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state.ts src/constants/strings.ts __tests__/screens/transactions/transaction_form/budget_assignment.helpers.test.ts __tests__/screens/transactions/transaction_form/add_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/add_transaction_state.test.ts __tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts __tests__/screens/transactions/transaction_form/edit_transaction_state.test.ts __tests__/add_transaction.store.test.ts __tests__/edit_transaction.store.test.ts
git commit -m "feat: select named budgets on expenses"
```

## Task 6: Implement the Compact Categories Summary and Actions

**Files:**
- Modify: `src/modules/budget/screens/budget/components/summary_card.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_bar.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_tool_rail.tsx`
- Create: `src/modules/budget/screens/budget/components/income_sheet.hook.ts`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.tsx`
- Modify: `src/modules/budget/screens/budget/components/income_sheet.state.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/constants/strings.ts`
- Modify: `__tests__/screens/budget/budget_tool_rail.test.tsx`
- Create: `__tests__/screens/budget/summary_card.test.tsx`
- Modify: `__tests__/income_sheet.state.test.ts`

- [ ] **Step 1: Write failing summary/action contract tests**

Test the rendered contract rather than recomputing values in the component:

```ts
const summaryVm: BudgetCategoriesSummaryVM = {
  hasPlan: true,
  planned: 6250,
  spent: 3700,
  left: 2550,
  usedPct: 0.592,
  unassignedIncome: 1350,
  unbudgetedSpend: 200,
  eyebrowLabel: '3 category budgets in July 2026',
  categoryCountLabel: '3 category budgets',
  balanceAmountLabel: '2,550 EGP left',
  balanceMetaLabel: '12 days left',
  balanceColor: Colors.dark.positive,
  barColor: Colors.dark.budgetSteady,
  spentPlannedLabel: '3,700 spent of 6,250',
  usedLabel: '59% used',
  plannedLabel: '6,250',
  unassignedIncomeLabel: '1,350',
  unbudgetedSpendLabel: '200',
  lifecycleLabel: '12 days left',
  onTrackCount: 1,
  watchCount: 1,
  overCount: 1,
  statusItems: [
    { key: 'on-track', label: '1 on track', icon: 'check-circle-outline', color: Colors.dark.positive },
    { key: 'watch', label: '1 watch', icon: 'alert-circle-outline', color: Colors.dark.budgetWatch },
    { key: 'over', label: '1 over', icon: 'alert-octagon-outline', color: Colors.dark.negative },
  ],
};
const onSetIncome = jest.fn();
render(<SummaryCard summary={summaryVm} onSetIncome={onSetIncome} />);
expect(screen.getByText('2,550 EGP left')).toBeTruthy();
expect(screen.getByText('3,700 spent of 6,250')).toBeTruthy();
expect(screen.getByText('59% used')).toBeTruthy();
expect(screen.getByText('1 on track')).toBeTruthy();
expect(screen.getByText('1 watch')).toBeTruthy();
expect(screen.getByText('1 over')).toBeTruthy();
```

Update tool-rail expectations to exactly two Categories actions and one Plans action.

- [ ] **Step 2: Run focused UI tests**

Run:

```bash
npm test -- --runInBand __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/summary_card.test.tsx
```

Expected: FAIL against the old three-figure summary.

- [ ] **Step 3: Compose the summary from HeroUI primitives**

Use the same hierarchy and class scale as `spending_plans_summary.tsx`:

```tsx
<Card className="bg-surface border-border mx-4 mt-3 rounded-xl border p-0 shadow-none">
  <Card.Body className="px-2 py-1.5">
    <HeroText className="font-inter text-muted text-[11px] font-medium">
      {summary.eyebrowLabel}
    </HeroText>
    <View className="mt-0.5 flex-row items-end justify-between gap-3">
      <HeroText style={{ color: summary.balanceColor }} className="font-sora text-[26px] font-bold">
        {summary.balanceAmountLabel}
      </HeroText>
      <HeroText className="font-inter text-muted text-[11px]">{summary.lifecycleLabel}</HeroText>
    </View>
    <View className="mt-0.5 flex-row items-center justify-between gap-3">
      <HeroText className="font-inter text-foreground text-[13px] font-medium">
        {summary.spentPlannedLabel}
      </HeroText>
      {summary.usedLabel ? (
        <HeroText className="font-inter text-muted text-[12px] font-semibold">
          {summary.usedLabel}
        </HeroText>
      ) : null}
    </View>
    <BudgetBar pct={summary.usedPct ?? 0} status="under" color={summary.barColor} height={ms(4)} />
    <SummaryMetrics summary={summary} onSetIncome={onSetIncome} />
    <View className="mt-1.5 flex-row items-center">
      {summary.statusItems.map((item) => <SummaryStatusItem key={item.key} item={item} />)}
    </View>
  </Card.Body>
</Card>
```

Define `SummaryMetrics` and `SummaryStatusItem` in the same file as stateless functions. `SummaryMetrics` renders three equal columns labeled `Planned`, `Unassigned income`, and `Unbudgeted spend`; only the `Set income` value uses `PressableFeedback` and `onSetIncome`. `SummaryStatusItem` renders the supplied MaterialCommunityIcon and label in an equal-width row.

Do not calculate percentages, colors, balance labels, counts, or lifecycle copy here. Render the supplied `BudgetCategoriesSummaryVM`.

Remove the `StyleSheet` from `budget_bar.tsx`. Keep only runtime `height`, percentage width, and fill color in `style`; express the track/fill background, clipping, and radius with Uniwind classes.

- [ ] **Step 4: Convert the tool rail to HeroUI/Uniwind**

Keep `BudgetToolRail` shared with Plans but remove `StyleSheet`. Categories renders `Copy` and `Budget`; Plans renders only `Plan`. Use project `Button` or HeroUI `PressableFeedback` composition with equal widths, compact height, and existing themed variants.

Move amount parsing, validation, `setExpectedIncome`, loading state, and close behavior from `income_sheet.tsx` into `useIncomeSheet`. Add top-level `saving` and `setSaving` fields to `income_sheet.state.ts`. The sheet becomes HeroUI/Uniwind presentation only and its save button uses `isLoading={state.saving}`.

Expose `openIncomeSheet` from `useBudget` as a stable callback that calls `useIncomeSheetState.getState().open(incomeSuggestion, expectedIncome)`. The summary receives this action; it does not access stores directly.

- [ ] **Step 5: Run focused tests and typecheck**

Run:

```bash
npm test -- --runInBand __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/summary_card.test.tsx __tests__/income_sheet.state.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 6: Commit summary/actions**

```bash
git add src/modules/budget/screens/budget/components/summary_card.tsx src/modules/budget/screens/budget/components/budget_bar.tsx src/modules/budget/screens/budget/components/budget_tool_rail.tsx src/modules/budget/screens/budget/components/income_sheet.tsx src/modules/budget/screens/budget/components/income_sheet.hook.ts src/modules/budget/screens/budget/components/income_sheet.state.ts src/modules/budget/screens/budget/budget.hook.ts src/constants/strings.ts __tests__/screens/budget/budget_tool_rail.test.tsx __tests__/screens/budget/summary_card.test.tsx __tests__/income_sheet.state.test.ts
git commit -m "feat: redesign budget categories summary"
```

## Task 7: Implement the Expandable HeroUI Category Ledger

**Files:**
- Create: `src/modules/budget/screens/budget/components/named_budget_row.tsx`
- Create: `src/modules/budget/screens/budget/components/unassigned_spending_row.tsx`
- Modify: `src/modules/budget/screens/budget/components/category_budget_row.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_delete_confirm_sheet.tsx`
- Modify: `src/constants/strings.ts`
- Create: `__tests__/screens/budget/category_budget_row.test.tsx`

- [ ] **Step 1: Write failing ledger behavior tests**

Cover one controlled expanded value, child data, reconciliation, detail action, edit/delete, and accessibility:

```ts
const rowVm: CategoryBudgetRowVM = {
  categoryId: 'food',
  name: 'Food & Dining',
  icon: 'food-fork-drink',
  color: '#E0B341',
  planned: 2500,
  spent: 1900,
  left: 600,
  usedPct: 0.76,
  status: 'on-track',
  statusLabel: 'On track',
  statusChipColor: 'default',
  spentPlannedUsedLabel: '1,900 / 2,500 spent · 76% used',
  balanceAmountLabel: '600',
  balanceMetaLabel: 'EGP left',
  ringColor: Colors.dark.positive,
  unassignedSpend: 200,
  unassignedSpendLabel: '200 EGP',
  budgets: [{
    id: 'meals',
    name: 'Monthly meals',
    planned: 2000,
    spent: 1400,
    left: 600,
    usedPct: 0.7,
    categorySharePct: 0.8,
    usedLabel: '70%',
    shareLabel: '80% of category',
    spentPlannedLabel: '1,400 / 2,000 spent',
    balanceAmountLabel: '600',
    balanceMetaLabel: 'EGP left',
    ringColor: Colors.dark.positive,
    accessibilityLabel: 'Monthly meals, 1,400 of 2,000 spent, 600 EGP left',
    menuAccessibilityLabel: 'Actions for Monthly meals',
  }],
  accessibilityLabel: 'Food & Dining, 1,900 of 2,500 spent, 600 EGP left, On track',
};
const onExpandedChange = jest.fn();
const onViewDetails = jest.fn();
const onEdit = jest.fn();
const onDelete = jest.fn();
render(
  <CategoryBudgetRow
    row={rowVm}
    isExpanded
    onExpandedChange={onExpandedChange}
    onViewDetails={onViewDetails}
    onEdit={onEdit}
    onDelete={onDelete}
  />,
);
expect(screen.getByText('Monthly meals')).toBeTruthy();
expect(screen.getByText('80% of category')).toBeTruthy();
expect(screen.getByText('1,400 / 2,000 spent')).toBeTruthy();
expect(screen.getByText('600')).toBeTruthy();
expect(screen.getByText('Unassigned spending')).toBeTruthy();
fireEvent.press(screen.getByLabelText('View Food & Dining details'));
expect(onViewDetails).toHaveBeenCalledWith('food');
```

- [ ] **Step 2: Run ledger tests and confirm failure**

Run:

```bash
npm test -- --runInBand __tests__/screens/budget/category_budget_row.test.tsx
```

Expected: FAIL because the old row always renders children and uses swipe actions.

- [ ] **Step 3: Compose a controlled HeroUI Accordion item**

Use:

```tsx
<Accordion
  selectionMode="single"
  value={isExpanded ? row.categoryId : undefined}
  onValueChange={(value) => onExpandedChange(typeof value === 'string' ? value : undefined)}
  hideSeparator
  className="border-separator border-b"
>
  <Accordion.Item value={row.categoryId}>
    <Accordion.Trigger className="px-4 py-2">
      <View className="flex-1 flex-row items-center gap-2.5">
        <BudgetRing pct={row.usedPct} color={row.ringColor}>
          <MaterialCommunityIcons name={toIconName(row.icon, 'tag-outline')} color={row.color} />
        </BudgetRing>
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center gap-1.5">
            <HeroText className="font-sora text-foreground text-[15px] font-semibold">
              {row.name}
            </HeroText>
            <Chip
              size="sm"
              variant="soft"
              color={row.statusChipColor}
              animation="disable-all"
            >
              <Chip.Label>{row.statusLabel}</Chip.Label>
            </Chip>
          </View>
          <HeroText className="font-inter text-muted text-[12px]">
            {row.spentPlannedUsedLabel}
          </HeroText>
        </View>
        <View className="items-end">
          <HeroText style={{ color: row.ringColor }} className="font-sora text-[17px] font-bold">
            {row.balanceAmountLabel}
          </HeroText>
          <HeroText className="font-inter text-muted text-[10px]">{row.balanceMetaLabel}</HeroText>
        </View>
        <Accordion.Indicator />
      </View>
    </Accordion.Trigger>
    <Accordion.Content className="px-0 pb-0">
      {row.budgets.map((budget) => (
        <NamedBudgetRow key={budget.id} budget={budget} onEdit={onEdit} onDelete={onDelete} />
      ))}
      {row.unassignedSpend > 0 ? (
        <UnassignedSpendingRow amountLabel={row.unassignedSpendLabel} />
      ) : null}
      <PressableFeedback
        accessibilityLabel={Strings.budgetViewCategoryDetailsA11y(row.name)}
        onPress={() => onViewDetails(row.categoryId)}
        className="border-separator min-h-10 flex-row items-center gap-2 border-t px-4"
      >
        <MaterialCommunityIcons name="chart-box-outline" color={Colors.dark.text2} />
        <HeroText className="font-inter text-foreground text-[13px] font-semibold">
          {Strings.budgetViewCategoryDetails(row.name)}
        </HeroText>
      </PressableFeedback>
    </Accordion.Content>
  </Accordion.Item>
</Accordion>
```

The parent uses `BudgetRing`; no progress bar. It renders only supplied labels/colors.

#### Approved neutral-row refinement

Apply the approved Option B treatment without changing ledger geometry:

- `UnassignedSpendingRow` uses neutral default/border/foreground/muted tokens only.
- Its trailing label is `<amount> EGP`; `Unassigned spending` remains in the row title
  and is not repeated beside the amount.
- The category-detail action uses a neutral icon container, foreground label, and muted
  chevron rather than accent/gold styling.
- Add source-contract and helper assertions before implementation, then run the focused
  budget helper and styling architecture suites.

- [ ] **Step 4: Add aligned child rows and HeroUI Menu actions**

Each `NamedBudgetRow` uses the same fixed `ms(46)` leading gutter as the parent row and no card nesting. Center the approved smaller `BudgetRing` (`size={ms(34)}`) inside that gutter so child circles align on the parent circle's centerline. Keep all vertical row spacing in Uniwind classes and pass only the scaled ring size/stroke through geometry props. Compose the overflow menu exactly with HeroUI:

```tsx
<Menu>
  <Menu.Trigger asChild>
    <PressableFeedback accessibilityLabel={budget.menuAccessibilityLabel}>
      <MaterialCommunityIcons name="dots-vertical" />
    </PressableFeedback>
  </Menu.Trigger>
  <Menu.Portal>
    <Menu.Overlay />
    <Menu.Content presentation="popover" placement="left" width={180}>
      <Menu.Item onPress={() => onEdit(budget.id)}>
        <Menu.ItemTitle>{Strings.swipeEdit}</Menu.ItemTitle>
      </Menu.Item>
      <Menu.Item variant="danger" onPress={() => onDelete({ id: budget.id, name: budget.name })}>
        <Menu.ItemTitle>{Strings.swipeDelete}</Menu.ItemTitle>
      </Menu.Item>
    </Menu.Content>
  </Menu.Portal>
</Menu>
```

Use `BudgetRing` at the approved smaller size. Render `UnassignedSpendingRow` only when its supplied amount is positive.

- [ ] **Step 5: Update delete confirmation copy**

The confirmation states: deleting the named budget keeps its transactions in the category and marks their spending unassigned. Preserve existing loading/duplicate-submit handling.

- [ ] **Step 6: Run ledger and delete tests**

Run:

```bash
npm test -- --runInBand __tests__/screens/budget/category_budget_row.test.tsx __tests__/screens/budget/budget_screen.test.tsx __tests__/screens/budget/set_budget_sheet.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the ledger**

```bash
git add src/modules/budget/screens/budget/components/category_budget_row.tsx src/modules/budget/screens/budget/components/named_budget_row.tsx src/modules/budget/screens/budget/components/unassigned_spending_row.tsx src/modules/budget/screens/budget/components/budget_delete_confirm_sheet.tsx src/constants/strings.ts __tests__/screens/budget/category_budget_row.test.tsx __tests__/screens/budget/budget_screen.test.tsx __tests__/screens/budget/set_budget_sheet.test.tsx
git commit -m "feat: add expandable budget category ledger"
```

## Task 8: Integrate Screen States, Skeleton Geometry, and Code-Pattern Guards

**Files:**
- Modify: `src/modules/budget/screens/budget/index.tsx`
- Modify: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Modify: `src/modules/budget/screens/budget/category_detail/category_detail.hook.ts`
- Create: `src/modules/budget/screens/budget/category_detail/category_detail.state.ts`
- Create: `__tests__/screens/budget/budget_categories_styling_architecture.test.ts`
- Modify: `__tests__/screens/budget/budget_screen.test.tsx`
- Modify: `__tests__/screens/budget/budget_month_rollover.hook.test.ts`

- [ ] **Step 1: Write failing architecture and screen-state tests**

Architecture guard:

```ts
const PRESENTATION_FILES = [
  'src/modules/budget/screens/budget/index.tsx',
  'src/modules/budget/screens/budget/components/summary_card.tsx',
  'src/modules/budget/screens/budget/components/budget_bar.tsx',
  'src/modules/budget/screens/budget/components/budget_tool_rail.tsx',
  'src/modules/budget/screens/budget/components/category_budget_row.tsx',
  'src/modules/budget/screens/budget/components/named_budget_row.tsx',
  'src/modules/budget/screens/budget/components/unassigned_spending_row.tsx',
  'src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx',
  'src/modules/budget/screens/budget/components/income_sheet.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/index.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx',
  'src/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet.tsx',
];

for (const path of PRESENTATION_FILES) {
  const text = source(path);
  expect(text).not.toContain('StyleSheet');
  expect(text).toContain('className=');
}
expect(source('src/modules/budget/screens/budget/index.tsx')).not.toMatch(/useState|useSharedValue/);
expect(source('src/modules/transactions/screens/transactions/transaction_form/index.tsx'))
  .not.toMatch(/useState|useSharedValue/);
```

Screen tests must prove:

- tabs stay visible while loading/refreshing;
- Categories skeleton renders summary, two actions, and parent rows with final geometry;
- empty month renders `No budget set`, `Add budget`, and `Copy from month`;
- expanded category is controlled by hook state;
- category detail navigation keeps the month param;
- Plans and 50/30/20 lenses remain unchanged.

- [ ] **Step 2: Run architecture and screen tests**

Run:

```bash
npm test -- --runInBand __tests__/screens/budget/budget_categories_styling_architecture.test.ts __tests__/screens/budget/budget_screen.test.tsx
```

Expected: FAIL while legacy StyleSheets and old composition remain.

- [ ] **Step 3: Refactor Budget screen composition to Uniwind**

Keep `Screen`, standard header, `MonthFilter`, and three tabs. Render the Categories lens as:

```tsx
<ScreenScroll contentContainerStyle={{ paddingBottom: ms(96) }} refreshControl={refreshControl}>
  <SummaryCard summary={state.categoriesSummary} onSetIncome={openIncomeSheet} />
  <View className="mx-4 mt-2">
    <BudgetToolRail
      variant="categories"
      onCopy={openCopy}
      onAddCategory={openAdd}
      onPlan={openPlanTool}
      copyDisabled={false}
      addCategoryDisabled={state.budgetableCategories.length === 0}
      planDisabled={false}
    />
  </View>
  <HeroText className="font-inter text-muted mx-4 mt-4 text-[11px] font-medium">
    {state.categoryCountLabel}
  </HeroText>
  {state.rows.map((row) => (
    <CategoryBudgetRow
      key={row.categoryId}
      row={row}
      isExpanded={state.expandedCategoryId === row.categoryId}
      onExpandedChange={setExpandedCategoryId}
      onViewDetails={goToCategory}
      onEdit={openEdit}
      onDelete={requestDelete}
    />
  ))}
</ScreenScroll>
<IncomeSheet />
```

Keep all calculations and callbacks in `useBudget`; template callbacks only forward arguments.
The Categories tool rail remains visible for an empty month. Copy stays enabled so the source-month picker can choose any month with budgets; Add budget is the primary empty-month action.

- [ ] **Step 4: Match skeleton geometry exactly**

Categories skeleton uses the same outer `Card` classes and spacing as the loaded summary, two equal action placeholders, the count label, and four collapsed parent rows. Use HeroUI `SkeletonGroup` only. Do not render child skeletons while collapsed.

- [ ] **Step 5: Preserve selected month in category detail**

Read the optional `month` route param in `category_detail.hook.ts`; validate it with `/^\d{4}-(0[1-9]|1[0-2])$/`. Put `month` and `setMonth` in `category_detail.state.ts`. A valid route month remains fixed across focus; absent/invalid input falls back to `currentYearMonth()` and continues the existing month-rollover-on-focus behavior.

- [ ] **Step 6: Run Budget screen regressions**

Run:

```bash
npm test -- --runInBand __tests__/screens/budget __tests__/budget.helpers.test.ts __tests__/budget.state.test.ts __tests__/budget.store.test.ts
npm run typecheck
```

Expected: PASS.

- [ ] **Step 7: Commit screen integration**

```bash
git add src/modules/budget/screens/budget/index.tsx src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx src/modules/budget/screens/budget/components/income_sheet.tsx src/modules/budget/screens/budget/category_detail/category_detail.hook.ts src/modules/budget/screens/budget/category_detail/category_detail.state.ts src/modules/transactions/screens/transactions/transaction_form/index.tsx src/constants/strings.ts __tests__/screens/budget/budget_categories_styling_architecture.test.ts __tests__/screens/budget/budget_screen.test.tsx __tests__/screens/budget/budget_month_rollover.hook.test.ts
git commit -m "feat: integrate redesigned budget categories screen"
```

## Task 9: Full Verification and Device-QA Handoff

**Files:**
- No new files. Verification failures return to the owning task before this gate is repeated.

- [ ] **Step 1: Run formatter and focused feature tests**

Run:

```bash
npm run format
npm test -- --runInBand \
  __tests__/database/migrations/015_add_budget_id.test.ts \
  __tests__/budget_stats.query.test.ts \
  __tests__/budget.helpers.test.ts \
  __tests__/budget.store.test.ts \
  __tests__/transaction.repository.test.ts \
  __tests__/screens/transactions/transaction_form \
  __tests__/screens/budget
```

Expected: PASS with zero failed tests.

- [ ] **Step 2: Run local CI parity before push**

Run exactly:

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

Expected: all six checks pass and the final green message prints.

- [ ] **Step 3: Review the diff against project patterns**

Run:

```bash
git diff --check
git status --short
rg -n "StyleSheet|useState|useSharedValue" \
  src/modules/budget/screens/budget/index.tsx \
  src/modules/budget/screens/budget/components/summary_card.tsx \
  src/modules/budget/screens/budget/components/category_budget_row.tsx \
  src/modules/budget/screens/budget/components/named_budget_row.tsx \
  src/modules/transactions/screens/transactions/transaction_form/index.tsx
```

Expected: no whitespace errors, only intended files changed, and no forbidden pattern matches.

- [ ] **Step 4: Resolve any verification failure in its owning task**

If a check fails, return to the task that owns the file, add a focused regression test, rerun that task's focused command, and use that task's exact staging command and commit message. Restart Task 9 from Step 1 afterward. Do not create an aggregate verification commit and do not use `git add .`.

- [ ] **Step 5: Start the local dev server for the device-QA gate**

Run:

```bash
npm start
```

Manual device matrix:

1. First load and pull-to-refresh skeletons match loaded summary/action/row heights with no visible jump.
2. Empty, current, future, and past months show correct lifecycle and no fabricated percentage.
3. Expand/collapse one category at a time; long names wrap without colliding with right-aligned values.
4. Child rings align under the parent ring; each child shows share, spent/planned, usage, and left/over.
5. Existing unassigned spending reconciles exactly with parent spend.
6. Add expense with zero, one, and multiple matching budgets.
7. Edit an existing unassigned expense without forcing assignment; then assign it deliberately.
8. Change category/date and verify stale budget selection clears.
9. Delete a linked named budget and verify spending moves to `Unassigned spending` while transaction totals remain unchanged.
10. Copy a month and verify new budgets have no inherited transaction assignments.
11. Plans and 50/30/20 tabs remain visually and functionally unchanged.

Do not recommend merge until the user completes this device-QA gate.

## Review Remediation — 2026-07-16

The product owner approved the following review fixes before merge:

1. Surface failed transaction deletion and commitment deactivate/skip actions in their confirmation sheets.
2. Keep the transaction budget selector mounted while eligibility is loading to prevent form reflow.
3. Move lifecycle and save orchestration out of Zustand `.state.ts` files into colocated hooks.
4. Replace cold-load row-count guesses with a stable viewport skeleton region while preserving known refresh geometry.
5. Allow category and named-budget titles to wrap to two bounded lines without colliding with metadata.
6. Make `Unassigned income` actionable only when income has not been configured.
7. Replace mocked HeroUI interaction render tests with logic and source-contract coverage; leave real transitions to device QA.
8. Cover edit assignment changes across month/category transitions and repository month validation.

Implementation remains inside the existing branch and uses the approved design, financial formulas, HeroUI Native primitives, and module anatomy.
