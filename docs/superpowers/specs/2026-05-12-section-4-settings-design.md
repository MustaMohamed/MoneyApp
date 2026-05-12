# Section 4 · Settings — Design Spec

**Date:** 2026-05-12
**Status:** Draft — awaiting plan approval
**Owners:** [tariq] technical · [marcus] UX · [layla] financial · [sarah] sequencing
**Section:** 4 of 9 (Settings) within the HeroUI Native migration initiative
**Branch:** `feat/section-4-settings` (branch before any work)

**Cross-references:**
- §3 Reusable Patterns spec: `docs/superpowers/specs/2026-05-12-section-3-reusable-patterns-design.md`
- §3 Plan: `docs/superpowers/plans/2026-05-12-section-3-reusable-patterns.md`
- §1 Foundation spec: `docs/superpowers/specs/2026-05-10-section-1-foundation-design.md`

---

## 1. Feature Summary

§4 migrates the entire Settings domain to HeroUI Native v1.0 + Unistyles 3 (via Uniwind) and Cairo Nights tokens. It retires two legacy `react-native-actions-sheet` consumers that live in this domain, activates the real `getCategoryTransactionCount` stub, fixes the `reassignAndDelete` atomicity bug, adds the `cat_other_income` protected seed via migration 009, and ships a minimal About screen. Security and PIN are explicitly deferred to after §9.

**What ships in §4:**

1. Settings root — migrated to `SettingsSection` with 3-group layout (see §3 below).
2. Currency screen — migrated to HeroUI Native / Cairo Nights. Logic unchanged. Fetch-error inline message added.
3. Categories screen — migrated shell + tab switcher. FlashList kept. Legacy sheet consumers replaced.
4. `AddEditCategorySheet` — migrated from `react-native-actions-sheet` to `Sheet` (`size="lg"`).
5. `ReassignCategorySheet` — migrated from `react-native-actions-sheet` to `Sheet` (`size="lg"`). Combined title + subtitle header.
6. `DeleteConfirmationDialog` — kept as RN `Modal`. No change.
7. About screen — new minimal screen (logo, version, build, data-locality notice only).
8. Migration `009_add_other_income_category.ts` — seeds `cat_other_income` as protected income fallback.
9. `PROTECTED_CATEGORY_IDS` compile-time constant — exported from `constants/enums.ts`.
10. `getCategoryTransactionCount(db, id)` query — replaces the hardcoded `false` stub at `categories.hook.ts:104`.
11. `reassignAndDelete` atomicity fix — `db.withTransactionAsync` wrapper; extends to update `commitments.category_id`.
12. `EmptyState` `categories` variant — additive extension to the §3 component.
13. Name uniqueness validation — scoped to `(name, type)` at application layer (Zod + repository check).
14. Copy keys in `constants/strings.ts` per §8 below.

**What does NOT ship in §4 (explicit out-of-scope):**
- Security screen and Security group in Settings root
- PIN setup screen
- App lock / lock-on-resume behavior
- Idle timeout
- Primary-currency change
- Full About sub-rows (Privacy Policy, Terms, Licenses, Contact, Rate App, attribution)
- Subcategories
- `is_deleted` soft-delete on categories

---

## 2. Product & UX

*Source: Marcus Chen's §4 brainstorm. Implementors build from this section directly.*

### 2.1 Settings Root — Section Grouping

**Decision: Option A — three groups (Preferences, Data, About).**

Rationale: With Security deferred, the natural groupings are Preferences (how the app behaves), Data (what the user has stored), and About (informational). Option B (collapsing into two groups) is forced — Currency and Categories serve different mental models (rate management vs. data management) and do not naturally share a header. Three groups is honest about the structure. Consistent with YNAB's four-group pattern, scaled to our current surface area.

**Group 1 — PREFERENCES**
- "Currency" · icon: `currency-usd` · trailing: `chevron` + value text ("EGP / USD") · navigates to Currency screen

**Group 2 — DATA**
- "Categories" · icon: `tag-multiple` · trailing: `chevron` · navigates to Categories screen

**Group 3 — ABOUT**
- "About MoneyApp" · icon: `information-outline` · trailing: `chevron` · navigates to About screen

The existing hand-rolled card + `SafeAreaView` is completely replaced. Three `SettingsSection` instances, stacked in `ScreenScroll`. `StyleSheet.create` is deleted from this file.

**Currency row trailing value:** Display the primary currency code "EGP" as the trailing value (per Layla: EGP is the immutable primary; the screen manages the rate, not a currency selector). The `value` prop on `SettingsSectionItem` receives `Strings.settingsCurrencyValue('EGP')`.

### 2.2 Currency Screen

Keep as a full-screen stack route. No conversion to sheet. Navigation: `router.push('/settings/currency')` from the chevron row. The screen has enough content substance (rate card + refresh + manual override form) to justify a dedicated screen.

