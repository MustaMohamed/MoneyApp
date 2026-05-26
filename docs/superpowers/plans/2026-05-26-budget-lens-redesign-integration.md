# Budget Lens + Redesign Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fold the 50/30/20 lens (PR #131, `origin/feat/budget-5030-20-lens`) into `feat/swipe-actions-standard` so the budget screen ships with both the ring/swipe visual redesign AND the Categories ↔ 50/30/20 Tabs in a single PR, then close #131 as superseded.

**Architecture:** Apply the lens net-diff as a sequence of hand-crafted commits (no `git merge`) to avoid a three-way conflict storm on the three overlapping files. Each task copies or surgically edits one coherent unit, immediately fixes the `@/components/ui/bottom_sheet` → `@/components/ui/sheet` import path (the #136 sheet migration deleted the old path), then runs the test suite. The three collision files (`index.tsx`, `set_budget_sheet.tsx`, `category_budget_row.tsx`) are resolved by explicit merge rules decided below. The two branches share a migration-012-free base on this branch, so migration 012 lands as a new additive file with zero data-loss risk.

**Tech Stack:** React Native (bare Expo), TypeScript strict, Zustand v5, expo-sqlite, HeroUI Native `Tabs` + `Card` + `RadioGroup`, `@gorhom/bottom-sheet` `BottomSheetScrollView`, `@/components/ui/sheet` (post-#136 primitive).

---

## Merge Mechanic Decision

**Chosen mechanic: hand-apply the net diff as sequential commits. Do NOT run `git merge origin/feat/budget-5030-20-lens`.**

Rationale: The lens branch is 158 commits ahead of the merge base (33c2be7) and the three overlap files would produce conflicts that `git merge` would auto-resolve in the wrong direction (the lens base predates the redesign). Hand-applying gives surgical control — we take every lens-only file verbatim, apply the three collision-file rules explicitly, and fix the single dead import path (`bottom_sheet` → `sheet`) as we go. This produces a clean, bisectable commit history on `feat/swipe-actions-standard` with no merge commit.

**Conflict-resolution decisions for the three overlap files:**

| File | Rule |
|---|---|
| `screens/budget/index.tsx` | Start from our redesign's version (swipe wiring, `useConfirmAction`, `useFocusEffect` blur-close, inset fix). Graft in the lens's `Tabs` wrapper, `setLensTab`, `FiftyThirtyTwentyLens` import, and conditional header/body rendering. The lens version strips `openEdit` from the destructure — restore it (our redesign needs it for `onEdit`). The lens version removes the `onEdit` prop from `CategoryBudgetRow` — restore it. |
| `screens/budget/components/set_budget_sheet.tsx` | Start from our redesign's version (inline Remove link already deleted, `size="sm"` non-scrollable, `View` body, `Button variant="primary"`). Graft in the lens additions: `BottomSheetScrollView` body (change `View` → `BottomSheetScrollView`), `size="md" scrollable`, `groupValue` state, two `useEffect`s for group sync, `SHEET_FOOTER_CLEARANCE` `paddingBottom` in `bodyContent`, the `RadioGroup` group picker, and the `setCategoryGroup` call in `onSubmit`. **Drop the lens's inline Remove `Pressable` block** — swipe Delete replaces it. Fix import: `@/components/ui/bottom_sheet` → `@/components/ui/sheet`. The `Button` in footer: use `variant="primary" label={...}` form (our redesign's pattern, not the lens's `<Button.Label>` child pattern — keep consistency). |
| `screens/budget/components/category_budget_row.tsx` | Our redesign's full rewrite wins for every visual concern. The lens's +9 lines add only `paddingVertical: Spacing.sm` (was `Spacing.xs`) and the `borderBottomWidth`/`borderBottomColor` divider to the `row` style — **these are already present in our redesign's version** (we independently added dividers; padding differs: ours uses `Spacing.xs`, lens uses `Spacing.sm`). Keep our version untouched. The lens's version also drops `onEdit`/`onDelete` props entirely — ignore that, our redesign keeps them for swipe. |

**Sheet API drift check — `@/components/ui/sheet` vs what lens files expect:**

The lens was written against `bottom_sheet.tsx`. After #136, the public surface of `sheet.tsx` is:
- `Sheet` component — same props: `isOpen`, `onOpenChange`, `title`, `size`, `snapPoints`, `scrollable`, `fitContent`, `footer`, `children`. No drift.
- `useBottomSheetAwareHandlers` — re-exported from `heroui-native`. Same.
- `SHEET_FOOTER_CLEARANCE` — exported. Same value formula. No drift.

The only change is the import path. All lens files that import from `@/components/ui/bottom_sheet` need the path changed to `@/components/ui/sheet`. Affected lens files: `income_sheet.tsx` and `set_budget_sheet.tsx` (the lens version). `bucket_card.tsx` and `fifty_thirty_twenty_lens.tsx` do not import from `bottom_sheet`.

---

## File Map

**New files to create (verbatim from lens branch):**
- `database/migrations/012_add_budget_group.ts` — migration adding `budget_group` column + seeding
- `database/migrations/index.ts` — append migration 012 to the array
- `screens/budget/budget_buckets.helpers.ts` — `computeBuckets` pure function + `BucketsVM`/`BucketVM` types
- `screens/budget/components/bucket_card.tsx` — HeroUI `Card`-based 50/30/20 bucket display
- `screens/budget/components/fifty_thirty_twenty_lens.tsx` — lens container (income header + bucket cards + footer)
- `screens/budget/components/income_sheet.tsx` — expected-income entry sheet
- `screens/budget/components/income_sheet.state.ts` — Zustand state for income sheet (isOpen, amountText, suggestion)

**New test files to create (verbatim from lens branch):**
- `__tests__/budget.state.5030.test.ts` — lensTab state tests
- `__tests__/budget.store.5030.test.ts` — createBudgetStore factory + expectedIncome tests
- `__tests__/budget_buckets.helpers.test.ts` — computeBuckets unit tests (100% branches)
- `__tests__/budget_group.migration.test.ts` — migration 012 schema + seed tests
- `__tests__/category_group.query.test.ts` — setCategoryGroup query tests
- `__tests__/trailing_income.query.test.ts` — getTrailingIncomeSuggestion query tests

**Files to modify:**
- `constants/enums.ts` — add `BudgetGroup` enum
- `constants/strings.ts` — add 38 new budget/income strings
- `database/budget_stats.ts` — add `getTrailingIncomeSuggestion` function
- `database/categories.ts` — add `setCategoryGroup` function + update `addCategory` INSERT to include `budget_group` column
- `database/entities/category.entity.ts` — add `budget_group: BudgetGroup | null` field
- `database/migrations/index.ts` — append migration012
- `repositories/category.repository.ts` — add `budget_group: null` to `addCategory` data object
- `store/budget.store.ts` — refactor to `createBudgetStore` factory, add `expectedIncome` state, `setExpectedIncome`, `setExpectedIncomeLocal`, update `setData` arity to 3 args, update `load` to read `expected_monthly_income` from `AppSettingsRepository`
- `screens/budget/budget.state.ts` — add `LensTab` type, `lensTab` field, `setLensTab` action
- `screens/budget/budget.hook.ts` — add `suggestion` state, trailing-income fetch in `useFocusEffect`, `buckets` memo, `lensTab`/`setLensTab` from state, expose all via return
- `screens/budget/index.tsx` — graft `Tabs` wrapper + lens tab content onto redesign's swipe wiring
- `screens/budget/components/set_budget_sheet.tsx` — graft group picker + `BottomSheetScrollView` + income integration onto redesign's base (keep Remove link deleted)
- `screens/budget/category_detail/category_detail.hook.ts` — add `openEdit` + `editBudget` (already in lens; this branch's redesign added the separate "edit from swipe" path — need to confirm no conflict)
- `screens/budget/category_detail/index.tsx` — add pencil edit button from lens
- `__tests__/budget.store.test.ts` — update `setData` call-sites from 2-arg to 3-arg

---

## Tasks

### Task 1: Constants — BudgetGroup enum + 38 strings

**Files:**
- Modify: `constants/enums.ts`
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add `BudgetGroup` enum to `constants/enums.ts`**

Insert after the `RecurrencePreset` enum block and before `PROTECTED_CATEGORY_IDS`:

```typescript
export enum BudgetGroup {
  Need = 'need',
  Want = 'want',
  Savings = 'savings',
}
```

- [ ] **Step 2: Add 38 budget/income strings to `constants/strings.ts`**

Locate the block ending with `budgetDetailInProgress: '* in progress',` and insert immediately after it:

```typescript
  // Budget — 50/30/20 lens
  budget5030TabCategories: 'Categories',
  budget5030TabLens: '50/30/20',
  budget5030MonthlyIncome: 'Monthly income',
  budget5030EditIncome: 'Edit',
  budget5030SetIncomeCta: 'Set your monthly income',
  budget5030SetIncomeCtaBody:
    'Add your expected monthly income to see how your budget aligns with the 50/30/20 rule.',
  budget5030NeedLabel: 'Needs',
  budget5030WantLabel: 'Wants',
  budget5030SavingsLabel: 'Savings',
  budget5030NeedPct: '50%',
  budget5030WantPct: '30%',
  budget5030SavingsPct: '20%',
  budget5030StatusOnTrack: 'On track',
  budget5030StatusOver: 'Over',
  budget5030StatusAhead: 'Ahead',
  budget5030StatusBehind: 'Behind',
  budget5030Unallocated: 'Unallocated',
  budget5030OverAllocated: 'Over-allocated by',
  budget5030Ungrouped: 'Ungrouped',
  budget5030SavingsCaption:
    "Savings moved as transfers won't show as spend — the allocation still reflects your plan.",
  budget5030AllocatedLabel: 'Allocated',
  budget5030TargetLabel: 'Target',
  budget5030GroupPickerLabel: 'BUDGET GROUP',
  budget5030GroupNeed: 'Need',
  budget5030GroupWant: 'Want',
  budget5030GroupSavings: 'Savings',
  // Income sheet
  incomeSheetTitle: 'Monthly income',
  incomeSheetAmountLabel: 'Expected monthly income',
  incomeSheetAmountPlaceholder: '0',
  incomeSheetSuggestionNote: 'Pre-filled from your last 3 months of income',
  incomeSheetSaveCta: 'Save',
  incomeSheetAmountRequired: 'Enter your monthly income',
  incomeSheetAmountInvalid: 'Enter an amount greater than 0',
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors in `constants/`.

- [ ] **Step 4: Commit**

```bash
git add constants/enums.ts constants/strings.ts
git commit -m "feat(budget-lens): BudgetGroup enum + 38 strings (lens integration W0)"
```

---

### Task 2: Database layer — entity, migration 012, query additions

**Files:**
- Modify: `database/entities/category.entity.ts`
- Create: `database/migrations/012_add_budget_group.ts`
- Modify: `database/migrations/index.ts`
- Modify: `database/budget_stats.ts`
- Modify: `database/categories.ts`
- Modify: `repositories/category.repository.ts`

- [ ] **Step 1: Add `budget_group` field to category entity**

Replace the contents of `database/entities/category.entity.ts` with:

```typescript
import type { BudgetGroup, CategoryType } from '@/constants/enums';

export interface Category {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
  is_default: 0 | 1;
  sort_order: number;
  budget_group: BudgetGroup | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Create migration 012**

Create `database/migrations/012_add_budget_group.ts` with these exact contents:

```typescript
// Seeded IDs per spec §4.5.
// Need: Housing, Groceries, Transport, Car, Utilities, Phone & Internet,
//       Health, Bills, Education, Family, Debt Payment, Bank Fees
// Want: Food & Dining, Dining Out, Subscriptions, Shopping, Clothes,
//       Gifts, Entertainment, Charity
// Savings: (only the new cat_savings seeded here)
// NULL: Money Transfer, Other (no UPDATE needed — NULL is the column default)

export const migration012 = {
  version: 12,
  up: `
    ALTER TABLE categories ADD COLUMN budget_group TEXT
      CHECK(budget_group IN ('need','want','savings'));

    UPDATE categories SET budget_group = 'need'
      WHERE id IN (
        'cat_housing','cat_groceries','cat_transport','cat_car',
        'cat_utilities','cat_phone_internet','cat_health','cat_bills',
        'cat_education','cat_family','cat_debt_payment','cat_bank_fees'
      );

    UPDATE categories SET budget_group = 'want'
      WHERE id IN (
        'cat_food','cat_dining_out','cat_subscriptions','cat_shopping',
        'cat_clothes','cat_gifts','cat_entertainment','cat_charity'
      );

    INSERT OR IGNORE INTO categories
      (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
    VALUES
      ('cat_savings', 'Savings & Investments', 'expense', 'piggy-bank', '#4CAF82', 1, 22, 'savings',
       '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');
  `,
};
```

- [ ] **Step 3: Append migration 012 to the index**

Open `database/migrations/index.ts`. Add the import and append `migration012` to the `MIGRATIONS` array. The file currently ends with `migration011` — add after it:

```typescript
import { migration012 } from './012_add_budget_group';
```

And in the `MIGRATIONS` array append `migration012` as the last element.

- [ ] **Step 4: Add `getTrailingIncomeSuggestion` to `database/budget_stats.ts`**

Append to the end of `database/budget_stats.ts`:

```typescript
/**
 * Returns the rounded average monthly income over the last N complete months
 * (relative to `currentYearMonth`, which is the current "YYYY-MM" string).
 * Income = transactions with type = 'income'.
 * A "complete month" is any month strictly before currentYearMonth.
 * Returns null when there is no qualifying income history.
 */
export async function getTrailingIncomeSuggestion(
  db: SQLiteDatabase,
  currentYearMonth: string,
  windowMonths = 3,
): Promise<number | null> {
  const row = await db.getFirstAsync<{ suggestion: number | null }>(
    `SELECT ROUND(AVG(monthly_total)) AS suggestion
       FROM (
         SELECT SUM(egp_amount) AS monthly_total
           FROM transactions
          WHERE type = 'income'
            AND substr(transaction_date, 1, 7) < ?
          GROUP BY substr(transaction_date, 1, 7)
          ORDER BY substr(transaction_date, 1, 7) DESC
          LIMIT ?
       )`,
    [currentYearMonth, windowMonths],
  );
  return row?.suggestion ?? null;
}
```

- [ ] **Step 5: Add `setCategoryGroup` to `database/categories.ts`**

The function signature requires `BudgetGroup` from enums. Add import at the top of the file:

```typescript
import { type BudgetGroup } from '@/constants/enums';
```

Then append the function before `deleteCategory`:

```typescript
export async function setCategoryGroup(
  db: SQLiteDatabase,
  categoryId: string,
  group: BudgetGroup | null,
): Promise<void> {
  await db.runAsync('UPDATE categories SET budget_group = ?, updated_at = ? WHERE id = ?', [
    group,
    new Date().toISOString(),
    categoryId,
  ]);
}
```

Also update `addCategory` — the current INSERT does not include the `budget_group` column. The entity now requires it. Update the INSERT SQL and params:

```typescript
export async function addCategory(db: SQLiteDatabase, category: Category): Promise<void> {
  await db.runAsync(
    `INSERT INTO categories (id, name, type, icon, color, is_default, sort_order, budget_group, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      category.id,
      category.name,
      category.type,
      category.icon,
      category.color,
      category.is_default,
      category.sort_order,
      category.budget_group,
      category.created_at,
      category.updated_at,
    ],
  );
}
```

- [ ] **Step 6: Update `repositories/category.repository.ts`**

In `CategoryRepository.addCategory`, the data object being passed to the database function currently omits `budget_group`. Locate the `addCategory` call that builds the object with `id`, `name`, `type`, `icon`, `color`, `is_default`, `sort_order`, `created_at`, `updated_at` and add `budget_group: null` (new user-created categories have no group by default):

```typescript
budget_group: null,
```

Insert it after `sort_order` and before `created_at`.

- [ ] **Step 7: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors. The `Category` type is now structural — any place that constructs one directly will now need `budget_group`. TypeScript will flag any missing field.

- [ ] **Step 8: Commit**

```bash
git add database/entities/category.entity.ts \
        database/migrations/012_add_budget_group.ts \
        database/migrations/index.ts \
        database/budget_stats.ts \
        database/categories.ts \
        repositories/category.repository.ts
git commit -m "feat(budget-lens): migration 012 + entity + query additions (lens integration W1)"
```

---

### Task 3: Tests — migration 012, query layer (budget_group + trailing income)

**Files:**
- Create: `__tests__/budget_group.migration.test.ts`
- Create: `__tests__/category_group.query.test.ts`
- Create: `__tests__/trailing_income.query.test.ts`

These tests come verbatim from the lens branch. They test the database layer just added in Task 2.

- [ ] **Step 1: Create `__tests__/budget_group.migration.test.ts`**

```typescript
import Database from 'better-sqlite3';

import { MIGRATIONS } from '@/database/migrations';

describe('migration 012 — budget_group', () => {
  let db: ReturnType<typeof Database>;

  beforeAll(() => {
    db = new Database(':memory:');
    db.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  });

  afterAll(() => db.close());

  it('adds budget_group column to categories with NULL default', () => {
    const cols = db.prepare('PRAGMA table_info(categories)').all() as {
      name: string;
      dflt_value: string | null;
      notnull: number;
    }[];
    const col = cols.find((c) => c.name === 'budget_group');
    expect(col).toBeDefined();
    expect(col!.notnull).toBe(0);
    expect(col!.dflt_value).toBeNull();
  });

  it('rejects invalid budget_group values', () => {
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'invalid' WHERE id = 'cat_housing'`).run(),
    ).toThrow();
  });

  it('accepts need, want, savings, and NULL', () => {
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'need' WHERE id = 'cat_housing'`).run(),
    ).not.toThrow();
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'want' WHERE id = 'cat_dining_out'`).run(),
    ).not.toThrow();
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = 'savings' WHERE id = 'cat_savings'`).run(),
    ).not.toThrow();
    expect(() =>
      db.prepare(`UPDATE categories SET budget_group = NULL WHERE id = 'cat_other_expense'`).run(),
    ).not.toThrow();
  });

  it('backfills seeded categories to their groups', () => {
    const groupOf = (id: string) =>
      (
        db.prepare(`SELECT budget_group FROM categories WHERE id = ?`).get(id) as {
          budget_group: string | null;
        }
      ).budget_group;
    expect(groupOf('cat_housing')).toBe('need');
    expect(groupOf('cat_phone_internet')).toBe('need');
    expect(groupOf('cat_debt_payment')).toBe('need');
    expect(groupOf('cat_dining_out')).toBe('want');
    expect(groupOf('cat_entertainment')).toBe('want');
  });

  it('inserts cat_savings with group savings', () => {
    const row = db.prepare(`SELECT * FROM categories WHERE id = 'cat_savings'`).get() as {
      name: string;
      type: string;
      budget_group: string;
    };
    expect(row).toBeDefined();
    expect(row.name).toBe('Savings & Investments');
    expect(row.type).toBe('expense');
    expect(row.budget_group).toBe('savings');
  });

  it('sets Money Transfer and Other to NULL group', () => {
    const rows = db
      .prepare(
        `SELECT id, budget_group FROM categories WHERE id IN ('cat_money_transfer','cat_other_expense')`,
      )
      .all() as { id: string; budget_group: string | null }[];
    for (const r of rows) {
      expect(r.budget_group).toBeNull();
    }
  });
});
```

- [ ] **Step 2: Create `__tests__/category_group.query.test.ts`**

This test uses the standard SQLite mock harness already established in the project (bridging `better-sqlite3` into the expo-sqlite mock). Copy the full file content from the lens branch:

```typescript
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { BudgetGroup } from '@/constants/enums';
import { getCategories, setCategoryGroup } from '@/database/categories';
import { MIGRATIONS } from '@/database/migrations';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: { runAsync: jest.Mock; getAllAsync: jest.Mock };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getCategories
>[0];

