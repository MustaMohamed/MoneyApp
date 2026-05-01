# M2c — Transaction History (List + Detail Read-Only + Delete)

**Date:** 2026-05-01
**Status:** Draft — pending user review
**Module:** M2c — Transaction History (third sub-module of M2: Daily Transactions)
**Depends on:** M2a (Categories), M2b (Add Transaction sheet + transactions data layer)
**Unlocks:** M2d — Edit Transaction + U31 advanced Search & Filter drawer

---

## 1. Overview

M2c delivers the read side of M2 — the user can browse, search, filter, paginate, drill into, and delete transactions through the existing **Transactions** tab. The Add Transaction sheet from M2b stays as-is; this cycle replaces the empty-state placeholder under it with the full U5 list and adds U7 detail.

### In scope

- **U5 Transaction List** — paginated 30-rows-per-page (`SectionList` with sticky date headers), single-select type chips (`All / Expense / Income / Transfer / CC Pay`), always-visible search bar (300 ms debounce, searches `note + category.name + account.name` for both source and destination accounts).
- **U7 Transaction Detail** — read-only metadata view. Hero (gradient + grid texture + amount + name) → detail rows card (category, account, date/time, exchange rate captured, note) → action row (Edit *disabled with "Coming in M2d"* + Delete *active with confirm dialog*). Budget Impact card cut entirely.
- **Data layer** — `getTransactions` extended with `{ search?, type? }` filters; global store gains `setQuery`, `refresh`, `loadMore`, `hasMore`, `loading`, with a monotonic `requestId` race-condition guard.
- **Screen-local Zustand store** for search query + active filter chip + reset on tab blur.
- **Helpers** — `formatTransactionTitle`, `groupTransactionsByDate`, `useDebouncedValue`.
- **Delete reversal** — already implemented in M2b's `deleteTransaction` (asset/CC balances restored, including the cc_payment installment-first split). M2c only wires it to the UI.
- **Tests** — query executor (filter + search + pagination), repository, store (incl. race guard), helpers, hook (debounce). No component-level tests per the project's logic-only test boundary.

### Out of scope (explicitly deferred)

- **Edit Transaction (M2d)** — the Edit button ships disabled.
- **U31 advanced filter drawer (M2d or M2e)** — multi-axis combinations of account / category / date-range / amount.
- **Budget Impact card on U7 (M3)** — depends on budget data that doesn't exist yet.
- **`getTransactionsByAccount`** — already in the executor for future Account Detail integration; not surfaced in M2c.

---

## 2. File Layout

### New files

```
app/(app)/(tabs)/transactions/
  transactions.hook.ts              # bridge between screen UI store and global data store
  transactions.store.ts             # screen-local: searchQuery, activeFilter, reset
  transactions.anim.ts              # row press scale, chip color/scale interpolations
  components/
    search_bar.tsx                  # frosted-glass input + magnify icon + clear button
    filter_chips.tsx                # horizontal scroll, single-select, animated
    transaction_row.tsx             # icon + title + subtitle + amount + time, animated press
    date_header.tsx                 # sticky "TODAY · MAY 1" header
    loading_footer.tsx              # FlatList footer ActivityIndicator
  _layout.tsx                       # NEW Stack: index + detail/[id] routes
  detail/
    [id].tsx                        # Expo Router dynamic route
    detail.hook.ts                  # loads tx by id, derives display values, delete handler
    detail.anim.ts                  # hero entry, action row press
    components/
      detail_hero.tsx               # gradient + SVG grid texture + amount + name
      detail_rows_card.tsx          # frosted-glass container for the rows
      detail_row.tsx                # 32×32 icon + label/value + optional badge
      action_row.tsx                # Edit (disabled) + Delete buttons
      delete_confirm_dialog.tsx     # native Modal, mirrors categories pattern
      not_found_state.tsx           # tx === null fallback

utils/
  format_transaction_title.ts       # pure (tx, account, toAccount, category) → { title, subtitle }
  group_transactions_by_date.ts     # pure Transaction[] → SectionListData[]
  use_debounced_value.hook.ts       # generic debounce hook (300 ms used by search)
  format_time_12h.ts                # pure 'HH:MM:SS' → 'H:MM AM/PM'
```

### Updated files

