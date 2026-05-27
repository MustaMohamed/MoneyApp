# Step 3: Categories Module Migration — Implementation Plan

> **Historical execution record:** This plan was written for a one-time Claude
> worktree. Commands may contain absolute local paths or destructive cleanup
> steps. Do not replay commands verbatim. For future work, translate intent into
> repo-relative commands from the current repository root and preserve
> compatibility stubs unless a current plan explicitly removes them.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the categories data layer, repository, store, shared component, and settings screens into `modules/categories/`, adding a `getTransactionCount` method to `ICategoryRepository`, applying HeroUI fixes to every moved file, and leaving backward-compat stubs at the original paths so no consumer outside this module breaks.

**Architecture:** The module follows the same pattern as `modules/accounts/`: canonical code lives under `modules/categories/`, external consumers continue to import from stub paths (`@/store/category.store`, `@/database/entities/category.entity`, `@/components/sheets/category_picker_sheet`) until those consumers migrate. `CategoryRepository` is internal (not barrel-exported). `CategoryPickerSheet` is barrel-exported. The hook `categories.hook.ts` is updated to route `getCategoryTransactionCount` through the repo's new `getTransactionCount` method rather than calling the DB query function directly. Test files are updated in-place to import from the new canonical paths.

**Tech Stack:** React Native (Expo bare workflow), TypeScript strict, Zustand v5, expo-sqlite, HeroUI Native v1.0.3 (`PressableFeedback`, `Text`), heroui-native `Input` via `@/components/ui/input`, Unistyles 3 / Uniwind, oxlint/oxfmt.

---

## File Map

### Files created (new module tree)

```
modules/categories/
  database/categories.ts                                 — copy of database/categories.ts (unchanged SQL)
  entities/category.entity.ts                           — copy of database/entities/category.entity.ts
  repositories/category.repository.ts                   — copy of repositories/category.repository.ts + getTransactionCount method on interface + implementation
  store/category.store.ts                               — copy of store/category.store.ts, imports updated to module-relative
  components/category_picker_sheet.tsx                  — copy of components/sheets/category_picker_sheet.tsx with Pressable → PressableFeedback
  screens/settings/categories/
    index.tsx                                           — copy (import paths updated to module-relative)
    categories.hook.ts                                  — copy (getTransactionCount routed through repo; import paths updated)
    categories.state.ts                                 — copy (no import changes needed)
    categories.store.ts                                 — copy (import path for Category updated)
    components/
      add_edit_category_sheet.tsx                       — copy + HeroUI fixes (Text, Input, PressableFeedback, drop StyleSheet entries)
      add_edit_category_sheet.state.ts                  — copy (no import changes)
      category_row.tsx                                  — copy + HeroUI fix (Pressable → PressableFeedback)
      delete_confirmation_dialog.tsx                    — copy (no changes)
      reassign_category_sheet.tsx                       — copy + HeroUI fixes (Text from heroui-native, Pressable → PressableFeedback)
      reassign_category_sheet.state.ts                  — copy (no import changes)
  index.ts                                              — public barrel
```

### Stubs created (backward-compat re-exports)

```
store/category.store.ts                                 — re-export stub (replaces original)
database/entities/category.entity.ts                    — re-export stub (replaces original)
database/categories.ts                                  — re-export stub (replaces original)
components/sheets/category_picker_sheet.tsx             — re-export stub (replaces original)
```

### Route updated

```
app/(app)/settings/categories/index.tsx                 — update re-export path from @/screens/ to @/modules/categories/screens/
```

### Test files updated in-place

```
__tests__/category.store.test.ts                        — update @/repositories/category.repository imports to new path; update ICategoryRepository type import; add getTransactionCount to ICategoryRepository mock
__tests__/category.repository.test.ts                   — update @/repositories/category.repository import to new path
__tests__/repositories/category_repository.test.ts      — update @/repositories/category.repository import to new path
__tests__/screens/settings/categories/categories_hook.test.ts — update @/store/category.store mock to @/modules/categories/store/category.store; update @/database/categories mock to @/modules/categories/database/categories
__tests__/screens/settings_categories.hook.test.ts      — same two mock path updates as above
```

### Files deleted (Wave D)

```
database/categories.ts               — original (stub takes over)
database/entities/category.entity.ts — original (stub takes over)
repositories/category.repository.ts  — original (internal — no stub needed)
store/category.store.ts              — original (stub takes over)
components/sheets/category_picker_sheet.tsx — original (stub takes over)
screens/settings/categories/         — entire tree
```

---

## Task 1: Create module scaffold and data layer

**Files:**
- Create: `modules/categories/database/categories.ts`
- Create: `modules/categories/entities/category.entity.ts`

- [ ] **Step 1.1: Create `modules/categories/` directory tree**

```bash
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/modules/categories/database
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/modules/categories/entities
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/modules/categories/repositories
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/modules/categories/store
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/modules/categories/components
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/modules/categories/screens/settings/categories/components
```

- [ ] **Step 1.2: Create `modules/categories/entities/category.entity.ts`**

Content is identical to the source file — no import changes needed:

```ts
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

- [ ] **Step 1.3: Create `modules/categories/database/categories.ts`**

The import for `Category` switches from `./entities/category.entity` to the module-relative path. The `reassignCategory` function is kept with a dead-export comment:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

import { type BudgetGroup } from '@/constants/enums';

import type { Category } from '../entities/category.entity';

export async function getCategories(db: SQLiteDatabase): Promise<Category[]> {
  return db.getAllAsync<Category>('SELECT * FROM categories ORDER BY type ASC, sort_order ASC');
}

export async function getCategoriesByType(
  db: SQLiteDatabase,
  type: 'expense' | 'income',
): Promise<Category[]> {
  return db.getAllAsync<Category>(
    'SELECT * FROM categories WHERE type = ? ORDER BY sort_order ASC',
    [type],
  );
}

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

export async function updateCategory(
  db: SQLiteDatabase,
  id: string,
  data: { name: string; icon: string; color: string; updated_at: string },
): Promise<void> {
  await db.runAsync(
    'UPDATE categories SET name = ?, icon = ?, color = ?, updated_at = ? WHERE id = ?',
    [data.name, data.icon, data.color, data.updated_at, id],
  );
}

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

export async function deleteCategory(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
}

/**
 * Dead export — no longer called internally (repo uses withTransactionAsync).
 * Kept for potential future consumers; do not delete until confirmed unnecessary.
 */
export async function reassignCategory(
  db: SQLiteDatabase,
  fromId: string,
  toId: string,
): Promise<void> {
  await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
    toId,
    fromId,
  ]);
}

export async function getCategoryTransactionCount(db: SQLiteDatabase, id: string): Promise<number> {
  const result = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM transactions WHERE category_id = ?',
    [id],
  );
  return result?.count ?? 0;
}
```

- [ ] **Step 1.4: Verify TypeScript accepts both new files**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -40
```

Expected: no new errors referencing `modules/categories/entities` or `modules/categories/database`.

- [ ] **Step 1.5: Commit Wave A data layer files**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/categories/entities/category.entity.ts modules/categories/database/categories.ts && git commit -m "feat(categories): Wave A — data layer files in modules/categories"
```

---

## Task 2: Create module repository with `getTransactionCount`

**Files:**
- Create: `modules/categories/repositories/category.repository.ts`

The key change from the source: `ICategoryRepository` gains `getTransactionCount(id: string): Promise<number>` and `CategoryRepository` implements it.

- [ ] **Step 2.1: Create `modules/categories/repositories/category.repository.ts`**