describe('setCategoryGroup', () => {
  it('updates budget_group for a category', async () => {
    await setCategoryGroup(mockDb, 'cat_housing', BudgetGroup.Need);
    const cats = await getCategories(mockDb);
    const housing = cats.find((c) => c.id === 'cat_housing');
    expect(housing?.budget_group).toBe(BudgetGroup.Need);
  });

  it('sets budget_group to null', async () => {
    await setCategoryGroup(mockDb, 'cat_housing', null);
    const cats = await getCategories(mockDb);
    const housing = cats.find((c) => c.id === 'cat_housing');
    expect(housing?.budget_group).toBeNull();
  });
});
```

- [ ] **Step 3: Create `__tests__/trailing_income.query.test.ts`**

```typescript
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { getTrailingIncomeSuggestion } from '@/database/budget_stats';
import { MIGRATIONS } from '@/database/migrations';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: { getFirstAsync: jest.Mock; getAllAsync: jest.Mock };
    }
  ).__fakeDb;

  mocked.getFirstAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });

  mocked.getAllAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    return realDb.prepare(sql).all(...(params as never[]));
  });

  // Seed: account + income-type category, then income transactions
  const now = '2026-05-01T00:00:00.000Z';
  realDb
    .prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,
       interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc1','Bank','bank','EGP',0,0,0,0,0,?,?)`,
    )
    .run(now, now);

  // Insert 3 months of income: Feb=10000, Mar=20000, Apr=30000
  // currentYearMonth in tests = '2026-05' so all three are complete months
  for (const [month, amount] of [['2026-02', 10000], ['2026-03', 20000], ['2026-04', 30000]] as const) {
    realDb
      .prepare(
        `INSERT INTO transactions
         (id, account_id, type, egp_amount, transaction_date, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(`tx-${month}`, 'acc1', 'income', amount, `${month}-15`, now, now);
  }
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const mockDb = (SQLite as unknown as { __fakeDb: unknown }).__fakeDb as Parameters<
  typeof getTrailingIncomeSuggestion
>[0];

describe('getTrailingIncomeSuggestion', () => {
  it('returns rounded average of last 3 complete months', async () => {
    // avg(10000, 20000, 30000) = 20000
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05', 3);
    expect(result).toBe(20000);
  });

  it('uses window size — last 2 months gives avg of Mar+Apr', async () => {
    // avg(20000, 30000) = 25000
    const result = await getTrailingIncomeSuggestion(mockDb, '2026-05', 2);
    expect(result).toBe(25000);
  });

  it('returns null when no income transactions exist before the current month', async () => {
    // No transactions before '2020-01'
    const result = await getTrailingIncomeSuggestion(mockDb, '2020-01', 3);
    expect(result).toBeNull();
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget_group.migration|category_group.query|trailing_income" --ci
```

Expected: all pass. If `trailing_income` fails on the `transactions` INSERT (missing columns), check the `transactions` table schema — the INSERT must include all NOT NULL columns. Adjust the seed INSERT to include `title`, `type`, `currency`, `amount` etc. as required by your migration 004 schema.

- [ ] **Step 5: Commit**

```bash
git add __tests__/budget_group.migration.test.ts \
        __tests__/category_group.query.test.ts \
        __tests__/trailing_income.query.test.ts
git commit -m "test(budget-lens): migration 012 + setCategoryGroup + trailing income query tests (W1)"
```

---

### Task 4: Zustand layer — budget.store.ts factory upgrade + budget.state.ts lens additions

**Files:**
- Modify: `store/budget.store.ts`
- Modify: `screens/budget/budget.state.ts`
- Modify: `__tests__/budget.store.test.ts` (fix `setData` arity)

- [ ] **Step 1: Refactor `store/budget.store.ts` to the `createBudgetStore` factory**

Replace the entire contents of `store/budget.store.ts`:

```typescript
import { create } from 'zustand';

import type { Budget } from '@/database/entities/budget.entity';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';
import { budgetRepository, currentYearMonth, lastMonths } from '@/repositories/budget.repository';

const HISTORY_MONTHS = 12;
const EXPECTED_INCOME_KEY = 'expected_monthly_income';

interface BudgetStoreShape {
  rows: Budget[];
  // spend keyed { [categoryId]: { [yearMonth]: number } } over the loaded window
  spendByMonth: Record<string, Record<string, number>>;
  loaded: boolean;
  /** Expected monthly income in EGP. null = not yet set by the user. */
  expectedIncome: number | null;
}

interface BudgetStore {
  state: BudgetStoreShape;
  setData: (
    rows: Budget[],
    spendByMonth: Record<string, Record<string, number>>,
    expectedIncome: number | null,
  ) => void;
  load: () => Promise<void>;
  setLimit: (categoryId: string, limit: number) => Promise<void>;
  removeBudget: (categoryId: string) => Promise<void>;
  setExpectedIncome: (amount: number) => Promise<void>;
  /** Synchronous setter for tests — does not persist. */
  setExpectedIncomeLocal: (amount: number | null) => void;
  reset: () => void;
}

const INITIAL_STATE: BudgetStoreShape = {
  rows: [],
  spendByMonth: {},
  loaded: false,
  expectedIncome: null,
};

export function createBudgetStore(repo: IAppSettingsRepository) {
  return create<BudgetStore>((set, get) => ({
    state: INITIAL_STATE,

    setData: (rows, spendByMonth, expectedIncome) =>
      set((s) => ({ state: { ...s.state, rows, spendByMonth, expectedIncome, loaded: true } })),

    load: async () => {
      const months = lastMonths(currentYearMonth(), HISTORY_MONTHS);
      const [rows, spendByMonth, rawIncome] = await Promise.all([
        budgetRepository.getRows(),
        budgetRepository.getSpendByMonth(months),
        repo.get(EXPECTED_INCOME_KEY),
      ]);
      const expectedIncome = rawIncome !== null ? Number(rawIncome) : null;
      get().setData(rows, spendByMonth, expectedIncome);
    },

    setLimit: async (categoryId, limit) => {
      await budgetRepository.setLimit(categoryId, limit);
      await get().load();
    },

    removeBudget: async (categoryId) => {
      await budgetRepository.removeBudget(categoryId);
      await get().load();
    },

    setExpectedIncome: async (amount) => {
      await repo.set(EXPECTED_INCOME_KEY, String(amount));
      await get().load();
    },

    setExpectedIncomeLocal: (amount) =>
      set((s) => ({ state: { ...s.state, expectedIncome: amount } })),

    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useBudgetStore = createBudgetStore(new AppSettingsRepository());
```

- [ ] **Step 2: Update `budget.state.ts` to add `LensTab` + `lensTab` + `setLensTab`**

Replace the entire contents of `screens/budget/budget.state.ts`:

```typescript
import { create } from 'zustand';

export type BudgetSheetMode = 'add' | 'edit';
export type LensTab = 'categories' | 'fiftythirty';

interface BudgetStateShape {
  sheetVisible: boolean;
  mode: BudgetSheetMode;
  targetCategoryId: string | undefined;
  lensTab: LensTab;
}

interface BudgetState {
  state: BudgetStateShape;
  openAdd: () => void;
  openEdit: (categoryId: string) => void;
  close: () => void;
  setLensTab: (tab: LensTab) => void;
  reset: () => void;
}

const INITIAL_STATE: BudgetStateShape = {
  sheetVisible: false,
  mode: 'add',
  targetCategoryId: undefined,
  lensTab: 'categories',
};

export const useBudgetState = create<BudgetState>((set) => ({
  state: INITIAL_STATE,
  openAdd: () =>
    set((s) => ({
      state: { ...s.state, sheetVisible: true, mode: 'add', targetCategoryId: undefined },
    })),
  openEdit: (categoryId) =>
    set((s) => ({
      state: { ...s.state, sheetVisible: true, mode: 'edit', targetCategoryId: categoryId },
    })),
  close: () => set((s) => ({ state: { ...s.state, sheetVisible: false } })),
  setLensTab: (tab) => set((s) => ({ state: { ...s.state, lensTab: tab } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 3: Fix `__tests__/budget.store.test.ts` — update `setData` call-sites from 2 args to 3**

The existing test calls `setData([r], { a: { '2026-05': 2400 } })` with 2 args. Add `null` as the third argument (expectedIncome) in every `setData` call in that file:

```typescript
// Before:
useBudgetStore.getState().setData([r], { a: { '2026-05': 2400 } });

// After (both occurrences):
useBudgetStore.getState().setData([r], { a: { '2026-05': 2400 } }, null);
```

Also add an assertion for the new `expectedIncome` field in the initial-state test:

```typescript
it('starts empty and not loaded', () => {
  const s = useBudgetStore.getState().state;
  expect(s.rows).toEqual([]);
  expect(s.spendByMonth).toEqual({});
  expect(s.loaded).toBe(false);
  expect(s.expectedIncome).toBeNull();
});
```

- [ ] **Step 4: Create `__tests__/budget.state.5030.test.ts`**

```typescript
import { useBudgetState } from '@/screens/budget/budget.state';

beforeEach(() => useBudgetState.getState().reset());

describe('useBudgetState — lensTab', () => {
  it('initialises lensTab to categories', () => {
    expect(useBudgetState.getState().state.lensTab).toBe('categories');
  });

  it('setLensTab updates to fiftythirty', () => {
    useBudgetState.getState().setLensTab('fiftythirty');
    expect(useBudgetState.getState().state.lensTab).toBe('fiftythirty');
  });

  it('setLensTab updates back to categories', () => {
    useBudgetState.getState().setLensTab('fiftythirty');
    useBudgetState.getState().setLensTab('categories');
    expect(useBudgetState.getState().state.lensTab).toBe('categories');
  });

  it('reset clears lensTab to categories', () => {
    useBudgetState.getState().setLensTab('fiftythirty');
    useBudgetState.getState().reset();
    expect(useBudgetState.getState().state.lensTab).toBe('categories');
  });
});
```

- [ ] **Step 5: Create `__tests__/budget.store.5030.test.ts`**

```typescript
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';
import { createBudgetStore } from '@/store/budget.store';

function makeRepo(seed: Record<string, string> = {}): IAppSettingsRepository {
  const db: Record<string, string> = { ...seed };
  return {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
  };
}

describe('useBudgetStore — 50/30/20 extensions', () => {
  it('initialises expectedIncome as null', () => {
    const store = createBudgetStore(makeRepo());
    expect(store.getState().state.expectedIncome).toBeNull();
  });

  it('setExpectedIncomeLocal updates state without persisting', () => {
    const repo = makeRepo();
    const store = createBudgetStore(repo);
    store.getState().setExpectedIncomeLocal(15000);
    expect(store.getState().state.expectedIncome).toBe(15000);
    expect(repo.set).not.toHaveBeenCalled();
  });

  it('reset clears expectedIncome back to null', () => {
    const store = createBudgetStore(makeRepo());
    store.getState().setExpectedIncomeLocal(15000);
    store.getState().reset();
    expect(store.getState().state.expectedIncome).toBeNull();
  });

  it('reset also resets loaded to false and clears rows/spendByMonth', () => {
    const store = createBudgetStore(makeRepo());
    store.getState().setData([], {}, 5000);
    store.getState().reset();
    const s = store.getState().state;
    expect(s.loaded).toBe(false);
    expect(s.rows).toEqual([]);
    expect(s.spendByMonth).toEqual({});
    expect(s.expectedIncome).toBeNull();
  });
});
```

- [ ] **Step 6: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget.store|budget.state" --ci
```

Expected: all pass including the updated `budget.store.test.ts` and two new files.

- [ ] **Step 7: Commit**

```bash
git add store/budget.store.ts \
        screens/budget/budget.state.ts \
        __tests__/budget.store.test.ts \
        __tests__/budget.state.5030.test.ts \
        __tests__/budget.store.5030.test.ts
git commit -m "feat(budget-lens): store factory + expectedIncome + LensTab state (lens integration W2)"
```

---

### Task 5: Pure helper — `budget_buckets.helpers.ts` + its test

**Files:**
- Create: `screens/budget/budget_buckets.helpers.ts`
- Create: `__tests__/budget_buckets.helpers.test.ts`

- [ ] **Step 1: Create `screens/budget/budget_buckets.helpers.ts`**

```typescript
import { BudgetGroup } from '@/constants/enums';
import type { Budget } from '@/database/entities/budget.entity';
import type { Category } from '@/database/entities/category.entity';
import { resolveLimitForMonth } from '@/screens/budget/budget.helpers';

export type BucketStatus = 'on-track' | 'over' | 'ahead' | 'behind';

export interface BucketVM {
  group: BudgetGroup;
  target: number;
  allocated: number;
  spent: number;
  /** Clamped 0–1 for bar width. True pct = allocated/target (shown in text). */
  barPct: number;
  /** Clamped 0–1 for spend fill width. True pct = spent/allocated (shown in text). */
  spendFillPct: number;
  status: BucketStatus;
}

export interface BucketsVM {
  income: number;
  hasIncome: boolean;
  buckets: BucketVM[];
  /** Sum of limits for budgeted categories with null budget_group. */
  ungrouped: number;
  /** income − (Σ allocated across all groups + ungrouped). Negative = over-allocated. */
  unallocated: number;
}

const GROUP_PCTS: Record<BudgetGroup, number> = {
  [BudgetGroup.Need]: 0.5,
  [BudgetGroup.Want]: 0.3,
  [BudgetGroup.Savings]: 0.2,
};

const GROUP_ORDER = [BudgetGroup.Need, BudgetGroup.Want, BudgetGroup.Savings];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function computeGroupStatus(group: BudgetGroup, allocated: number, target: number): BucketStatus {
  if (group === BudgetGroup.Savings) {
    return allocated >= target ? 'ahead' : 'behind';
  }
  return allocated > target ? 'over' : 'on-track';
}

export function computeBuckets(
  income: number,
  categories: Category[],
  rows: Budget[],
  spendByMonth: Record<string, Record<string, number>>,
  month: string,
): BucketsVM {
  if (income <= 0) {
    return { income, hasIncome: false, buckets: [], ungrouped: 0, unallocated: 0 };
  }

  const totals: Record<BudgetGroup, { allocated: number; spent: number }> = {
    [BudgetGroup.Need]: { allocated: 0, spent: 0 },
    [BudgetGroup.Want]: { allocated: 0, spent: 0 },
    [BudgetGroup.Savings]: { allocated: 0, spent: 0 },
  };
  let ungrouped = 0;

  for (const cat of categories) {
    const limit = resolveLimitForMonth(rows, cat.id, month);
    if (limit === null) continue;
    const spent = spendByMonth[cat.id]?.[month] ?? 0;
    if (cat.budget_group === null) {
      ungrouped += limit;
    } else {
      totals[cat.budget_group].allocated += limit;
      totals[cat.budget_group].spent += spent;
    }
  }

  const buckets: BucketVM[] = GROUP_ORDER.map((group) => {
    const target = GROUP_PCTS[group] * income;
    const { allocated, spent } = totals[group];
    return {
      group,
      target,
      allocated,
      spent,
      barPct: clamp(allocated / target, 0, 1),
      spendFillPct: clamp(allocated > 0 ? spent / allocated : 0, 0, 1),
      status: computeGroupStatus(group, allocated, target),
    };
  });

  const allocatedTotal = buckets.reduce((s, b) => s + b.allocated, 0) + ungrouped;
  const unallocated = income - allocatedTotal;

  return { income, hasIncome: true, buckets, ungrouped, unallocated };
}
```

- [ ] **Step 2: Run typecheck on the helper alone**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors — `cat.budget_group` now exists on `Category`.

- [ ] **Step 3: Create `__tests__/budget_buckets.helpers.test.ts`**

```typescript
import { BudgetGroup, CategoryType } from '@/constants/enums';
import type { Budget } from '@/database/entities/budget.entity';
import type { Category } from '@/database/entities/category.entity';
import {
  computeBuckets,
  type BucketStatus,
  type BucketVM,
  type BucketsVM,
} from '@/screens/budget/budget_buckets.helpers';

const NOW = '2026-05-01T00:00:00.000Z';
const MONTH = '2026-05';

function makeCategory(
  id: string,
  group: BudgetGroup | null,
  type: CategoryType = CategoryType.Expense,
): Category {
  return {
    id,
    name: id,
    type,
    icon: 'tag',
    color: '#fff',
    is_default: 0,
    sort_order: 0,
    budget_group: group,
    created_at: NOW,
    updated_at: NOW,
  };
}

function makeBudget(categoryId: string, limit: number, effectiveFrom = '2026-01'): Budget {
  return {
    id: `${categoryId}-${effectiveFrom}`,
    category_id: categoryId,
    limit_amount: limit,
    effective_from: effectiveFrom,
    created_at: NOW,
    updated_at: NOW,
  };
}

describe('computeBuckets — targets', () => {
  it('computes targets at 50/30/20 of income', () => {
    const result = computeBuckets(20000, [], [], {}, MONTH);
    expect(result.hasIncome).toBe(true);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    const want = result.buckets.find((b) => b.group === BudgetGroup.Want)!;
    const savings = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(need.target).toBe(10000);
    expect(want.target).toBe(6000);
    expect(savings.target).toBe(4000);
  });
});

describe('computeBuckets — income guard', () => {
  it('returns hasIncome false when income <= 0', () => {
    const r0 = computeBuckets(0, [], [], {}, MONTH);
    expect(r0.hasIncome).toBe(false);
    expect(r0.buckets).toHaveLength(0);

    const rNeg = computeBuckets(-100, [], [], {}, MONTH);
    expect(rNeg.hasIncome).toBe(false);
  });
});

describe('computeBuckets — allocated', () => {
  const cats = [
    makeCategory('cat_housing', BudgetGroup.Need),
    makeCategory('cat_groceries', BudgetGroup.Need),
    makeCategory('cat_dining', BudgetGroup.Want),
    makeCategory('cat_untagged', null),
  ];
  const budgets = [
    makeBudget('cat_housing', 5000),
    makeBudget('cat_groceries', 3000),
    makeBudget('cat_dining', 2000),
    makeBudget('cat_untagged', 1000),
  ];

  it('sums budgeted tagged categories into their group', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    const want = result.buckets.find((b) => b.group === BudgetGroup.Want)!;
    expect(need.allocated).toBe(8000);
    expect(want.allocated).toBe(2000);
  });

  it('accumulates untagged budgets into ungrouped', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    expect(result.ungrouped).toBe(1000);
  });

  it('unallocated = income − (allocated + ungrouped)', () => {
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    // need=8000 + want=2000 + savings=0 + ungrouped=1000 = 11000
    // unallocated = 20000 − 11000 = 9000
    expect(result.unallocated).toBe(9000);
  });
});

describe('computeBuckets — status', () => {
  it('need/want: on-track when allocated <= target', () => {
    const cats = [makeCategory('cat_h', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_h', 5000)]; // target = 10000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.status).toBe('on-track');
  });

  it('need/want: over when allocated > target', () => {
    const cats = [makeCategory('cat_h', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_h', 15000)]; // target = 10000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.status).toBe('over');
  });

  it('savings: ahead when allocated >= target', () => {
    const cats = [makeCategory('cat_s', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_s', 4000)]; // target = 4000 (exactly)
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const sav = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(sav.status).toBe('ahead');
  });

  it('savings: behind when allocated < target', () => {
    const cats = [makeCategory('cat_s', BudgetGroup.Savings)];
    const budgets = [makeBudget('cat_s', 1000)]; // target = 4000
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const sav = result.buckets.find((b) => b.group === BudgetGroup.Savings)!;
    expect(sav.status).toBe('behind');
  });
});

describe('computeBuckets — barPct clamped', () => {
  it('barPct is clamped at 1 when over-allocated', () => {
    const cats = [makeCategory('cat_h', BudgetGroup.Need)];
    const budgets = [makeBudget('cat_h', 25000)]; // target = 10000 → ratio = 2.5
    const result = computeBuckets(20000, cats, budgets, {}, MONTH);
    const need = result.buckets.find((b) => b.group === BudgetGroup.Need)!;
    expect(need.barPct).toBe(1);
  });

  it('barPct is 0 when nothing allocated', () => {
    const result = computeBuckets(20000, [], [], {}, MONTH);
    for (const b of result.buckets) {
      expect(b.barPct).toBe(0);
    }
  });
});
```

- [ ] **Step 4: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget_buckets.helpers" --ci
```

Expected: all pass with 100% branch coverage on the helper.

- [ ] **Step 5: Commit**

```bash
git add screens/budget/budget_buckets.helpers.ts \
        __tests__/budget_buckets.helpers.test.ts
git commit -m "feat(budget-lens): computeBuckets helper + 100% branch TDD suite (W3)"
```

---

### Task 6: Lens UI components — `income_sheet.state.ts`, `income_sheet.tsx`, `bucket_card.tsx`, `fifty_thirty_twenty_lens.tsx`

**Files:**
- Create: `screens/budget/components/income_sheet.state.ts`
- Create: `screens/budget/components/income_sheet.tsx`
- Create: `screens/budget/components/bucket_card.tsx`
- Create: `screens/budget/components/fifty_thirty_twenty_lens.tsx`

These files come from the lens branch with one modification: every `import ... from '@/components/ui/bottom_sheet'` is changed to `@/components/ui/sheet`.

- [ ] **Step 1: Create `screens/budget/components/income_sheet.state.ts`**

This file has no `bottom_sheet` import. Copy verbatim:

```typescript
import { create } from 'zustand';

interface IncomeSheetStateShape {
  isOpen: boolean;
  amountText: string;
  suggestion: number | null;
}

interface IncomeSheetState {
  state: IncomeSheetStateShape;
  open: (suggestion: number | null, currentIncome: number | null) => void;
  close: () => void;
  setAmountText: (text: string) => void;
  reset: () => void;
}

const INITIAL_STATE: IncomeSheetStateShape = {
  isOpen: false,
  amountText: '',
  suggestion: null,
};

export const useIncomeSheetState = create<IncomeSheetState>((set) => ({
  state: INITIAL_STATE,

  open: (suggestion, currentIncome) =>
    set((s) => ({
      state: {
        ...s.state,
        isOpen: true,
        suggestion,
        amountText:
          currentIncome !== null
            ? String(currentIncome)
            : suggestion !== null
              ? String(suggestion)
              : '',
      },
    })),

  close: () => set((s) => ({ state: { ...s.state, isOpen: false } })),

  setAmountText: (text) => set((s) => ({ state: { ...s.state, amountText: text } })),

  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create `screens/budget/components/income_sheet.tsx`**

Copy from lens branch with the import path fixed (`bottom_sheet` → `sheet`):

```typescript
import { Button } from 'heroui-native';
import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Sheet, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { useIncomeSheetState } from '@/screens/budget/components/income_sheet.state';
import { useBudgetStore } from '@/store/budget.store';
import { ms } from '@/utils/responsive';

export function IncomeSheet() {
  const { sheetState, close, setAmountText } = useIncomeSheetState(
    useShallow((s) => ({
      sheetState: s.state,
      close: s.close,
      setAmountText: s.setAmountText,
    })),
  );
  const { setExpectedIncome } = useBudgetStore(
    useShallow((s) => ({ setExpectedIncome: s.setExpectedIncome })),
  );
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const handleSave = async () => {
    const amount = parseFloat(sheetState.amountText);
    if (!isFinite(amount) || amount <= 0) return;
    await setExpectedIncome(amount);
    close();
  };

  return (
    <Sheet
      isOpen={sheetState.isOpen}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      title={Strings.incomeSheetTitle}
      size="sm"
      footer={
        <Button
          variant="primary"
          label={Strings.incomeSheetSaveCta}
          onPress={() => {
            void handleSave();
          }}
        />
      }
    >
      <View style={styles.body}>
        <Text style={styles.label}>{Strings.incomeSheetAmountLabel}</Text>
        <View style={styles.field}>
          <TextInput
            value={sheetState.amountText}
            onChangeText={setAmountText}
            onFocus={onFocus}
            onBlur={onBlur}
            keyboardType="number-pad"
            placeholder={Strings.incomeSheetAmountPlaceholder}
            placeholderTextColor={Colors.dark.text3}
            style={styles.input}
            accessibilityLabel={Strings.incomeSheetAmountLabel}
          />
          <Text style={styles.suffix}>EGP</Text>
        </View>
        {sheetState.suggestion !== null &&
          sheetState.amountText === String(sheetState.suggestion) && (
            <Text style={styles.suggestionNote}>{Strings.incomeSheetSuggestionNote}</Text>
          )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  body: { paddingHorizontal: Spacing.md, paddingTop: Spacing.xs },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderWidth: ms(1.5),
    borderColor: Colors.dark.gold,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  input: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    padding: 0,
  },
  suffix: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text2 },
  suggestionNote: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
});
```

Note on `Button` footer: the lens branch used `<Button><Button.Label>...</Button.Label></Button>`. This branch uses `variant="primary" label={...}` which is the project's established pattern — use that form.

- [ ] **Step 3: Create `screens/budget/components/bucket_card.tsx`**

Copy verbatim from lens branch (no `bottom_sheet` import in this file):

```typescript
import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { BucketStatus, BucketVM } from '@/screens/budget/budget_buckets.helpers';
import { ms } from '@/utils/responsive';

export interface BucketCardProps {
  vm: BucketVM;
  currency?: string;
}

const BUCKET_LABELS: Record<BudgetGroup, string> = {
  [BudgetGroup.Need]: Strings.budget5030NeedLabel,
  [BudgetGroup.Want]: Strings.budget5030WantLabel,
  [BudgetGroup.Savings]: Strings.budget5030SavingsLabel,
};

const BUCKET_PCTS: Record<BudgetGroup, string> = {
  [BudgetGroup.Need]: Strings.budget5030NeedPct,
  [BudgetGroup.Want]: Strings.budget5030WantPct,
  [BudgetGroup.Savings]: Strings.budget5030SavingsPct,
};

const STATUS_LABELS: Record<BucketStatus, string> = {
  'on-track': Strings.budget5030StatusOnTrack,
  over: Strings.budget5030StatusOver,
  ahead: Strings.budget5030StatusAhead,
  behind: Strings.budget5030StatusBehind,
};

const STATUS_TEXT_COLORS: Record<BucketStatus, string> = {
  'on-track': Colors.dark.positive,
  over: Colors.dark.negative,
  ahead: Colors.dark.positive,
  behind: Colors.dark.warning,
};

const STATUS_BG_COLORS: Record<BucketStatus, string> = {
  'on-track': 'rgba(76, 175, 130, 0.12)',
  over: Colors.dark.dangerBg,
  ahead: 'rgba(76, 175, 130, 0.12)',
  behind: Colors.dark.warningBg,
};

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.round(amount))}`;
}

export function BucketCard({ vm, currency = 'EGP' }: BucketCardProps) {
  const { group, target, allocated, spent, barPct, spendFillPct, status } = vm;

  const label = BUCKET_LABELS[group];
  const pctLabel = BUCKET_PCTS[group];
  const statusLabel = STATUS_LABELS[status];
  const statusTextColor = STATUS_TEXT_COLORS[status];
  const statusBgColor = STATUS_BG_COLORS[status];

  const allocatedPct = target > 0 ? Math.round((allocated / target) * 100) : 0;
  const spentPct = allocated > 0 ? Math.round((spent / allocated) * 100) : 0;

  return (
    <Card className="mb-3 rounded-xl p-0" style={{ elevation: 0, shadowOpacity: 0 }}>
      <Card.Body className="gap-0 p-4">
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: Spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
            <Text
              style={{
                fontFamily: FontFamily.soraBold,
                fontSize: Type.body,
                color: Colors.dark.text1,
              }}
            >
              {label}
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
              }}
            >
              {pctLabel}
            </Text>
          </View>

          <View
            style={{
              backgroundColor: statusBgColor,
              paddingHorizontal: Spacing.xs,
              paddingVertical: ms(3),
              borderRadius: Radius.pill,
            }}
          >
            <Text
              style={{
                fontFamily: FontFamily.interSemi,
                fontSize: Type.micro,
                color: statusTextColor,
              }}
            >
              {statusLabel}
            </Text>
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: Spacing.sm,
          }}
        >
          <View>
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
                marginBottom: ms(2),
              }}
            >
              {Strings.budget5030AllocatedLabel}
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.soraBold,
                fontSize: Type.body,
                color: Colors.dark.text1,
              }}
            >
              {formatAmount(allocated, currency)}
            </Text>
          </View>

          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
                marginBottom: ms(2),
              }}
            >
              {Strings.budget5030TargetLabel}
            </Text>
            <Text
              style={{
                fontFamily: FontFamily.soraBold,
                fontSize: Type.body,
                color: Colors.dark.text1,
              }}
            >
              {formatAmount(target, currency)}
            </Text>
          </View>
        </View>

        <View
          style={{
            height: ms(8),
            backgroundColor: Colors.dark.surfaceEl,
            borderRadius: Radius.sm,
            overflow: 'hidden',
            marginBottom: ms(4),
          }}
        >
          <View
            style={{
              height: '100%',
              width: `${barPct * 100}%`,
              backgroundColor: Colors.dark.border,
              borderRadius: Radius.sm,
              overflow: 'hidden',
            }}
          >
            <View
              style={{
                height: '100%',
                width: `${spendFillPct * 100}%`,
                backgroundColor: statusTextColor,
                borderRadius: Radius.sm,
              }}
            />
          </View>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            marginBottom: group === BudgetGroup.Savings ? Spacing.sm : 0,
          }}
        >
          <Text
            style={{
              fontFamily: FontFamily.interRegular,
              fontSize: Type.micro,
              color: Colors.dark.text2,
            }}
          >
            {`${allocatedPct}% ${Strings.budget5030AllocatedLabel.toLowerCase()}`}
          </Text>

          {allocated > 0 && (
            <Text
              style={{
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
                color: Colors.dark.text2,
              }}
            >
              {`${spentPct}% ${Strings.budgetSummarySpent.toLowerCase()}`}
            </Text>
          )}
        </View>

        {group === BudgetGroup.Savings && (
          <Text
            style={{
              fontFamily: FontFamily.interRegular,
              fontSize: Type.micro,
              color: Colors.dark.text2,
              fontStyle: 'italic',
            }}
          >
            {Strings.budget5030SavingsCaption}
          </Text>
        )}
      </Card.Body>
    </Card>
  );
}
```

- [ ] **Step 4: Create `screens/budget/components/fifty_thirty_twenty_lens.tsx`**

Copy verbatim from lens branch (no `bottom_sheet` import):

```typescript
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { BucketsVM } from '@/screens/budget/budget_buckets.helpers';
import { BucketCard } from '@/screens/budget/components/bucket_card';
import { IncomeSheet } from '@/screens/budget/components/income_sheet';
import { useIncomeSheetState } from '@/screens/budget/components/income_sheet.state';