**Migration work only:**
- `SafeAreaView` → `Screen`
- `ScrollView` → `ScreenScroll`
- StyleSheet primitives → `Box`/`Text` className tokens
- Raw `TextInput` → `Input` from `components/ui/input.tsx`
- `LinearGradient` + `Pressable` CTA → `Button` variant="primary" (gold gradient)
- Refresh button → `Button` variant="secondary" (outlined)

**New addition:** inline fetch-error message below the refresh button when `state.fetchError` is set. Copy: `Strings.currencyFetchError`. The rate card continues showing last-known value when error is present.

**Manual override panel:** The `Animated.View` expand/collapse stays. `currency.anim.ts` is untouched. Only the container Box styles change.

**Visual hierarchy fix:** Refresh button = `variant="secondary"` (ghost/outlined). Save rate = `variant="primary"` (gold gradient). This clarifies which action is primary — currently both look similar.

**States:**
- Loading: `isFetching=true` → refresh Button shows loading indicator, is disabled
- Error: `fetchError` set → inline message `Strings.currencyFetchError` below refresh button
- Manual override active: "Manual" badge visible, rate value uses `text-accent` (gold)
- Populated: rate + timestamp

### 2.3 Categories Screen

Structure preserved. Migration work:

1. `SafeAreaView` → `Screen`
2. Tab switcher: keep Pressable + Box composition with `tv()` variants (HeroUI Native `SegmentedControl` does not match the spec — compose manually). Active tab: `bg-accent`, midnight-blue text. Inactive: `bg-surface-secondary`, muted text.
3. `FlashList` kept. High-performance, correct for potentially long lists.
4. Bottom CTA area: replace hand-rolled `Pressable` with `Button` variant="primary". Limit message: replace raw `Text` with HeroUI `Text` primitive.
5. `EmptyState` categories variant: rendered when both `defaultCategories` and `customCategories` are empty for the active tab.

**Empty state:** `<EmptyState variant="categories" />` — no `onAction` (no CTA). This is a defensive fallback; categories always ship defaults via migration. See §5 for the new variant spec.

**`CategoryRow` component:** Prop API unchanged. Icon box color via `style={{ backgroundColor: item.color + '22' }}` (runtime hex — cannot use className). Edit/delete affordances are shown for all non-protected categories regardless of `is_default`. The lock icon and absent actions apply only to `PROTECTED_CATEGORY_IDS` (`cat_other_expense`, `cat_other_income`). All other `is_default=1` categories show edit and delete buttons — Layla confirmed this is correct.

### 2.4 AddEditCategorySheet — Migration Recipe

This is a step-by-step contract for `@dev`. The complete before/after:

| Item | Before | After |
|---|---|---|
| Import | `from 'react-native-actions-sheet'` | `from '@/components/ui/sheet'` + `from '@gorhom/bottom-sheet'` |
| Component | `<ActionSheet ref={sheetRef} ...>` | `<Sheet visible={visible} onClose={onClose} title={...} size="lg" footer={<Button>}>` |
| Scroll container | `<ScrollView>` from actions-sheet | `<BottomSheetScrollView>` from `@gorhom/bottom-sheet` |
| Icon grid | `<FlatList scrollEnabled={false}>` from react-native | `<FlatList scrollEnabled={false}>` from react-native (unchanged — non-scrollable, does not need BottomSheetFlatList) |
| Imperative control | `useRef<ActionSheetRef>` + `useEffect` calling `.show()` / `.hide()` | Deleted entirely. `visible` prop drives Sheet. |
| CTA | Inside content View | Moved to `footer` prop on Sheet |
| Title rendering | Hand-rolled `Text` inside content | Sheet `title` prop: `{isEditing ? Strings.categoriesEditSheetTitle : Strings.categoriesAddSheetTitle}` |
| Sheet height | Auto-sized to content | Fixed at 85% (`size="lg"`) |
| Keyboard behavior | `useBottomSafeAreaPadding={false}` in actions-sheet | `@gorhom` handles keyboard avoidance; use `keyboardBehavior="extend"` on the BottomSheet via the Sheet primitive |
| Background | `containerStyle.backgroundColor` | `bg-surface` className on Sheet container (handled by primitive) |

**Specific deletions from `add_edit_category_sheet.tsx`:**
- `import ActionSheet, { type ActionSheetRef, ScrollView } from 'react-native-actions-sheet'` — delete
- `const sheetRef = useRef<ActionSheetRef>(null)` — delete
- `useEffect(() => { if (visible) { sheetRef.current?.show(); } else { sheetRef.current?.hide(); } }, [visible, ...])` — delete the imperative show/hide calls; the reset/initialize logic inside the `if (visible)` block stays, just without the `.show()` call
- `<ActionSheet ref={sheetRef} ...>` — replace with `<Sheet>`