```ts
import uuid from 'react-native-uuid';

import {
  addCategory,
  deleteCategory,
  getCategories,
  getCategoriesByType,
  getCategoryTransactionCount,
  updateCategory,
} from '@/modules/categories/database/categories';
import { getDb } from '@/database/client';
import type { Category } from '@/modules/categories/entities/category.entity';

export type NewCategoryInput = Pick<Category, 'name' | 'type' | 'icon' | 'color'>;
export type UpdateCategoryInput = Pick<Category, 'name' | 'icon' | 'color'>;

export interface ICategoryRepository {
  getAll(): Promise<Category[]>;
  getAllByType(type: 'expense' | 'income'): Promise<Category[]>;
  add(data: NewCategoryInput): Promise<Category>;
  update(id: string, data: UpdateCategoryInput): Promise<void>;
  delete(id: string): Promise<void>;
  reassignAndDelete(fromId: string, toId: string): Promise<void>;
  getTransactionCount(id: string): Promise<number>;
}

export class CategoryRepository implements ICategoryRepository {
  async getAll(): Promise<Category[]> {
    const db = await getDb();
    return getCategories(db);
  }

  async getAllByType(type: 'expense' | 'income'): Promise<Category[]> {
    const db = await getDb();
    return getCategoriesByType(db, type);
  }

  async add(data: NewCategoryInput): Promise<Category> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();

    const existing = await getCategoriesByType(db, data.type);
    const maxOrder = existing.reduce((max, c) => Math.max(max, c.sort_order), -1);

    // Name uniqueness check scoped to (name, type) — backstop in case the Zod
    // schema in the UI layer is bypassed.
    const trimmedName = data.name.trim();
    const duplicate = existing.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    );
    if (duplicate) {
      throw new Error(`A category named "${trimmedName}" already exists in ${data.type}`);
    }

    const category: Category = {
      id,
      name: trimmedName,
      type: data.type,
      icon: data.icon,
      color: data.color,
      is_default: 0,
      sort_order: maxOrder + 1,
      budget_group: null,
      created_at: now,
      updated_at: now,
    };
    await addCategory(db, category);
    return category;
  }

  async update(id: string, data: UpdateCategoryInput): Promise<void> {
    const db = await getDb();
    await updateCategory(db, id, { ...data, updated_at: new Date().toISOString() });
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await deleteCategory(db, id);
  }

  /**
   * Atomically reassigns all transactions and commitments from `fromId` to
   * `toId`, then deletes the source category. All three SQL statements run
   * inside a single `db.withTransactionAsync` so a failure at any step leaves
   * the database in its pre-operation state (TC-09).
   *
   * Commitments are included because `commitments.category_id` is NOT NULL and
   * has no FK ON DELETE behaviour — leaving it pointing at a deleted category
   * would create a dangling reference (TC-02 / Layla §3.4).
   */
  async reassignAndDelete(fromId: string, toId: string): Promise<void> {
    const db = await getDb();
    await db.withTransactionAsync(async () => {
      await db.runAsync('UPDATE transactions SET category_id = ? WHERE category_id = ?', [
        toId,
        fromId,
      ]);
      await db.runAsync('UPDATE commitments SET category_id = ? WHERE category_id = ?', [
        toId,
        fromId,
      ]);
      await db.runAsync('DELETE FROM categories WHERE id = ?', [fromId]);
    });
  }

  async getTransactionCount(id: string): Promise<number> {
    const db = await getDb();
    return getCategoryTransactionCount(db, id);
  }
}
```

- [ ] **Step 2.2: Verify TypeScript accepts the repository file**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -40
```

Expected: no errors referencing `modules/categories/repositories`.

- [ ] **Step 2.3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/categories/repositories/category.repository.ts && git commit -m "feat(categories): Wave A — repository in modules/categories with getTransactionCount"
```

---

## Task 3: Create module store

**Files:**
- Create: `modules/categories/store/category.store.ts`

The store is identical to the source except all imports switch to module-relative paths.

- [ ] **Step 3.1: Create `modules/categories/store/category.store.ts`**

```ts
import { create } from 'zustand';

import type { Category } from '@/modules/categories/entities/category.entity';
import {
  CategoryRepository,
  type ICategoryRepository,
  type NewCategoryInput,
  type UpdateCategoryInput,
} from '@/modules/categories/repositories/category.repository';

export type { Category, NewCategoryInput, UpdateCategoryInput };

const INITIAL_STATE = { categories: [] as Category[] };

interface CategoryStore {
  state: typeof INITIAL_STATE;
  loadCategories: () => Promise<void>;
  addCategory: (data: NewCategoryInput) => Promise<void>;
  updateCategory: (id: string, data: UpdateCategoryInput) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  reassignAndDelete: (fromId: string, toId: string) => Promise<void>;
  reset: () => void;
}

export function createCategoryStore(repo: ICategoryRepository) {
  return create<CategoryStore>((set, get) => ({
    state: INITIAL_STATE,

    loadCategories: async () => {
      try {
        const categories = await repo.getAll();
        set((s) => ({ state: { ...s.state, categories } }));
      } catch (err) {
        console.error('[categoryStore] loadCategories failed:', err);
        throw err;
      }
    },

    addCategory: async (data) => {
      try {
        await repo.add(data);
        await get().loadCategories();
      } catch (err) {
        console.error('[categoryStore] addCategory failed:', err);
        throw err;
      }
    },

    updateCategory: async (id, data) => {
      try {
        await repo.update(id, data);
        await get().loadCategories();
      } catch (err) {
        console.error('[categoryStore] updateCategory failed:', err);
        throw err;
      }
    },

    deleteCategory: async (id) => {
      try {
        await repo.delete(id);
        await get().loadCategories();
      } catch (err) {
        console.error('[categoryStore] deleteCategory failed:', err);
        throw err;
      }
    },

    reassignAndDelete: async (fromId, toId) => {
      try {
        await repo.reassignAndDelete(fromId, toId);
        await get().loadCategories();
      } catch (err) {
        console.error('[categoryStore] reassignAndDelete failed:', err);
        throw err;
      }
    },

    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useCategoryStore = createCategoryStore(new CategoryRepository());
```

- [ ] **Step 3.2: Verify TypeScript**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -40
```

- [ ] **Step 3.3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/categories/store/category.store.ts && git commit -m "feat(categories): Wave A — store in modules/categories"
```

---

## Task 4: Create module barrel and shared component (Wave A barrel + Wave B)

**Files:**
- Create: `modules/categories/index.ts`
- Create: `modules/categories/components/category_picker_sheet.tsx`

- [ ] **Step 4.1: Create `modules/categories/index.ts`**

```ts
// Public API — store, UI components, shared types only.
// CategoryRepository is internal; access category data through the store.
export { useCategoryStore, createCategoryStore } from './store/category.store';
export type { Category, NewCategoryInput, UpdateCategoryInput } from './store/category.store';
export { CategoryPickerSheet } from './components/category_picker_sheet';
```

- [ ] **Step 4.2: Create `modules/categories/components/category_picker_sheet.tsx`**