```
app/(app)/(tabs)/transactions/index.tsx   # replace EmptyState with full list scaffold
store/transaction.store.ts                # add { search, type } params, loadMore, refresh, hasMore, loading, requestId guard, getById
repositories/transaction.repository.ts    # extend getAll signature to take TransactionListQuery
database/transactions.ts                  # extend getTransactions with search + type filtering
constants/strings.ts                      # add U5 + U7 copy block
constants/theme.ts                        # add transferBlue, ccPlum, heroGrad1/2/3, dangerBg
components/empty_states/...               # add transactionsNoResults variant
app/_layout.tsx                           # load Sora_800ExtraBold for U7 hero amount
```

---

## 3. Data Layer

### 3.1 `database/transactions.ts` — extended `getTransactions`

```ts
export interface TransactionListQuery {
  limit?:  number;          // default 30
  offset?: number;          // default 0
  type?:   TransactionType; // omit = all types
  search?: string;          // trimmed; omit / '' = no search
}

export async function getTransactions(
  db: SQLiteDatabase,
  q: TransactionListQuery = {},
): Promise<Transaction[]>;
```

SQL — entity-pure (no joined columns leak into the result type):

```sql
SELECT t.* FROM transactions t
WHERE (? IS NULL OR t.type = ?)
  AND (
    ? IS NULL
    OR t.note LIKE ? COLLATE NOCASE
    OR EXISTS (
      SELECT 1 FROM accounts a
      WHERE a.id IN (t.account_id, t.to_account_id)
        AND a.name LIKE ? COLLATE NOCASE
    )
    OR EXISTS (
      SELECT 1 FROM categories c
      WHERE c.id = t.category_id
        AND c.name LIKE ? COLLATE NOCASE
    )
  )
ORDER BY t.transaction_date DESC, t.transaction_time DESC
LIMIT ? OFFSET ?;
```

The search wildcard is built in JS as `` `%${escapeLike(search.trim())}%` `` to safely handle `%` and `_` literals. `escapeLike` is a small private helper in the same file.

`addTransaction`, `deleteTransaction`, `getTransactionById`, `getTransactionsByAccount` — **unchanged**.

`updateTransaction` is **not** added (deferred to M2d).

### 3.2 `repositories/transaction.repository.ts`

```ts
export interface ITransactionRepository {
  getAll(query?: TransactionListQuery): Promise<Transaction[]>;   // signature change
  getByAccount(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  add(data: NewTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
}
```

`getAll` defaults to `{ limit: 30, offset: 0 }` when called with no args. Other methods unchanged.

### 3.3 `store/transaction.store.ts` — new shape

```ts
const PAGE_SIZE = 30;

interface TransactionState {
  transactions: Transaction[];
  hasMore:      boolean;
  loading:      boolean;
  query:        { type?: TransactionType; search?: string };

  setQuery: (q: { type?: TransactionType; search?: string }) => Promise<void>;
  refresh:  () => Promise<void>;
  loadMore: () => Promise<void>;

  getById:           (id: string) => Promise<Transaction | null>;   // one-shot read for detail screen; doesn't touch state
  addTransaction:    (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}
```

- `setQuery` resets `transactions` to the new page-1 result, replaces `query`.
- `refresh` re-fetches page 1 with the **current** `query` (used after add / delete).
- `loadMore` no-ops if `!hasMore || loading`; otherwise fetches `offset = transactions.length` and appends.
- `hasMore = lastFetchedCount === PAGE_SIZE`.
- **Race guard**: an internal monotonic `requestId` is incremented on every fetch start and checked at resolve time; out-of-order results from rapid `setQuery` calls (fast typing) are dropped.
- `getById` is a thin pass-through to `repo.getById`; it does not touch list state. The detail screen uses it for the one-shot fetch.
- `addTransaction` and `deleteTransaction` call `refresh()` after the underlying repo call.

### 3.4 Add/Delete behaviour under an active filter

Adding an `Expense` while the `Income` chip is active makes the new row absent from the visible list (filter is honored). Documented limitation — a "Transaction added" toast would solve the disorientation but the design system has no toast component yet. Out of scope for M2c.

---

## 4. Screen-Local State & Hook Wiring

### 4.1 `transactions.store.ts`

```ts
export type TransactionFilter = TransactionType | 'all';

interface TransactionsScreenState {
  searchQuery:  string;
  activeFilter: TransactionFilter;
  setSearchQuery:  (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  clearSearch:     () => void;
  reset:           () => void;
}
```