**Name-length fix:** Current schema validates max 20 chars (`categoriesErrNameTooLong` says "20 characters or less"), but Layla's rule is 50. Update Zod schema to `z.string().min(1).max(50)` and update the string key to reflect 50.

**Name uniqueness fix (type-scoped):** Current uniqueness check in `createCategorySchema` compares names case-insensitively across ALL categories regardless of type. This must be scoped to same-type only: the refine predicate should filter by `c.type === activeTab` (for new) or `c.type === editingCategory.type` (for edit). Additionally, add a repository-layer check in `CategoryRepository.add()` before inserting.

### 2.5 ReassignCategorySheet — Migration Recipe

| Item | Before | After |
|---|---|---|
| Import | `from 'react-native-actions-sheet'` | `from '@/components/ui/sheet'` + `from '@gorhom/bottom-sheet'` |
| Component | `<ActionSheet ref={sheetRef} ...>` | `<Sheet visible={visible} onClose={onCancel} title={titleString} size="lg" footer={<Button>}>` |
| Option list | `<FlatList>` from react-native (scrollable) | `<BottomSheetFlatList>` from `@gorhom/bottom-sheet` |
| Imperative control | `useRef<ActionSheetRef>` + `useEffect` + `.reset()` call | Deleted. `visible` prop + `onClose` drives Sheet. |
| CTA | Inside content View | `footer` prop on Sheet |
| Sheet height | Auto-sized (~40%) | Fixed at 85% (`size="lg"`) — rationale: user may have many categories to choose from |

