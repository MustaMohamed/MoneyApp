# Section 4 · Settings — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Settings domain to HeroUI Native + Cairo Nights, retire two legacy `react-native-actions-sheet` consumers, fix the `reassignAndDelete` atomicity bug, activate the transaction-count stub, and ship a minimal About screen — all gated behind the §4 spec.

**Architecture:** Infrastructure tasks (DB, constants, EmptyState) have zero UI coupling and can run in parallel with each other. The two sheet migrations are also mutually independent. UI screen migrations depend only on infrastructure being in place, so they can run in parallel once Task Groups A and B complete.

**Tech Stack:** React Native / Expo · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · HeroUI Native v1.0 · Unistyles 3 (Uniwind) · @gorhom/bottom-sheet v5 · MaterialCommunityIcons · expo-constants

---

## Parallel Execution Map

This plan is structured into five task groups. The human can dispatch `@dev` agents in parallel per group, subject to the dependency rules below:

```
Group A (Infrastructure)  ─── no deps ──► can start immediately
  Task 1: Migration 009 + getCategoryTransactionCount
  Task 2: PROTECTED_CATEGORY_IDS + strings.ts additions
  Task 3: EmptyState categories variant + SettingsSection value fix

Group B (Repository fix)  ─── no deps ──► can start immediately (parallel with A)
  Task 4: reassignAndDelete atomicity fix

Group C (Hook + store)    ─── depends on A + B ──► start after A and B are merged
  Task 5: categories.store.ts + categories.hook.ts

Group D (Sheet migrations) ─── depends on A + C ──► parallel with each other after C
  Task 6: AddEditCategorySheet migration
  Task 7: ReassignCategorySheet migration

Group E (Screen + About)  ─── depends on A + C ──► parallel with D after C
  Task 8: Settings root screen migration
  Task 9: Currency screen migration + fetchError state
  Task 10: Categories screen migration + CategoryRow fix
  Task 11: About screen (new)
```

**Parallel-safe pairs after C merges:** Task 6 and Task 7 can run simultaneously (different files). Tasks 8, 9, 10, and 11 can also run simultaneously (different files).

---

## File Map

### New files
```
database/migrations/009_add_other_income_category.ts
app/(app)/settings/about/index.tsx
screens/settings/about/index.tsx
screens/settings/about/about.hook.ts
__tests__/database/categories.test.ts             (new or extend)
__tests__/repositories/category_repository.test.ts (new or extend)
__tests__/constants/protected_categories.test.ts
__tests__/screens/settings/categories/categories_hook.test.ts (new or extend)
__tests__/screens/settings/about/about_hook.test.ts
```

### Modified files
```
database/categories.ts                 add getCategoryTransactionCount
database/migrations/index.ts           add migration009 import + array entry
constants/enums.ts                     add PROTECTED_CATEGORY_IDS + ProtectedCategoryId
constants/strings.ts                   add §4 copy keys; update categoriesErrNameTooLong
components/ui/empty_state.tsx          add 'categories' variant
components/ui/settings_section.tsx     add numberOfLines to value text
repositories/category.repository.ts   reassignAndDelete atomicity fix
screens/settings/categories/categories.store.ts   add linkedCount
screens/settings/categories/categories.state.ts   add isDeleting
screens/settings/categories/categories.hook.ts    activate getCategoryTransactionCount
screens/settings/categories/components/add_edit_category_sheet.tsx  Sheet migration
screens/settings/categories/components/reassign_category_sheet.tsx  Sheet migration
screens/settings/categories/components/category_row.tsx             PROTECTED_CATEGORY_IDS guard
screens/settings/index.tsx             SettingsSection migration
screens/settings/settings.hook.ts      add goToAbout
screens/settings/currency/index.tsx    Screen/Button/Input migration + fetchError
screens/settings/categories/index.tsx  Screen/Button/EmptyState migration
```

---

## GROUP A — Infrastructure (no dependencies, start immediately)

---

### Task 1: Migration 009 + `getCategoryTransactionCount` query

**Files:**
- Create: `database/migrations/009_add_other_income_category.ts`
- Modify: `database/migrations/index.ts`
- Modify: `database/categories.ts`
- Create: `__tests__/database/categories.test.ts`

- [ ] **Step 1.1: Write the failing test for `getCategoryTransactionCount`**

Create `__tests__/database/categories.test.ts`:

```typescript
import { getCategoryTransactionCount } from '@/database/categories';

// Mock expo-sqlite
const mockGetFirstAsync = jest.fn();
const mockDb = { getFirstAsync: mockGetFirstAsync } as any;

describe('getCategoryTransactionCount', () => {
  beforeEach(() => {
    mockGetFirstAsync.mockReset();
  });

  it('returns 0 when no transactions are linked', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 0 });
    const result = await getCategoryTransactionCount(mockDb, 'cat_groceries');
    expect(result).toBe(0);
    expect(mockGetFirstAsync).toHaveBeenCalledWith(
      'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
      ['cat_groceries'],
    );
  });

  it('returns the correct count when transactions are linked', async () => {
    mockGetFirstAsync.mockResolvedValueOnce({ count: 47 });
    const result = await getCategoryTransactionCount(mockDb, 'cat_groceries');
    expect(result).toBe(47);
  });

  it('returns 0 when db returns null', async () => {
    mockGetFirstAsync.mockResolvedValueOnce(null);
    const result = await getCategoryTransactionCount(mockDb, 'cat_nonexistent');
    expect(result).toBe(0);
  });
});
```

- [ ] **Step 1.2: Run test to confirm it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp
npx jest __tests__/database/categories.test.ts --no-coverage
```

Expected: FAIL — `getCategoryTransactionCount` not found.

- [ ] **Step 1.3: Add `getCategoryTransactionCount` to `database/categories.ts`**

Open `database/categories.ts` and add after the existing `reassignCategory` function:

```typescript
export async function getCategoryTransactionCount(
  db: SQLiteDatabase,
  id: string,
): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id],
  );
  return result?.count ?? 0;
}
```

- [ ] **Step 1.4: Run test to confirm it passes**

```bash
npx jest __tests__/database/categories.test.ts --no-coverage
```

Expected: PASS (3 tests).

- [ ] **Step 1.5: Write the migration test**

Add to `__tests__/database/categories.test.ts` (append after existing describe block):

```typescript
import { migration009 } from '@/database/migrations/009_add_other_income_category';

describe('migration009', () => {
  it('exports version 9', () => {
    expect(migration009.version).toBe(9);
  });

  it('INSERT OR IGNORE sql targets cat_other_income', () => {
    expect(migration009.up).toContain("'cat_other_income'");
    expect(migration009.up).toContain('INSERT OR IGNORE');
    expect(migration009.up).toContain("'income'");
  });
});
```

- [ ] **Step 1.6: Run test to confirm migration test fails**

```bash
npx jest __tests__/database/categories.test.ts --no-coverage
```

Expected: FAIL — migration009 module not found.

- [ ] **Step 1.7: Create `database/migrations/009_add_other_income_category.ts`**

```typescript
export const migration009 = {
  version: 9,
  up: `
    INSERT OR IGNORE INTO categories (id, name, type, icon, color, is_default, sort_order, created_at, updated_at)
    VALUES (
      'cat_other_income',
      'Other Income',
      'income',
      'dots-horizontal',
      '#6B7F99',
      1,
      99,
      '2026-01-01T00:00:00.000Z',
      '2026-01-01T00:00:00.000Z'
    );
  `,
};
```

- [ ] **Step 1.8: Register migration009 in `database/migrations/index.ts`**

Current file ends with `migration008`. Add:

```typescript
import { migration009 } from './009_add_other_income_category';
```

Add `migration009` to the `MIGRATIONS` array as the last entry:

```typescript
export const MIGRATIONS: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
];
```

- [ ] **Step 1.9: Run all tests to confirm all pass**

```bash
npx jest __tests__/database/categories.test.ts --no-coverage
```

Expected: PASS (5 tests).

- [ ] **Step 1.10: Commit**

```bash
git add database/migrations/009_add_other_income_category.ts \
        database/migrations/index.ts \
        database/categories.ts \
        __tests__/database/categories.test.ts
git commit -m "feat(§4): add getCategoryTransactionCount query + migration 009 (cat_other_income)"
```

---

### Task 2: `PROTECTED_CATEGORY_IDS` constant + strings.ts additions

**Files:**
- Modify: `constants/enums.ts`
- Modify: `constants/strings.ts`
- Create: `__tests__/constants/protected_categories.test.ts`

- [ ] **Step 2.1: Write the failing test**

Create `__tests__/constants/protected_categories.test.ts`:

```typescript
import { PROTECTED_CATEGORY_IDS } from '@/constants/enums';