interface FiftyThirtyTwentyLensProps {
  vm: BucketsVM;
  suggestion: number | null;
  currency?: string;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${new Intl.NumberFormat('en-US', { style: 'decimal' }).format(Math.round(Math.abs(amount)))}`;
}

export function FiftyThirtyTwentyLens({
  vm,
  suggestion,
  currency = 'EGP',
}: FiftyThirtyTwentyLensProps) {
  const { openIncomeSheet } = useIncomeSheetState(useShallow((s) => ({ openIncomeSheet: s.open })));

  const handleEditIncome = () => {
    openIncomeSheet(suggestion, vm.hasIncome ? vm.income : null);
  };

  return (
    <>
      <View style={styles.incomeHeader}>
        {vm.hasIncome ? (
          <>
            <View>
              <Text style={styles.incomeCaption}>{Strings.budget5030MonthlyIncome}</Text>
              <Text style={styles.incomeAmount}>{formatAmount(vm.income, currency)}</Text>
            </View>
            <Text style={styles.editLink} onPress={handleEditIncome} accessibilityRole="button">
              {Strings.budget5030EditIncome}
            </Text>
          </>
        ) : (
          <View style={styles.ctaCard}>
            <Text style={styles.ctaTitle}>{Strings.budget5030SetIncomeCta}</Text>
            <Text style={styles.ctaBody}>{Strings.budget5030SetIncomeCtaBody}</Text>
            <Text style={styles.ctaAction} onPress={handleEditIncome} accessibilityRole="button">
              {Strings.budget5030SetIncomeCta}
            </Text>
          </View>
        )}
      </View>

      {vm.hasIncome && (
        <>
          {vm.buckets.map((bucket) => (
            <BucketCard key={bucket.group} vm={bucket} currency={currency} />
          ))}

          <View style={styles.footer}>
            {vm.ungrouped > 0 && (
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>{Strings.budget5030Ungrouped}</Text>
                <Text style={styles.footerAmount}>{formatAmount(vm.ungrouped, currency)}</Text>
              </View>
            )}
            <View style={styles.footerRow}>
              {vm.unallocated >= 0 ? (
                <>
                  <Text style={styles.footerLabel}>{Strings.budget5030Unallocated}</Text>
                  <Text style={styles.footerAmount}>{formatAmount(vm.unallocated, currency)}</Text>
                </>
              ) : (
                <>
                  <Text style={[styles.footerLabel, { color: Colors.dark.negative }]}>
                    {Strings.budget5030OverAllocated}
                  </Text>
                  <Text style={[styles.footerAmount, { color: Colors.dark.negative }]}>
                    {formatAmount(Math.abs(vm.unallocated), currency)}
                  </Text>
                </>
              )}
            </View>
          </View>
        </>
      )}

      <IncomeSheet />
    </>
  );
}

const styles = StyleSheet.create({
  incomeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  incomeCaption: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: ms(2),
  },
  incomeAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  editLink: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
  },
  ctaCard: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.xs,
  },
  ctaTitle: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  ctaBody: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  ctaAction: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.gold,
    marginTop: Spacing.xs,
  },
  footer: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    gap: Spacing.xs,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  footerAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
});

function ms(n: number): number {
  // The lens file uses ms() — import it rather than defining it inline.
  // Replace this stub: import { ms } from '@/utils/responsive';
  return n;
}
```

**Important:** The `ms` stub above is a reminder — the actual file should import `ms` from `@/utils/responsive` at the top, not define it inline. The import line should be:

```typescript
import { ms } from '@/utils/responsive';
```

And the stub `function ms` at the bottom of the file should be removed.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors. If `Colors.dark.warning` or `Colors.dark.warningBg` or `Colors.dark.dangerBg` are flagged as unknown, open `constants/theme.ts` and verify these token names. If they differ (e.g. `Colors.dark.warn`), fix the references in `bucket_card.tsx` to match the actual token names.

- [ ] **Step 6: Commit**

```bash
git add screens/budget/components/income_sheet.state.ts \
        screens/budget/components/income_sheet.tsx \
        screens/budget/components/bucket_card.tsx \
        screens/budget/components/fifty_thirty_twenty_lens.tsx
git commit -m "feat(budget-lens): lens UI components — IncomeSheet, BucketCard, FiftyThirtyTwentyLens (W4)"
```

---

### Task 7: `budget.hook.ts` — graft lens additions onto existing redesign hook

**Files:**
- Modify: `screens/budget/budget.hook.ts`

The current hook has: `rows`, `overall`, `daysLeft`, `budgetableCategories`, `hasBudgets`, `openAdd`, `openEdit`, `goToCategory`. The lens adds: `suggestion` state + trailing-income fetch, `buckets` memo, `lensTab` + `setLensTab` from state. No redesign content is removed.

- [ ] **Step 1: Update `screens/budget/budget.hook.ts`**

Replace the file contents with the merged version:

```typescript
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { getTrailingIncomeSuggestion } from '@/database/budget_stats';
import { getDb } from '@/database/client';
import { currentYearMonth } from '@/repositories/budget.repository';
import {
  type CategoryBudgetVM,
  computeCategoryRow,
  computeOverall,
  resolveLimitForMonth,
} from '@/screens/budget/budget.helpers';
import { useBudgetState, type LensTab } from '@/screens/budget/budget.state';
import { computeBuckets, type BucketsVM } from '@/screens/budget/budget_buckets.helpers';
import { useBudgetStore } from '@/store/budget.store';
import { useCategoryStore } from '@/store/category.store';

export interface CategoryBudgetRowVM extends CategoryBudgetVM {
  name: string;
  icon: string;
  color: string;
}

export function useBudget() {
  const router = useRouter();
  const [month, setMonth] = useState(currentYearMonth);
  const [suggestion, setSuggestion] = useState<number | null>(null);

  const { categories, loadCategories } = useCategoryStore(
    useShallow((s) => ({ categories: s.state.categories, loadCategories: s.loadCategories })),
  );
  const { budgetState, load } = useBudgetStore(
    useShallow((s) => ({ budgetState: s.state, load: s.load })),
  );
  const { openAdd, openEdit, lensTab, setLensTab } = useBudgetState(
    useShallow((s) => ({
      openAdd: s.openAdd,
      openEdit: s.openEdit,
      lensTab: s.state.lensTab,
      setLensTab: s.setLensTab,
    })),
  );

  useFocusEffect(
    useCallback(() => {
      setMonth(currentYearMonth());
      void loadCategories();
      void load();
      void (async () => {
        try {
          const db = await getDb();
          const s = await getTrailingIncomeSuggestion(db, currentYearMonth());
          setSuggestion(s);
        } catch {
          setSuggestion(null);
        }
      })();
    }, [loadCategories, load]),
  );

  const rows: CategoryBudgetRowVM[] = useMemo(() => {
    const out: CategoryBudgetRowVM[] = [];
    for (const c of categories) {
      if (c.type !== CategoryType.Expense) continue;
      const limit = resolveLimitForMonth(budgetState.rows, c.id, month);
      if (limit === null) continue;
      const spent = budgetState.spendByMonth[c.id]?.[month] ?? 0;
      out.push({
        ...computeCategoryRow(c.id, limit, spent),
        name: c.name,
        icon: c.icon,
        color: c.color,
      });
    }
    return out;
  }, [categories, budgetState.rows, budgetState.spendByMonth, month]);

  const overall = useMemo(() => computeOverall(rows), [rows]);

  const buckets: BucketsVM = useMemo(
    () =>
      computeBuckets(
        budgetState.expectedIncome ?? 0,
        categories,
        budgetState.rows,
        budgetState.spendByMonth,
        month,
      ),
    [categories, budgetState.rows, budgetState.spendByMonth, budgetState.expectedIncome, month],
  );

  const budgetableCategories = useMemo(
    () =>
      categories.filter(
        (c) =>
          c.type === CategoryType.Expense &&
          resolveLimitForMonth(budgetState.rows, c.id, month) === null,
      ),
    [categories, budgetState.rows, month],
  );

  const daysLeft = useMemo(() => {
    const [y, m] = month.split('-').map(Number);
    const lastDay = new Date(y, m, 0).getDate();
    const today = new Date();
    const isCurrent = currentYearMonth(today) === month;
    return isCurrent ? Math.max(0, lastDay - today.getDate()) : 0;
  }, [month]);

  const goToCategory = (categoryId: string) => {
    router.push(`/(app)/(tabs)/budget/${categoryId}`);
  };

  return {
    state: {
      rows,
      overall,
      month,
      daysLeft,
      hasBudgets: rows.length > 0,
      budgetableCategories,
      buckets,
      suggestion,
      lensTab,
    },
    openAdd,
    openEdit,
    setLensTab,
    goToCategory,
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors. `budgetState.expectedIncome` now exists (Task 4). `computeBuckets` now accepts `Category[]` with `budget_group` field (Task 2).

- [ ] **Step 3: Run budget hook test**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm test -- --testPathPattern="budget_month_rollover.hook" --ci
```

Expected: passes. If the test mocks `useBudgetState` and doesn't include `lensTab`/`setLensTab`, add them to the mock return object (both tests are logic-only `.ts` files so they mock the stores).

- [ ] **Step 4: Commit**

```bash
git add screens/budget/budget.hook.ts
git commit -m "feat(budget-lens): graft buckets + lensTab + suggestion into budget hook (W5)"
```

---

### Task 8: `index.tsx` — graft Tabs wrapper onto redesign's swipe wiring

**Files:**
- Modify: `screens/budget/index.tsx`

Resolution rule: start from our redesign's version, graft in the lens's `Tabs` wrapper + `setLensTab` + `FiftyThirtyTwentyLens` + conditional header/body rendering. Keep all redesign content: `useConfirmAction`, `removeBudget`, `useFocusEffect` blur-close, `BudgetDeleteConfirmSheet`, `openEdit`, `onEdit`/`onDelete` props on `CategoryBudgetRow`, `inset` style on `SummaryCard`, section label.

- [ ] **Step 1: Replace `screens/budget/index.tsx`**

```typescript
import { Tabs } from 'heroui-native';
import { useFocusEffect } from 'expo-router';
import React, { useCallback } from 'react';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { useBudget } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { BudgetDeleteConfirmSheet } from '@/screens/budget/components/budget_delete_confirm_sheet';
import { CategoryBudgetRow } from '@/screens/budget/components/category_budget_row';
import { FiftyThirtyTwentyLens } from '@/screens/budget/components/fifty_thirty_twenty_lens';
import { SetBudgetSheet } from '@/screens/budget/components/set_budget_sheet';
import { SummaryCard } from '@/screens/budget/components/summary_card';
import { useBudgetStore } from '@/store/budget.store';
import { ms } from '@/utils/responsive';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

export default function BudgetScreen() {
  const { state, openAdd, openEdit, setLensTab, goToCategory } = useBudget();
  const editingTargetId = useBudgetState((s) => s.state.targetCategoryId);
  const editingRow = state.rows.find((r) => r.categoryId === editingTargetId);

  const { removeBudget } = useBudgetStore(useShallow((s) => ({ removeBudget: s.removeBudget })));

  const {
    pendingPayload: pendingDelete,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<{ id: string; name: string }>(({ id }) => removeBudget(id));

  useFocusEffect(
    useCallback(() => {
      return () => closeAllRows();
    }, []),
  );

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.budgetTitle}</Text>
        {state.lensTab === 'categories' &&
          state.hasBudgets &&
          state.budgetableCategories.length > 0 && (
            <Text style={styles.addBtn} onPress={openAdd} accessibilityRole="button">
              {`+ ${Strings.budgetAddCategory}`}
            </Text>
          )}
      </View>

      <Tabs
        value={state.lensTab}
        onValueChange={(key) => {
          if (key === 'categories' || key === 'fiftythirty') setLensTab(key);
        }}
      >
        <Tabs.List className="mx-4 mt-2 mb-2 self-stretch">
          <Tabs.Indicator />
          <Tabs.Trigger value="categories" className="flex-1">
            <Tabs.Label>{Strings.budget5030TabCategories}</Tabs.Label>
          </Tabs.Trigger>
          <Tabs.Trigger value="fiftythirty" className="flex-1">
            <Tabs.Label>{Strings.budget5030TabLens}</Tabs.Label>
          </Tabs.Trigger>
        </Tabs.List>
      </Tabs>

      {state.lensTab === 'categories' ? (
        state.hasBudgets ? (
          <ScreenScroll contentContainerStyle={styles.content}>
            <View style={styles.inset}>
              <SummaryCard overall={state.overall} daysLeft={state.daysLeft} />
            </View>
            <Text style={styles.section}>{Strings.budgetDetailCategories}</Text>
            {state.rows.map((row) => (
              <CategoryBudgetRow
                key={row.categoryId}
                row={row}
                onPress={() => goToCategory(row.categoryId)}
                onEdit={() => openEdit(row.categoryId)}
                onDelete={() => requestDelete({ id: row.categoryId, name: row.name })}
              />
            ))}
          </ScreenScroll>
        ) : (
          <EmptyState variant="budget" onAction={openAdd} />
        )
      ) : (
        <ScreenScroll contentContainerStyle={styles.content}>
          <FiftyThirtyTwentyLens vm={state.buckets} suggestion={state.suggestion} />
        </ScreenScroll>
      )}

      <SetBudgetSheet budgetableCategories={state.budgetableCategories} editingRow={editingRow} />

      <BudgetDeleteConfirmSheet
        isOpen={pendingDelete !== null}
        categoryName={pendingDelete?.name ?? ''}
        busy={deleteBusy}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.title, color: Colors.dark.text1 },
  addBtn: { fontFamily: FontFamily.interMedium, fontSize: Type.body, color: Colors.dark.gold },
  content: { paddingBottom: ms(96) },
  inset: { paddingHorizontal: Spacing.md },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
});
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors.

- [ ] **Step 3: Run lint**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run lint
```

Expected: no errors. If the `Tabs` `onValueChange` type-narrowing triggers a lint rule, the existing pattern from the lens branch (`if (key === 'categories' || key === 'fiftythirty') setLensTab(key)`) is the approved pattern.

- [ ] **Step 4: Commit**

```bash
git add screens/budget/index.tsx
git commit -m "feat(budget-lens): integrate Tabs wrapper into budget index (categories + 50/30/20) (W6)"
```

---

### Task 9: `set_budget_sheet.tsx` — graft income/group additions, keep Remove link deleted

**Files:**
- Modify: `screens/budget/components/set_budget_sheet.tsx`

Resolution rule: start from our redesign's current file (Remove link already gone, `size="sm"`, `View` body, `Button variant="primary"`). Graft in lens additions: `BottomSheetScrollView` body, `size="md" scrollable`, `groupValue` state, two `useEffect`s for group sync, `SHEET_FOOTER_CLEARANCE` padding, `RadioGroup` group picker, `setCategoryGroup` call in `onSubmit`. The import `@/components/ui/bottom_sheet` in the lens version becomes `@/components/ui/sheet`. Do NOT add the inline Remove `Pressable` back.

- [ ] **Step 1: Replace `screens/budget/components/set_budget_sheet.tsx`**

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Button, RadioGroup } from 'heroui-native';
import React, { useEffect, useMemo, useState } from 'react';
import { Controller } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { CategoryPickerSheet } from '@/components/sheets/category_picker_sheet';
import {
  Sheet,
  SHEET_FOOTER_CLEARANCE,
  useBottomSheetAwareHandlers,
} from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { setCategoryGroup } from '@/database/categories';
import { getDb } from '@/database/client';
import type { Category } from '@/database/entities/category.entity';
import type { CategoryBudgetRowVM } from '@/screens/budget/budget.hook';
import { useBudgetState } from '@/screens/budget/budget.state';
import { useSetBudgetSheetState } from '@/screens/budget/components/set_budget_sheet.state';
import { useBudgetStore } from '@/store/budget.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import { budgetFormSchema, parseLimit, type BudgetFormValues } from '@/utils/schemas/budget.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

