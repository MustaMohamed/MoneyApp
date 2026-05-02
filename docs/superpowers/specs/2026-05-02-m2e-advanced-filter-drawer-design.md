# M2e — Advanced Filter Drawer Design Spec

**Date:** 2026-05-02
**Cycle:** M2e
**Scope:** U31 Advanced Filter Drawer on the Transactions screen
**Unlocks:** M3 polish (saved filter presets, sort controls, etc.)

---

## 1. Goal & Non-goals

**Goal.** Add the U31 Advanced Filter Drawer to the Transactions screen so users can narrow the list by **account**, **category**, **date range**, and **amount range** in addition to the existing search and type chips. The drawer is a bottom sheet with explicit Apply semantics; the existing type chip and search behaviors are preserved.

**Non-goals (deferred):**
- Saved filter presets ("My Groceries view") — defer to a later cycle.
- Filter persistence across tab navigation or cold start — clears on tab blur, same as today.
- Sort controls inside the drawer — sort stays implicit (date desc, time desc).
- Export / report features that consume the same filter — out of scope.
- Extracting a generic multi-select primitive — defer; build dedicated filter pickers for now.

---

## 2. Settled UX Summary

| Decision | Resolution |
|---|---|
| Entry surface | Bottom sheet (~70% height), matches existing pickers |
| Filter button | Sliders icon trailing the search bar; count badge when active |
| Type chips | Unchanged — compose orthogonally with drawer filters (AND semantics) |
| Account axis | Multi-select via dedicated filter sub-picker |
| Category axis | Multi-select via dedicated filter sub-picker; type-agnostic (full list shown) |
| Date axis | Inline radio list of presets + "Custom..." opening a date-range sub-picker |
| Amount axis | Inline EGP/USD toggle + min/max numeric inputs; filters on raw `amount` & `currency` |
| Apply | Explicit Apply CTA at bottom; Reset link in drawer header clears all axes |
| Persistence | Clears on tab blur (matches existing `useTransactionsScreenStore.reset()`) |
| Picker strategy | New dedicated filter pickers under `transactions/filter/components/` (no reuse of single-select pickers) |

---

## 3. Folder Structure & File Map

### 3.1 New folder

```
app/(app)/(tabs)/transactions/filter/
├── index.tsx                          # FilterDrawer bottom sheet (default export)
├── filter.hook.ts                     # useFilterDrawer — orchestrates draft, sub-pickers, apply
├── filter.store.ts                    # Zustand: drawer visibility + draft selections
├── filter.anim.ts                     # Sheet open/close + section entry animations
├── filter.helpers.ts                  # Pure helpers (preset → date range, count active, etc.)
└── components/
    ├── filter_section_row.tsx         # Reusable "Accounts → [3 selected] →" row
    ├── filter_account_picker.tsx      # Multi-select sub-sheet for accounts
    ├── filter_category_picker.tsx     # Multi-select sub-sheet for categories
    ├── filter_date_section.tsx        # Inline preset radio list (+ Custom row trigger)
    ├── filter_date_custom_picker.tsx  # Sub-sheet: from/to date pickers
    └── filter_amount_section.tsx      # Inline EGP/USD toggle + From/To numeric inputs
```

### 3.2 New file under existing `components/`

```
transactions/components/
└── filter_button.tsx                  # Trailing sliders icon button with count badge
```

### 3.3 Modified files

| File | Change |
|---|---|
| `transactions/index.tsx` | Wrap `<SearchBar/>` and new `<FilterButton/>` in a horizontal row; mount `<FilterDrawer/>` below `<AddTransactionSheet/>`. |
| `transactions/transactions.hook.ts` | Read applied filter state; pass full filter set to `setQuery`. Compute active-filter count for the badge. Open the drawer via the filter store. |
| `transactions/transactions.store.ts` | Extend `TransactionsScreenState` with `appliedFilters: AdvancedFilters` and `setAppliedFilters` action; include in `reset()`. |
| `transactions/components/search_bar.tsx` | Accept `style?: ViewStyle` so it can flex inside the new row. No behavior change. |
| `store/transaction.store.ts` | Extend `TransactionListFilters` with new fields (accountIds, categoryIds, dateFrom, dateTo, amountMin, amountMax, amountCurrency). |
| `repositories/transaction.repository.ts` | `getAll(query)` already passes through to `getTransactions`; just widen the type. |
| `database/transactions.ts` | Extend `getTransactions` SQL to handle the new optional clauses. |
| `constants/enums.ts` | Add `DatePreset` enum. |
| `constants/strings.ts` | New filter-related copy (drawer title, section labels, preset names, Apply/Reset, etc.). |

