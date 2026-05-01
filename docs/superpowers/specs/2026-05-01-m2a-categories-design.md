# M2a — Categories

**Date:** 2026-05-01
**Status:** Approved
**Module:** M2a — Categories (first sub-module of M2: Daily Transactions)
**Depends on:** M1 + M1.5 complete
**Unlocks:** M2b — Transactions (categories must exist before transactions can be logged)

---

## Overview

M2a builds the category system that transactions will reference. It seeds 27 default categories (22 expense + 5 income), provides the full data layer, and delivers U25 — Settings Categories screen where users can add, edit, and delete custom categories.

U24 (Accounts Management Settings) is deferred to a future sub-module.

---

## 1. File Layout

### New files

```
database/
  migrations/
    003_create_categories.ts      # DDL + INSERT OR IGNORE for all 27 defaults
  entities/
    category.entity.ts
  categories.ts                   # query executor

store/
  category.store.ts               # createCategoryStore(repo) + useCategoryStore

app/(app)/settings/
  categories/
    index.tsx
    categories.hook.ts
    categories.store.ts           # activeTab: 'expense' | 'income'
    categories.anim.ts
    components/
      category_row.tsx
      add_edit_category_sheet.tsx
      reassign_category_sheet.tsx
      delete_confirmation_dialog.tsx
```

### Updated files

```
database/migrations/index.ts          # append migration003
constants/enums.ts                    # add CategoryType enum
constants/strings.ts                  # all U25 copy
app/(app)/_layout.tsx                 # call loadCategories() on mount
app/(app)/settings/index.tsx          # unblock Categories Management row
app/(app)/settings/settings.hook.ts   # add categories navigation
```

---

## 2. DB Schema

```sql
CREATE TABLE IF NOT EXISTS categories (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK(type IN ('expense', 'income')),
  icon       TEXT NOT NULL,
  color      TEXT NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
```

---

## 3. Default Category Seed

All 27 defaults are seeded in `003_create_categories.ts` using `INSERT OR IGNORE`. Deterministic string IDs make the operation idempotent across fresh installs and re-runs.

### Expense (22)

| id | Name | Icon | Color |
|---|---|---|---|
| `cat_housing` | Housing | `home` | `#1B2B4B` |
| `cat_food` | Food & Dining | `food-fork-drink` | `#C9973A` |
| `cat_groceries` | Groceries | `cart` | `#3D7A5F` |
| `cat_dining_out` | Dining Out | `silverware-fork-knife` | `#D4830A` |
| `cat_transport` | Transport | `bus` | `#185FA5` |
| `cat_car` | Car | `car` | `#4A6FA5` |
| `cat_utilities` | Utilities | `lightning-bolt` | `#2D7D6E` |
| `cat_phone_internet` | Phone & Internet | `wifi` | `#7B3F8C` |
| `cat_health` | Health | `pill` | `#C0442A` |
| `cat_subscriptions` | Subscriptions | `cellphone` | `#4A2545` |
| `cat_shopping` | Shopping | `shopping` | `#C45C2A` |
| `cat_clothes` | Clothes | `hanger` | `#7A8B3C` |
| `cat_education` | Education | `school` | `#185FA5` |
| `cat_family` | Family | `account-group` | `#2D7D6E` |
| `cat_charity` | Charity | `hand-heart` | `#3D7A5F` |
| `cat_gifts` | Gifts | `gift-outline` | `#C9973A` |
| `cat_bills` | Bills | `receipt` | `#1B2B4B` |
| `cat_debt_payment` | Debt Payment | `bank-transfer` | `#C0442A` |
| `cat_bank_fees` | Bank Fees | `bank` | `#4A2545` |
| `cat_entertainment` | Entertainment | `party-popper` | `#C45C2A` |
| `cat_money_transfer` | Money Transfer | `bank-transfer-out` | `#4A6FA5` |
| `cat_other_expense` | Other | `dots-horizontal` | `#6B7F99` |

### Income (5)

| id | Name | Icon | Color |
|---|---|---|---|
| `cat_salary` | Salary | `briefcase` | `#4CAF82` |
| `cat_freelance` | Freelance | `lightbulb` | `#C9973A` |
| `cat_gift_income` | Gift | `gift` | `#7B3F8C` |
| `cat_returns` | Returns | `chart-line` | `#185FA5` |
| `cat_transfer_in` | Transfer In | `arrow-down-circle` | `#3D7A5F` |

---

## 4. Enum

```typescript
// constants/enums.ts — append
export enum CategoryType {
  Expense = 'expense',
  Income  = 'income',
}
```

---

## 5. Entity

```typescript
// database/entities/category.entity.ts
export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
  icon: string
  color: string
  is_default: 0 | 1
  sort_order: number
  created_at: string
  updated_at: string
}
```

---

## 6. Query Executor — `database/categories.ts`

| Function | SQL operation |
|---|---|
| `getCategories(db)` | SELECT all, ORDER BY type, sort_order |
| `getCategoriesByType(db, type)` | SELECT WHERE type = ? |
| `addCategory(db, data)` | INSERT |
| `updateCategory(db, id, data)` | UPDATE name / icon / color |
| `deleteCategory(db, id)` | DELETE WHERE id = ? |
| `reassignCategory(db, fromId, toId)` | UPDATE transactions SET category_id = ? WHERE category_id = ? |