describe('PROTECTED_CATEGORY_IDS', () => {
  it('contains cat_other_expense', () => {
    expect(PROTECTED_CATEGORY_IDS).toContain('cat_other_expense');
  });

  it('contains cat_other_income', () => {
    expect(PROTECTED_CATEGORY_IDS).toContain('cat_other_income');
  });

  it('has exactly 2 entries', () => {
    expect(PROTECTED_CATEGORY_IDS).toHaveLength(2);
  });

  it('isProtected returns true for cat_other_expense', () => {
    const isProtected = (id: string): boolean =>
      (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);
    expect(isProtected('cat_other_expense')).toBe(true);
  });

  it('isProtected returns false for cat_groceries', () => {
    const isProtected = (id: string): boolean =>
      (PROTECTED_CATEGORY_IDS as readonly string[]).includes(id);
    expect(isProtected('cat_groceries')).toBe(false);
  });
});
```

- [ ] **Step 2.2: Run test to confirm it fails**

```bash
npx jest __tests__/constants/protected_categories.test.ts --no-coverage
```

Expected: FAIL — `PROTECTED_CATEGORY_IDS` not exported from `@/constants/enums`.

- [ ] **Step 2.3: Add `PROTECTED_CATEGORY_IDS` to `constants/enums.ts`**

Append at the end of `constants/enums.ts` (after the last enum):

```typescript
export const PROTECTED_CATEGORY_IDS = ['cat_other_expense', 'cat_other_income'] as const;
export type ProtectedCategoryId = (typeof PROTECTED_CATEGORY_IDS)[number];
```

- [ ] **Step 2.4: Run test to confirm it passes**

```bash
npx jest __tests__/constants/protected_categories.test.ts --no-coverage
```

Expected: PASS (5 tests).

- [ ] **Step 2.5: Add §4 copy keys to `constants/strings.ts`**

Open `constants/strings.ts`. Find the line `} as const;` at the end of the file. Insert before it:

```typescript
  // §4 Settings root groups
  settingsGroupPreferences: 'PREFERENCES',
  settingsGroupData: 'DATA',
  settingsGroupAbout: 'ABOUT',
  settingsCurrencyValue: (pair: string) => pair,

  // §4 About screen
  aboutTitle: 'About',
  aboutDataNotice: 'MoneyApp is local-only. All your financial data stays on your device.',
  aboutVersion: (version: string) => `Version ${version}`,
  aboutBuild: (build: string) => `Build ${build}`,

  // §4 Currency screen additions
  currencyFetchError: 'Could not update rate. Try again.',
  currencyFooterNote: 'All balances and analytics are shown in Egyptian Pound (EGP).',

  // §4 Category additions
  categoriesReassignSubtitle: (count: number) =>
    count === 1 ? '1 transaction will be moved' : `${count} transactions will be moved`,

  // §4 EmptyState — categories variant
  emptyStateCategoriesHeadline: 'No categories yet',
  emptyStateCategoriesDescription: 'Your categories will appear here.',
```

Also find the existing `categoriesErrNameTooLong` key and update it:

```typescript
  // BEFORE:
  categoriesErrNameTooLong: 'Name must be 20 characters or less',
  // AFTER:
  categoriesErrNameTooLong: 'Name must be 50 characters or less',
```

- [ ] **Step 2.6: Run TypeScript check to confirm no type errors**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors related to the new keys (the `as const` type widens automatically).

- [ ] **Step 2.7: Commit**

```bash
git add constants/enums.ts \
        constants/strings.ts \
        __tests__/constants/protected_categories.test.ts
git commit -m "feat(§4): PROTECTED_CATEGORY_IDS constant + §4 strings"
```

---

### Task 3: `EmptyState` `categories` variant + `SettingsSection` value truncation fix

**Files:**
- Modify: `components/ui/empty_state.tsx`
- Modify: `components/ui/settings_section.tsx`
- Modify: `__tests__/components/ui/empty_state.test.tsx`

- [ ] **Step 3.1: Write the failing EmptyState test**

Open `__tests__/components/ui/empty_state.test.tsx`. Append a new describe block for the `categories` variant:

```typescript
describe('EmptyState — categories variant', () => {
  it('renders the tag-outline icon', () => {
    const { getByTestId } = render(<EmptyState variant="categories" />);
    // The icon is rendered via MaterialCommunityIcons with name prop
    // We test indirectly via the component rendering without crash and checking text
    expect(getByTestId).toBeTruthy();
  });

  it('renders the correct headline', () => {
    const { getByText } = render(<EmptyState variant="categories" />);
    expect(getByText('No categories yet')).toBeTruthy();
  });

  it('renders the correct description', () => {
    const { getByText } = render(<EmptyState variant="categories" />);
    expect(getByText('Your categories will appear here.')).toBeTruthy();
  });

  it('renders no CTA gradient button', () => {
    const { queryByTestId } = render(<EmptyState variant="categories" />);
    expect(queryByTestId('empty-state-cta-gradient')).toBeNull();
  });

  it('renders no clear-filters text button', () => {
    const { queryByText } = render(<EmptyState variant="categories" />);
    expect(queryByText('Clear Filters')).toBeNull();
  });
});
```

- [ ] **Step 3.2: Run test to confirm it fails**

```bash
npx jest __tests__/components/ui/empty_state.test.tsx --no-coverage
```

Expected: FAIL — `'categories'` is not assignable to `EmptyStateVariant`.

- [ ] **Step 3.3: Add `categories` variant to `components/ui/empty_state.tsx`**

Find the `EmptyStateVariant` type:

```typescript
// BEFORE:
export type EmptyStateVariant = 'accounts' | 'transactions' | 'commitments' | 'filtered';
```

Change to:

```typescript
// AFTER:
export type EmptyStateVariant = 'accounts' | 'transactions' | 'commitments' | 'filtered' | 'categories';
```

Find the `VARIANT_CONFIG` object and add the `categories` entry after `filtered`:

```typescript
  categories: {
    icon: 'tag-outline',
    headline: Strings.emptyStateCategoriesHeadline,
    description: Strings.emptyStateCategoriesDescription,
    ctaLabel: null,
    clearLabel: null,
  },
```

- [ ] **Step 3.4: Run test to confirm it passes**

```bash
npx jest __tests__/components/ui/empty_state.test.tsx --no-coverage
```

Expected: PASS (all tests including new ones).

- [ ] **Step 3.5: Fix value text truncation in `components/ui/settings_section.tsx`**

Find the `valueText` render inside `SettingsSectionRow`. Currently:

```typescript
        {item.value !== undefined && trailing !== 'chevron' && trailing !== 'toggle' && (
          <Text style={styles.valueText}>{item.value}</Text>
        )}