### 3.4 Conventions followed

- snake_case filenames, camelCase identifiers.
- Per-folder module pattern: `index.tsx`, `<name>.hook.ts`, `<name>.store.ts`, `<name>.anim.ts`, optional `<name>.helpers.ts`, colocated `components/`.
- No business logic in `index.tsx` (pure template); state in store + RHF where applicable; sheet animation isolated in `.anim.ts`.

### 3.5 State separation

- **Draft state** (`filter.store.ts`, drawer-internal): what the user is currently selecting inside the open sheet. Initialized from applied state when the drawer opens. Discarded on close-without-apply.
- **Applied state** (`transactions.store.ts`, screen-local): what's actually filtering the list. Committed from draft on Apply. Cleared on tab blur via existing `reset()`.

---

## 4. Data Model

### 4.1 New shared types

`AdvancedFilters` is the single drawer-state contract, exported from `filter.store.ts`:

```typescript
import { Currency, DatePreset } from '@/constants/enums';

export interface AdvancedFilters {
  accountIds:       string[];           // [] = no constraint
  categoryIds:      string[];           // [] = no constraint
  datePreset:       DatePreset;         // defaults to AllTime
  customDateFrom?:  string;             // ISO YYYY-MM-DD; only when preset === Custom
  customDateTo?:    string;             // ISO YYYY-MM-DD; only when preset === Custom
  amountCurrency:   Currency;           // defaults to EGP
  amountMin?:       number;             // raw amount, optional
  amountMax?:       number;             // raw amount, optional
}

export const EMPTY_FILTERS: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  datePreset: DatePreset.AllTime,
  amountCurrency: Currency.EGP,
};
```

### 4.2 New enum (`constants/enums.ts`)

```typescript
export enum DatePreset {
  Today      = 'today',
  ThisWeek   = 'this_week',
  ThisMonth  = 'this_month',
  LastMonth  = 'last_month',
  Last30Days = 'last_30_days',
  ThisYear   = 'this_year',
  AllTime    = 'all_time',
  Custom     = 'custom',
}
```

UI list order matches enum order: Today → This week → This month → Last month → Last 30 days → This year → All time → Custom....

### 4.3 Drawer draft store (`filter.store.ts`)

```typescript
interface FilterDrawerState {
  visible: boolean;
  draft: AdvancedFilters;

  // sub-picker visibility
  accountPickerVisible:    boolean;
  categoryPickerVisible:   boolean;
  customDatePickerVisible: boolean;

  // lifecycle
  open:  (initial: AdvancedFilters) => void;   // pre-load draft from applied; visible = true
  close: () => void;                           // visible = false; draft kept (overwritten on next open)
  resetDraft: () => void;                      // draft = EMPTY_FILTERS; does NOT close

  // draft setters
  toggleAccountId:     (id: string) => void;
  toggleCategoryId:    (id: string) => void;
  setDatePreset:       (p: DatePreset) => void;
  setCustomDateRange:  (from?: string, to?: string) => void;
  setAmountMin:        (v?: number) => void;
  setAmountMax:        (v?: number) => void;
  setAmountCurrency:   (c: Currency) => void;

  // sub-picker controls
  setAccountPickerVisible:    (v: boolean) => void;
  setCategoryPickerVisible:   (v: boolean) => void;
  setCustomDatePickerVisible: (v: boolean) => void;
}
```

### 4.4 Applied state — extend `transactions.store.ts`

```typescript
interface TransactionsScreenState {
  searchQuery:     string;
  activeFilter:    TransactionFilter;
  appliedFilters:  AdvancedFilters;
  setSearchQuery:    (q: string) => void;
  setActiveFilter:   (f: TransactionFilter) => void;
  setAppliedFilters: (f: AdvancedFilters) => void;
  clearSearch: () => void;
  reset: () => void;          // resets all three (incl. appliedFilters)
}

const INITIAL = {
  searchQuery: '',
  activeFilter: 'all' as const,
  appliedFilters: EMPTY_FILTERS,
};
```