`reset()` returns to `{ searchQuery: '', activeFilter: 'all' }`. Invoked from the screen template's `useFocusEffect` cleanup callback so the list always returns to a clean state when the user navigates away from the tab.

### 4.2 `transactions.hook.ts` — `useTransactions()`

The only file that bridges screen-local state ↔ global data store.

Responsibilities:

1. Read screen-local UI state (`searchQuery`, `activeFilter`).
2. Read global data state (`transactions`, `hasMore`, `loading`).
3. Read `accounts` and `categories` from their respective global stores; build `accountsById` and `categoriesById` lookup `Map`s memoized on the source array.
4. Run `searchQuery` through `useDebouncedValue(300)`.
5. Push `{ search, type }` into `useTransactionStore.setQuery` when the debounced search or active filter changes.
6. Group `transactions` into date sections via `groupTransactionsByDate`.
7. Compute `emptyVariant`:
   - `'none'`        if `transactions.length > 0`
   - `'noResults'`   if `debouncedSearch || activeFilter !== 'all'`
   - `'noData'`      otherwise
8. Return everything needed by the template: `sections, hasMore, loading, emptyVariant, searchQuery, activeFilter, accountsById, categoriesById, setSearchQuery, setActiveFilter, clearSearch, onEndReached`.

### 4.3 `index.tsx` — pure template

No `useState`, no `useSharedValue`. Wires hook outputs into the JSX. Pseudocode:

```tsx
const t = useTransactions();
const { visible, open, close } = useAddTransactionStore(...);

useFocusEffect(useCallback(() => () => useTransactionsScreenStore.getState().reset(), []));

return (
  <SafeAreaView>
    <Header title={Strings.transactions} />
    <SearchBar  value={t.searchQuery}  onChange={t.setSearchQuery} onClear={t.clearSearch} />
    <FilterChips active={t.activeFilter} onChange={t.setActiveFilter} />

    {t.emptyVariant !== 'none'
      ? <EmptyState variant={t.emptyVariant === 'noData' ? 'transactions' : 'transactionsNoResults'} />
      : <SectionList
          sections={t.sections}
          renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
          renderItem={({ item }) => (
            <TransactionRow
              tx={item}
              account={t.accountsById.get(item.account_id)}
              toAccount={item.to_account_id ? t.accountsById.get(item.to_account_id) : undefined}
              category={item.category_id ? t.categoriesById.get(item.category_id) : undefined}
              onPress={() => router.push(`/(app)/(tabs)/transactions/detail/${item.id}`)}
            />
          )}
          keyExtractor={item => item.id}
          onEndReached={t.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={t.loading && t.hasMore ? <LoadingFooter /> : null}
          stickySectionHeadersEnabled
        />
    }

    <FAB onPress={open} />
    <AddTransactionSheet visible={visible} onClose={close} />
  </SafeAreaView>
);
```

### 4.4 `transactions.anim.ts`

- **Row press**: scale `1.0 → 0.98 → 1.0` via `withSequence(withTiming(80ms), withSpring)`.
- **Chip selection**: scale `1.0 → 1.05 → 1.0`; border `interpolateColor(#2A3A4F → #C9973A)` over 200 ms.

---

## 5. U5 List Components

All visuals follow Cairo Nights tokens (`Colors.*`, `Spacing.*`, `Type.*`, `Radius.*`, `FontFamily.*`) and `ms()` / `msFont()` scaling.

### 5.1 `search_bar.tsx`

```ts
type Props = { value: string; onChange: (v: string) => void; onClear: () => void };
```

Layout left → right: `magnify` icon (`#6B7F99`, `ms(18)`) · `TextInput` flex 1 · `close-circle` clear button (only when `value.length > 0`).

Container: `Colors.dark.surface`, border `Colors.dark.border`, height `ms(40)`, radius `Radius.sm`, horizontal padding `Spacing.sm`. Margin: `Spacing.md` horizontal, `Spacing.sm` top.

Placeholder: `Strings.searchTransactionsPlaceholder`. Input font: `FontFamily.interRegular`, `Type.body`, color `Colors.dark.text1`. `autoCorrect={false}`, `returnKeyType="search"`.

### 5.2 `filter_chips.tsx`