```

Replace with:

```typescript
        {item.value !== undefined && trailing !== 'toggle' && (
          <Text
            style={styles.valueText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {item.value}
          </Text>
        )}
```

Note: The original condition excluded `trailing === 'chevron'` from showing value text — this prevented showing both a value AND a chevron. Per spec, the Currency row needs both `value` and `trailing: 'chevron'`. Remove that exclusion so value text + chevron can coexist.

- [ ] **Step 3.6: Run existing SettingsSection tests to confirm no regression**

```bash
npx jest __tests__/components/ui/settings_section.test.tsx --no-coverage
```

Expected: PASS.

- [ ] **Step 3.7: Commit**

```bash
git add components/ui/empty_state.tsx \
        components/ui/settings_section.tsx \
        __tests__/components/ui/empty_state.test.tsx
git commit -m "feat(§4): EmptyState categories variant + SettingsSection value truncation fix"
```

---

## GROUP B — Repository Fix (no dependencies, start immediately, parallel with Group A)

---

### Task 4: `reassignAndDelete` atomicity fix

**Files:**
- Modify: `repositories/category.repository.ts`
- Create: `__tests__/repositories/category_repository.test.ts`

- [ ] **Step 4.1: Write the failing tests**

Create `__tests__/repositories/category_repository.test.ts`:

```typescript
import { CategoryRepository } from '@/repositories/category.repository';
import * as categoriesDb from '@/database/categories';
import * as dbClient from '@/database/client';

// Mock the DB client
const mockWithTransactionAsync = jest.fn();
const mockRunAsync = jest.fn();
const mockGetFirstAsync = jest.fn();
const mockGetAllAsync = jest.fn();

const mockDb = {
  withTransactionAsync: mockWithTransactionAsync,
  runAsync: mockRunAsync,
  getFirstAsync: mockGetFirstAsync,
  getAllAsync: mockGetAllAsync,
} as any;

jest.spyOn(dbClient, 'getDb').mockResolvedValue(mockDb);

describe('CategoryRepository.reassignAndDelete', () => {
  let repo: CategoryRepository;

  beforeEach(() => {
    repo = new CategoryRepository();
    jest.clearAllMocks();
    // Default: withTransactionAsync calls its callback
    mockWithTransactionAsync.mockImplementation(async (cb: () => Promise<void>) => {
      await cb();
    });
    mockRunAsync.mockResolvedValue(undefined);
  });

  it('wraps all SQL in a single withTransactionAsync call', async () => {
    await repo.reassignAndDelete('cat_groceries', 'cat_food');
    expect(mockWithTransactionAsync).toHaveBeenCalledTimes(1);
  });

  it('updates transactions.category_id (TC-01)', async () => {
    await repo.reassignAndDelete('cat_groceries', 'cat_food');
    expect(mockRunAsync).toHaveBeenCalledWith(
      'UPDATE transactions SET category_id = ? WHERE category_id = ?',
      ['cat_food', 'cat_groceries'],
    );
  });

  it('updates commitments.category_id (TC-02)', async () => {
    await repo.reassignAndDelete('cat_subscriptions', 'cat_entertainment');
    expect(mockRunAsync).toHaveBeenCalledWith(
      'UPDATE commitments SET category_id = ? WHERE category_id = ?',
      ['cat_entertainment', 'cat_subscriptions'],
    );
  });

  it('deletes the source category', async () => {
    await repo.reassignAndDelete('cat_groceries', 'cat_food');
    expect(mockRunAsync).toHaveBeenCalledWith(
      'DELETE FROM categories WHERE id = ?',
      ['cat_groceries'],
    );
  });

  it('issues exactly 3 SQL statements inside the transaction (TC-09)', async () => {
    await repo.reassignAndDelete('cat_groceries', 'cat_food');
    expect(mockRunAsync).toHaveBeenCalledTimes(3);
  });

  it('rolls back on failure — withTransactionAsync is atomic (TC-09)', async () => {
    mockWithTransactionAsync.mockRejectedValueOnce(new Error('DB write failed'));
    await expect(repo.reassignAndDelete('cat_groceries', 'cat_food')).rejects.toThrow(
      'DB write failed',
    );
    // No runAsync calls because the transaction itself threw
    expect(mockRunAsync).not.toHaveBeenCalled();
  });
});

describe('CategoryRepository.add — name uniqueness within type (TC-06)', () => {
  let repo: CategoryRepository;

  beforeEach(() => {
    repo = new CategoryRepository();
    jest.clearAllMocks();
    mockRunAsync.mockResolvedValue(undefined);
  });

  it('throws when a duplicate name+type already exists', async () => {
    // Simulate existing category with same name and type
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: 'cat_existing',
        name: 'My Expenses',
        type: 'expense',
        icon: 'home',
        color: '#fff',
        is_default: 0,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    await expect(
      repo.add({ name: 'My Expenses', type: 'expense', icon: 'home', color: '#fff' }),
    ).rejects.toThrow('already exists');
    expect(mockRunAsync).not.toHaveBeenCalled();
  });

  it('allows the same name under a different type (TC-06 cross-type)', async () => {
    // Existing: "My Expenses" as expense
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: 'cat_existing',
        name: 'My Expenses',
        type: 'expense',
        icon: 'home',
        color: '#fff',
        is_default: 0,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    // Second getAllAsync call for sort_order calculation
    mockGetAllAsync.mockResolvedValueOnce([
      {
        id: 'cat_existing',
        name: 'My Expenses',
        type: 'expense',
        icon: 'home',
        color: '#fff',
        is_default: 0,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    ]);
    // Adding as income — should not throw
    await expect(
      repo.add({ name: 'My Expenses', type: 'income', icon: 'briefcase', color: '#fff' }),
    ).resolves.toBeDefined();
  });

  it('does not modify the type field on update (TC-07)', async () => {
    await repo.update('cat_salary', { name: 'Salary v2', icon: 'briefcase', color: '#4CAF82' });
    // Should only call updateCategory — verify the SQL doesn't contain type
    const call = mockRunAsync.mock.calls[0];
    expect(call[0]).not.toContain('type');
  });
});
```

- [ ] **Step 4.2: Run test to confirm it fails**

```bash
npx jest __tests__/repositories/category_repository.test.ts --no-coverage
```

Expected: FAIL — `withTransactionAsync` called 0 times, `runAsync` called 2 times (not 3).

- [ ] **Step 4.3: Fix `repositories/category.repository.ts`**

Replace the `reassignAndDelete` method. Current code:

```typescript
  async reassignAndDelete(fromId: string, toId: string): Promise<void> {
    const db = await getDb();
    await reassignCategory(db, fromId, toId); // no-op in M2a
    await deleteCategory(db, fromId);
  }
```

New code:

```typescript
  async reassignAndDelete(fromId: string, toId: string): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync(
        'UPDATE transactions SET category_id = ? WHERE category_id = ?',
        [toId, fromId],
      );
      await db.runAsync(
        'UPDATE commitments SET category_id = ? WHERE category_id = ?',
        [toId, fromId],
      );
      await db.runAsync('DELETE FROM categories WHERE id = ?', [fromId]);
    });
  }
```

Also update the `add` method to check for name uniqueness before inserting. Find the `add` method and modify it:

```typescript
  async add(data: NewCategoryInput): Promise<Category> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();

    const existing = await getCategoriesByType(db, data.type);
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sort_order), -1);

    // Name uniqueness check scoped to (name, type)
    const trimmedName = data.name.trim();
    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(`A category with this name already exists in ${data.type}`);
    }

    const category: Category = {
      id,
      name: trimmedName,
      type: data.type,
      icon: data.icon,
      color: data.color,
      is_default: 0,
      sort_order: maxOrder + 1,
      created_at: now,
      updated_at: now,
    };
    await addCategory(db, category);
    return category;
  }
```

Note: `getCategoriesByType` is already imported in the repository. The `add` method already calls it for `maxOrder` — we reuse that result for the uniqueness check.

- [ ] **Step 4.4: Run test to confirm it passes**

```bash
npx jest __tests__/repositories/category_repository.test.ts --no-coverage
```

Expected: PASS (all tests).

- [ ] **Step 4.5: Commit**

```bash
git add repositories/category.repository.ts \
        __tests__/repositories/category_repository.test.ts
git commit -m "fix(§4): reassignAndDelete atomicity — withTransactionAsync + commitments UPDATE + name uniqueness"
```

---

## GROUP C — Hook + Store (depends on Groups A and B)

---

### Task 5: `categories.store.ts` `linkedCount` + `categories.state.ts` `isDeleting` + `categories.hook.ts` activation

**Files:**
- Modify: `screens/settings/categories/categories.store.ts`
- Modify: `screens/settings/categories/categories.state.ts`
- Modify: `screens/settings/categories/categories.hook.ts`
- Create/Modify: `__tests__/screens/settings/categories/categories_hook.test.ts`

- [ ] **Step 5.1: Write the failing tests**

Create `__tests__/screens/settings/categories/categories_hook.test.ts`:

```typescript
// We test the store/state shapes and the hook's logic in isolation.
// The hook itself uses Zustand stores and a router — we test the store shapes
// and the pure logic functions here.

import { useCategoriesScreenStore } from '@/screens/settings/categories/categories.store';
import { useCategoriesScreenState } from '@/screens/settings/categories/categories.state';

describe('useCategoriesScreenStore — linkedCount', () => {
  beforeEach(() => {
    useCategoriesScreenStore.getState().reset();
  });

  it('has linkedCount of 0 in initial state', () => {
    const { state } = useCategoriesScreenStore.getState();
    expect(state.linkedCount).toBe(0);
  });

  it('setLinkedCount updates linkedCount', () => {
    useCategoriesScreenStore.getState().setLinkedCount(47);
    expect(useCategoriesScreenStore.getState().state.linkedCount).toBe(47);
  });

  it('reset sets linkedCount back to 0', () => {
    useCategoriesScreenStore.getState().setLinkedCount(47);
    useCategoriesScreenStore.getState().reset();
    expect(useCategoriesScreenStore.getState().state.linkedCount).toBe(0);
  });
});

describe('useCategoriesScreenState — isDeleting', () => {
  beforeEach(() => {
    useCategoriesScreenState.getState().reset();
  });

  it('has isDeleting of false in initial state', () => {
    const { state } = useCategoriesScreenState.getState();
    expect(state.isDeleting).toBe(false);
  });

  it('setIsDeleting updates isDeleting', () => {
    useCategoriesScreenState.getState().setIsDeleting(true);
    expect(useCategoriesScreenState.getState().state.isDeleting).toBe(true);
  });
});
```

- [ ] **Step 5.2: Run test to confirm it fails**

```bash
npx jest __tests__/screens/settings/categories/categories_hook.test.ts --no-coverage
```

Expected: FAIL — `linkedCount` not in state shape, `setLinkedCount` not a function, `isDeleting` not in state shape.

- [ ] **Step 5.3: Update `categories.store.ts` to add `linkedCount`**

Current file has `INITIAL_STATE` with `editingCategory` and `categoryToDelete`. Add `linkedCount`:

```typescript
// Replace the entire file content:
import { create } from 'zustand';

import type { Category } from '@/store/category.store';

interface CategoriesScreenStoreShape {
  editingCategory: Category | null;
  categoryToDelete: Category | null;
  linkedCount: number;
}

interface CategoriesScreenStore {
  state: CategoriesScreenStoreShape;
  setEditingCategory: (c: Category | null) => void;
  setCategoryToDelete: (c: Category | null) => void;
  setLinkedCount: (count: number) => void;
  reset: () => void;
}

const INITIAL_STATE: CategoriesScreenStoreShape = {
  editingCategory: null,
  categoryToDelete: null,
  linkedCount: 0,
};