The existing tab-blur reset path (`useFocusEffect` in `transactions/index.tsx`) automatically clears `appliedFilters` because it uses the same `INITIAL` constant.

### 4.5 Global query type — extend `TransactionListFilters` in `store/transaction.store.ts`

```typescript
export interface TransactionListFilters {
  type?:           TransactionType;
  search?:         string;
  // NEW (already resolved — preset converted to dateFrom/dateTo by the hook)
  accountIds?:     string[];
  categoryIds?:    string[];
  dateFrom?:       string;       // ISO date inclusive
  dateTo?:         string;       // ISO date inclusive
  amountMin?:      number;
  amountMax?:      number;
  amountCurrency?: Currency;     // only meaningful with amountMin or amountMax
}
```

The hook does **not** pass `datePreset` to the query layer — `filter.helpers.ts:resolveDateRange` converts it into concrete `dateFrom` / `dateTo` ISO strings first.

### 4.6 Pure helpers (`filter.helpers.ts`)

```typescript
resolveDateRange(preset, customFrom?, customTo?, today = new Date()): { from?: string; to?: string }
countActiveFilters(f: AdvancedFilters): number
toQueryFilters(applied: AdvancedFilters): Partial<TransactionListFilters>   // resolveDateRange + amount unpack
parseAmountInput(s: string): number | undefined                              // empty/invalid → undefined
formatSelectionSummary(names: string[]): string                              // 1 / 2 / 3+ name formatter
```

All five are unit-testable, no React dependencies.

`countActiveFilters` returns the number of axes that are non-default:
- `accountIds.length > 0` → +1
- `categoryIds.length > 0` → +1
- `datePreset !== AllTime` → +1
- `amountMin !== undefined || amountMax !== undefined` → +1

---

## 5. SQL & Repository Layer

### 5.1 Extended `TransactionListQuery` in `database/transactions.ts`

```typescript
export interface TransactionListQuery {
  limit?:           number;
  offset?:          number;
  type?:            TransactionType;
  search?:          string;
  // NEW
  accountIds?:      string[];
  categoryIds?:     string[];
  dateFrom?:        string;     // ISO date inclusive
  dateTo?:          string;     // ISO date inclusive
  amountMin?:       number;
  amountMax?:       number;
  amountCurrency?:  Currency;
}
```

### 5.2 SQL strategy

Single statement with optional WHERE arms, all parameterized except for the `?` placeholder count in `IN` clauses (which is generated from the list length, never from user data).

```sql
SELECT t.* FROM transactions t
WHERE
  -- existing
  (? IS NULL OR t.type = ?)
  AND (
    ? IS NULL
    OR t.note LIKE ? ESCAPE '\' COLLATE NOCASE
    OR EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id IN (t.account_id, t.to_account_id)
        AND a.name LIKE ? ESCAPE '\' COLLATE NOCASE
    )
    OR EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = t.category_id
        AND c.name LIKE ? ESCAPE '\' COLLATE NOCASE
    )
  )
  -- NEW: account multi-select (matches account_id OR to_account_id)
  AND (
    ? = 1                                              -- accountListEmpty sentinel
    OR t.account_id    IN (?, ?, …)                    -- arity = accountIds.length
    OR t.to_account_id IN (?, ?, …)                    -- same arity, same params
  )
  -- NEW: category multi-select
  AND (
    ? = 1                                              -- categoryListEmpty sentinel
    OR t.category_id IN (?, ?, …)
  )
  -- NEW: date range
  AND (? IS NULL OR t.transaction_date >= ?)
  AND (? IS NULL OR t.transaction_date <= ?)
  -- NEW: amount range — paired with currency on each clause
  AND (? IS NULL OR (t.currency = ? AND t.amount >= ?))
  AND (? IS NULL OR (t.currency = ? AND t.amount <= ?))
ORDER BY t.transaction_date DESC, t.transaction_time DESC
LIMIT ? OFFSET ?;
```

### 5.3 Implementation sketch