Horizontal `ScrollView` (no wrapping), single-select.

```ts
type Props = { active: TransactionFilter; onChange: (f: TransactionFilter) => void };

const CHIPS: { key: TransactionFilter; label: string }[] = [
  { key: 'all',        label: Strings.filterAll },
  { key: 'expense',    label: Strings.filterExpense },
  { key: 'income',     label: Strings.filterIncome },
  { key: 'transfer',   label: Strings.filterTransfer },
  { key: 'cc_payment', label: Strings.filterCcPayment },
];
```

Each chip uses an animated style from `transactions.anim.ts`:
- Active: `Colors.shared.cairoGold` background, `Colors.shared.midnightBlue` text, no border.
- Inactive: `Colors.dark.surface` background, `Colors.dark.border` border, `Colors.dark.text2` text.

Padding `ms(5) / ms(12)`, radius `Radius.sm`, font `FontFamily.interBold msFont(11)`. Container padding: `Spacing.md` horizontal, `Spacing.sm` vertical.

### 5.3 `transaction_row.tsx`

48 px min-height, color-coded by type.

```ts
type Props = {
  tx: Transaction;
  account?:   Account;
  toAccount?: Account;
  category?:  Category;
  onPress: () => void;
};
```

Layout left → right:
1. **Icon container** — `ms(36)` square, `Radius.sm`, background = `category.color` (expense/income) or type accent (transfer / cc_payment) at 18 % opacity, MCI glyph (`ms(18)`) centered.
2. **Center column** (flex 1) — `title` (`FontFamily.interMedium`, `Type.body`, single-line, ellipsized) over `subtitle` (`FontFamily.interRegular`, `msFont(11)`, `Colors.dark.text2`, single-line).
3. **Right column** — `amount` (`FontFamily.soraBold`, `Type.bodyStrong`, signed, color-coded) over `time` (`FontFamily.interRegular`, `msFont(10)`, `Colors.dark.text2`).

`title`/`subtitle` from `formatTransactionTitle`. `time` from `formatTime12h(tx.transaction_time)`.

**Amount formatting**: `Intl.NumberFormat('en-US', { style: 'decimal' })` (CLAUDE.md), signed prefix:

| Type | Prefix | Color |
|---|---|---|
| `expense`    | `−` | `Colors.shared.negative`    |
| `income`     | `+` | `Colors.shared.positive`    |
| `transfer`   | `''` | `Colors.shared.transferBlue` (new) |
| `cc_payment` | `''` | `Colors.shared.ccPlum` (new) |

Suffix ` EGP`. Press triggers row-press animation; `onPress` navigates to detail.

#### Icon mapping for transfer / cc_payment

| Type | Icon | Background |
|---|---|---|
| `transfer`   | `swap-horizontal`     | `Colors.shared.transferBlue` @ 18 % |
| `cc_payment` | `credit-card-refund`  | `Colors.shared.ccPlum`       @ 18 % |

### 5.4 `date_header.tsx`

Sticky section header. Background `Colors.dark.bg`, border-bottom `Colors.dark.border`. Padding `Spacing.sm` horizontal, `ms(6)` vertical. Text: `FontFamily.interBold`, `msFont(10)`, `Colors.dark.text2`, uppercase, `letterSpacing: 0.5`.

### 5.5 `loading_footer.tsx`

`ActivityIndicator` (`Colors.shared.cairoGold`) centered with `Spacing.md` vertical padding. Rendered only when `loading && hasMore`.

### 5.6 `EmptyState` extension — `transactionsNoResults` variant

- Icon: `magnify-close` (`Colors.dark.text2`, large).
- Headline: `Strings.noResultsHeadline`.
- Subtext: `Strings.noResultsSubtext`.

The existing `transactions` variant (zero-data case) is unchanged.

### 5.7 `format_transaction_title.ts`

Pure function:

```ts
export function formatTransactionTitle(args: {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
}): { title: string; subtitle: string };
```

Rules:
- **Expense / Income** — `title = tx.note?.trim() || category?.name || Strings.uncategorized`; `subtitle = `${accountName} · ${time}``.
- **Transfer** — `title = tx.note?.trim() || Strings.transferTitle`; `subtitle = `${accountName} → ${toAccountName} · ${time}``.
- **CC Payment** — `title = tx.note?.trim() || Strings.ccPaymentTitle`; `subtitle = `${accountName} → ${toAccountName} · ${time}``.