export const useCategoriesScreenStore = create<CategoriesScreenStore>((set) => ({
  state: INITIAL_STATE,
  setEditingCategory: (c) => set((s) => ({ state: { ...s.state, editingCategory: c } })),
  setCategoryToDelete: (c) => set((s) => ({ state: { ...s.state, categoryToDelete: c } })),
  setLinkedCount: (count) => set((s) => ({ state: { ...s.state, linkedCount: count } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 5.4: Update `categories.state.ts` to add `isDeleting`**

Current file has `activeTab`, `showAddSheet`, `showDeleteConfirm`, `showReassignSheet`. Add `isDeleting`:

```typescript
// Replace the entire file content:
import { create } from 'zustand';

interface CategoriesScreenStateShape {
  activeTab: 'expense' | 'income';
  showAddSheet: boolean;
  showDeleteConfirm: boolean;
  showReassignSheet: boolean;
  isDeleting: boolean;
}

interface CategoriesScreenState {
  state: CategoriesScreenStateShape;
  setActiveTab: (tab: 'expense' | 'income') => void;
  setShowAddSheet: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowReassignSheet: (v: boolean) => void;
  setIsDeleting: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CategoriesScreenStateShape = {
  activeTab: 'expense',
  showAddSheet: false,
  showDeleteConfirm: false,
  showReassignSheet: false,
  isDeleting: false,
};

export const useCategoriesScreenState = create<CategoriesScreenState>((set) => ({
  state: INITIAL_STATE,
  setActiveTab: (tab) => set((s) => ({ state: { ...s.state, activeTab: tab } })),
  setShowAddSheet: (v) => set((s) => ({ state: { ...s.state, showAddSheet: v } })),
  setShowDeleteConfirm: (v) => set((s) => ({ state: { ...s.state, showDeleteConfirm: v } })),
  setShowReassignSheet: (v) => set((s) => ({ state: { ...s.state, showReassignSheet: v } })),
  setIsDeleting: (v) => set((s) => ({ state: { ...s.state, isDeleting: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 5.5: Run test to confirm store/state tests pass**

```bash
npx jest __tests__/screens/settings/categories/categories_hook.test.ts --no-coverage
```

Expected: PASS (5 tests).

- [ ] **Step 5.6: Update `categories.hook.ts` — activate `getCategoryTransactionCount`**

Open `screens/settings/categories/categories.hook.ts`. Make the following changes:

**Add import at top:**

```typescript
import { getCategoryTransactionCount } from '@/database/categories';
import { getDb } from '@/database/client';
```

**Update the useShallow call for `useCategoriesScreenStore` to include `setLinkedCount`:**

```typescript
  const {
    state: catScreenDataState,
    setEditingCategory,
    setCategoryToDelete,
    setLinkedCount,
  } = useCategoriesScreenStore(
    useShallow((s) => ({
      state: s.state,
      setEditingCategory: s.setEditingCategory,
      setCategoryToDelete: s.setCategoryToDelete,
      setLinkedCount: s.setLinkedCount,
    })),
  );
```

**Update the useShallow call for `useCategoriesScreenState` to include `setIsDeleting`:**

```typescript
  const {
    state: catScreenUiState,
    setActiveTab,
    setShowAddSheet,
    setShowDeleteConfirm,
    setShowReassignSheet,
    setIsDeleting,
  } = useCategoriesScreenState(
    useShallow((s) => ({
      state: s.state,
      setActiveTab: s.setActiveTab,
      setShowAddSheet: s.setShowAddSheet,
      setShowDeleteConfirm: s.setShowDeleteConfirm,
      setShowReassignSheet: s.setShowReassignSheet,
      setIsDeleting: s.setIsDeleting,
    })),
  );
```

**Replace `handleDeletePress`** (the stub function at line 103):

```typescript
  const handleDeletePress = async (category: Category) => {
    setIsDeleting(true);
    try {
      const db = await getDb();
      const count = await getCategoryTransactionCount(db, category.id);
      setLinkedCount(count);
      if (count > 0) {
        openReassignSheet(category);
      } else {
        openDeleteConfirm(category);
      }
    } finally {
      setIsDeleting(false);
    }
  };
```

**Update the returned state** to include `linkedCount` and `isDeleting`:

```typescript
  return {
    state: {
      defaultCategories,
      customCategories,
      isAtLimit,
      activeTab: catScreenUiState.activeTab,
      showAddSheet: catScreenUiState.showAddSheet,
      editingCategory: catScreenDataState.editingCategory,
      categoryToDelete: catScreenDataState.categoryToDelete,
      showDeleteConfirm: catScreenUiState.showDeleteConfirm,
      showReassignSheet: catScreenUiState.showReassignSheet,
      reassignOptions,
      linkedCount: catScreenDataState.linkedCount,
      isDeleting: catScreenUiState.isDeleting,
    },
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    handleSave,
    handleDeletePress,
    handleDeleteConfirm,
    handleReassignConfirm,
    closeDeleteFlow,
    goBack: () => router.back(),
  };
```

- [ ] **Step 5.7: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep -i "categor" | head -20
```

Expected: no errors in categories files.

- [ ] **Step 5.8: Run all current tests**

```bash
npx jest --no-coverage 2>&1 | tail -10
```

Expected: PASS — all existing tests pass; no regressions.

- [ ] **Step 5.9: Commit**

```bash
git add screens/settings/categories/categories.store.ts \
        screens/settings/categories/categories.state.ts \
        screens/settings/categories/categories.hook.ts \
        __tests__/screens/settings/categories/categories_hook.test.ts
git commit -m "feat(§4): categories store/state linkedCount + isDeleting + activate getCategoryTransactionCount"
```

---

## GROUP D — Sheet Migrations (depends on Groups A + C, Tasks 6 and 7 are parallel with each other)

---

### Task 6: Migrate `AddEditCategorySheet` from `react-native-actions-sheet` to `Sheet`

**Files:**
- Modify: `screens/settings/categories/components/add_edit_category_sheet.tsx`

> No unit test file for this component exists. The migration is a controlled UI rewrite with no behavioral logic change beyond the already-tested name uniqueness fix (Task 4) and max-length schema fix. Manual verification is required after coding.

- [ ] **Step 6.1: Confirm `components/ui/sheet.tsx` does not have `keyboardBehavior` on the `BottomSheet` wrapper**

Open `components/ui/sheet.tsx`. Check the `<BottomSheetLib ...>` render. If `keyboardBehavior` is absent, add `keyboardBehavior="extend"` as a prop:

```tsx
<BottomSheetLib
  ref={sheetRef}
  index={visible ? 0 : -1}
  snapPoints={SNAP_POINTS[size]}
  enablePanDownToClose
  onClose={onClose}
  backdropComponent={renderBackdrop}
  handleComponent={SheetHandle}
  footerComponent={footer !== undefined ? renderFooter : undefined}
  backgroundStyle={styles.background}
  keyboardBehavior="extend"
>
```

If `keyboardBehavior="extend"` is already present, skip this step.

- [ ] **Step 6.2: Rewrite `add_edit_category_sheet.tsx`**

Replace the entire file content. The logic (form, state management, icon grid, color swatches) is unchanged. Only the sheet container, scroll wrapper, and imperative ref are replaced:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect } from 'react';
import { type Control, useController } from 'react-hook-form';
import { FlatList, Pressable, View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { z } from 'zod/v4';
import { useShallow } from 'zustand/react/shallow';

import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, Radius, Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useCategoryStore } from '@/store/category.store';
import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

import { useAddEditCategorySheetState } from './add_edit_category_sheet.state';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const CATEGORY_ICONS: IconName[] = [
  'home',
  'food-fork-drink',
  'cart',
  'silverware-fork-knife',
  'bus',
  'car',
  'lightning-bolt',
  'wifi',
  'pill',
  'cellphone',
  'shopping',
  'hanger',
  'school',
  'account-group',
  'hand-heart',
  'gift-outline',
  'gift',
  'receipt',
  'bank-transfer',
  'bank-transfer-out',
  'bank',
  'party-popper',
  'briefcase',
  'lightbulb',
  'chart-line',
  'arrow-down-circle',
  'dots-horizontal',
  'star',
  'heart',
  'music-note',
  'dumbbell',
  'airplane',
];

function createCategorySchema(categories: Category[], editingId?: string, activeType?: string) {
  return z.object({
    name: z
      .string()
      .min(1, Strings.categoriesErrNameRequired)
      .max(50, Strings.categoriesErrNameTooLong)
      .refine(
        (val) =>
          !categories.some(
            (c) =>
              c.name.trim().toLowerCase() === val.trim().toLowerCase() &&
              c.type === (editingId ? c.type : activeType) &&
              c.id !== editingId,
          ),
        Strings.categoriesErrNameDuplicate,
      ),
  });
}

interface AddEditCategorySheetProps {
  visible: boolean;
  editingCategory: Category | null;
  activeTab: 'expense' | 'income';
  onClose: () => void;
  onSave: (data: NewCategoryInput | UpdateCategoryInput) => Promise<void>;
}

export function AddEditCategorySheet({
  visible,
  editingCategory,
  activeTab,
  onClose,
  onSave,
}: AddEditCategorySheetProps) {
  const { state: categoryState } = useCategoryStore(useShallow((s) => ({ state: s.state })));
  const isEditing = editingCategory !== null;

  const {
    state: sheetState,
    setType,
    setSelectedIcon,
    setSelectedColor,
    setIconError,
    setIsLoading,
    initialize,
  } = useAddEditCategorySheetState(
    useShallow((s) => ({
      state: s.state,
      setType: s.setType,
      setSelectedIcon: s.setSelectedIcon,
      setSelectedColor: s.setSelectedColor,
      setIconError: s.setIconError,
      setIsLoading: s.setIsLoading,
      initialize: s.initialize,
    })),
  );

  const schema = createCategorySchema(
    categoryState.categories,
    editingCategory?.id,
    editingCategory?.type ?? activeTab,
  );
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(schema, {
    defaultValues: { name: '' },
  });

  // Initialize form and sheet state when visibility changes
  useEffect(() => {
    if (visible) {
      if (editingCategory) {
        reset({ name: editingCategory.name });
        initialize({
          type: editingCategory.type,
          icon: editingCategory.icon as IconName,
          color: editingCategory.color,
        });
      } else {
        reset({ name: '' });
        initialize({
          type: activeTab as CategoryType,
          icon: null,
          color: AccountColors[0],
        });
      }
    }
  }, [visible, editingCategory, activeTab]);

  const handleSave = handleSubmit(async ({ name }) => {
    if (!sheetState.selectedIcon) {
      setIconError(Strings.categoriesErrIconRequired);
      return;
    }
    setIsLoading(true);
    try {
      await onSave({
        name: name.trim(),
        type: sheetState.type,
        icon: sheetState.selectedIcon,
        color: sheetState.selectedColor,
      });
    } finally {
      setIsLoading(false);
    }
  });

  const footer = (
    <Button
      label={Strings.categoriesSaveCta}
      variant="primary"
      onPress={handleSave}
      isDisabled={sheetState.isLoading}
      isLoading={sheetState.isLoading}
    />
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={isEditing ? Strings.categoriesEditSheetTitle : Strings.categoriesAddSheetTitle}
      size="lg"
      footer={footer}
    >
      <Sheet.Body>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }}
        >
          <Text className="text-muted text-xs font-inter-medium uppercase tracking-wider mb-1 mt-2">
            {Strings.categoriesNameLabel.toUpperCase()}
          </Text>
          <NameField
            control={control}
            placeholder={Strings.categoriesNamePlaceholder}
            error={errors.name?.message}
          />

          {!isEditing && (
            <>
              <Text className="text-muted text-xs font-inter-medium uppercase tracking-wider mb-1 mt-3">
                {Strings.categoriesTypeLabel}
              </Text>
              <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
                {(['expense', 'income'] as const).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setType(t as CategoryType)}
                    style={[
                      {
                        flex: 1,
                        paddingVertical: Spacing.xs,
                        borderRadius: Radius.sm,
                        alignItems: 'center',
                        borderWidth: 1,
                      },
                      sheetState.type === t
                        ? { backgroundColor: Colors.shared.cairoGold, borderColor: Colors.shared.cairoGold }
                        : { backgroundColor: Colors.dark.surfaceEl, borderColor: Colors.dark.border },
                    ]}
                  >
                    <Text
                      className={sheetState.type === t ? 'text-accent-foreground font-sora-semi' : 'text-muted font-inter-medium'}
                    >
                      {t === 'expense' ? Strings.categoriesTabExpense : Strings.categoriesTabIncome}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          )}

          <Text className="text-muted text-xs font-inter-medium uppercase tracking-wider mb-1 mt-3">
            {Strings.categoriesIconLabel}
          </Text>
          {sheetState.iconError ? (
            <Text className="text-danger text-xs font-inter-regular mb-1">
              {sheetState.iconError}
            </Text>
          ) : null}
          {/* FlatList with scrollEnabled=false — lives inside BottomSheetScrollView */}
          <FlatList
            data={CATEGORY_ICONS}
            numColumns={8}
            scrollEnabled={false}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => {
                  setSelectedIcon(item);
                  setIconError('');
                }}
                style={[
                  {
                    flex: 1,
                    aspectRatio: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: Radius.sm,
                    margin: ms(3),
                    backgroundColor: Colors.dark.surfaceEl,
                  },
                  sheetState.selectedIcon === item && {
                    borderWidth: 2,
                    borderColor: Colors.shared.cairoGold,
                  },
                ]}
              >
                <MaterialCommunityIcons
                  name={item}
                  size={20}
                  color={
                    sheetState.selectedIcon === item ? Colors.shared.cairoGold : Colors.dark.text2
                  }
                />
              </Pressable>
            )}
            style={{ marginBottom: Spacing.xs }}
          />

          <Text className="text-muted text-xs font-inter-medium uppercase tracking-wider mb-1 mt-3">
            {Strings.categoriesColorLabel}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm }}>
            {AccountColors.map((c) => (
              <Pressable
                key={c}
                onPress={() => setSelectedColor(c)}
                style={[
                  { width: ms(28), height: ms(28), borderRadius: ms(14), backgroundColor: c },
                  sheetState.selectedColor === c && {
                    borderWidth: 2,
                    borderColor: Colors.dark.text1,
                  },
                ]}
              />
            ))}
          </View>
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}