export interface SetBudgetSheetProps {
  budgetableCategories: Category[];
  editingRow?: CategoryBudgetRowVM;
}

const GROUP_OPTIONS: { value: BudgetGroup; label: string }[] = [
  { value: BudgetGroup.Need, label: Strings.budget5030GroupNeed },
  { value: BudgetGroup.Want, label: Strings.budget5030GroupWant },
  { value: BudgetGroup.Savings, label: Strings.budget5030GroupSavings },
];

const BUDGET_GROUP_VALUES: readonly string[] = Object.values(BudgetGroup);
function isBudgetGroup(value: string): value is BudgetGroup {
  return BUDGET_GROUP_VALUES.includes(value);
}

export function SetBudgetSheet({ budgetableCategories, editingRow }: SetBudgetSheetProps) {
  const { sheetState, close } = useBudgetState(
    useShallow((s) => ({ sheetState: s.state, close: s.close })),
  );
  const { setLimit } = useBudgetStore(useShallow((s) => ({ setLimit: s.setLimit })));

  const {
    pickerSheetState,
    initAddMode,
    setSelectedCategoryId,
    togglePicker,
    collapsePicker,
    reset,
  } = useSetBudgetSheetState(
    useShallow((s) => ({
      pickerSheetState: s.state,
      initAddMode: s.initAddMode,
      setSelectedCategoryId: s.setSelectedCategoryId,
      togglePicker: s.togglePicker,
      collapsePicker: s.collapsePicker,
      reset: s.reset,
    })),
  );

  const isEdit = sheetState.mode === 'edit';
  const { onFocus, onBlur } = useBottomSheetAwareHandlers();

  const {
    control,
    handleSubmit,
    reset: resetForm,
  } = useZodForm<BudgetFormValues>(budgetFormSchema, { defaultValues: { limitText: '' } });

  const [groupValue, setGroupValue] = useState<BudgetGroup | null>(null);

  const addModeSelectedCategory = useMemo(
    () => budgetableCategories.find((c) => c.id === pickerSheetState.selectedCategoryId),
    [budgetableCategories, pickerSheetState.selectedCategoryId],
  );

  useEffect(() => {
    if (sheetState.sheetVisible) {
      resetForm({ limitText: isEdit && editingRow ? String(editingRow.limit) : '' });
      if (!isEdit) initAddMode(budgetableCategories[0]?.id);
    } else {
      reset();
    }
  }, [
    sheetState.sheetVisible,
    isEdit,
    editingRow,
    resetForm,
    initAddMode,
    reset,
    budgetableCategories,
  ]);

  useEffect(() => {
    if (!sheetState.sheetVisible) {
      setGroupValue(null);
      return;
    }
    setGroupValue(isEdit ? null : (addModeSelectedCategory?.budget_group ?? null));
  }, [sheetState.sheetVisible, isEdit, addModeSelectedCategory]);

  const editingCategoryName = editingRow?.name;

  const selectedCategoryId = isEdit
    ? sheetState.targetCategoryId
    : pickerSheetState.selectedCategoryId;

  const onSubmit = handleSubmit(async (values) => {
    if (!selectedCategoryId) return;
    await setLimit(selectedCategoryId, parseLimit(values.limitText));
    if (groupValue !== null) {
      const db = await getDb();
      await setCategoryGroup(db, selectedCategoryId, groupValue);
    }
    close();
  });

  return (
    <>
      <Sheet
        isOpen={sheetState.sheetVisible}
        onOpenChange={(open) => {
          if (!open) close();
        }}
        title={isEdit ? Strings.budgetEditTitle : Strings.budgetSetTitle}
        size="md"
        scrollable
        footer={
          <Button
            variant="primary"
            label={Strings.budgetSaveCta}
            onPress={() => void onSubmit()}
          />
        }
      >
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.bodyContent}
        >
          {isEdit ? (
            <View style={[styles.picker, styles.pickerLocked]}>
              <Text style={styles.pickerName}>
                {editingCategoryName ?? Strings.budgetPickCategory}
              </Text>
            </View>
          ) : (
            <Pressable
              style={styles.picker}
              onPress={togglePicker}
              accessibilityRole="button"
              accessibilityLabel={Strings.budgetPickCategory}
            >
              {addModeSelectedCategory ? (
                <View style={styles.pickerContent}>
                  <View
                    style={[
                      styles.categoryIcon,
                      { backgroundColor: `${addModeSelectedCategory.color}22` },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={toIconName(addModeSelectedCategory.icon, 'tag-outline')}
                      size={ms(15)}
                      color={addModeSelectedCategory.color}
                    />
                  </View>
                  <Text style={styles.pickerName}>{addModeSelectedCategory.name}</Text>
                </View>
              ) : (
                <Text style={[styles.pickerName, styles.pickerPlaceholder]}>
                  {Strings.budgetPickCategory}
                </Text>
              )}
              <Text style={styles.chev}>{'›'}</Text>
            </Pressable>
          )}

          <Text style={styles.label}>{Strings.budgetMonthlyLimitLabel}</Text>
          <Controller
            control={control}
            name="limitText"
            render={({ field: { value, onChange }, fieldState }) => (
              <>
                <View style={[styles.field, fieldState.error && styles.fieldError]}>
                  <TextInput
                    value={value}
                    onChangeText={onChange}
                    onFocus={onFocus}
                    onBlur={onBlur}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor={Colors.dark.text3}
                    style={styles.input}
                    accessibilityLabel={Strings.budgetMonthlyLimitLabel}
                  />
                  <Text style={styles.suffix}>EGP</Text>
                </View>
                {fieldState.error && (
                  <Text style={styles.errorText}>{fieldState.error.message}</Text>
                )}
              </>
            )}
          />

          <Text style={[styles.label, styles.groupLabel]}>{Strings.budget5030GroupPickerLabel}</Text>
          <RadioGroup
            value={groupValue ?? undefined}
            onValueChange={(val) => {
              if (isBudgetGroup(val)) setGroupValue(val);
            }}
            accessibilityLabel={Strings.budget5030GroupPickerLabel}
          >
            {GROUP_OPTIONS.map((opt) => (
              <RadioGroup.Item key={opt.value} value={opt.value}>
                {opt.label}
              </RadioGroup.Item>
            ))}
          </RadioGroup>
        </BottomSheetScrollView>
      </Sheet>

      {!isEdit && (
        <CategoryPickerSheet
          isOpen={sheetState.sheetVisible && pickerSheetState.pickerExpanded}
          title={Strings.budgetPickCategory}
          categories={budgetableCategories}
          selectedId={pickerSheetState.selectedCategoryId}
          onSelect={(cat) => setSelectedCategoryId(cat.id)}
          onOpenChange={collapsePicker}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  bodyContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: SHEET_FOOTER_CLEARANCE,
  },
  picker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.dark.surfaceEl,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.md,
  },
  pickerLocked: { opacity: 0.7 },
  pickerContent: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs },
  pickerName: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text1 },
  pickerPlaceholder: { color: Colors.dark.text2 },
  chev: { fontFamily: FontFamily.interRegular, fontSize: Type.title, color: Colors.dark.text2 },
  categoryIcon: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
  },
  groupLabel: { marginTop: Spacing.md },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dark.bg,
    borderWidth: ms(1.5),
    borderColor: Colors.dark.gold,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  fieldError: { borderColor: Colors.dark.negative },
  input: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    padding: 0,
  },
  suffix: { fontFamily: FontFamily.interSemi, fontSize: Type.body, color: Colors.dark.text2 },
  errorText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.negative,
    marginTop: Spacing.xs,
  },
});
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors. `SHEET_FOOTER_CLEARANCE` is exported from `@/components/ui/sheet`. `setCategoryGroup` accepts `BudgetGroup | null`.