Missing account / to-account → `Strings.unknownAccount`.

### 5.8 `group_transactions_by_date.ts`

Pure function:

```ts
export function groupTransactionsByDate(
  txs: Transaction[],
  now: Date = new Date(),
): { key: string; data: Transaction[] }[];
```

Iterates `txs` (already ordered DESC by SQL), groups by `transaction_date`, formats each key:
- Today           → `TODAY · MMM D` (e.g., `TODAY · MAY 1`)
- Yesterday       → `YESTERDAY · MMM D`
- Older this year → `MMM D` (e.g., `APR 28`)
- Older years     → `MMM D, YYYY` (e.g., `DEC 12, 2025`)

`now` is a parameter so tests are deterministic.

### 5.9 `format_time_12h.ts`

Pure: `'HH:MM:SS'` → `'H:MM AM/PM'` (e.g., `'14:30:00'` → `'2:30 PM'`, `'00:05:00'` → `'12:05 AM'`, `'12:00:00'` → `'12:00 PM'`).

### 5.10 `use_debounced_value.hook.ts`

Generic:

```ts
export function useDebouncedValue<T>(value: T, delayMs: number): T;
```

Returns `value` immediately on mount; on subsequent value changes, only emits after `delayMs` of stillness. Uses `setTimeout` + cleanup on unmount/value-change.

---

## 6. U7 Detail Screen (Read-Only + Delete)

### 6.1 `detail/[id].tsx` — pure template

Reads `id` from `useLocalSearchParams`, calls `useTransactionDetail(id)`, dispatches on `state`:

```tsx
if (d.state === 'loading')  return <LoadingScreen />;
if (d.state === 'notFound') return <NotFoundState />;

return (
  <SafeAreaView edges={['top','bottom']}>
    <DetailHeader onBack={router.back} />
    <ScrollView>
      <DetailHero ... />
      <DetailRowsCard>
        <DetailRow icon="shape"                  label={Strings.detailCategory}      value={d.categoryLabel} badge={d.categoryBadge} />
        <DetailRow icon="card-bulleted-outline"  label={Strings.detailAccount}       value={d.accountLabel}  sublabel={d.accountTypeLabel} />
        <DetailRow icon="calendar"               label={Strings.detailDateTime}      value={d.dateTimeText} />
        {d.exchangeRateText && (
          <DetailRow icon="earth"                label={Strings.detailExchangeRate}  value={d.exchangeRateText} badge={Strings.capturedBadge} />
        )}
        <DetailRow icon="text"                   label={Strings.detailNote}          value={d.noteText}      muted={!d.tx.note} />
      </DetailRowsCard>
      <ActionRow onDelete={d.openDeleteConfirm} />
    </ScrollView>

    <DeleteConfirmDialog
      visible={d.confirmVisible}
      onCancel={d.closeDeleteConfirm}
      onConfirm={d.confirmDelete}
      busy={d.deleting}
    />
  </SafeAreaView>
);
```

### 6.2 `detail.hook.ts` — `useTransactionDetail(id)`

```ts
export function useTransactionDetail(id: string) {
  const [tx,        setTx]              = useState<Transaction | null | undefined>(undefined);
  const [confirmVisible, setConfirmVis] = useState(false);
  const [deleting,  setDeleting]        = useState(false);

  const accountsById   = /* memoized Map from useAccountStore(s => s.accounts) */;
  const categoriesById = /* memoized Map from useCategoryStore(s => s.categories) */;
  const getById            = useTransactionStore(s => s.getById);
  const deleteTransaction  = useTransactionStore(s => s.deleteTransaction);  // already calls refresh() internally per Section 3.3

  useEffect(() => {
    let cancelled = false;
    getById(id).then(t => { if (!cancelled) setTx(t); });
    return () => { cancelled = true; };
  }, [id, getById]);

  const state = tx === undefined ? 'loading' : tx === null ? 'notFound' : 'ready';
  // ... derived display values memoized on tx + lookups

  const confirmDelete = useCallback(async () => {
    if (!tx) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);   // store handles balance reversal via repo + refreshes list
      router.back();
    } catch (e) {
      console.error('[transactionDetail] delete failed', e);
      Alert.alert(Strings.errDeleteFailed);
    } finally {
      setDeleting(false);
      setConfirmVis(false);
    }
  }, [tx, deleteTransaction]);

  return { state, tx, confirmVisible, deleting,
           openDeleteConfirm, closeDeleteConfirm, confirmDelete,
           /* derived: title, amountText, dateTimeText, exchangeRateText,
                       categoryLabel, categoryBadge, accountLabel,
                       accountTypeLabel, noteText */ };
}
```