function NameField({
  control,
  placeholder,
  error,
}: {
  control: Control<{ name: string }>;
  placeholder: string;
  error?: string;
}) {
  const { field } = useController({ control, name: 'name' });
  return (
    <Input
      value={field.value as string}
      onChangeText={field.onChange}
      placeholder={placeholder}
      maxLength={50}
      isInvalid={!!error}
      helperText={error}
    />
  );
}
```

- [ ] **Step 6.3: Run TypeScript check on the modified file**

```bash
npx tsc --noEmit 2>&1 | grep "add_edit_category_sheet" | head -10
```

Expected: no errors.

- [ ] **Step 6.4: Run full test suite to confirm no regressions**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: PASS — all tests pass.

- [ ] **Step 6.5: Commit**

```bash
git add screens/settings/categories/components/add_edit_category_sheet.tsx \
        components/ui/sheet.tsx
git commit -m "feat(§4): migrate AddEditCategorySheet from react-native-actions-sheet to Sheet"
```

---

### Task 7: Migrate `ReassignCategorySheet` from `react-native-actions-sheet` to `Sheet`

**Files:**
- Modify: `screens/settings/categories/components/reassign_category_sheet.tsx`

> This task is parallel-safe with Task 6 — different file, no shared state.

- [ ] **Step 7.1: Rewrite `reassign_category_sheet.tsx`**

Replace the entire file content:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, View } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';
import type { Category } from '@/store/category.store';
import { Sheet } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface ReassignCategorySheetProps {
  visible: boolean;
  categoryName: string;
  linkedCount: number;
  options: Category[];
  onConfirm: (toId: string) => Promise<void>;
  onCancel: () => void;
}

export function ReassignCategorySheet({
  visible,
  categoryName,
  linkedCount,
  options,
  onConfirm,
  onCancel,
}: ReassignCategorySheetProps) {
  const {
    state: reassignState,
    setSelectedId,
    setIsLoading,
  } = useReassignCategorySheetState(
    useShallow((s) => ({
      state: s.state,
      setSelectedId: s.setSelectedId,
      setIsLoading: s.setIsLoading,
    })),
  );

  // Reset sheet state when closing
  const handleClose = () => {
    useReassignCategorySheetState.getState().reset();
    onCancel();
  };

  const handleConfirm = async () => {
    if (!reassignState.selectedId) return;
    setIsLoading(true);
    try {
      await onConfirm(reassignState.selectedId);
    } finally {
      setIsLoading(false);
      setSelectedId(null);
    }
  };

  const footer = (
    <Button
      label={Strings.categoriesReassignConfirm}
      variant="primary"
      onPress={handleConfirm}
      isDisabled={!reassignState.selectedId || reassignState.isLoading}
      isLoading={reassignState.isLoading}
    />
  );

  return (
    <Sheet
      visible={visible}
      onClose={handleClose}
      title={Strings.categoriesReassignTitle(categoryName)}
      size="lg"
      footer={footer}
    >
      <Sheet.Body>
        {/* Subtitle — transaction count signal */}
        <Text
          className="text-muted text-sm font-inter-regular mb-3"
          style={{ paddingHorizontal: Spacing.md }}
        >
          {Strings.categoriesReassignSubtitle(linkedCount)}
        </Text>

        {/* BottomSheetFlatList — required for scrollable list inside Sheet */}
        <BottomSheetFlatList
          data={options}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.xl }}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => setSelectedId(item.id)}
              style={[
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: Spacing.sm,
                  paddingVertical: Spacing.sm,
                  paddingHorizontal: Spacing.sm,
                  borderRadius: Radius.sm,
                  marginBottom: 2,
                },
                reassignState.selectedId === item.id && {
                  backgroundColor: Colors.dark.surfaceEl,
                },
              ]}
            >
              <View
                style={{
                  width: ms(32),
                  height: ms(32),
                  borderRadius: Radius.sm,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: item.color + '22',
                }}
              >
                <MaterialCommunityIcons
                  name={item.icon as IconName}
                  size={Size.iconXs}
                  color={item.color}
                />
              </View>
              <Text className="text-foreground font-inter-medium text-body" style={{ flex: 1 }}>
                {item.name}
              </Text>
              {reassignState.selectedId === item.id && (
                <MaterialCommunityIcons
                  name="check-circle"
                  size={Size.iconXs}
                  color={Colors.shared.cairoGold}
                />
              )}
            </Pressable>
          )}
        />
      </Sheet.Body>
    </Sheet>
  );
}
```