- [ ] **Step 3: Commit**

```bash
git add screens/budget/components/set_budget_sheet.tsx
git commit -m "feat(budget-lens): set_budget_sheet — group picker + BottomSheetScrollView + income wiring (W7)"
```

---

### Task 10: `category_detail` — graft edit button from lens

**Files:**
- Modify: `screens/budget/category_detail/category_detail.hook.ts`
- Modify: `screens/budget/category_detail/index.tsx`

The lens adds a pencil icon button to the category detail header that fires `editBudget()` — this opens the `SetBudgetSheet` in edit mode and pops back to the overview. Verify first whether these files already exist unchanged on this branch or were already modified by the redesign.

- [ ] **Step 1: Check if category_detail already has `editBudget`**

```bash
grep -n "editBudget" /Users/musta/Code/projects/practice/MoneyApp/screens/budget/category_detail/category_detail.hook.ts
```

If the grep returns a match, the file is already updated from a prior commit — skip Step 2. If not, proceed.

- [ ] **Step 2: Add `openEdit` + `editBudget` to `category_detail.hook.ts`**

Open `screens/budget/category_detail/category_detail.hook.ts`. Add the import for `useBudgetState`:

```typescript
import { useBudgetState } from '@/screens/budget/budget.state';
```

Add the `useShallow` selector inside `useCategoryDetail`:

```typescript
const { openEdit } = useBudgetState(useShallow((s) => ({ openEdit: s.openEdit })));
```

Add the `editBudget` function to the return object:

```typescript
editBudget: () => {
  if (!id) return;
  router.back();
  openEdit(id);
},
```

- [ ] **Step 3: Add pencil button to `category_detail/index.tsx`**

Open `screens/budget/category_detail/index.tsx`. Add `Pressable` to the RN import if not already present. Destructure `editBudget` from `useCategoryDetail`. Add the button after the title, inside the header row, gated on `state.liveMonth`:

```tsx
{state.liveMonth && (
  <Pressable
    onPress={editBudget}
    hitSlop={ms(8)}
    accessibilityRole="button"
    accessibilityLabel={Strings.budgetEditTitle}
    style={styles.editBtn}
  >
    <MaterialCommunityIcons name="pencil" size={ms(20)} color={Colors.dark.gold} />
  </Pressable>
)}
```

Add the style:

```typescript
editBtn: { padding: ms(4) },
```

Also update the `title` style to `flex: 1` so the pencil doesn't push the title off-screen:

```typescript
title: { flex: 1, fontFamily: FontFamily.soraBold, fontSize: Type.title, color: Colors.dark.text1 },
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add screens/budget/category_detail/category_detail.hook.ts \
        screens/budget/category_detail/index.tsx
git commit -m "feat(budget-lens): category detail — pencil edit button (lens integration W8)"
```