`useState` in a `*.hook.ts` file is allowed per CLAUDE.md (the rule forbids it only in `index.tsx`). All repo access goes through `useTransactionStore` so the `ITransactionRepository` boundary stays encapsulated.

### 6.3 `detail_hero.tsx`

- **Background**: `expo-linear-gradient` `linear-gradient(138deg, Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3)`.
- **Grid texture**: `react-native-svg` `<Pattern>` — 26 px tile, single 1 px stroke at 2 % white opacity, rendered as a full-bleed `<Rect>` overlay. (`react-native-svg` is already a transitive dep of `@expo/vector-icons` — no new package.)
- **Top-right glow**: absolutely-positioned `View` with the type accent color at 25 % opacity, radial-feel via large `borderRadius` + soft shadow.
- **Layout (vertical, centered)**:
  1. Icon container `ms(52)` square, `Radius.md`, background = type color at 18 %, MCI glyph centered.
  2. Amount — `FontFamily.soraExtraBold`, `msFont(36)`, color-coded.
  3. Title — `FontFamily.interSemi`, `msFont(16)`, `Colors.dark.text1` at 70 % opacity.
  4. Meta — `${dateLong} · ${time}`, `msFont(12)`, `Colors.dark.text1` at 35 % opacity.

Padding: `Spacing.lg` vertical, `Spacing.md` horizontal.

### 6.4 `detail_rows_card.tsx`

`Colors.dark.surface`, `Radius.md`, `Spacing.md` margin (horizontal + top), `Spacing.sm` internal padding. Children rendered with `Colors.dark.border` dividers between rows (last row no divider).

### 6.5 `detail_row.tsx`

```ts
type Props = {
  icon:     keyof typeof MaterialCommunityIcons.glyphMap;
  label:    string;
  value:    string;
  badge?:   string;
  sublabel?: string;
  muted?:   boolean;
};
```

Layout: `ms(32)` icon container (`Radius.sm`, `Colors.dark.surfaceEl`) on left · two-line label/value column flex 1 · optional badge top-right.

Vertical padding `Spacing.sm`. Label: `FontFamily.interMedium`, `msFont(11)`, `Colors.dark.text2`, uppercase, `letterSpacing: 0.4`. Value: `FontFamily.interSemi`, `Type.body`, `Colors.dark.text1` (or `text2` when `muted`).

Badge: small pill, `Colors.dark.surfaceEl` background, `msFont(10)` `interBold`, `Spacing.xxs Spacing.xs` padding, `Radius.pill`.

### 6.6 `action_row.tsx`

Two equal-width buttons side-by-side, gap `Spacing.sm`, container padding `Spacing.md`.

- **Edit** — `disabled`. Background `Colors.dark.surface`, text `Colors.dark.text2`, `pencil-outline` icon. Below the button label, a small caption `Strings.editComingSoon`. `Pressable` either omitted or no-op.
- **Delete** — Background `Colors.dark.dangerBg` (`Colors.shared.negative` @ 12 %), text `Colors.shared.negative`, `delete-outline` icon. Press triggers `openDeleteConfirm`. Press animation: scale `1.0 → 0.97 → 1.0`.

### 6.7 `delete_confirm_dialog.tsx`

Mirrors `app/(app)/settings/categories/components/delete_confirmation_dialog.tsx` exactly:

- Native `Modal` with `transparent`, `animationType="fade"`, `statusBarTranslucent`.
- Overlay: `rgba(0,0,0,0.6)` background, centered card.
- Card: `Colors.dark.surface` background, `Radius.lg`, `Spacing.lg` padding, `Colors.dark.border` 1 px border.
- Title: `Strings.deleteConfirmTitle` ("Delete this transaction?") — `FontFamily.soraBold`, `Type.subhead`.
- Body: `Strings.deleteConfirmBody` ("The account balance will be restored. This cannot be undone.") — `FontFamily.interRegular`, `Type.body`, `Colors.dark.text2`, `lineHeight: 22`.
- Two buttons: `Cancel` (`Colors.dark.surfaceEl` bg, `Colors.dark.text1` text) + `Delete` (`Colors.dark.negative` bg, `Colors.dark.text1` text, `ActivityIndicator` when `busy`).