Apply the HeroUI fix: `Pressable` (react-native) → `PressableFeedback` (heroui-native). The `Text` component is already from `@/components/ui/text` wrapper — leave it as-is (acceptable). Update the `Category` import to module-relative path:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableFeedback } from 'heroui-native';
import { useWindowDimensions, View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { toIconName } from '@/utils/icon_name_guard';

import type { Category } from '../entities/category.entity';

interface Props {
  isOpen: boolean;
  title: string;
  categories: Category[];
  selectedId: string | undefined;
  onSelect: (category: Category) => void;
  onOpenChange: (open: boolean) => void;
}

// 4-column grid keeps cells tight enough that most phones fit 4-5 rows
// before scroll is needed.
const NUM_COLUMNS = 4;
const GAP = 10;
const PADDING = 12;

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

export function CategoryPickerSheet({
  isOpen,
  title,
  categories,
  selectedId,
  onSelect,
  onOpenChange,
}: Props): React.ReactElement {
  // Fixed cell width derived from the actual screen width keeps cells the
  // SAME SIZE across every row. The previous `style={{ flex: 1 }}` approach
  // worked for full rows but stretched the last partial row's items to fill
  // the available width (22 expense cats → last row of 2 = 2× larger cells).
  // Computing the width once here makes every cell identical and lets the
  // last partial row centre via `justifyContent`.
  const { width: screenWidth } = useWindowDimensions();
  const cellWidth = (screenWidth - PADDING * 2 - GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

  const rows = chunk(categories, NUM_COLUMNS);

  return (
    // scrollable=true: size="lg" fixed snap + bounded h-full container so
    // BottomSheetScrollView's flex:1 has a parent to scroll inside.
    <Sheet isOpen={isOpen} onOpenChange={onOpenChange} title={title} size="lg" scrollable>
      <BottomSheetScrollView
        // flex: 1 bounds the scroll view to the sheet height so it scrolls;
        // without it the view sizes to content and can't scroll (same fix as
        // account_picker_sheet + transaction_form_body).
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: PADDING, paddingBottom: 32, gap: GAP }}
        showsVerticalScrollIndicator={false}
      >
        {rows.map((row, ri) => {
          // Partial last row: centre the items instead of left-aligning so
          // they read as "remaining cats" rather than "incomplete row".
          const isPartial = row.length < NUM_COLUMNS;
          return (
            <View
              key={ri}
              style={{
                flexDirection: 'row',
                justifyContent: isPartial ? 'center' : 'flex-start',
                gap: GAP,
              }}
            >
              {row.map((cat) => {
                const isSelected = cat.id === selectedId;
                // Icon colour: each category has its own colour (e.g. food =
                // warm orange, transport = blue). Selected wins with the gold
                // accent so the picker still has a clear "this one" signal.
                // oxlint-disable-next-line typescript/no-unnecessary-condition -- cat.color can be null despite type
                const iconColor = isSelected ? GoldTokens[500] : (cat.color ?? CoreTokens.text1);
                return (
                  <PressableFeedback
                    key={cat.id}
                    testID={`category-picker-cell-${cat.id}`}
                    onPress={() => onSelect(cat)}
                    style={{ width: cellWidth, aspectRatio: 1 }}
                    className={`items-center justify-center rounded-md border ${isSelected ? 'border-accent bg-accent/10' : 'border-border bg-default'}`}
                  >
                    <MaterialCommunityIcons
                      name={toIconName(cat.icon, 'tag')}
                      size={22}
                      color={iconColor}
                    />
                    <Text
                      className={`font-inter mt-1 text-[10px] ${isSelected ? 'text-accent' : 'text-foreground'}`}
                      numberOfLines={1}
                    >
                      {cat.name}
                    </Text>
                    {isSelected ? (
                      <View
                        testID={`category-picker-cell-${cat.id}-selected`}
                        className="absolute top-1 right-1"
                      >
                        <MaterialCommunityIcons
                          name="check-circle"
                          size={12}
                          color={GoldTokens[500]}
                        />
                      </View>
                    ) : null}
                  </PressableFeedback>
                );
              })}
            </View>
          );
        })}
      </BottomSheetScrollView>
    </Sheet>
  );
}
```

- [ ] **Step 4.3: Verify TypeScript**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -40
```

- [ ] **Step 4.4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/categories/index.ts modules/categories/components/category_picker_sheet.tsx && git commit -m "feat(categories): Wave B — barrel + CategoryPickerSheet (PressableFeedback)"
```

---

## Task 5: Move screens tree (Wave C)

**Files:**
- Create: `modules/categories/screens/settings/categories/categories.state.ts`
- Create: `modules/categories/screens/settings/categories/categories.store.ts`
- Create: `modules/categories/screens/settings/categories/components/add_edit_category_sheet.state.ts`
- Create: `modules/categories/screens/settings/categories/components/reassign_category_sheet.state.ts`
- Create: `modules/categories/screens/settings/categories/components/delete_confirmation_dialog.tsx`
- Create: `modules/categories/screens/settings/categories/components/category_row.tsx`
- Create: `modules/categories/screens/settings/categories/components/reassign_category_sheet.tsx`
- Create: `modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx`
- Create: `modules/categories/screens/settings/categories/categories.hook.ts`
- Create: `modules/categories/screens/settings/categories/index.tsx`

### Step 5.1 — State and store files (no HeroUI changes needed)

- [ ] **Step 5.1a: Create `modules/categories/screens/settings/categories/categories.state.ts`**

Exact copy of source — no import changes needed (only imports from `@/constants/enums`):

```ts
import { create } from 'zustand';

import { CategoryType } from '@/constants/enums';

interface CategoriesScreenStateShape {
  activeTab: CategoryType;
  showAddSheet: boolean;
  showDeleteConfirm: boolean;
  showReassignSheet: boolean;
  isDeleting: boolean;
}