---

### Task 11: Full CI parity gate

**Files:** none new — verification only.

- [ ] **Step 1: Run the full pre-push CI parity chain**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && \
  npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green — safe to push"
```

Expected: all six steps pass and "CI parity green" prints.

- [ ] **Step 2: Fix any failures before pushing**

If `format:check` fails: run `npm run format` and re-stage all modified files.

If `lint` fails: fix the flagged rule, re-run from the top.

If `typecheck` fails: diagnose the type error in the flagged file. Common cause: a lens component references a `Colors.dark.*` token that was renamed in this branch (e.g. `Colors.dark.warning` vs `Colors.dark.gold`, `Colors.dark.dangerBg` vs `Colors.dark.negativeBg`). Fix the reference to match `constants/theme.ts`.

If tests fail on `budget.store.test.ts` after the `setData` arity change from Task 4: verify all `setData([r], {...})` calls in that file have a third `null` argument.

If `expo-doctor` reports a version mismatch: the integration added no new native dependencies, so this should not fire. If it does, check whether `RadioGroup` from `heroui-native` required any native registration not already present.

If `prebuild` fails: the integration adds no new native modules or `app.json` entries — this should not occur.

- [ ] **Step 3: Commit any format-only fixes**

```bash
git add -p   # stage only changed files
git commit -m "chore(budget-lens): format + lint fixes from CI parity gate (W9)"
```

- [ ] **Step 4: Push**

```bash
git push origin feat/swipe-actions-standard
```

---

## Coverage Table — Target End-State vs Tasks

| Target end-state requirement | Task(s) |
|---|---|
| Budget overview shows Tabs: Categories ↔ 50/30/20 | T8 (`index.tsx`) |
| Categories tab: BudgetRing + remaining-first + 5-band colour | Already on branch (redesign) |
| Categories tab: SwipeableRow + Edit/Delete + useConfirmAction + blur-close + inset fix | Already on branch (redesign) |
| 50/30/20 tab: FiftyThirtyTwentyLens + BucketCard + IncomeSheet | T5 (helper), T6 (UI components), T8 (index) |
| set_budget_sheet: income/group additions | T9 |
| set_budget_sheet: Remove link stays deleted | T9 (explicitly excluded) |
| category_budget_row: redesign wins, +9 lens lines already present | Verified in plan — no action needed |
| bottom_sheet → sheet import path fixed (all lens files) | T6 (income_sheet.tsx), T9 (set_budget_sheet.tsx) |
| BudgetGroup enum + Strings | T1 |
| Migration 012 (budget_group column + seeding) | T2 |
| database layer (budget_stats, categories, entity, repository) | T2 |
| Store factory (createBudgetStore + expectedIncome + setExpectedIncome) | T4 |
| State (LensTab + lensTab + setLensTab) | T4 |
| Hook (buckets + suggestion + lensTab) | T7 |
| Category detail pencil edit button | T10 |
| Logic-only tests: migration, query, buckets, state, store | T3, T4, T5 |
| CI parity green | T11 |

---

## Device QA Delta

After pushing, the user walks these scenarios on a real device (these are the incremental checks beyond the redesign's existing QA matrix):

1. **Tab switch:** Budget screen shows two tabs ("Categories" / "50/30/20"). Tapping each tab switches the content area. Navigating away and back restores the last active tab (state persists in Zustand; no reset on unmount).
2. **Categories tab:** Existing redesign QA — ring, remaining-first, 5-band colour, swipe Edit/Delete, confirm sheet, blur-close. Verify the inset fix: summary card and section label are inset; row dividers span full width.
3. **50/30/20 tab — no income set:** Shows the "Set your monthly income" CTA card. Tapping it opens the income sheet. Entering 0 or non-numeric does not save. Entering a valid amount saves and shows bucket cards.
4. **50/30/20 tab — income set:** Shows income header with "Edit" link. Shows three bucket cards (Needs 50%, Wants 30%, Savings 20%). Status chips reflect actual allocation vs targets. Over-allocated total shows negative unallocated in danger colour.
5. **Income sheet:** Pre-fills from trailing 3-month average when available (check against `getTrailingIncomeSuggestion`). Pre-fills with current income when editing. Suggestion note appears only when amount matches suggestion exactly.
6. **Group picker in Set Budget sheet:** In add mode, RadioGroup is pre-selected from the category's seeded `budget_group`. Changing it and saving updates the category's group in SQLite (verify by re-opening — group should persist). In edit mode, no pre-selection (picker starts empty).
7. **50/30/20 math:** Set a category (e.g. Housing) to Need, budget EGP 5,000, income EGP 20,000 → Need target = 10,000, allocated = 5,000, bar at 50%, status "On track".
8. **Category detail pencil:** Tapping pencil pops back to budget overview and opens the edit sheet for that category.