All functions receive `db: SQLiteDatabase` as first parameter. No internal `getDb()` calls.

> **M2a note:** `reassignCategory` references the `transactions` table which is created in M2b. During M2a, no transactions exist so the "has transactions" delete branch never triggers. The function is defined in M2a with a stub body and completed in M2b when the transactions table is available.

---

## 7. Repository Interface

```typescript
export interface ICategoryRepository {
  getAll(): Promise<Category[]>
  getAllByType(type: 'expense' | 'income'): Promise<Category[]>
  add(data: Omit<Category, 'id' | 'is_default' | 'created_at' | 'updated_at'>): Promise<void>
  update(id: string, data: Pick<Category, 'name' | 'icon' | 'color'>): Promise<void>
  delete(id: string): Promise<void>
  reassignAndDelete(fromId: string, toId: string): Promise<void>
}
```

Implemented by `CategoryRepository`. Injected into `createCategoryStore`.

---

## 8. Store — `store/category.store.ts`

```typescript
interface CategoryState {
  categories: Category[]
  loadCategories: () => Promise<void>
  addCategory: (data) => Promise<void>
  updateCategory: (id: string, data) => Promise<void>
  deleteCategory: (id: string) => Promise<void>
  reassignAndDelete: (fromId: string, toId: string) => Promise<void>
}

export function createCategoryStore(repo: ICategoryRepository) { ... }
export const useCategoryStore = createCategoryStore(new CategoryRepository())
```

`loadCategories()` is called in `(app)/_layout.tsx` on mount alongside `loadAccounts()` and `loadRate()`.

---

## 9. U25 — Settings Categories Screen

### Route
`/(app)/settings/categories` — stack push from U23 Settings Main.

### Layout

```
Header: "Categories"  ←  back button
──────────────────────────────────────
[ Expense ]  [ Income ]    ← tab switcher (categories.store.ts: activeTab)
──────────────────────────────────────
Defaults section
  [icon]  Housing                🔒
  [icon]  Food & Dining          🔒
  ...

Custom section (only shown when custom categories exist)
  [icon]  My Category     [✏️] [🗑️]
  ...
──────────────────────────────────────
                   [ + Add Category ]  ← FAB
```

### Category row — default
Icon (colored) · Name · `lock-outline` icon (`text2` color, right-aligned). No edit or delete.

### Category row — custom
Icon (colored) · Name · Edit button · Delete button (right side).

### Add / Edit Category Sheet (bottom sheet)

| Field | Rule |
|---|---|
| Name | Required · max 20 chars · unique within same type |
| Type | Expense or Income toggle · **locked when editing** |
| Icon | Scrollable grid of curated MCIcons (see list below) |
| Color | 12 swatches — same `AccountColors` from `theme.ts` |

### Delete flow

| Condition | Flow |
|---|---|
| Custom, no transactions | Confirmation dialog: *"Delete [Name]? This cannot be undone."* → delete |
| Custom, has transactions | Reassign sheet: *"[Name] has transactions. Move them to:"* → list of same-type categories (excluding deleted one) → confirm → reassign all transactions → delete |

Defaults are never deletable or renameable — edit/delete controls are not rendered for rows where `is_default = 1`.

### Icon picker — available icons

```
home               food-fork-drink     cart                silverware-fork-knife
bus                car                 lightning-bolt      wifi
pill               cellphone           shopping            hanger
school             account-group       hand-heart          gift-outline
gift               receipt             bank-transfer       bank-transfer-out
bank               party-popper        briefcase           lightbulb
chart-line         arrow-down-circle   dots-horizontal     star
heart              music-note          dumbbell            airplane
```

32 icons total — covers all default category icons plus extras for custom categories.

### Custom category limits
Max 30 custom categories total (across both types). FAB is hidden and a message shown when limit is reached.

---

## 10. Navigation Update — U23 Settings

The "Categories Management" row in `app/(app)/settings/index.tsx` is currently rendered greyed out with a "coming soon" tooltip. It is unblocked: tap navigates to `/(app)/settings/categories`.

---

## 11. Business Rules

| Rule | Detail |
|---|---|
| BR-CAT-01 | Default categories cannot be deleted or renamed |
| BR-CAT-02 | Custom category name must be unique within the same type (expense or income) |
| BR-CAT-03 | Deleting a custom category with transactions requires reassigning them first |
| BR-CAT-04 | Reassign target must be of the same type as the deleted category |
| BR-CAT-05 | Max 30 custom categories total |
| BR-CAT-06 | Category type cannot be changed after creation |
| BR-CAT-07 | `Transfer` transaction type handles internal account-to-account moves — no category needed for those. `Money Transfer` expense category is for sending money to others (Instapay, family, etc.) |

---

## 12. Out of Scope

- Sub-categories (explicitly deferred)
- U24 Accounts Management Settings (deferred to future sub-module)
- Category usage statistics / spending breakdowns (M6)
- Category icons beyond the curated 24 (user can only pick from the grid)