- [ ] **Step 7.2: Update caller in `categories/index.tsx` to pass `linkedCount` prop**

Open `screens/settings/categories/index.tsx`. Find the `<ReassignCategorySheet>` usage and add `linkedCount={state.linkedCount}`:

```tsx
      <ReassignCategorySheet
        visible={state.showReassignSheet}
        categoryName={state.categoryToDelete?.name ?? ''}
        linkedCount={state.linkedCount}
        options={state.reassignOptions}
        onConfirm={handleReassignConfirm}
        onCancel={closeDeleteFlow}
      />
```

- [ ] **Step 7.3: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "reassign" | head -10
```

Expected: no errors.

- [ ] **Step 7.4: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 7.5: Commit**

```bash
git add screens/settings/categories/components/reassign_category_sheet.tsx \
        screens/settings/categories/index.tsx
git commit -m "feat(§4): migrate ReassignCategorySheet from react-native-actions-sheet to Sheet + linkedCount prop"
```

---

## GROUP E — Screen Migrations + About Screen (depends on Groups A + C, parallel within group)

---

### Task 8: Settings root screen migration

**Files:**
- Modify: `screens/settings/index.tsx`
- Modify: `screens/settings/settings.hook.ts`

- [ ] **Step 8.1: Update `settings.hook.ts` to add `goToAbout`**

Replace the file:

```typescript
import { useRouter } from 'expo-router';

export function useSettings() {
  const router = useRouter();

  const goToCurrency = () => router.push('/settings/currency');
  const goToCategories = () => router.push('/settings/categories');
  const goToAbout = () => router.push('/settings/about');
  const goBack = () => router.back();

  return { goToCurrency, goToCategories, goToAbout, goBack };
}
```

- [ ] **Step 8.2: Rewrite `screens/settings/index.tsx`**

Replace the entire file. Remove all `StyleSheet.create`, `SafeAreaView`, hand-rolled cards. Use `Screen`, `ScreenScroll`, and `SettingsSection`:

```typescript
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { SettingsSection } from '@/components/ui/settings_section';
import { Strings } from '@/constants/strings';
import { useSettings } from './settings.hook';

export default function SettingsScreen() {
  const { goToCurrency, goToCategories, goToAbout, goBack } = useSettings();

  return (
    <Screen>
      {/* No custom header — settings uses the stack navigator header from _layout.tsx */}
      <ScreenScroll contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}>
        <SettingsSection
          title={Strings.settingsGroupPreferences}
          items={[
            {
              label: Strings.settingsCurrencyRow,
              icon: 'currency-usd',
              value: Strings.settingsCurrencyValue('EGP'),
              trailing: 'chevron',
              onPress: goToCurrency,
            },
          ]}
        />
        <SettingsSection
          title={Strings.settingsGroupData}
          items={[
            {
              label: Strings.settingsCategoriesRow,
              icon: 'tag-multiple',
              trailing: 'chevron',
              onPress: goToCategories,
            },
          ]}
        />
        <SettingsSection
          title={Strings.settingsGroupAbout}
          items={[
            {
              label: Strings.aboutTitle,
              icon: 'information-outline',
              trailing: 'chevron',
              onPress: goToAbout,
            },
          ]}
        />
      </ScreenScroll>
    </Screen>
  );
}
```

> Note: Check whether `app/(app)/settings/_layout.tsx` exists and provides a stack header with "Settings" as the title. If yes, the `Screen` here needs `edges={['bottom']}` to avoid double-inset for the top. If there is no stack layout header, add a `Header` component manually. Inspect `app/(app)/settings/` before deciding.

- [ ] **Step 8.3: Check the settings stack layout**

```bash
ls /Users/musta/Code/projects/practice/MoneyApp/app/\(app\)/settings/
```

If `_layout.tsx` exists, open it and check if it renders a header. If it does, set `edges={['bottom']}` on `Screen` in `screens/settings/index.tsx`. If no header is rendered, keep `edges={['top', 'bottom']}` (the default) and verify the screen title renders correctly.

- [ ] **Step 8.4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "settings/index" | head -10
```

Expected: no errors.

- [ ] **Step 8.5: Commit**

```bash
git add screens/settings/index.tsx \
        screens/settings/settings.hook.ts
git commit -m "feat(§4): migrate Settings root to SettingsSection x3 groups (Preferences/Data/About)"
```

---

### Task 9: Currency screen migration + fetch-error state

**Files:**
- Modify: `screens/settings/currency/index.tsx`
- Modify: `screens/settings/currency/currency.state.ts`
- Modify: `screens/settings/currency/currency.hook.ts`

- [ ] **Step 9.1: Add `fetchError` to `currency.state.ts`**

Open `screens/settings/currency/currency.state.ts`. Add `fetchError: string` to the state shape:

```typescript
// Replace entire file:
import { create } from 'zustand';

interface CurrencyScreenStateShape {
  isManualPanelOpen: boolean;
  isFetching: boolean;
  isSaving: boolean;
  fetchError: string;
}

interface CurrencyScreenState {
  state: CurrencyScreenStateShape;
  setManualPanelOpen: (v: boolean) => void;
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setFetchError: (msg: string) => void;
  reset: () => void;
}

const INITIAL_STATE: CurrencyScreenStateShape = {
  isManualPanelOpen: false,
  isFetching: false,
  isSaving: false,
  fetchError: '',
};

export function createCurrencyScreenState() {
  return create<CurrencyScreenState>((set) => ({
    state: INITIAL_STATE,
    setManualPanelOpen: (v) => set((s) => ({ state: { ...s.state, isManualPanelOpen: v } })),
    setFetching: (v) => set((s) => ({ state: { ...s.state, isFetching: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, isSaving: v } })),
    setFetchError: (msg) => set((s) => ({ state: { ...s.state, fetchError: msg } })),
    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useCurrencyScreenState = createCurrencyScreenState();
```

- [ ] **Step 9.2: Update `currency.hook.ts` to wire `fetchError`**

Open `screens/settings/currency/currency.hook.ts`. Add `setFetchError` to the useShallow selector and update `handleFetchRate`:

```typescript
  const {
    state: screenState,
    setManualPanelOpen,
    setFetching,
    setSaving,
    setFetchError,
    resetState,
  } = useCurrencyScreenState(
    useShallow((s) => ({
      state: s.state,
      setManualPanelOpen: s.setManualPanelOpen,
      setFetching: s.setFetching,
      setSaving: s.setSaving,
      setFetchError: s.setFetchError,
      resetState: s.reset,
    })),
  );
```

Update `handleFetchRate`:

```typescript
  const handleFetchRate = async () => {
    setFetching(true);
    setFetchError('');
    try {
      await fetchRate();
    } catch {
      setFetchError(Strings.currencyFetchError);
    } finally {
      setFetching(false);
    }
  };
```

Add `fetchError` to the returned state:

```typescript
  return {
    state: {
      rate: currencyState.rate,
      lastFetched: currencyState.lastFetched,
      isManualOverride: currencyState.isManualOverride,
      isManualPanelOpen: screenState.isManualPanelOpen,
      isFetching: screenState.isFetching,
      isSaving: screenState.isSaving,
      fetchError: screenState.fetchError,
    },
    form,
    setManualPanelOpen,
    handleFetchRate,
    handleSaveManualRate,
    goBack,
  };
```

- [ ] **Step 9.3: Rewrite `screens/settings/currency/index.tsx`**

Replace the entire file. Remove `SafeAreaView`, `ScrollView`, `StyleSheet`, `LinearGradient` wrapping CTA. Keep `currency.anim.ts` usage unchanged:

```typescript
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useCurrencyScreen } from './currency.hook';
import { useCurrencyScreenAnim } from './currency.anim';

export default function CurrencyScreen() {
  const { state, setManualPanelOpen, form, handleFetchRate, handleSaveManualRate } =
    useCurrencyScreen();
  const { rate, lastFetched, isManualOverride, isManualPanelOpen, isFetching, isSaving, fetchError } =
    state;
  const { panelEntering, panelExiting } = useCurrencyScreenAnim();
  const {
    control,
    formState: { errors },
  } = form;

  const formattedDate = lastFetched
    ? new Date(lastFetched).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : Strings.currencyNeverFetched;

  return (
    <Screen>
      <ScreenScroll showsVerticalScrollIndicator={false}>
        {/* Rate card */}
        <View className="mx-4 mt-4 bg-surface rounded-2xl p-5 border border-border">
          <Text className="text-muted text-xs font-inter-medium uppercase tracking-wider mb-1">
            {Strings.currencyRateLabel}
          </Text>
          <Text
            className={`font-sora-bold text-4xl ${isManualOverride ? 'text-accent' : 'text-foreground'}`}
          >
            {rate.toFixed(2)}
          </Text>
          <Text className="text-muted text-xs font-inter-regular mt-1">
            {Strings.currencyRateSub}
          </Text>
          {isManualOverride && (
            <View className="self-start mt-2 bg-default border border-accent rounded-full px-2 py-0.5">
              <Text className="text-accent text-xs font-sora-semi">
                {Strings.currencyManualLabel}
              </Text>
            </View>
          )}
          <Text className="text-muted text-xs font-inter-regular mt-3">
            {Strings.currencyLastFetched}: {formattedDate}
          </Text>
        </View>

        {/* Refresh Rate button — secondary (outlined) */}
        <View className="mx-4 mt-3">
          <Button
            label={Strings.currencyFetchCta}
            variant="secondary"
            onPress={handleFetchRate}
            isDisabled={isFetching}
            isLoading={isFetching}
          />
        </View>

        {/* Fetch error message */}
        {fetchError !== '' && (
          <Text className="text-danger text-sm font-inter-regular mx-4 mt-2">
            {fetchError}
          </Text>
        )}

        {/* Manual override toggle row */}
        <View
          className="mx-4 mt-2 flex-row items-center justify-between bg-surface rounded-xl px-4 py-4 border border-border"
          style={{ cursor: 'pointer' } as any}
        >
          <View style={{ flex: 1 }}>
            <Text className="text-foreground font-inter-medium text-base">
              {Strings.currencyManualLabel}
            </Text>
            <Text className="text-muted text-xs font-inter-regular mt-0.5">
              {Strings.currencyManualSub}
            </Text>
          </View>
          <Button
            label={isManualPanelOpen ? '▲' : '▼'}
            variant="ghost"
            onPress={() => setManualPanelOpen(!isManualPanelOpen)}
          />
        </View>

        {/* Manual override panel — animated expansion (anim unchanged) */}
        {isManualPanelOpen && (
          <Animated.View
            entering={panelEntering}
            exiting={panelExiting}
            className="mx-4 mt-2 bg-surface rounded-xl p-4 border border-border"
          >
            <Text className="text-accent text-xs font-sora-bold uppercase tracking-widest mb-2">
              {Strings.currencyRateLabel}
            </Text>
            <Controller
              control={control}
              name="rate"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  keyboardType="decimal-pad"
                  isInvalid={!!errors.rate}
                  helperText={errors.rate?.message}
                />
              )}
            />
            {/* Save Rate button — primary (gold gradient) */}
            <View className="mt-4">
              <Button
                label={Strings.currencySaveCta}
                variant="primary"
                onPress={handleSaveManualRate}
                isDisabled={isSaving}
                isLoading={isSaving}
              />
            </View>
          </Animated.View>
        )}

        {/* Footer note — EGP immutability */}
        <Text className="text-muted text-xs font-inter-regular text-center mx-6 mt-6 mb-8">
          {Strings.currencyFooterNote}
        </Text>
      </ScreenScroll>
    </Screen>
  );
}
```

> Note: The `Button` with `variant="ghost"` for the chevron toggle is a workaround. If `ghost` variant is not available in `components/ui/button.tsx`, use a raw `Pressable` from `react-native` with `MaterialCommunityIcons` `chevron-up` / `chevron-down` — same pattern as the original code.

- [ ] **Step 9.4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "currency" | head -10
```

Expected: no errors.

- [ ] **Step 9.5: Commit**

```bash
git add screens/settings/currency/index.tsx \
        screens/settings/currency/currency.state.ts \
        screens/settings/currency/currency.hook.ts
git commit -m "feat(§4): migrate Currency screen to HeroUI Native + add fetchError inline state"
```

---

### Task 10: Categories screen migration + `CategoryRow` protection fix

**Files:**
- Modify: `screens/settings/categories/index.tsx`
- Modify: `screens/settings/categories/components/category_row.tsx`

- [ ] **Step 10.1: Fix `CategoryRow` — replace `is_default` guard with `PROTECTED_CATEGORY_IDS`**

Open `screens/settings/categories/components/category_row.tsx`. Import `PROTECTED_CATEGORY_IDS` and update the protection logic:

```typescript
// Add import at top:
import { PROTECTED_CATEGORY_IDS, type ProtectedCategoryId } from '@/constants/enums';
```

Replace:

```typescript
  const isDefault = category.is_default === 1;
```

With:

```typescript
  const isProtected = (PROTECTED_CATEGORY_IDS as readonly string[]).includes(category.id);
```

Replace the conditional render:

```typescript
      <View style={styles.right}>
        {isDefault ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={Size.iconXs}
            color={Colors.dark.text2}
          />
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconXs}
                color={Colors.dark.text2}
              />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={Size.iconXs}
                color={Colors.dark.negative}
              />
            </Pressable>
          </View>
        )}
      </View>
```

With:

```typescript
      <View style={styles.right}>
        {isProtected ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={Size.iconXs}
            color={Colors.dark.text2}
          />
        ) : (
          <View style={styles.actions}>
            <Pressable onPress={onEdit} hitSlop={8} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconXs}
                color={Colors.dark.text2}
              />
            </Pressable>
            <Pressable onPress={onDelete} hitSlop={8} style={styles.actionBtn}>
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={Size.iconXs}
                color={Colors.dark.negative}
              />
            </Pressable>
          </View>
        )}
      </View>
```

- [ ] **Step 10.2: Migrate `screens/settings/categories/index.tsx`**

Replace the entire file. Key changes: `SafeAreaView` → `Screen`, tab switcher styles → inline styles with className, `FlashList` kept, bottom CTA → `Button`, add `EmptyState` when list is empty, add `isDeleting` to `onDelete` disable:

```typescript
import { FlashList } from '@shopify/flash-list';
import { Pressable, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Screen } from '@/components/ui/screen';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty_state';
import { Colors, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/store/category.store';
import { useCategories } from './categories.hook';
import { AddEditCategorySheet } from './components/add_edit_category_sheet';
import { CategoryRow } from './components/category_row';
import { DeleteConfirmationDialog } from './components/delete_confirmation_dialog';
import { ReassignCategorySheet } from './components/reassign_category_sheet';

type ListEntry =
  | { type: 'header'; id: string; label: string }
  | { type: 'category'; id: string; category: Category };

function buildListEntries(defaults: Category[], customs: Category[]): ListEntry[] {
  const entries: ListEntry[] = [];
  if (defaults.length > 0) {
    entries.push({ type: 'header', id: 'header-default', label: Strings.categoriesDefaultSection });
    for (const c of defaults) entries.push({ type: 'category', id: c.id, category: c });
  }
  if (customs.length > 0) {
    entries.push({ type: 'header', id: 'header-custom', label: Strings.categoriesCustomSection });
    for (const c of customs) entries.push({ type: 'category', id: c.id, category: c });
  }
  return entries;
}

export default function CategoriesScreen() {
  const {
    state,
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    handleSave,
    handleDeletePress,
    handleDeleteConfirm,
    handleReassignConfirm,
    closeDeleteFlow,
  } = useCategories();

  const isEmpty = state.defaultCategories.length === 0 && state.customCategories.length === 0;
  const listData = buildListEntries(state.defaultCategories, state.customCategories);

  return (
    <Screen>
      {/* Tab switcher */}
      <View
        style={{
          flexDirection: 'row',
          marginHorizontal: Spacing.sm,
          marginTop: Spacing.sm,
          backgroundColor: Colors.dark.surfaceEl,
          borderRadius: Radius.md,
          padding: 3,
          gap: 3,
        }}
      >
        {(['expense', 'income'] as const).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[
              {
                flex: 1,
                paddingVertical: Spacing.xs,
                borderRadius: Radius.sm,
                alignItems: 'center',
              },
              state.activeTab === tab && { backgroundColor: Colors.shared.cairoGold },
            ]}
          >
            <Text
              className={
                state.activeTab === tab
                  ? 'text-accent-foreground font-sora-semi text-base'
                  : 'text-muted font-inter-medium text-base'
              }
            >
              {tab === 'expense' ? Strings.categoriesTabExpense : Strings.categoriesTabIncome}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* List or EmptyState */}
      {isEmpty ? (
        <EmptyState variant="categories" />
      ) : (
        <FlashList<ListEntry>
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: Spacing.sm,
            paddingTop: Spacing.md,
            paddingBottom: Spacing.xxl,
          }}
          getItemType={(item) => item.type}
          renderItem={({ item }) =>
            item.type === 'header' ? (
              <Text className="text-muted text-xs font-inter-medium tracking-wider mb-1">
                {item.label}
              </Text>
            ) : (
              <CategoryRow
                category={item.category}
                onEdit={() => openEditSheet(item.category)}
                onDelete={() => handleDeletePress(item.category)}
                isDeleteDisabled={state.isDeleting}
              />
            )
          }
          estimatedItemSize={56}
        />
      )}

      {/* Bottom CTA or limit message */}
      <View
        className="border-t border-separator pt-2 px-4 pb-6"
      >
        {!state.isAtLimit ? (
          <Button
            label={Strings.categoriesAddBtn}
            variant="primary"
            onPress={openAddSheet}
          />
        ) : (
          <Text className="text-muted text-xs font-inter-regular text-center py-3">
            {Strings.categoriesLimitMsg}
          </Text>
        )}
      </View>

      {/* Sheets and dialogs */}
      <AddEditCategorySheet
        visible={state.showAddSheet}
        editingCategory={state.editingCategory}
        activeTab={state.activeTab}
        onClose={closeSheet}
        onSave={handleSave}
      />

      <DeleteConfirmationDialog
        visible={state.showDeleteConfirm}
        categoryName={state.categoryToDelete?.name ?? ''}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteFlow}
      />

      <ReassignCategorySheet
        visible={state.showReassignSheet}
        categoryName={state.categoryToDelete?.name ?? ''}
        linkedCount={state.linkedCount}
        options={state.reassignOptions}
        onConfirm={handleReassignConfirm}
        onCancel={closeDeleteFlow}
      />
    </Screen>
  );
}
```

- [ ] **Step 10.3: Update `CategoryRow` props to accept `isDeleteDisabled`**

The `CategoryRow` now receives `isDeleteDisabled?: boolean`. Update its interface:

```typescript
interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  isDeleteDisabled?: boolean;
}
```

Update the delete `Pressable`:

```typescript
            <Pressable
              onPress={onDelete}
              hitSlop={8}
              style={styles.actionBtn}
              disabled={isDeleteDisabled}
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={Size.iconXs}
                color={isDeleteDisabled ? Colors.dark.text2 : Colors.dark.negative}
              />
            </Pressable>