```typescript
function buildInClause(n: number): string {
  return Array(n).fill('?').join(',');
}

function padIds(ids: string[]): string[] {
  return ids.length === 0 ? [''] : ids;   // dummy when empty (clause short-circuited via sentinel)
}

export async function getTransactions(db, query) {
  const limit = query.limit ?? PAGE_SIZE_DEFAULT;
  const offset = query.offset ?? 0;

  const accountIds  = query.accountIds  ?? [];
  const categoryIds = query.categoryIds ?? [];

  const accountListEmpty  = accountIds.length === 0  ? 1 : 0;
  const categoryListEmpty = categoryIds.length === 0 ? 1 : 0;

  const accountIn  = buildInClause(Math.max(accountIds.length,  1));
  const categoryIn = buildInClause(Math.max(categoryIds.length, 1));

  // ... interpolate accountIn / categoryIn into the SQL template (only `?` characters,
  //     never user data) ...

  return db.getAllAsync<Transaction>(sql, [
    typeParam, typeParam,
    searchParam, likePattern, likePattern, likePattern,
    accountListEmpty, ...padIds(accountIds), ...padIds(accountIds),
    categoryListEmpty, ...padIds(categoryIds),
    dateFrom, dateFrom,
    dateTo, dateTo,
    amountMin, amountCurrency, amountMin,
    amountMax, amountCurrency, amountMax,
    limit, offset,
  ]);
}
```

**Account match is OR over `account_id` and `to_account_id`** so transfers and CC payments match if either side is in the selected set (mirrors `getTransactionsByAccount`).

**Amount filter pairs the comparison with currency.** A row only matches if `t.currency = amountCurrency` AND its `amount` is in range. Filtering against `amount` of a different-currency row is never possible.

**Empty-list short-circuit.** When an `IN` list is empty, the sentinel param is `1` and the `IN (?)` clause is bypassed. The dummy `''` value bound by `padIds` keeps placeholder count consistent.

### 5.4 Repository (`repositories/transaction.repository.ts`)

```typescript
async getAll(query: TransactionListQuery = {}): Promise<Transaction[]> {
  const db = await getDb();
  return getTransactions(db, query);
}
```

No code change — the type widens automatically through the re-exported interface.

### 5.5 Hook wiring (`transactions.hook.ts`)

```typescript
const appliedFilters = useTransactionsScreenStore((s) => s.appliedFilters);

useEffect(() => {
  const trimmed = debouncedSearch.trim();
  setQuery({
    type:    activeFilter === 'all' ? undefined : activeFilter,
    search:  trimmed || undefined,
    ...toQueryFilters(appliedFilters),     // resolves preset → dateFrom/dateTo, unpacks amount
  }).catch(() => {});
}, [debouncedSearch, activeFilter, appliedFilters, setQuery]);
```

`toQueryFilters` returns `undefined` for empty arrays / no-op date preset / unset amount, so the `setQuery` payload stays minimal and the existing `requestId` race guard still works.

---

## 6. Drawer UI

### 6.1 `FilterDrawer` (`filter/index.tsx`)

Bottom sheet, ~70% of viewport height, same animation primitive as the existing `account_picker_sheet`. Layout:

```
┌───────────────────────────────────────────┐
│ ✕   Filters                       Reset   │   ← header
├───────────────────────────────────────────┤
│ Accounts          All accounts        →   │   ← FilterSectionRow
│ Categories        2 selected          →   │
│                                            │
│ Date                                       │
│   ○ Today                                  │
│   ○ This week                              │
│   ● This month   ✓                         │
│   ○ Last month                             │
│   ○ Last 30 days                           │
│   ○ This year                              │
│   ○ All time                               │
│   ○ Custom...    May 1 – May 30, 2026     │
│                                            │
│ Amount                                     │
│   [ EGP ] [ USD ]                          │
│   From [______]    To [______]            │
├───────────────────────────────────────────┤
│         [   Apply  (3)   ]                │   ← sticky footer
└───────────────────────────────────────────┘
```