### 6.8 `not_found_state.tsx`

Centered card with `alert-circle-outline` icon, headline `Strings.detailNotFoundHeadline`, "Back to transactions" button → `router.back()`. Avoids a blank screen for stale deep links.

### 6.9 `detail.anim.ts`

- Hero entry: `FadeInDown.duration(300)`.
- Detail rows: `FadeInUp.delay(150).duration(300)`.
- Action row: `FadeInUp.delay(250).duration(300)`. Press scale `1.0 → 0.97 → 1.0`.
- Delete dialog: native `Modal` fade.

---

## 7. Theme & String Additions

### 7.1 `constants/theme.ts`

Append to `Colors.shared`:

```ts
transferBlue: '#4A7ABF',
ccPlum:       '#5A2D55',
heroGrad1:    '#1A2948',
heroGrad2:    '#223060',
heroGrad3:    '#192A4A',
```

Append to `Colors.dark`:

```ts
dangerBg: 'rgba(224, 90, 66, 0.12)',  // Colors.shared.negative @ 12 %
```

### 7.2 `constants/strings.ts`

Append:

```ts
// U5
transactions:                  'Transactions',
searchTransactionsPlaceholder: 'Search transactions…',
filterAll:                     'All',
filterExpense:                 'Expense',
filterIncome:                  'Income',
filterTransfer:                'Transfer',
filterCcPayment:               'Credit Pay',
transferTitle:                 'Transfer',
ccPaymentTitle:                'Credit Card Payment',
unknownAccount:                'Unknown account',
uncategorized:                 'Uncategorized',
noResultsHeadline:             'No transactions found',
noResultsSubtext:              'Try a different search term or filter.',
todayLabel:                    'TODAY',
yesterdayLabel:                'YESTERDAY',

// U7
detailHeader:                  'Transaction',
detailCategory:                'CATEGORY',
detailAccount:                 'ACCOUNT',
detailDateTime:                'DATE & TIME',
detailExchangeRate:            'EXCHANGE RATE',
detailNote:                    'NOTE',
detailNoteEmpty:               'No note',
capturedBadge:                 'Captured',
editTransaction:               'Edit Transaction',
editComingSoon:                'Coming in M2d',
deleteTransaction:             'Delete',
deleteConfirmTitle:            'Delete this transaction?',
deleteConfirmBody:             'The account balance will be restored. This cannot be undone.',
deleteCancel:                  'Cancel',
detailNotFoundHeadline:        'Transaction not found',
detailNotFoundCta:             'Back to transactions',
errDeleteFailed:               'Could not delete transaction. Please try again.',
typeBadgeExpense:              'Expense',
typeBadgeIncome:               'Income',
typeBadgeTransfer:             'Transfer',
typeBadgeCcPayment:            'CC Payment',
```

### 7.3 `app/_layout.tsx` — font load

Add `Sora_800ExtraBold` to the `useFonts` map alongside the existing `Sora_400/600/700`.

---

## 8. Tests

Coverage thresholds per CLAUDE.md: **80 % lines / 95 % functions / 100 % branches** on the logic layer.

### 8.1 New test files