```

- [ ] **Step 10.4: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "categor" | head -10
```

Expected: no errors.

- [ ] **Step 10.5: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 10.6: Commit**

```bash
git add screens/settings/categories/index.tsx \
        screens/settings/categories/components/category_row.tsx
git commit -m "feat(§4): migrate Categories screen to HeroUI Native + fix CategoryRow protection guard"
```

---

### Task 11: About screen (new)

**Files:**
- Create: `app/(app)/settings/about/index.tsx`
- Create: `screens/settings/about/index.tsx`
- Create: `screens/settings/about/about.hook.ts`
- Create: `__tests__/screens/settings/about/about_hook.test.ts`

- [ ] **Step 11.1: Write the failing test**

Create `__tests__/screens/settings/about/about_hook.test.ts`:

```typescript
// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      version: '1.2.3',
      extra: {
        buildNumber: '42',
      },
    },
  },
}));

import { useAbout } from '@/screens/settings/about/about.hook';

// Simple test — hook returns synchronously from Constants
describe('useAbout', () => {
  it('returns version from expoConfig', () => {
    const result = useAbout();
    expect(result.state.version).toBe('1.2.3');
  });

  it('returns buildNumber from expoConfig.extra', () => {
    const result = useAbout();
    expect(result.state.build).toBe('42');
  });
});
```

> Note: `useAbout` is a plain function (no hooks), so we can call it directly in the test.

- [ ] **Step 11.2: Run test to confirm it fails**

```bash
npx jest __tests__/screens/settings/about/about_hook.test.ts --no-coverage
```

Expected: FAIL — `useAbout` not found.

- [ ] **Step 11.3: Create `screens/settings/about/about.hook.ts`**

```typescript
import Constants from 'expo-constants';

interface AboutState {
  version: string;
  build: string;
}

interface UseAboutReturn {
  state: AboutState;
}

export function useAbout(): UseAboutReturn {
  const version = Constants.expoConfig?.version ?? '—';
  const build =
    (Constants.expoConfig?.extra?.buildNumber as string | undefined) ??
    Constants.expoConfig?.version ??
    '—';

  return {
    state: {
      version,
      build,
    },
  };
}
```

- [ ] **Step 11.4: Run test to confirm it passes**

```bash
npx jest __tests__/screens/settings/about/about_hook.test.ts --no-coverage
```

Expected: PASS (2 tests).

- [ ] **Step 11.5: Create `screens/settings/about/index.tsx`**

```typescript
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Strings } from '@/constants/strings';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Colors, Spacing } from '@/constants/theme';
import { useAbout } from './about.hook';

export default function AboutScreen() {
  const { state } = useAbout();

  return (
    <Screen>
      <ScreenScroll contentContainerStyle={{ paddingBottom: 48 }}>
        {/* App info card */}
        <View className="mx-4 mt-6 bg-surface rounded-2xl p-6 border border-border items-center">
          {/* App icon placeholder — replace with Image when asset exists */}
          <View
            className="w-20 h-20 rounded-2xl bg-default border border-border items-center justify-center mb-4"
          >
            <MaterialCommunityIcons
              name="chart-line"
              size={40}
              color={Colors.shared.cairoGold}
            />
          </View>

          <Text className="text-foreground font-sora-bold text-xl mb-1">MoneyApp</Text>

          <Text className="text-muted font-inter-regular text-sm">
            {Strings.aboutVersion(state.version)}
          </Text>
          <Text className="text-muted font-inter-regular text-sm mt-0.5">
            {Strings.aboutBuild(state.build)}
          </Text>
        </View>

        {/* Data locality notice */}
        <View className="mx-4 mt-4 bg-surface rounded-xl px-4 py-4 border border-border">
          <Text className="text-muted font-inter-regular text-sm text-center leading-5">
            {Strings.aboutDataNotice}
          </Text>
        </View>
      </ScreenScroll>
    </Screen>
  );
}
```

- [ ] **Step 11.6: Create `app/(app)/settings/about/index.tsx`**

```typescript
export { default } from '@/screens/settings/about';
```

- [ ] **Step 11.7: Run TypeScript check**

```bash
npx tsc --noEmit 2>&1 | grep "about" | head -10
```

Expected: no errors.

- [ ] **Step 11.8: Run full test suite**

```bash
npx jest --no-coverage 2>&1 | tail -5
```

Expected: PASS.

- [ ] **Step 11.9: Commit**

```bash
git add app/\(app\)/settings/about/index.tsx \
        screens/settings/about/index.tsx \
        screens/settings/about/about.hook.ts \
        __tests__/screens/settings/about/about_hook.test.ts
git commit -m "feat(§4): About screen — minimal v1 (version, build, data locality notice)"
```

---

## Final verification

- [ ] **Step F.1: Run the full test suite with coverage**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp
npm run test:coverage
```

Expected thresholds: 80% lines / 95% functions / 100% branches. Fix any failing thresholds before proceeding.

- [ ] **Step F.2: TypeScript full check**

```bash
npx tsc --noEmit
```

Expected: zero errors.

- [ ] **Step F.3: Verify no new imports from `react-native-actions-sheet` in `screens/settings/`**

```bash
grep -r "react-native-actions-sheet" /Users/musta/Code/projects/practice/MoneyApp/screens/settings/
```

Expected: no output (zero matches).

- [ ] **Step F.4: Verify `migration009` is registered**

```bash
grep "migration009" /Users/musta/Code/projects/practice/MoneyApp/database/migrations/index.ts
```

Expected: two lines — the import and the array entry.

- [ ] **Step F.5: Final commit (if any cleanup needed)**

```bash
git add -p   # Stage any remaining changes
git commit -m "chore(§4): final cleanup + coverage fixes"
```

---

## Self-Review Checklist

### Spec coverage

| Spec item | Task covering it |
|---|---|
| Settings root — 3 groups | Task 8 |
| Currency screen migration | Task 9 |
| Categories screen migration | Task 10 |
| AddEditCategorySheet migration | Task 6 |
| ReassignCategorySheet migration | Task 7 |
| DeleteConfirmationDialog — no change | (excluded — no task needed) |
| About screen | Task 11 |
| Migration 009 | Task 1 |
| PROTECTED_CATEGORY_IDS | Task 2 |
| getCategoryTransactionCount | Task 1 |
| reassignAndDelete atomicity | Task 4 |
| Commitments UPDATE in reassign | Task 4 |
| EmptyState categories variant | Task 3 |
| Name uniqueness (name, type) | Task 4 + Task 6 schema fix |
| Name max-length 50 | Task 2 (strings) + Task 6 (schema) |
| Copy keys in strings.ts | Task 2 |
| SettingsSection value truncation | Task 3 |
| CategoryRow PROTECTED_CATEGORY_IDS fix | Task 10 |
| linkedCount prop on ReassignSheet | Task 5 + Task 7 |
| isDeleting guard on delete button | Task 5 + Task 10 |
| keyboardBehavior on Sheet | Task 6 (step 6.1) |
| Security/PIN — deferred (no tasks) | N/A |

All 22 spec items are covered. No gaps found.

### Type consistency check

- `PROTECTED_CATEGORY_IDS` defined in Task 2, used in Task 10 — match confirmed.
- `linkedCount: number` added to `categories.store.ts` in Task 5, returned by hook in Task 5, consumed by `ReassignCategorySheet` in Task 7 and `categories/index.tsx` in Task 10 — prop name consistent.
- `isDeleting: boolean` added to `categories.state.ts` in Task 5, returned by hook in Task 5, passed as `isDeleteDisabled` to `CategoryRow` in Task 10 — prop name consistent.
- `getCategoryTransactionCount` defined in Task 1 (`database/categories.ts`), called in Task 5 (`categories.hook.ts`) — signature match confirmed.
- `fetchError: string` added to `currency.state.ts` in Task 9, returned by hook in Task 9, consumed in `currency/index.tsx` in Task 9 — consistent.
- `migration009` created in Task 1, registered in Task 1 — no drift.
- `emptyStateCategoriesHeadline` / `emptyStateCategoriesDescription` added to `strings.ts` in Task 2, consumed in `empty_state.tsx` in Task 3 — key names match.
- `categoriesReassignSubtitle` added to `strings.ts` in Task 2, used in `reassign_category_sheet.tsx` in Task 7 — match confirmed.