- **Header.** `✕` (close, discards draft) on the left; `Reset` link (calls `resetDraft()`; doesn't close the sheet) on the right.
- **Body.** `ScrollView` so the sheet doesn't break on small phones.
- **Footer.** Sticky `Apply (count)` button. Always tappable. Resolved active count appears in parentheses, mirroring the badge on the main screen.

Sub-sheets (`FilterAccountPicker`, `FilterCategoryPicker`, `FilterDateCustomPicker`) are independent `<Modal>` siblings stacked above the drawer.

### 6.2 `FilterButton` (`transactions/components/filter_button.tsx`)

```tsx
<Pressable onPress={...}>
  <MaterialCommunityIcons
    name="tune-variant"
    size={ms(22)}
    color={count > 0 ? Colors.shared.cairoGold : Colors.dark.text2}
  />
  {count > 0 && (
    <View style={badge}>
      <Text style={badgeText}>{count}</Text>
    </View>
  )}
</Pressable>
```

- Icon: `tune-variant` (filled, 4-slider style).
- Active state — when `count > 0`, icon flips to `Colors.shared.cairoGold`; small gold badge sits at the top-right corner with white digit.
- Tap → opens the drawer via `useFilterDrawerStore.getState().open(appliedFilters)`.

Layout in `transactions/index.tsx`:

```tsx
<View style={styles.searchRow}>
  <SearchBar style={{ flex: 1 }} ... />
  <FilterButton count={t.activeFilterCount} onPress={t.openFilter} />
</View>
```

### 6.3 `FilterSectionRow` (`filter/components/filter_section_row.tsx`)

Reusable row used by Accounts and Categories. Displays label, summary, and chevron:

```
Accounts        All accounts            >
Categories      Food, Restaurants +1    >
```

Summary text (`formatSelectionSummary` in `filter.helpers.ts`):
- `[]` → "All accounts" / "All categories"
- 1 selected → that one's name
- 2 selected → "Name A, Name B"
- 3+ selected → "Name A, Name B + N"

### 6.4 `FilterAccountPicker` (sub-sheet)

Multi-select bottom sheet, ~70% height. Shows non-archived accounts only.

```
┌─────────────────────────────────┐
│  Select Accounts        Done    │
├─────────────────────────────────┤
│ ☑ Bank A             EGP 12,300 │
│ ☐ Cash Wallet        EGP    480 │
│ ☑ Visa Gold          EGP   -... │
│ ☐ USD Savings        USD  1,200 │
└─────────────────────────────────┘
```

- Row: type-matched account icon (gold when checked, grey when unchecked), name, balance.
- Tapping a row toggles its checkbox; selection accumulates in `draft.accountIds`.
- `Done` closes the sub-sheet (no separate Apply needed — the draft is already updated as the user taps).
- No search bar in v1 (account count ≤ ~10 in practice).

### 6.5 `FilterCategoryPicker` (sub-sheet)

Same pattern, type-agnostic — shows all expense + income categories in one list. Each row: category icon (its `icon` field) + name + small caption showing `Expense` or `Income` so users can tell them apart.

```
┌─────────────────────────────────┐
│  Select Categories      Done    │
├─────────────────────────────────┤
│ ☑ 🍔 Food            Expense    │
│ ☐ 💰 Salary          Income     │
│ ☑ 🍝 Restaurants     Expense    │
└─────────────────────────────────┘
```

### 6.6 `FilterDateSection` (inline)

Renders 8 radio rows. Selected row = gold left-border + filled radio. The `Custom...` row, when selected and a range is set, shows a caption underneath:

```
● Custom...
  May 1 – May 30, 2026         (tap to change)
```

- Tap on `Custom...` → opens `FilterDateCustomPicker` sub-sheet.
- Tap on any other preset → updates `draft.datePreset` only. `customDateFrom` / `customDateTo` are **not** cleared, so the user's last custom range is preserved if they switch back to Custom. They are cleared by `resetDraft()` (Reset link).

### 6.7 `FilterDateCustomPicker` (sub-sheet)

```
┌─────────────────────────────────┐
│  ✕  Custom date range    Done   │
├─────────────────────────────────┤
│  From   [ May 1, 2026 ]         │
│  To     [ May 30, 2026 ]        │
└─────────────────────────────────┘
```

- Each field opens the same native date picker the transaction form uses (`@react-native-community/datetimepicker`, an existing dependency from M2B/D).
- Validation: `from <= to`. `Done` is disabled until both dates are picked.
- On `Done`: writes both into `draft` and sets `datePreset = Custom`.

### 6.8 `FilterAmountSection` (inline)

```
Amount
[ EGP ] [ USD ]
From [______]    To [______]
```

- Two-pill currency toggle (gold-filled when active).
- Two `TextInput`s, `keyboardType="decimal-pad"`. Comma formatting on blur (`Intl.NumberFormat('en-US', { style: 'decimal' })`); digits-only on focus.
- No inline validation. If `From > To`, the SQL returns no rows — user notices and corrects.

### 6.9 Animation (`filter.anim.ts`)

| Element | Animation |
|---|---|
| Sheet open | `translateY` + backdrop opacity, `withTiming(280ms)` (matches `transaction_form.anim.ts`) |
| Sheet close | `translateY` + backdrop opacity, `withTiming(220ms)` |
| Section entry on open | `FadeInDown.delay(80).duration(250)` per section |
| Apply button press | `scale 1.0 → 0.97 → 1.0` via `withSequence(withTiming(80), withSpring)` |
| Count badge change | `withSpring(1.2 → 1.0)` |
| Sub-sheet open/close | Same as main drawer |

### 6.10 Hook orchestration (`filter.hook.ts`)

```typescript
useFilterDrawer(): {
  visible, draft,
  openFilter,                      // captured by FilterButton
  close,                           // captured by ✕ + backdrop tap
  resetDraft,                      // captured by Reset link
  applyDraft,                      // captured by Apply button → setAppliedFilters(draft) + close
  // sub-picker controls
  accountPickerVisible, setAccountPickerVisible,
  categoryPickerVisible, setCategoryPickerVisible,
  customDatePickerVisible, setCustomDatePickerVisible,
  // setters surface for sub-picker children
  toggleAccountId, toggleCategoryId,
  setDatePreset, setCustomDateRange,
  setAmountMin, setAmountMax, setAmountCurrency,
  // derived
  draftActiveCount,
}
```

`applyDraft` reads draft, calls `useTransactionsScreenStore.getState().setAppliedFilters(draft)`, then `close()`. The transactions screen's existing `useEffect` (Section 5.5) sees the new applied filters and re-fires `setQuery`.

---

## 7. Strings (`constants/strings.ts`)

```typescript
// Drawer
filterTitle:               'Filters',
filterReset:               'Reset',
filterApply:               'Apply',
filterApplyWithCount:      (n: number) => `Apply (${n})`,

// Sections
filterSectionAccounts:     'Accounts',
filterSectionCategories:   'Categories',
filterSectionDate:         'Date',
filterSectionAmount:       'Amount',

// Summaries
filterAllAccounts:         'All accounts',
filterAllCategories:       'All categories',
filterAccountsCount:       (n: number) => `${n} selected`,
filterCategoriesCount:     (n: number) => `${n} selected`,

// Date presets
datePresetToday:           'Today',
datePresetThisWeek:        'This week',
datePresetThisMonth:       'This month',
datePresetLastMonth:       'Last month',
datePresetLast30Days:      'Last 30 days',
datePresetThisYear:        'This year',
datePresetAllTime:         'All time',
datePresetCustom:          'Custom...',
filterCustomDateRangeTitle:'Custom date range',
filterCustomFromLabel:     'From',
filterCustomToLabel:       'To',

// Sub-pickers
filterPickAccountsTitle:   'Select Accounts',
filterPickCategoriesTitle: 'Select Categories',
filterPickerDone:          'Done',

// Amount
filterAmountFromPlaceholder: 'Min',
filterAmountToPlaceholder:   'Max',

// Category type captions inside the category picker
filterCategoryTypeExpense:   'Expense',
filterCategoryTypeIncome:    'Income',
```

---

## 8. Tests

Pure-logic tests only (per the project's testing layer convention — 80% lines / 95% functions / 100% branches on `*.helpers.ts`, stores, and `utils/`).

| Test file | Coverage |
|---|---|
| `__tests__/filter_helpers.test.ts` | `resolveDateRange` for all 8 presets at a fixed `today`; `countActiveFilters` for empty / partial / full filter shapes; `toQueryFilters` correctly omits empty arrays and unset amounts; `parseAmountInput` for valid, empty, comma-formatted, and invalid strings; `formatSelectionSummary` for 0 / 1 / 2 / 3+ items. |
| `__tests__/filter_store.test.ts` | `open(applied)` snapshots applied into draft; `toggleAccountId` adds and removes; `setDatePreset(Custom)` preserves `customDateFrom/To` set separately; `resetDraft` clears all but doesn't change `visible`; `close` only flips visibility. |
| `__tests__/transactions_store_filter.test.ts` (extension) | `setAppliedFilters` updates store; `reset()` clears `appliedFilters` back to `EMPTY_FILTERS`. |
| `__tests__/database_get_transactions_filter.test.ts` | New SQL filter axes against an in-memory or mocked `db.getAllAsync` — assert correct arity of `?` placeholders, correct empty-list short-circuit param, correct AND composition of date / account / category / amount-with-currency clauses. |

Existing M2A–M2D tests must remain green. Any test that called `setQuery({ type, search })` continues to work — the new fields are optional.

---

## 9. Edge Cases & Invariants

- **Empty multi-select arrays = no constraint** on that axis. `EMPTY_FILTERS` is the canonical "nothing applied" shape.
- **`amountMin > amountMax`**: SQL returns 0 rows. Drawer shows no inline error. User notices empty list and corrects.
- **Custom date range with only one date set**: `Done` is disabled until both are picked. No partial state escapes the sub-sheet.
- **Type chip switch while filters active**: filters stay applied; the SQL just gets one more AND clause via `type`. No drawer state change.
- **Account archived after being filtered**: archived accounts are excluded from the *picker*, but if the applied state still references one, the SQL still filters by it. Acceptable — applied state will clear on next tab blur anyway.
- **Category deleted while filtered**: same reasoning — handled implicitly by tab-blur reset.
- **Currency mismatch** between selected accounts and amount-currency filter (e.g. only EGP accounts selected + amount currency USD): SQL returns 0 rows. User's deliberate combination, no warning.
- **Sub-sheet stacking**: only one sub-sheet is open at a time. Tapping a section row while another sub-sheet is open is prevented (the row is hidden behind the sub-sheet's modal).
- **Backdrop tap on the main drawer** while a sub-sheet is open: dismisses only the topmost layer (sub-sheet first, then drawer).
- **Tab blur with drawer open**: `useFocusEffect` cleanup calls `useFilterDrawerStore.getState().close()` in addition to `useTransactionsScreenStore.getState().reset()` so the drawer doesn't linger when returning to the tab.

---

## 10. Definition of Done

- ✅ Filter icon button renders trailing the search bar; sliders icon, gold tint when active, count badge with active-axis count.
- ✅ Tapping the icon opens the bottom-sheet drawer; backdrop dim and slide-up animation match existing pickers.
- ✅ Drawer header shows `Filters` title, `✕` close, and `Reset` link.
- ✅ Accounts row → opens multi-select sub-sheet of non-archived accounts; selections persist in draft.
- ✅ Categories row → opens multi-select sub-sheet of all categories with type captions.
- ✅ Date section renders 8 radio rows; tapping `Custom...` opens the custom-range sub-sheet with from/to date pickers.
- ✅ Amount section renders EGP/USD pill toggle and From/To numeric inputs.
- ✅ Reset clears the draft only (does not auto-apply, does not close).
- ✅ `✕` and backdrop tap discard the draft and close.
- ✅ Apply button commits draft to applied state, closes the drawer, and the list re-queries with the merged filter set.
- ✅ Type chip and search compose with applied filters via AND.
- ✅ Tab blur clears search, type chip, applied filters, and any open drawer.
- ✅ All four axes work end-to-end against the SQLite query, including all 8 date presets and the EGP/USD-aware amount filter.
- ✅ Existing M2A/B/C/D flows pass unchanged (no regression in add, list, detail, edit, delete).
- ✅ Test coverage thresholds met on the helpers, stores, and SQL layer.

---

## 11. Notes & Deferrals

- **Saved filter presets** — defer; would require a new `app_settings` key or a dedicated table.
- **Search inside multi-select pickers** — defer; account/category counts are small in practice. Add when a user has more than ~15 of either.
- **Sort controls** — out of scope; current sort (date desc, time desc) stays implicit.
- **Generic multi-select sheet primitive** — defer extraction until a third use case appears. Two filter pickers is not enough to justify the abstraction.
- **`amountCurrency` default = `Currency.EGP`** — could later default to the user's `BaseCurrency` from `app_settings` (set during onboarding O2). One tap to flip the toggle today; revisit if onboarding-currency-aware defaults become important.