| File | Scope |
|---|---|
| `__tests__/format_transaction_title.test.ts` | Expense/income title fallbacks (note → category → uncategorized), transfer/cc_payment title + subtitle with arrow, missing accounts, `formatTime12h` for 12 PM / 12 AM / mid-afternoon edge cases (asserted via the title's subtitle output). |
| `__tests__/format_time_12h.test.ts` | `'14:30:00'` → `'2:30 PM'`; `'00:05:00'` → `'12:05 AM'`; `'12:00:00'` → `'12:00 PM'`; `'23:59:00'` → `'11:59 PM'`. |
| `__tests__/group_transactions_by_date.test.ts` | Empty array → `[]`; today only; today + yesterday; today + yesterday + older this year + older year — assert correct keys and DESC order; deterministic via `now` param. |
| `__tests__/use_debounced_value.hook.test.ts` | Initial value returned synchronously; rapid changes within 300 ms collapse to the last value; `jest.useFakeTimers`; cleanup on unmount cancels pending timer. |
| `__tests__/transactions_screen.store.test.ts` | Default state; `setSearchQuery` / `setActiveFilter` updates; `clearSearch` resets only search; `reset` returns both to defaults. |

### 8.2 Updated test files

| File | Additions |
|---|---|
| `__tests__/transaction.query_executor.test.ts` | `type: 'expense'` filter; search by note; search by category name; search by source account name; search by destination account name (transfer/cc_payment); combined filter+search; `escapeLike` — literal `%` in query doesn't act as wildcard; pagination across two pages (insert 35 rows). |
| `__tests__/transaction.repository.test.ts` | `getAll({ type, limit, offset })` passes through to executor; `getAll()` defaults. |
| `__tests__/transaction.store.test.ts` | `setQuery` replaces array, sets loading flow; `hasMore` true at exactly `PAGE_SIZE`, false at less; `loadMore` no-op when `!hasMore` or `loading`; `loadMore` appends and bumps offset; `refresh` re-fetches with **current** query; `addTransaction` calls `refresh`; `deleteTransaction` calls `refresh`; `getById` passes through to the repo without touching state; **race guard**: two `setQuery` calls resolved out of order — final state matches the later request. |

### 8.3 No component-level tests

Per CLAUDE.md the project's test layer covers pure logic (helpers, stores, query executors, repositories). M2c keeps that boundary; all branchable logic lives in the helpers and stores listed above.

---

## 9. Animation Reference

| Surface | Animation |
|---|---|
| Row press | `withSequence(withTiming(scale: 0.98, 80ms), withSpring(scale: 1.0))` |
| Filter chip select | scale `withSequence(withTiming(1.05), withSpring(1.0))`; border `interpolateColor(#2A3A4F → #C9973A)` over 200 ms |
| Detail hero entry | `FadeInDown.duration(300)` |
| Detail rows | `FadeInUp.delay(150).duration(300)` |
| Action row | `FadeInUp.delay(250).duration(300)` |
| Delete button press | `withSequence(withTiming(scale: 0.97, 80ms), withSpring(scale: 1.0))` |
| Delete dialog | native `Modal` fade |

---

## 10. Definition of Done

✅ Tap the Transactions tab → list of all transactions appears, ordered DESC by date+time, grouped under sticky `TODAY · MMM D` / `YESTERDAY · MMM D` / `MMM D` / `MMM D, YYYY` headers.
✅ Filter chips switch the visible list to a single type; `All` shows everything.
✅ Search field filters live with 300 ms debounce across `note`, `category.name`, source `account.name`, and destination `account.name`.
✅ Search + filter combine (AND).
✅ Scroll past the bottom 50 % → next 30 rows append; spinner footer visible while loading; stops at end-of-data.
✅ Empty list shows the existing `transactions` empty state; empty search/filter result shows the new `transactionsNoResults` state.
✅ Tab away then back → list resets to `All` + empty search.
✅ Tap a row → detail screen opens at `/transactions/detail/[id]`, hero + rows + action row visible.
✅ Detail Edit button is visibly disabled with "Coming in M2d" caption.
✅ Detail Delete button → confirmation dialog → confirm → row deleted, account balance(s) restored (per existing M2b reversal logic), navigation back to the list, list reflects the removal.
✅ Cancel from the dialog closes it without changing anything.
✅ Stale deep link to a deleted id → `NotFoundState` instead of a blank screen.
✅ Adding a transaction via the FAB while a non-`All` filter is active → list refreshes under the active filter (documented limitation, not a bug).
✅ Test coverage ≥ 80 / 95 / 100 on logic layer; existing M2a/M2b tests still green.

---

## 11. Notes & Deferrals

- **Edit Transaction (M2d)** — Add Transaction sheet opens pre-filled with the existing tx values; `type` is locked; save calls a new `updateTransaction` (which delta-applies the balance change).
- **U31 advanced filter drawer (M2d/M2e)** — multi-axis combinations of account / category / date-range / amount.
- **Budget Impact card on U7 (M3)** — once budgets exist.
- **Toast component (M3 polish)** — would solve the "added under a non-matching filter" disorientation.
- **Account Detail integration (later)** — `getTransactionsByAccount` already exists; surfacing it in the U3 Account Detail screen is its own ticket.