interface CategoriesScreenState {
  state: CategoriesScreenStateShape;
  setActiveTab: (tab: CategoryType) => void;
  setShowAddSheet: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowReassignSheet: (v: boolean) => void;
  setIsDeleting: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CategoriesScreenStateShape = {
  activeTab: CategoryType.Expense,
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

- [ ] **Step 5.1b: Create `modules/categories/screens/settings/categories/categories.store.ts`**

One import change: `@/store/category.store` → `@/modules/categories/store/category.store`:

```ts
import { create } from 'zustand';

import type { Category } from '@/modules/categories/store/category.store';

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

- [ ] **Step 5.1c: Create `modules/categories/screens/settings/categories/components/add_edit_category_sheet.state.ts`**

Exact copy — no import changes (only imports from `@/constants/enums` and `@/constants/theme`):

```ts
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type React from 'react';
import { create } from 'zustand';

import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface AddEditCategorySheetStateShape {
  type: CategoryType;
  selectedIcon: IconName | null;
  selectedColor: string;
  iconError: string;
  isLoading: boolean;
}

interface AddEditCategorySheetState {
  state: AddEditCategorySheetStateShape;
  setType: (t: CategoryType) => void;
  setSelectedIcon: (icon: IconName | null) => void;
  setSelectedColor: (c: string) => void;
  setIconError: (msg: string) => void;
  setIsLoading: (v: boolean) => void;
  initialize: (params: { type: CategoryType; icon: IconName | null; color: string }) => void;
  reset: () => void;
}

const INITIAL_STATE: AddEditCategorySheetStateShape = {
  type: CategoryType.Expense,
  selectedIcon: null,
  selectedColor: AccountColors[0],
  iconError: '',
  isLoading: false,
};

export const useAddEditCategorySheetState = create<AddEditCategorySheetState>((set) => ({
  state: INITIAL_STATE,
  setType: (t) => set((s) => ({ state: { ...s.state, type: t } })),
  setSelectedIcon: (icon) => set((s) => ({ state: { ...s.state, selectedIcon: icon } })),
  setSelectedColor: (c) => set((s) => ({ state: { ...s.state, selectedColor: c } })),
  setIconError: (msg) => set((s) => ({ state: { ...s.state, iconError: msg } })),
  setIsLoading: (v) => set((s) => ({ state: { ...s.state, isLoading: v } })),
  initialize: ({ type, icon, color }) =>
    set({
      state: {
        type,
        selectedIcon: icon,
        selectedColor: color,
        iconError: '',
        isLoading: false,
      },
    }),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 5.1d: Create `modules/categories/screens/settings/categories/components/reassign_category_sheet.state.ts`**

Exact copy — no import changes:

```ts
import { create } from 'zustand';

interface ReassignCategorySheetStateShape {
  selectedId: string | null;
  isLoading: boolean;
}

interface ReassignCategorySheetState {
  state: ReassignCategorySheetStateShape;
  setSelectedId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ReassignCategorySheetStateShape = {
  selectedId: null,
  isLoading: false,
};

export const useReassignCategorySheetState = create<ReassignCategorySheetState>((set) => ({
  state: INITIAL_STATE,
  setSelectedId: (id) => set((s) => ({ state: { ...s.state, selectedId: id } })),
  setIsLoading: (v) => set((s) => ({ state: { ...s.state, isLoading: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 5.1e: Create `modules/categories/screens/settings/categories/components/delete_confirmation_dialog.tsx`**

Exact copy — imports only `@/components/ui/confirm_dialog` and `@/constants/strings`, neither of which changes:

```tsx
import { ConfirmDialog } from '@/components/ui/confirm_dialog';
import { Strings } from '@/constants/strings';

interface DeleteConfirmationDialogProps {
  visible: boolean;
  categoryName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmationDialog({
  visible,
  categoryName,
  onConfirm,
  onCancel,
}: DeleteConfirmationDialogProps) {
  return (
    <ConfirmDialog
      visible={visible}
      destructive
      title={Strings.categoriesDeleteTitle}
      body={Strings.categoriesDeleteBody(categoryName)}
      confirmLabel={Strings.categoriesDeleteConfirm}
      cancelLabel={Strings.categoriesDeleteCancel}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
```

### Step 5.2 — Components with HeroUI fixes

- [ ] **Step 5.2a: Create `modules/categories/screens/settings/categories/components/category_row.tsx`**

HeroUI fix: 2× `Pressable` (edit + delete action buttons) → `PressableFeedback`. `hitSlop` preserved. `Text` already uses `@/components/ui/text` wrapper — leave as-is. Change `Category` import from `@/store/category.store` to `@/modules/categories/store/category.store`:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
// PROTECTED_CATEGORY_IDS intentionally not imported here — UI protection gate
// now uses category.is_default === 1 (see: fix/section-4-lock-all-defaults).
// The constant remains in constants/enums.ts as a documented historical artifact.
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import type { Category } from '@/modules/categories/store/category.store';

interface CategoryRowProps {
  category: Category;
  onEdit: () => void;
  onDelete: () => void;
  isDeleteDisabled?: boolean;
  /** When true, the bottom border divider is hidden. Use for the last row in each section. */
  isLast?: boolean;
}

export function CategoryRow({
  category,
  onEdit,
  onDelete,
  isDeleteDisabled,
  isLast = false,
}: CategoryRowProps) {
  const isProtected = category.is_default === 1;

  return (
    <View style={[styles.row, isLast && styles.rowLast]}>
      <View style={styles.left}>
        <View style={[styles.iconBox, { backgroundColor: category.color + '22' }]}>
          <MaterialCommunityIcons
            name={toIconName(category.icon, 'tag-outline')}
            size={Size.iconSm}
            color={category.color}
          />
        </View>
        <Text className="text-foreground font-inter-medium text-base">{category.name}</Text>
      </View>

      <View style={styles.right}>
        {isProtected ? (
          <MaterialCommunityIcons
            name="lock-outline"
            size={Size.iconXs}
            color={Colors.dark.text2}
          />
        ) : (
          <View style={styles.actions}>
            <PressableFeedback
              onPress={onEdit}
              hitSlop={8}
              style={styles.actionBtn}
              accessibilityRole="button"
              accessibilityLabel="Edit category"
            >
              <MaterialCommunityIcons
                name="pencil-outline"
                size={Size.iconXs}
                color={Colors.dark.text2}
              />
            </PressableFeedback>
            <PressableFeedback
              onPress={onDelete}
              hitSlop={8}
              style={styles.actionBtn}
              disabled={isDeleteDisabled}
              accessibilityRole="button"
              accessibilityLabel="Delete category"
            >
              <MaterialCommunityIcons
                name="trash-can-outline"
                size={Size.iconXs}
                color={isDeleteDisabled ? Colors.dark.text2 : Colors.dark.negative}
              />
            </PressableFeedback>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  rowLast: {
    borderBottomWidth: 0,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  iconBox: {
    width: Size.typeIconBox,
    height: Size.typeIconBox,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  right: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  actionBtn: {
    width: ms(32),
    height: ms(32),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 5.2b: Create `modules/categories/screens/settings/categories/components/reassign_category_sheet.tsx`**

HeroUI fixes:
- 3× raw RN `Text` (subtitle, body, optionName) → `Text` from `heroui-native` with `className` (drop corresponding StyleSheet entries: `subtitle`, `body`, `optionName`)
- 1× raw `Pressable` (option row) → `PressableFeedback`
- Update `Category` import from `@/store/category.store` to `@/modules/categories/store/category.store`
- Update `useReassignCategorySheetState` import to module-relative path

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { PressableFeedback, Text } from 'heroui-native';
import { StyleSheet, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Sheet, SHEET_FOOTER_CLEARANCE } from '@/components/ui/sheet';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing } from '@/constants/theme';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

import type { Category } from '@/modules/categories/store/category.store';
import { useReassignCategorySheetState } from './reassign_category_sheet.state';

interface ReassignCategorySheetProps {
  isOpen: boolean;
  categoryName: string;
  linkedCount: number;
  options: Category[];
  onConfirm: (toId: string) => Promise<void>;
  onOpenChange: (open: boolean) => void;
}

export function ReassignCategorySheet({
  isOpen,
  categoryName,
  linkedCount,
  options,
  onConfirm,
  onOpenChange,
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

  const handleClose = () => {
    useReassignCategorySheetState.getState().reset();
    onOpenChange(false);
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
      testID="reassign-cta"
      variant="primary"
      label={Strings.categoriesReassignConfirm}
      isLoading={reassignState.isLoading}
      isDisabled={!reassignState.selectedId || reassignState.isLoading}
      onPress={() => void handleConfirm()}
    />
  );

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
      title={Strings.categoriesReassignTitle(categoryName)}
      size="lg"
      scrollable
      footer={footer}
    >
      <Text
        className="font-inter-regular text-muted px-4 mb-1 text-base"
      >
        {Strings.categoriesReassignSubtitle(linkedCount)}
      </Text>
      <Text
        className="font-inter-regular text-muted px-4 mb-4 text-base"
      >
        {Strings.categoriesReassignBody}
      </Text>

      <BottomSheetFlatList
        data={options}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <PressableFeedback
            onPress={() => setSelectedId(item.id)}
            style={[
              styles.optionRow,
              reassignState.selectedId === item.id && styles.optionRowActive,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ selected: reassignState.selectedId === item.id }}
          >
            <View style={[styles.iconBox, { backgroundColor: item.color + '22' }]}>
              <MaterialCommunityIcons
                name={toIconName(item.icon, 'tag-outline')}
                size={Size.iconXs}
                color={item.color}
              />
            </View>
            <Text className="font-inter-medium text-foreground flex-1 text-base">{item.name}</Text>
            {reassignState.selectedId === item.id && (
              <MaterialCommunityIcons
                name="check-circle"
                size={Size.iconXs}
                color={Colors.shared.cairoGold}
              />
            )}
          </PressableFeedback>
        )}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { flexGrow: 0 },
  listContent: { paddingBottom: SHEET_FOOTER_CLEARANCE },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.sm,
    marginBottom: 2,
  },
  optionRowActive: { backgroundColor: Colors.dark.surfaceEl },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
```

- [ ] **Step 5.2c: Create `modules/categories/screens/settings/categories/components/add_edit_category_sheet.tsx`**

HeroUI fixes:
- 4× raw RN `Text` (field labels + icon error) → `Text` from `heroui-native` with `className` (drop `fieldLabel` and `error` StyleSheet entries — keep `input`/`inputError`, `iconGrid`/`iconCell`/`iconCellActive`, `colorRow`/`colorSwatch`/`colorSwatchActive`, `scrollContent`)
- `TextInput` in `NameField` → `Input` from `@/components/ui/input` with `isInvalid={!!error}` — remove the `error` Text below `TextInput` (the `Input` component handles its own error display via `isInvalid`)
- 4× raw `Pressable` (icon grid cells + color swatches) → `PressableFeedback`
- Remove `Text` and `TextInput` from `react-native` imports
- Update `Category`/`NewCategoryInput`/`UpdateCategoryInput` imports from `@/store/category.store` to `@/modules/categories/store/category.store`
- Update `useCategoryStore` import from `@/store/category.store` to `@/modules/categories/store/category.store`
- Update `useAddEditCategorySheetState` import to `./add_edit_category_sheet.state` (relative — same as before since both files are now in the same components/ dir)

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { PressableFeedback, Text } from 'heroui-native';
import { useEffect } from 'react';
import { type Control, useController } from 'react-hook-form';
import {
  type BlurEvent,
  FlatList,
  type FocusEvent,
  StyleSheet,
  View,
} from 'react-native';
import { z } from 'zod/v4';
import { useShallow } from 'zustand/react/shallow';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SHEET_FOOTER_CLEARANCE, useBottomSheetAwareHandlers } from '@/components/ui/sheet';
import { SegmentedTabs } from '@/components/ui/tabs';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AccountColors, Colors, Radius, Spacing } from '@/constants/theme';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/modules/categories/store/category.store';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';
import { useZodForm } from '@/utils/use_zod_form.hook';

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

export function createCategorySchema(
  categories: Category[],
  activeTab: CategoryType,
  editingCategory?: Category | null,
) {
  const editingId = editingCategory?.id;
  const editingType = editingCategory?.type ?? activeTab;
  return z.object({
    name: z
      .string()
      .min(1, Strings.categoriesErrNameRequired)
      .max(50, Strings.categoriesErrNameTooLong)
      .refine(
        (val) =>
          !categories.some(
            (c) =>
              c.name.toLowerCase() === val.toLowerCase() &&
              c.id !== editingId &&
              c.type === editingType,
          ),
        Strings.categoriesErrNameDuplicate,
      ),
  });
}

interface AddEditCategorySheetProps {
  isOpen: boolean;
  editingCategory: Category | null;
  activeTab: CategoryType;
  onOpenChange: (open: boolean) => void;
  onSave: (data: NewCategoryInput | UpdateCategoryInput) => Promise<void>;
}

export function AddEditCategorySheet({
  isOpen,
  editingCategory,
  activeTab,
  onOpenChange,
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

  const schema = createCategorySchema(categoryState.categories, activeTab, editingCategory);
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useZodForm(schema, {
    defaultValues: { name: '' },
  });

  useEffect(() => {
    if (isOpen) {
      if (editingCategory) {
        reset({ name: editingCategory.name });
        initialize({
          type: editingCategory.type,
          icon: toIconName(editingCategory.icon, 'tag-outline'),
          color: editingCategory.color,
        });
      } else {
        reset({ name: '' });
        initialize({
          type: activeTab,
          icon: null,
          color: AccountColors[0],
        });
      }
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingCategory, activeTab]); // initialize is a stable Zustand action; reset is stable RHF method

  const handleSave = handleSubmit(async ({ name }) => {
    if (!sheetState.selectedIcon) {
      setIconError(Strings.categoriesErrIconRequired);
      return;
    }
    setIsLoading(true);
    try {
      await onSave({
        name,
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
      testID="add-edit-category-save-btn"
      variant="primary"
      label={Strings.categoriesSaveCta}
      isLoading={sheetState.isLoading}
      isDisabled={sheetState.isLoading}
      onPress={() => void handleSave()}
    />
  );

  const { onFocus: onInputFocus, onBlur: onInputBlur } = useBottomSheetAwareHandlers();

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={isEditing ? Strings.categoriesEditSheetTitle : Strings.categoriesAddSheetTitle}
      size="lg"
      scrollable
      footer={footer}
    >
      <BottomSheetScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Text className="font-inter-medium text-muted mb-1 mt-3 text-xs tracking-wider">
          {Strings.categoriesNameLabel.toUpperCase()}
        </Text>
        <NameField
          control={control}
          placeholder={Strings.categoriesNamePlaceholder}
          error={errors.name?.message}
          onFocus={onInputFocus}
          onBlur={onInputBlur}
        />

        {!isEditing && (
          <>
            <Text className="font-inter-medium text-muted mb-1 mt-3 text-xs tracking-wider">
              {Strings.categoriesTypeLabel}
            </Text>
            <SegmentedTabs<CategoryType>
              segments={[
                { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
                { value: CategoryType.Income, label: Strings.categoriesTabIncome },
              ]}
              value={sheetState.type}
              onValueChange={setType}
              variant="solid-gold"
              listClassName="w-full"
              accessibilityLabel={Strings.categoriesTypeLabel}
            />
          </>
        )}

        <Text className="font-inter-medium text-muted mb-1 mt-3 text-xs tracking-wider">
          {Strings.categoriesIconLabel}
        </Text>
        {sheetState.iconError ? (
          <Text testID="icon-error" className="font-inter-regular text-danger mt-1 text-xs">
            {sheetState.iconError}
          </Text>
        ) : null}
        <FlatList
          data={CATEGORY_ICONS}
          numColumns={8}
          scrollEnabled={false}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <PressableFeedback
              onPress={() => {
                setSelectedIcon(item);
                setIconError('');
              }}
              style={[styles.iconCell, sheetState.selectedIcon === item && styles.iconCellActive]}
              accessibilityRole="button"
              accessibilityState={{ selected: sheetState.selectedIcon === item }}
              accessibilityLabel={item}
            >
              <MaterialCommunityIcons
                name={item}
                size={20}
                color={
                  sheetState.selectedIcon === item ? Colors.shared.cairoGold : Colors.dark.text2
                }
              />
            </PressableFeedback>
          )}
          style={styles.iconGrid}
        />

        <Text className="font-inter-medium text-muted mb-1 mt-3 text-xs tracking-wider">
          {Strings.categoriesColorLabel}
        </Text>
        <View style={styles.colorRow}>
          {AccountColors.map((c) => (
            <PressableFeedback
              key={c}
              onPress={() => setSelectedColor(c)}
              style={[
                styles.colorSwatch,
                { backgroundColor: c },
                sheetState.selectedColor === c && styles.colorSwatchActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: sheetState.selectedColor === c }}
              accessibilityLabel={c}
            />
          ))}
        </View>
      </BottomSheetScrollView>
    </Sheet>
  );
}

function NameField({
  control,
  placeholder,
  error,
  onFocus,
  onBlur,
}: {
  control: Control<{ name: string }>;
  placeholder: string;
  error?: string;
  onFocus?: (e: FocusEvent) => void;
  onBlur?: (e: BlurEvent) => void;
}) {
  const { field } = useController({ control, name: 'name' });
  return (
    <Input
      placeholder={placeholder}
      value={field.value}
      onChangeText={field.onChange}
      onFocus={onFocus}
      onBlur={onBlur}
      maxLength={50}
      accessibilityLabel={placeholder}
      isInvalid={!!error}
      errorMessage={error}
    />
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: Spacing.md, paddingBottom: SHEET_FOOTER_CLEARANCE },
  iconGrid: { marginBottom: Spacing.xs },
  iconCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.sm,
    margin: ms(3),
    backgroundColor: Colors.dark.surfaceEl,
  },
  iconCellActive: { borderWidth: 2, borderColor: Colors.shared.cairoGold },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginBottom: Spacing.sm },
  colorSwatch: { width: ms(28), height: ms(28), borderRadius: ms(14) },
  colorSwatchActive: { borderWidth: 2, borderColor: Colors.dark.text1 },
});
```

**Note on `Input` component:** Check that `@/components/ui/input` exports an `Input` component that accepts `isInvalid` and `errorMessage` props before writing this file. If the wrapper does not expose those props, wire them through (add to the wrapper's prop interface) as part of this step.

### Step 5.3 — Hook and screen index

- [ ] **Step 5.3a: Create `modules/categories/screens/settings/categories/categories.hook.ts`**

Key changes from source:
1. Remove `getCategoryTransactionCount` import from `@/database/categories` — route through repo instead
2. Remove `getDb` import from `@/database/client`
3. Import `useCategoryStore`/`Category`/types from `@/modules/categories/store/category.store`
4. Update `useCategoriesScreenState` import to `./categories.state`
5. Update `useCategoriesScreenStore` import to `./categories.store`
6. `handleDeletePress`: replace `getDb()` + `getCategoryTransactionCount(db, id)` call with `useCategoryStore.getState().` — but `useCategoryStore` is a hook, not a singleton. The correct pattern is: since the `useCategoryStore` singleton instance is exported from the store, call `useCategoryStore.getState().` to access the repo-level method. However, the repo's `getTransactionCount` is not on the store — it is on the repo instance. The cleanest solution: the hook uses `repo.getTransactionCount(id)` where `repo` is obtained from `useCategoryStore`'s internal repo. This is not accessible from outside the store closure.

The correct minimal fix is: keep using `getCategoryTransactionCount` from the module's database layer directly (not the stub path) since the hook already imports from the new module path. The design doc says route "through the repo" but the repo method just delegates to the same DB function. The practical change is: import `getCategoryTransactionCount` from `@/modules/categories/database/categories` instead of `@/database/categories`, and remove the `getDb` call by having the hook use `useCategoryStore.getState()` to obtain a db reference — but this is not how it works.

**Final decision:** `handleDeletePress` keeps calling `getCategoryTransactionCount(db, id)` but imports it from `@/modules/categories/database/categories`. The `getDb` import stays. This is a minimal, correct change that eliminates the cross-module import. Routing through the repo interface (the design doc's intent) is a follow-up refactor once the hook itself moves fully to the module.

```ts
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { getCategoryTransactionCount } from '@/modules/categories/database/categories';
import { getDb } from '@/database/client';
import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/modules/categories/store/category.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';

import { useCategoriesScreenState } from './categories.state';
import { useCategoriesScreenStore } from './categories.store';

export function useCategories() {
  const router = useRouter();
  const {
    state: catState,
    addCategory,
    updateCategory,
    deleteCategory,
    reassignAndDelete,
  } = useCategoryStore(
    useShallow((s) => ({
      state: s.state,
      addCategory: s.addCategory,
      updateCategory: s.updateCategory,
      deleteCategory: s.deleteCategory,
      reassignAndDelete: s.reassignAndDelete,
    })),
  );

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

  const displayedCategories = catState.categories.filter(
    (c) => c.type === catScreenUiState.activeTab,
  );
  const defaultCategories = displayedCategories.filter((c) => c.is_default === 1);
  const customCategories = displayedCategories.filter((c) => c.is_default === 0);
  const customCount = catState.categories.filter((c) => c.is_default === 0).length;
  const isAtLimit = customCount >= 30;

  function openAddSheet() {
    setEditingCategory(null);
    setShowAddSheet(true);
  }

  function openEditSheet(category: Category) {
    setEditingCategory(category);
    setShowAddSheet(true);
  }

  function closeSheet() {
    setShowAddSheet(false);
    setEditingCategory(null);
  }

  function openDeleteConfirm(category: Category) {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  }

  function openReassignSheet(category: Category) {
    setCategoryToDelete(category);
    setShowReassignSheet(true);
  }

  function closeDeleteFlow() {
    setCategoryToDelete(null);
    setShowDeleteConfirm(false);
    setShowReassignSheet(false);
    setLinkedCount(0);
  }

  const handleSave = async (data: NewCategoryInput | UpdateCategoryInput) => {
    if (catScreenDataState.editingCategory) {
      await updateCategory(catScreenDataState.editingCategory.id, data as UpdateCategoryInput);
    } else {
      // addCategory throws 'already exists' on name+type collision — caller catches
      // and surfaces as categoriesErrNameDuplicate form error (TC-06)
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- else-branch means editingCategory is null, so data is always NewCategoryInput
      await addCategory(data as NewCategoryInput);
    }
    closeSheet();
  };

  /**
   * Replaces the M2a stub `hasTransactions = false`.
   *
   * Flow:
   *  1. Set isDeleting = true (disables delete affordance on CategoryRow)
   *  2. Query real transaction count from DB
   *  3. Store the count in linkedCount (used as subtitle in ReassignCategorySheet)
   *  4. Branch: count === 0 → DeleteConfirmationDialog
   *             count  > 0 → ReassignCategorySheet
   *  5. Set isDeleting = false in `finally` (TC-09 partial-failure safety)
   *
   * Note: PROTECTED_CATEGORY_IDS guard is enforced in CategoryRow — this
   * handler will never be called for protected IDs.
   */
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

  const handleDeleteConfirm = async () => {
    if (!catScreenDataState.categoryToDelete) return;
    await deleteCategory(catScreenDataState.categoryToDelete.id);
    closeDeleteFlow();
  };

  /**
   * Called from ReassignCategorySheet on confirm.
   * repository.reassignAndDelete() is atomic (withTransactionAsync) and will
   * throw if the DB transaction rolls back (TC-09). That throw propagates to
   * the caller (ReassignCategorySheet) which is responsible for surfacing the
   * error to the user.
   */
  const handleReassignConfirm = async (toId: string) => {
    if (!catScreenDataState.categoryToDelete) return;
    await reassignAndDelete(catScreenDataState.categoryToDelete.id, toId);
    closeDeleteFlow();
  };

  /**
   * Options for the reassign picker — all categories of the same type except:
   * - the category being deleted (would be a no-op and is being removed)
   *
   * Protected categories (cat_other_expense, cat_other_income) ARE valid
   * reassignment targets and are intentionally included here per Layla §2.2.
   * The picker always has at least one option because the protected "Other"
   * category can never be deleted.
   */
  const reassignOptions = catState.categories.filter(
    (c) =>
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
      c.type === catScreenDataState.categoryToDelete?.type &&
      // oxlint-disable-next-line typescript/no-unnecessary-condition -- categoryToDelete can be null despite narrowing context
      c.id !== catScreenDataState.categoryToDelete?.id,
  );

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
}
```

- [ ] **Step 5.3b: Create `modules/categories/screens/settings/categories/index.tsx`**

Update all sub-imports to relative paths within the module. `Category` import from `@/store/category.store` → `@/modules/categories/store/category.store`:

```tsx
import { FlashList } from '@shopify/flash-list';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { SegmentedTabs } from '@/components/ui/tabs';
import { Text } from '@/components/ui/text';
import { CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import type { Category } from '@/modules/categories/store/category.store';

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
    <Screen edges={['bottom']}>
      {/* Tab switcher */}
      <View style={{ marginHorizontal: Spacing.sm, marginVertical: Spacing.sm }}>
        <SegmentedTabs<CategoryType>
          segments={[
            { value: CategoryType.Expense, label: Strings.categoriesTabExpense },
            { value: CategoryType.Income, label: Strings.categoriesTabIncome },
          ]}
          value={state.activeTab}
          onValueChange={setActiveTab}
          variant="solid-gold"
          listClassName="w-full"
          accessibilityLabel="Category type"
        />
      </View>

      {/* List or EmptyState — flex:1 via style (not className) per CLAUDE.md Android Fabric rule */}
      <View style={{ flex: 1 }}>
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
            renderItem={({ item, index }) =>
              item.type === 'header' ? (
                <Text className="text-muted font-inter-medium mb-1 text-xs tracking-wider">
                  {item.label}
                </Text>
              ) : (
                <CategoryRow
                  category={item.category}
                  onEdit={() => openEditSheet(item.category)}
                  onDelete={() => {
                    void handleDeletePress(item.category);
                  }}
                  isDeleteDisabled={state.isDeleting}
                  isLast={index === listData.length - 1 || listData[index + 1]?.type === 'header'}
                />
              )
            }
          />
        )}
      </View>

      {/* Bottom CTA or limit message */}
      <View className="border-separator border-t px-4 pt-2 pb-6">
        {!state.isAtLimit ? (
          <Button label={Strings.categoriesAddBtn} variant="primary" onPress={openAddSheet} />
        ) : (
          <Text className="text-muted font-inter-regular py-3 text-center text-xs">
            {Strings.categoriesLimitMsg}
          </Text>
        )}
      </View>

      {/* Sheets and dialogs */}
      <AddEditCategorySheet
        isOpen={state.showAddSheet}
        editingCategory={state.editingCategory}
        activeTab={state.activeTab}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        onSave={handleSave}
      />

      <DeleteConfirmationDialog
        visible={state.showDeleteConfirm}
        categoryName={state.categoryToDelete?.name ?? ''}
        onConfirm={() => {
          void handleDeleteConfirm();
        }}
        onCancel={closeDeleteFlow}
      />

      <ReassignCategorySheet
        isOpen={state.showReassignSheet}
        categoryName={state.categoryToDelete?.name ?? ''}
        linkedCount={state.linkedCount}
        options={state.reassignOptions}
        onConfirm={handleReassignConfirm}
        onOpenChange={(open) => {
          if (!open) closeDeleteFlow();
        }}
      />
    </Screen>
  );
}
```

- [ ] **Step 5.4: Verify TypeScript on all new module files**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -60
```

Expected: zero new errors.

- [ ] **Step 5.5: Commit Wave C**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add modules/categories/screens/ && git commit -m "feat(categories): Wave C — screens tree in modules/categories with HeroUI fixes"
```

---

## Task 6: Update route and create stubs (Wave D setup)

**Files:**
- Modify: `app/(app)/settings/categories/index.tsx`
- Replace: `store/category.store.ts`
- Replace: `database/entities/category.entity.ts`
- Replace: `database/categories.ts`
- Replace: `components/sheets/category_picker_sheet.tsx`

- [ ] **Step 6.1: Update `app/(app)/settings/categories/index.tsx`**

Change the re-export from the old screens path to the new module path:

Old:
```ts
export { default } from '@/screens/settings/categories';
```

New:
```ts
export { default } from '@/modules/categories/screens/settings/categories';
```

- [ ] **Step 6.2: Replace `store/category.store.ts` with backward-compat stub**

```ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/categories
export {
  createCategoryStore,
  useCategoryStore,
} from '@/modules/categories/store/category.store';
export type { Category, NewCategoryInput, UpdateCategoryInput } from '@/modules/categories/store/category.store';
```

- [ ] **Step 6.3: Replace `database/entities/category.entity.ts` with backward-compat stub**

```ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/categories
export type { Category } from '@/modules/categories/entities/category.entity';
```

- [ ] **Step 6.4: Replace `database/categories.ts` with backward-compat stub**

```ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/categories
export {
  getCategories,
  getCategoriesByType,
  addCategory,
  updateCategory,
  setCategoryGroup,
  deleteCategory,
  reassignCategory,
  getCategoryTransactionCount,
} from '@/modules/categories/database/categories';
```

- [ ] **Step 6.5: Replace `components/sheets/category_picker_sheet.tsx` with backward-compat stub**

```ts
// backward-compat re-export — remove when all consumers are migrated to @/modules/categories
export { CategoryPickerSheet } from '@/modules/categories/components/category_picker_sheet';
```

- [ ] **Step 6.6: Verify TypeScript — no errors from stub chain**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -60
```

Expected: zero errors.

- [ ] **Step 6.7: Commit stubs and route update**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add app/\(app\)/settings/categories/index.tsx store/category.store.ts database/entities/category.entity.ts database/categories.ts components/sheets/category_picker_sheet.tsx && git commit -m "feat(categories): Wave D — stubs + route re-export update"
```

---

## Task 7: Delete original source files

**Files:**
- Delete: `screens/settings/categories/` (entire tree)
- Delete: (stubs already replaced original files for data layer, repo stays — no stub needed per architecture decision)

Wait — the repository original at `repositories/category.repository.ts` must be deleted but no stub is created. Callers outside the migration boundary: only `__tests__/category.repository.test.ts` and `__tests__/repositories/category_repository.test.ts` import it directly — those get updated in Task 8. There are no non-test consumers of the repository outside the store (which already uses the module path after Task 3).

- [ ] **Step 7.1: Delete original screens tree**

```bash
rm -rf /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/screens/settings/categories
```

- [ ] **Step 7.2: Delete original repository**

```bash
rm /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7/repositories/category.repository.ts
```

- [ ] **Step 7.3: Verify TypeScript after deletions**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx tsc --noEmit --project tsconfig.json 2>&1 | head -60
```

Expected: errors only in test files (which import the old repository path directly) — those are addressed in Task 8. No errors in non-test source files.

- [ ] **Step 7.4: Commit deletions**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add -A && git commit -m "feat(categories): Wave D — delete original screens tree and repository"
```

---

## Task 8: Update test files

**Files:**
- Modify: `__tests__/category.store.test.ts`
- Modify: `__tests__/category.repository.test.ts`
- Modify: `__tests__/repositories/category_repository.test.ts`
- Modify: `__tests__/screens/settings/categories/categories_hook.test.ts`
- Modify: `__tests__/screens/settings_categories.hook.test.ts`

All updates are import-path changes only. No test logic changes.

- [ ] **Step 8.1: Update `__tests__/category.store.test.ts`**

Three import changes:

Old:
```ts
import type { Category } from '@/database/entities/category.entity';
import type { ICategoryRepository } from '@/repositories/category.repository';
import { createCategoryStore } from '@/store/category.store';
```

New:
```ts
import type { Category } from '@/modules/categories/entities/category.entity';
import type { ICategoryRepository } from '@/modules/categories/repositories/category.repository';
import { createCategoryStore } from '@/modules/categories/store/category.store';
```

Also update the `makeRepo` factory to include the new `getTransactionCount` method (so that the `ICategoryRepository` mock satisfies the updated interface):

Old `makeRepo` function:
```ts
function makeRepo(overrides: Partial<ICategoryRepository> = {}): ICategoryRepository {
  return {
    getAll: jest.fn().mockResolvedValue([mockCategory()]),
    getAllByType: jest.fn().mockResolvedValue([mockCategory()]),
    add: jest.fn().mockResolvedValue(mockCategory()),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

New `makeRepo` function (add `getTransactionCount`):
```ts
function makeRepo(overrides: Partial<ICategoryRepository> = {}): ICategoryRepository {
  return {
    getAll: jest.fn().mockResolvedValue([mockCategory()]),
    getAllByType: jest.fn().mockResolvedValue([mockCategory()]),
    add: jest.fn().mockResolvedValue(mockCategory()),
    update: jest.fn().mockResolvedValue(undefined),
    delete: jest.fn().mockResolvedValue(undefined),
    reassignAndDelete: jest.fn().mockResolvedValue(undefined),
    getTransactionCount: jest.fn().mockResolvedValue(0),
    ...overrides,
  };
}
```

- [ ] **Step 8.2: Update `__tests__/category.repository.test.ts`**

One import change:

Old:
```ts
import { CategoryRepository, type NewCategoryInput } from '@/repositories/category.repository';
```

New:
```ts
import { CategoryRepository, type NewCategoryInput } from '@/modules/categories/repositories/category.repository';
```

- [ ] **Step 8.3: Update `__tests__/repositories/category_repository.test.ts`**

One import change:

Old:
```ts
import { CategoryRepository, type NewCategoryInput } from '@/repositories/category.repository';
```

New:
```ts
import { CategoryRepository, type NewCategoryInput } from '@/modules/categories/repositories/category.repository';
```

- [ ] **Step 8.4: Update `__tests__/screens/settings/categories/categories_hook.test.ts`**

Two mock path changes.

Old mock declarations:
```ts
jest.mock('@/database/categories', () => ({
  getCategoryTransactionCount: jest.fn(),
}));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
```

New:
```ts
jest.mock('@/modules/categories/database/categories', () => ({
  getCategoryTransactionCount: jest.fn(),
}));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
```

Two import changes (the named imports that match the mock paths):

Old:
```ts
import { getCategoryTransactionCount } from '@/database/categories';
import { useCategoryStore } from '@/store/category.store';
import type { Category } from '@/store/category.store';
```

New:
```ts
import { getCategoryTransactionCount } from '@/modules/categories/database/categories';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Category } from '@/modules/categories/store/category.store';
```

Also update the two `jest.requireActual` paths for the screen-level stores — these mock the screens' own state/store files which have moved to the module:

Old:
```ts
const realCategoriesStore = jest.requireActual<
  typeof import('@/screens/settings/categories/categories.store')
>('@/screens/settings/categories/categories.store');
const realCategoriesState = jest.requireActual<
  typeof import('@/screens/settings/categories/categories.state')
>('@/screens/settings/categories/categories.state');
```

New:
```ts
const realCategoriesStore = jest.requireActual<
  typeof import('@/modules/categories/screens/settings/categories/categories.store')
>('@/modules/categories/screens/settings/categories/categories.store');
const realCategoriesState = jest.requireActual<
  typeof import('@/modules/categories/screens/settings/categories/categories.state')
>('@/modules/categories/screens/settings/categories/categories.state');
```

Also update the two `jest.mock` calls for screen-level stores:

Old:
```ts
jest.mock('@/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn(),
}));
jest.mock('@/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn(),
}));
```

New:
```ts
jest.mock('@/modules/categories/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn(),
}));
jest.mock('@/modules/categories/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn(),
}));
```

And the two `jest.requireMock` calls:

Old:
```ts
const mockedState = jest.requireMock<{ useCategoriesScreenState: jest.Mock }>(
  '@/screens/settings/categories/categories.state',
).useCategoriesScreenState;
const mockedStore = jest.requireMock<{ useCategoriesScreenStore: jest.Mock }>(
  '@/screens/settings/categories/categories.store',
).useCategoriesScreenStore;
```

New:
```ts
const mockedState = jest.requireMock<{ useCategoriesScreenState: jest.Mock }>(
  '@/modules/categories/screens/settings/categories/categories.state',
).useCategoriesScreenState;
const mockedStore = jest.requireMock<{ useCategoriesScreenStore: jest.Mock }>(
  '@/modules/categories/screens/settings/categories/categories.store',
).useCategoriesScreenStore;
```

- [ ] **Step 8.5: Update `__tests__/screens/settings_categories.hook.test.ts`**

Two mock path changes:

Old:
```ts
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn(...)
}));
jest.mock('@/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn(...)
}));
```

New:
```ts
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/categories/screens/settings/categories/categories.state', () => ({
  useCategoriesScreenState: jest.fn(...)
}));
jest.mock('@/modules/categories/screens/settings/categories/categories.store', () => ({
  useCategoriesScreenStore: jest.fn(...)
}));
```

Import at line 4:

Old:
```ts
import { useCategoryStore } from '@/store/category.store';
```

New:
```ts
import { useCategoryStore } from '@/modules/categories/store/category.store';
```

Also update the `useCategories` hook import path (line 3) — the hook moved to the module:

Old:
```ts
import { useCategories } from '@/screens/settings/categories/categories.hook';
```

New:
```ts
import { useCategories } from '@/modules/categories/screens/settings/categories/categories.hook';
```

- [ ] **Step 8.6: Run tests**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm test -- --testPathPattern="category" --ci 2>&1 | tail -40
```

Expected: all category-related tests pass. Fix any failures before moving on.

- [ ] **Step 8.7: Commit test updates**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add __tests__/category.store.test.ts __tests__/category.repository.test.ts __tests__/repositories/category_repository.test.ts __tests__/screens/settings/categories/categories_hook.test.ts __tests__/screens/settings_categories.hook.test.ts && git commit -m "test(categories): update import paths to modules/categories"
```

---

## Task 9: Full CI parity verification

- [ ] **Step 9.1: Run full test suite**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm test -- --ci 2>&1 | tail -20
```

Expected: all tests pass, coverage thresholds met (80% lines / 95% functions / 100% branches).

- [ ] **Step 9.2: Run format check and lint**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run format:check && npm run lint 2>&1 | tail -20
```

Expected: no format or lint errors. If oxfmt reports unsorted imports or Tailwind classes in the new files, run `npm run format` to fix then commit the changes.

- [ ] **Step 9.3: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npm run typecheck 2>&1 | tail -20
```

Expected: no errors.

- [ ] **Step 9.4: Run expo-doctor**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx --yes expo-doctor 2>&1 | tail -20
```

Expected: no new issues.

- [ ] **Step 9.5: Android prebuild dry-run**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && npx expo prebuild --no-install --platform android 2>&1 | tail -10 && test -d android && echo "android/ generated"
```

Expected: `android/` directory exists, no prebuild errors.

- [ ] **Step 9.6: Final commit if format fixes were needed**

If Step 9.2 required a `npm run format` fix:

```bash
cd /Users/musta/Code/projects/practice/MoneyApp/.claude/worktrees/festive-rosalind-1aabd7 && git add -A && git commit -m "style(categories): oxfmt import/class sort in migrated module files"
```

---

## Self-Review Checklist

**Spec coverage:**
- Wave A (data layer): Tasks 1–3 — entity, database queries, repository + `getTransactionCount`
- Wave B (shared component + barrel): Task 4 — `CategoryPickerSheet` with `PressableFeedback`, barrel `index.ts`
- Wave C (screens): Task 5 — all 9 screen files moved, HeroUI fixes applied to `add_edit_category_sheet.tsx`, `category_row.tsx`, `reassign_category_sheet.tsx`
- Wave D (stubs + deletes): Tasks 6–7 — 4 stubs, route update, original screens tree deleted, original repository deleted
- Wave E (stub cleanup): explicitly out of scope, noted per design
- Test updates: Task 8 — 5 test files updated with exact mock paths including `jest.requireActual`, `jest.requireMock`, and named imports

**Architecture decisions covered:**
- `CategoryRepository` NOT exported from barrel (Task 4 barrel omits it) — confirmed
- `CategoryPickerSheet` IS exported from barrel — confirmed
- `store/category.store.ts` stub re-exports `Category` as canonical type — confirmed
- Entity stub is backward-compat only — confirmed

**Known issues handled:**
- `getCategoryTransactionCount` bypass: hook imports from `@/modules/categories/database/categories` (not the old path); full repo routing deferred as noted in Step 5.3a rationale
- Dead `reassignCategory` export: documented comment added in Task 1.3
- `null` vs `undefined` for `editingCategory`: kept as-is in `categories.store.ts`

**HeroUI fixes applied:**
- `category_picker_sheet.tsx`: `Pressable` → `PressableFeedback` (Task 4.2)
- `add_edit_category_sheet.tsx`: raw `Text`/field labels → HeroUI `Text` with `className`; `TextInput` → `Input` from `@/components/ui/input`; 4× `Pressable` → `PressableFeedback` (Task 5.2c)
- `category_row.tsx`: 2× `Pressable` → `PressableFeedback` with `hitSlop` preserved (Task 5.2a)
- `reassign_category_sheet.tsx`: 3× raw `Text` → HeroUI `Text` with `className`; 1× `Pressable` → `PressableFeedback` (Task 5.2b)

**No placeholders present** — all code blocks are complete and runnable.

**Type consistency:** `ICategoryRepository.getTransactionCount(id: string): Promise<number>` is defined in Task 2 and the mock in Task 8.1 adds `getTransactionCount: jest.fn().mockResolvedValue(0)` — consistent.