**Combined header (decision #6):** The Sheet `title` prop receives the category name (Marcus's format). A subtitle showing the transaction count is rendered as the first child inside `Sheet.Body` before the `BottomSheetFlatList`:

```tsx
<Sheet
  visible={visible}
  onClose={onCancel}
  title={Strings.categoriesReassignTitle(categoryName)}
  size="lg"
  footer={<Button ...>}
>
  <Sheet.Body>
    <Text className="text-muted text-sm font-inter-regular mb-3">
      {Strings.categoriesReassignSubtitle(transactionCount)}
    </Text>
    <BottomSheetFlatList ... />
  </Sheet.Body>
</Sheet>
```

The Sheet `title` prop is a plain string — `Strings.categoriesReassignTitle(categoryName)` evaluates to a string and is passed as a prop. No dynamic React node needed.

`transactionCount` is passed as a new prop `linkedCount: number` to `ReassignCategorySheet`. The hook (`categories.hook.ts`) computes this from the new `getCategoryTransactionCount` query result.

**Specific deletions from `reassign_category_sheet.tsx`:**
- `import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet'` — delete
- `const sheetRef = useRef<ActionSheetRef>(null)` — delete
- The entire `useEffect` — delete
- `<ActionSheet ref={sheetRef} ...>` — replace with `<Sheet>`
- `import { FlatList } from 'react-native'` — replace import with `BottomSheetFlatList` from `@gorhom/bottom-sheet`

**New prop:** `linkedCount: number` — passed from hook, displayed as subtitle.

### 2.6 About Screen

Minimal v1. Full-screen stack route at `app/(app)/settings/about/index.tsx`.

**Content:**
1. App info section (pure display, no `SettingsSection` header):
   - App icon/logo (from `assets/` — check availability; if absent, use `MaterialCommunityIcons` `bank` or a placeholder Box)
   - App name: "MoneyApp" in Sora Bold, `text-foreground`
   - Version: `Constants.expoConfig?.version` from `expo-constants`
   - Build: `Constants.expoConfig?.extra?.buildNumber ?? Constants.expoConfig?.version`
2. Data locality notice (plain info `Box` + `Text`):
   - Copy: `Strings.aboutDataNotice` — "MoneyApp is local-only. All your financial data stays on your device."

**No links section, no support section, no attribution** in v1 (decision #5). These rows ship when URLs and company name exist.

**Navigation:** accessed via "About MoneyApp" row on Settings root, standard stack push.

**Screen anatomy:**
- `screens/settings/about/index.tsx` — UI (no useState)
- `screens/settings/about/about.hook.ts` — reads `Constants.expoConfig?.version` and build number, returns them as state values

### 2.7 Navigation Architecture (All Settings Screens)

| Screen | Route | Container | §4 Status |
|---|---|---|---|
| Settings root | `app/(app)/settings/index.tsx` | Full-screen stack | Migrate |
| Currency | `app/(app)/settings/currency/index.tsx` | Full-screen stack | Migrate |
| Categories | `app/(app)/settings/categories/index.tsx` | Full-screen stack | Migrate |
| AddEditCategory | Sub-component within Categories | `Sheet` size="lg" | Migrate (from actions-sheet) |
| DeleteConfirmation | Sub-component within Categories | RN `Modal` (keep) | No change |
| ReassignCategory | Sub-component within Categories | `Sheet` size="lg" | Migrate (from actions-sheet) |
| About | `app/(app)/settings/about/index.tsx` | Full-screen stack | New |
| Security | — | — | DEFERRED (post-§9) |
| PIN Setup | — | — | DEFERRED (post-§9) |

`app/(app)/settings/about/index.tsx` is a one-liner: `export { default } from '@/screens/settings/about';`

---

## 3. Financial Logic

*Source: Layla Hassan's §4 brainstorm. These rules are authoritative — do not reinterpret.*

### 3.1 Currency Screen

- EGP is the immutable primary currency. No primary-currency change in v1.
- The currency screen manages only the EGP/USD exchange rate.
- Footer note: `Strings.currencyFooterNote` — "All balances and analytics are shown in Egyptian Pound (EGP)."
- Rate changes do NOT retroactively modify `egp_amount` on any existing transaction. The rate is a display-conversion tool only. Test case TC-08 verifies this.
- Rate refresh is user-initiated only (no background job). Live fetch: `https://open.er-api.com/v6/latest/USD`.

### 3.2 Category Taxonomy — Affirmed

22 expense + 5 income seeded categories (from migration 003). §4 adds one: `cat_other_income` (migration 009). Full taxonomy is in Layla's brainstorm §2.1 — not duplicated here.

**Protected category IDs:**
```typescript
// constants/enums.ts
export const PROTECTED_CATEGORY_IDS = ['cat_other_expense', 'cat_other_income'] as const;
export type ProtectedCategoryId = typeof PROTECTED_CATEGORY_IDS[number];
```

Only these two IDs are protected (undeletable). All other `is_default=1` categories are deletable with reassignment if linked transactions exist. This is enforced at the application layer (not DB level) — the delete button is absent for protected IDs in `CategoryRow`.

### 3.3 Category CRUD Rules (from Layla)

**Editable fields post-creation:** `name`, `icon`, `color`. Type (`expense` / `income`) is permanently locked after creation.

**Naming rules:**
1. Uniqueness scoped to `(name, type)` — "Groceries (expense)" and "Groceries (income)" are distinct. "Groceries" + "Groceries" under expense is a collision.
2. Length: 1–50 characters (Zod: `z.string().min(1).max(50)`). Note: current code has max 20 — this is corrected to 50 in §4.
3. Whitespace: strip leading/trailing before uniqueness check and save.
4. Character set: unrestricted (Arabic names supported).

**Custom category limit:** 30 total (`is_default=0`, both types combined). Enforced in hook via `customCount >= 30`. Affirmed unchanged.

### 3.4 Delete Flow — Exact Rules (from Layla)

**Step 1:** Query linked transaction count: `getCategoryTransactionCount(db, id)`.

**Step 2a (count = 0):** Show `DeleteConfirmationDialog`. On confirm: `deleteCategory(id)`.

**Step 2b (count ≥ 1):** Show `ReassignCategorySheet` with `linkedCount`. Reassign options = all categories of the same type, excluding the category being deleted. On confirm: `reassignAndDelete(fromId, toId)`.

**Protected categories:** Delete affordance is completely absent from the UI — no button, no disabled state. No DB guard needed because the guard is the missing button.

**Edge case guarantee:** `cat_other_income` (migration 009) ensures there is always at least one income reassignment target even if the user deletes all other income categories.

### 3.5 Atomicity Contract for `reassignAndDelete` (Layla TC-09)

The current implementation in `CategoryRepository.reassignAndDelete()` is non-atomic (two separate `runAsync` calls). §4 must wrap the entire operation in `db.withTransactionAsync`:

```typescript
// repositories/category.repository.ts — reassignAndDelete
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

Note: `commitments.category_id` is now included. The existing `database/categories.ts` `reassignCategory` function only updates `transactions`. The repository must inline both UPDATE statements (or the DB layer must gain a `reassignCommitments` function). Recommended: inline in the repository's `withTransactionAsync` block to keep the atomicity boundary explicit.

**Layla's TC-02 specifically tests commitment reassignment.** TC-09 tests atomicity on failure.

### 3.6 Worked Test Cases (by reference)

TC-01 through TC-10 are defined in full in `docs/superpowers/brainstorms/2026-05-12-section-4-settings-layla.md`. @dev converts these to Jest unit tests in `__tests__/`. Summary:

| TC | Tests | Key assertion |
|---|---|---|
| TC-01 | Transaction reassignment | 47 txns move; account balances unaffected |
| TC-02 | Commitment reassignment | 2 commitments move atomically with 8 txns |
| TC-03 | Zero-linked direct delete | No reassign flow; customCount decrements |
| TC-04 | Protected category | No delete button rendered; `isProtected()` returns true |
| TC-05 | Custom limit enforcement | 31st add is blocked; DB count stays at 30 |
| TC-06 | Name uniqueness within type | Duplicate name+type blocked; cross-type allowed |
| TC-07 | Type immutability | `UpdateCategoryInput` has no `type`; type unchanged |
| TC-08 | Rate change doesn't alter `egp_amount` | Historical `egp_amount` reads same value |
| TC-09 | Reassignment atomicity | All-or-nothing; no intermediate DB state |
| TC-10 | `cat_other_income` gap (fixed by migration 009) | Reassign options always ≥1 for income type |

---

## 4. Architecture

### 4.1 Settings Root Section Grouping — Final Decision

**Three groups, Option A.** Already stated in §2.1. The architectural rationale: three `SettingsSection` components stacked in `ScreenScroll`. No state required — all items navigate or are static. `screens/settings/settings.hook.ts` is a simple navigation helper; it requires no store.

### 4.2 Database Changes

#### Migration 009 — Add `cat_other_income`

File: `database/migrations/009_add_other_income_category.ts`

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

`sort_order = 99` places it at the end of the income list. `INSERT OR IGNORE` is idempotent — safe to run on existing databases that may already have a manually created category with this name.

Append to `database/migrations/index.ts`.

**Note: migration 008 already shipped. Migration 009 is the next version.** Never edit a shipped migration.

#### New query: `getCategoryTransactionCount`

Add to `database/categories.ts`:

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

This replaces the `const hasTransactions = false` stub at `categories.hook.ts:104`. The hook calls this before opening any delete UI.

#### `reassignAndDelete` atomicity fix

Location: `repositories/category.repository.ts`, method `reassignAndDelete`.

- Wrap in `db.withTransactionAsync`
- Add `UPDATE commitments SET category_id = ? WHERE category_id = ?`
- Remove the call to the standalone `reassignCategory` helper (inline the SQL instead so the transaction boundary is explicit)

The standalone `reassignCategory` function in `database/categories.ts` can remain for other callers but is no longer used by the repository.

#### Application-layer name uniqueness check

No DB migration needed. Enforcement is two-layered:

1. **Zod schema** (`add_edit_category_sheet.tsx`): refine predicate filters by matching type:
   ```typescript
   .refine(
     (val) =>
       !categories.some(
         (c) =>
           c.name.trim().toLowerCase() === val.trim().toLowerCase() &&
           c.type === (editingCategory?.type ?? activeTab) &&
           c.id !== editingCategory?.id,
       ),
     Strings.categoriesErrNameDuplicate,
   )
   ```

2. **Repository layer** (`CategoryRepository.add()`): before inserting, call `getCategoriesByType(db, data.type)` and check for a name match. Throw a typed error if duplicate found. This is the backstop in case the Zod schema is bypassed.

### 4.3 State Architecture

Settings §4 introduces one new screen folder with state. All existing stores are modified minimally.

**`screens/settings/about/`** — no store needed. `about.hook.ts` reads `Constants.expoConfig` synchronously and returns static values.

**`screens/settings/categories/categories.hook.ts`** — modifications:
- Replace `const hasTransactions = false` with `const transactionCount = await getCategoryTransactionCount(db, category.id)`
- Store the count in `catScreenDataState` so `ReassignCategorySheet` can display it
- Add `linkedCount` to the hook's returned state object

**`screens/settings/categories/categories.store.ts`** — add `linkedCount: number` to the state shape (default 0). This is data state (computed from DB), so it belongs in `.store.ts` not `.state.ts`.

Store/state shape per CLAUDE.md convention:

```typescript
// categories.store.ts — additions
const INITIAL_STATE = {
  editingCategory: null as Category | null,
  categoryToDelete: null as Category | null,
  linkedCount: 0, // NEW — transaction count for category being deleted
};

// setter
setLinkedCount: (count: number) =>
  set((s) => ({ state: { ...s.state, linkedCount: count } })),
```

**`components/ui/empty_state.tsx`** — additive extension only. Add `'categories'` to the `EmptyStateVariant` union. No breaking change to existing variants.

### 4.4 Folder Layout

#### New files

```
app/(app)/settings/about/index.tsx              NEW — one-liner route
screens/settings/about/index.tsx                NEW — UI (no useState)
screens/settings/about/about.hook.ts            NEW — reads expo-constants
database/migrations/009_add_other_income_category.ts   NEW
```

#### Modified files

```
app/(app)/settings/index.tsx                    no change (already one-liner)
screens/settings/index.tsx                      MIGRATE — SettingsSection x3, Screen, ScreenScroll
screens/settings/settings.hook.ts               ADD goToAbout navigation action
screens/settings/currency/index.tsx             MIGRATE — Screen, ScreenScroll, Button, Input, error state
screens/settings/categories/index.tsx           MIGRATE — Screen, tab switcher, Button CTA, EmptyState
screens/settings/categories/categories.hook.ts  MODIFY — getCategoryTransactionCount, linkedCount
screens/settings/categories/categories.store.ts MODIFY — add linkedCount to state
screens/settings/categories/components/add_edit_category_sheet.tsx   MIGRATE — Sheet, BottomSheetScrollView, name uniqueness fix, max-50 fix
screens/settings/categories/components/reassign_category_sheet.tsx   MIGRATE — Sheet, BottomSheetFlatList, linkedCount prop, combined header
repositories/category.repository.ts             FIX — withTransactionAsync + commitments UPDATE
database/categories.ts                          ADD getCategoryTransactionCount
database/migrations/index.ts                    ADD migration009 import + entry
constants/enums.ts                              ADD PROTECTED_CATEGORY_IDS
constants/strings.ts                            ADD §8 copy keys
components/ui/empty_state.tsx                   ADD 'categories' variant
```

#### Route anatomy for `settings/about/`

`app/(app)/settings/about/index.tsx`:
```typescript
export { default } from '@/screens/settings/about';
```

`screens/settings/about/index.tsx` — full UI component, no `useState`, no `useSharedValue`.
`screens/settings/about/about.hook.ts` — reads `Constants.expoConfig`, returns `{ state: { version, build } }`.

No `.store.ts` or `.state.ts` needed for About — there is no dynamic state.

### 4.5 Key APIs and Patterns

**`SettingsSection` usage in Settings root:**

```tsx
// screens/settings/index.tsx
<Screen>
  <ScreenScroll>
    <SettingsSection
      title={Strings.settingsGroupPreferences}
      items={[{
        label: Strings.settingsCurrencyRow,
        icon: 'currency-usd',
        value: Strings.settingsCurrencyValue('EGP'),
        trailing: 'chevron',
        onPress: goToCurrency,
      }]}
    />
    <SettingsSection
      title={Strings.settingsGroupData}
      items={[{
        label: Strings.settingsCategoriesRow,
        icon: 'tag-multiple',
        trailing: 'chevron',
        onPress: goToCategories,
      }]}
    />
    <SettingsSection
      title={Strings.settingsGroupAbout}
      items={[{
        label: Strings.aboutTitle,
        icon: 'information-outline',
        trailing: 'chevron',
        onPress: goToAbout,
      }]}
    />
  </ScreenScroll>
</Screen>
```

**`SettingsSection` value truncation gap (from Marcus §8):** The `SettingsSectionItem.value` string can overflow on small screens with long currency descriptions. The `SettingsSection` component should add `numberOfLines={1}` + `ellipsizeMode="tail"` to the value `Text` render. This is a fix to the §3 component, purely additive — no API change, no existing test breakage.

**Sheet migration pattern — keyboard behavior:** `@gorhom/bottom-sheet` handles keyboard avoidance via the `keyboardBehavior` prop on `BottomSheet`. The Sheet primitive (`components/ui/sheet.tsx`) should pass `keyboardBehavior="extend"` when rendering form sheets. Since the `Sheet` component is a shared primitive, this should be a constant applied to all Sheet instances (both "extend" and "fillParent" are safe defaults for form sheets). Check the §3 Sheet implementation to determine if this is already configured; if not, add it.

**`getCategoryTransactionCount` call pattern in hook:**

```typescript
// categories.hook.ts — handleDeletePress
const handleDeletePress = async (category: Category) => {
  const db = await getDb();
  const count = await getCategoryTransactionCount(db, category.id);
  setLinkedCount(count);
  if (count > 0) {
    openReassignSheet(category);
  } else {
    openDeleteConfirm(category);
  }
};
```

This makes `handleDeletePress` async. The calling UI component (`CategoryRow`) must handle the async gap — typically by showing a brief loading state on the delete button. Marcus's `CategoryRow` design already has action buttons; the loading state can be a per-row spinner during the count query.

**`PROTECTED_CATEGORY_IDS` usage pattern:**

```typescript
// In CategoryRow render
const isProtected = PROTECTED_CATEGORY_IDS.includes(category.id as ProtectedCategoryId);
// if (isProtected) render lock icon, no edit/delete buttons
// else render edit + delete buttons
```

Remove the current `is_default === 1` guard for hiding delete — it incorrectly hides delete for all 27 seeded categories. Replace with the `PROTECTED_CATEGORY_IDS` check.

### 4.6 `EmptyState` — Categories Variant Extension

File: `components/ui/empty_state.tsx`

Changes:
- Add `'categories'` to `EmptyStateVariant` union type
- Add `'categories'` entry to the variant config map:
  - icon: `'tag-outline'`
  - headline: `Strings.emptyStateCategories`
  - description: `Strings.emptyStateCategoriesDesc`
  - action: none (no CTA)

No other changes. Existing variants are untouched. Test file `__tests__/components/ui/empty_state.test.tsx` gets one new test: `categories` variant renders `tag-outline` icon, correct headline, correct description, no CTA button.

### 4.7 Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| `handleDeletePress` async gap — delete button has no loading state | High | Medium — double-tap can trigger duplicate delete | Add `isDeleting` boolean to `categories.state.ts`; set true on tap, false when sheet opens. Disable delete button while true. |
| `withTransactionAsync` on SQLite — deadlock if nested | Low | High — app freeze | `reassignAndDelete` is the only caller; it opens a fresh DB connection via `getDb()`. No nesting risk. |
| `migration009` `INSERT OR IGNORE` — existing `cat_other_income` user-created record | Low | Low — `INSERT OR IGNORE` silently skips; user's custom record survives. This is the correct behavior. |
| Name uniqueness check in repository — race condition on concurrent saves | Very low | Low — single-user local app; no concurrent writes. Not mitigated. |
| `BottomSheetFlatList` scroll behavior inside `Sheet` at `size="lg"` with many options | Medium | Medium — list may not scroll if `Sheet.Body` height is not set correctly | Ensure `Sheet.Body` uses `style={{ flex: 1 }}` (not className="flex-1" — Fabric caveat per CLAUDE.md) to fill the available snap space. |
| `SettingsSection` value text overflow (from Marcus §8) | Medium | Low | Add `numberOfLines={1}` + `ellipsizeMode="tail"` to value Text in `settings_section.tsx`. |
| `Currency` trailing value format — showing "EGP" may be confusing if user has a USD account | Low | Low — the screen title and footer note make the context clear. Accepted. |
| About screen logo asset missing | Medium | Low — use a fallback `Box` with app initials or icon until design asset exists | Check `assets/` for an app icon; if absent, use `MaterialCommunityIcons` `chart-line` or similar as placeholder. |
| `expo-constants` `buildNumber` not present in all build profiles | Low | Low — fall back to `Constants.expoConfig?.version` as the build display value. |

### 4.8 `SettingsSection` `numberOfLines` Fix (Gap from §3)

This is a minor corrective change to `components/ui/settings_section.tsx` — additive, no API change:

```tsx
// In SettingsSection, value text render:
{item.value && (
  <Text
    className="text-muted text-sm font-inter-regular"
    numberOfLines={1}
    ellipsizeMode="tail"
  >
    {item.value}
  </Text>
)}
```

---

## 5. EmptyState `categories` Variant Spec

**Variant:** `'categories'`

| Attribute | Value |
|---|---|
| Icon | `tag-outline` (MaterialCommunityIcons) |
| Headline | `Strings.emptyStateCategories` — "No categories yet" |
| Description | `Strings.emptyStateCategoriesDesc` — "Your categories will appear here." |
| Action | None — no CTA button, no text button |

**When shown:** When both `defaultCategories` and `customCategories` arrays are empty for the active tab. This is a defensive fallback — with migration 003 seeding 27 categories and migration 009 adding one more, a user should never see this state in normal flow. It protects against edge cases such as a failed migration or manual DB tampering.

**Render:** `<EmptyState variant="categories" />` with no `onAction` prop.

---

## 6. Copy Keys — `constants/strings.ts` Additions

All user-visible copy lives in `constants/strings.ts`. The following keys must be added in §4. Keys for Security, PIN, and About sub-rows (links, support, attribution) are excluded per locked decisions.

**Settings root:**
```typescript
settingsGroupPreferences: 'PREFERENCES',
settingsGroupData: 'DATA',
settingsGroupAbout: 'ABOUT',
settingsCurrencyValue: (pair: string) => pair,  // e.g. 'EGP' or 'EGP / USD'
```

**About screen:**
```typescript
aboutTitle: 'About',
aboutDataNotice: 'MoneyApp is local-only. All your financial data stays on your device.',
aboutVersion: (version: string) => `Version ${version}`,
aboutBuild: (build: string) => `Build ${build}`,
```

**Currency screen (new):**
```typescript
currencyFetchError: 'Could not update rate. Try again.',
currencyFooterNote: 'All balances and analytics are shown in Egyptian Pound (EGP).',
```

**Category changes:**
```typescript
// Update existing key (max changed from 20 to 50):
categoriesErrNameTooLong: 'Name must be 50 characters or less',

// New key for reassign subtitle:
categoriesReassignSubtitle: (count: number) =>
  count === 1 ? '1 transaction will be moved' : `${count} transactions will be moved`,
```

**EmptyState:**
```typescript
emptyStateCategories: 'No categories yet',
emptyStateCategoriesDesc: 'Your categories will appear here.',
```

---

## 7. Test Plan

All tests go in `__tests__/`. Snake_case filenames. Logic layer only (no snapshot/UI tests).

### 7.1 Database / Repository Tests

**File:** `__tests__/database/categories.test.ts`

Tests to add:
- `getCategoryTransactionCount` returns 0 when no transactions linked
- `getCategoryTransactionCount` returns correct count with N linked transactions

**File:** `__tests__/repositories/category_repository.test.ts`

Tests to add:
- `reassignAndDelete` — transactions are moved atomically (TC-01, TC-09)
- `reassignAndDelete` — commitments are also moved (TC-02)
- `reassignAndDelete` — is atomic: if DELETE fails, UPDATE is rolled back (TC-09 atomicity)
- `add` — rejects duplicate name within same type (TC-06)
- `add` — allows same name across different types (TC-06 cross-type note)
- `update` — does not modify `type` field (TC-07)

### 7.2 Store / Hook Tests

**File:** `__tests__/screens/settings/categories/categories_hook.test.ts`

Tests to add:
- `handleDeletePress` — calls `getCategoryTransactionCount` before routing
- `handleDeletePress` — routes to reassign sheet when count > 0
- `handleDeletePress` — routes to delete confirm when count = 0
- `isAtLimit` — true at exactly 30 custom categories (TC-05)
- `isAtLimit` — false at 29 custom categories
- `reassignOptions` — never includes the category being deleted
- `reassignOptions` — always includes `cat_other_income` for income type (TC-10)

### 7.3 Constant Tests

**File:** `__tests__/constants/protected_categories.test.ts`

- `PROTECTED_CATEGORY_IDS` includes `'cat_other_expense'`
- `PROTECTED_CATEGORY_IDS` includes `'cat_other_income'`
- `PROTECTED_CATEGORY_IDS` length is exactly 2
- `isProtected('cat_other_expense')` returns `true` (TC-04)
- `isProtected('cat_groceries')` returns `false`

### 7.4 Component Tests (additive)

**File:** `__tests__/components/ui/empty_state.test.tsx` (extend existing)

- `categories` variant renders `tag-outline` icon
- `categories` variant renders correct headline
- `categories` variant renders correct description
- `categories` variant renders no CTA button

### 7.5 Migration Test

**File:** `__tests__/database/migrations.test.ts` (extend existing if present, or create)

- Migration 009 inserts `cat_other_income` when category doesn't exist
- Migration 009 `INSERT OR IGNORE` — does not error if `cat_other_income` already exists

---

## 8. Out of Scope — Explicit List

The following are explicitly deferred. They must not appear in the §4 PR.

- **Security screen** and **Security group** in Settings root (post-§9)
- **PIN setup screen** and `PIN_CODE` secure store key (post-§9)
- **App lock / lock-on-resume** behavior (post-§9)
- **Idle timeout** (post-§9, possibly v2)
- **Primary-currency change** — EGP immutable in v1 (v2)
- **About sub-rows** — Privacy Policy, Terms of Service, Licenses, Contact Support, Rate App, attribution line (ship when URLs/copy exist)
- **Subcategories** (`parent_id` column, two-level picker) — v2
- **Category reorder** (drag `sort_order`) — no reorder logic exists; defer
- **Soft-delete / archived categories** (`is_deleted` column) — not needed with user-driven reassignment model
- **`InfoCard` shared primitive** — About and Currency screens compose inline `Box + Text` for info cards; the primitive is a candidate for §5+ but is not built in §4
- **Stripe / bank connection** — explicitly not in scope for MoneyApp ever (local-only)
- **Multi-currency expansion** (USD, GBP, etc.) beyond EGP/USD binary — v2

---

## 9. Open Questions

None remain open. All product decisions were resolved in Phase 1:

1. No primary-currency change — resolved (Layla + human confirmed).
2. Security deferred — resolved (human confirmed).
3. Migration 009 `cat_other_income` — resolved (human confirmed in-scope for §4).
4. About screen minimal — resolved (human confirmed).
5. Reassign sheet header: combined title + subtitle — resolved (decision #6).
6. Protected categories scope: only `cat_other_expense` and `cat_other_income` — resolved (decision #7).
7. Custom category limit: 30 — resolved (confirmed unchanged).
8. Idle timeout: deferred — resolved (decision #8).

One technical question for @dev to verify before coding:

- **Sheet `keyboardBehavior` in §3 primitive:** Confirm whether `components/ui/sheet.tsx` (shipped in §3) already passes `keyboardBehavior` to the underlying `BottomSheet`. If not, @dev must add `keyboardBehavior="extend"` to the `BottomSheet` component inside `sheet.tsx` as part of the §4 work. This does not change the `Sheet` public API.
