# M2e Part 5 — Wiring & End-to-End Verification

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md` §§ 5.5, 6.2, 9, 10

**Goal:** Wire the drawer into the Transactions screen — extend `SearchBar` to flex inside a row, modify `transactions.hook.ts` to compose the merged query and expose drawer-open + active-count, modify `transactions/index.tsx` to render the search row and mount `FilterDrawer`, ensure the focus-blur cleanup also dismisses the drawer. Then run a full verification pass.

**Tech Stack:** React Native, Expo Router, Zustand v5.

**Prerequisites:** Parts 1–4 complete.

---

## File Structure (this part)

| File | Purpose | Modified |
|---|---|---|
| `app/(app)/(tabs)/transactions/components/search_bar.tsx` | Accept optional `style` prop | Modified |
| `app/(app)/(tabs)/transactions/transactions.hook.ts` | Read appliedFilters, compose query, expose openFilter + activeFilterCount | Modified |
| `app/(app)/(tabs)/transactions/index.tsx` | Render search row with FilterButton; mount FilterDrawer; extend focus cleanup | Modified |

---

## Task 20: `SearchBar` accepts optional `style` prop

**Files:**
- Modify: `app/(app)/(tabs)/transactions/components/search_bar.tsx`

The current `SearchBar` hardcodes `marginHorizontal: Spacing.md, marginTop: Spacing.sm`. We move outer layout responsibility to the parent (the new search row) and accept an optional style override for sizing.

- [ ] **Step 1: Update the file**

Replace the current contents with:

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
  style?: ViewStyle;
}

export function SearchBar({ value, onChange, onClear, style }: Props) {
  return (
    <View style={[styles.container, style]}>
      <MaterialCommunityIcons
        name="magnify"
        size={ms(18)}
        color={Colors.dark.text2}
        style={styles.leadIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={Strings.searchTransactionsPlaceholder}
        placeholderTextColor={Colors.dark.text2}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8} style={styles.clearBtn}>
          <MaterialCommunityIcons name="close-circle" size={ms(16)} color={Colors.dark.text2} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(40),
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
  },
  leadIcon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    alignSelf: 'stretch',
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  clearBtn: { marginLeft: Spacing.xs },
});
```

The `marginHorizontal` and `marginTop` are intentionally removed from the container — the parent row now owns those.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS — `transactions/index.tsx` will look slightly off in dev runtime (no horizontal margin) until Task 22 lands, but typecheck stays clean.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/search_bar.tsx
git commit -m "refactor(m2e): SearchBar accepts optional style prop, drops outer margin"
```

---

## Task 21: Extend `transactions.hook.ts` with applied filters + drawer wiring

**Files:**
- Modify: `app/(app)/(tabs)/transactions/transactions.hook.ts`

- [ ] **Step 1: Replace the file with the extended hook**

```typescript
import { useEffect, useMemo } from 'react';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { countActiveFilters, toQueryFilters } from './filter/filter.helpers';
import { useFilterDrawerStore } from './filter/filter.store';
import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';

export function useTransactions() {
  // screen-local
  const searchQuery = useTransactionsScreenStore((s) => s.searchQuery);
  const activeFilter = useTransactionsScreenStore((s) => s.activeFilter);
  const appliedFilters = useTransactionsScreenStore((s) => s.appliedFilters);
  const setSearchQuery = useTransactionsScreenStore((s) => s.setSearchQuery);
  const setActiveFilter = useTransactionsScreenStore((s) => s.setActiveFilter);
  const clearSearch = useTransactionsScreenStore((s) => s.clearSearch);

  // global
  const transactions = useTransactionStore((s) => s.transactions);
  const hasMore = useTransactionStore((s) => s.hasMore);
  const loading = useTransactionStore((s) => s.loading);
  const setQuery = useTransactionStore((s) => s.setQuery);
  const loadMore = useTransactionStore((s) => s.loadMore);

  // joined
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  // drawer
  const openDrawer = useFilterDrawerStore((s) => s.open);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    setQuery({
      search: trimmed || undefined,
      type: activeFilter === 'all' ? undefined : activeFilter,
      ...toQueryFilters(appliedFilters),
    }).catch(() => {});
  }, [debouncedSearch, activeFilter, appliedFilters, setQuery]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const activeFilterCount = useMemo(() => countActiveFilters(appliedFilters), [appliedFilters]);
  const hasAdvancedFilters = activeFilterCount > 0;

  const emptyVariant: EmptyVariant =
    transactions.length > 0
      ? 'none'
      : debouncedSearch.trim() || activeFilter !== 'all' || hasAdvancedFilters
        ? 'noResults'
        : 'noData';

  function openFilter() {
    openDrawer(appliedFilters);
  }

  return {
    sections,
    hasMore,
    loading,
    emptyVariant,
    searchQuery,
    activeFilter,
    accountsById,
    categoriesById,
    setSearchQuery,
    setActiveFilter,
    clearSearch,
    onEndReached: loadMore,
    activeFilterCount,
    openFilter,
  };
}
```

Notes:
- `openFilter()` snapshots the current applied filters into the drawer's draft (per `useFilterDrawerStore.open(initial)`).
- `emptyVariant` now also surfaces `noResults` when only advanced filters are active and the query returns empty.

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run hook-related tests (transaction store)**

Run: `npx jest __tests__/transaction.store.test.ts __tests__/transactions_screen.store.test.ts`
Expected: All passing.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/transactions.hook.ts
git commit -m "feat(m2e): wire transactions.hook to applied filters and filter drawer"
```

---

## Task 22: Update `transactions/index.tsx` (search row, drawer mount, focus cleanup)

**Files:**
- Modify: `app/(app)/(tabs)/transactions/index.tsx`

- [ ] **Step 1: Replace the file**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty_states';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { useTransactionStore } from '@/store/transaction.store';
import { AddTransactionSheet } from './transaction_form';
import { useAddTransactionStore } from './transaction_form/add_transaction.store';
import { DateHeader } from './components/date_header';
import { FilterButton } from './components/filter_button';
import { FilterChips } from './components/filter_chips';
import { LoadingFooter } from './components/loading_footer';
import { SearchBar } from './components/search_bar';
import { TransactionRow } from './components/transaction_row';
import { FilterDrawer } from './filter';
import { useFilterDrawerStore } from './filter/filter.store';
import { useTransactions } from './transactions.hook';
import { useTransactionsScreenStore } from './transactions.store';

export default function TransactionsScreen() {
  const t = useTransactions();
  const open = useAddTransactionStore((s) => s.open);
  const close = useAddTransactionStore((s) => s.close);
  const visible = useAddTransactionStore((s) => s.visible);

  // On tab blur: reset both screen-local UI (chip + search + applied filters)
  // AND the global query so the data array is unfiltered before the user
  // returns. Also dismiss the filter drawer if it's open.
  useFocusEffect(
    useCallback(() => {
      return () => {
        useTransactionsScreenStore.getState().reset();
        useFilterDrawerStore.getState().close();
        useTransactionStore
          .getState()
          .setQuery({})
          .catch(() => {});
      };
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.transactions}</Text>
      </View>

      <View style={styles.searchRow}>
        <SearchBar
          style={styles.searchBar}
          value={t.searchQuery}
          onChange={t.setSearchQuery}
          onClear={t.clearSearch}
        />
        <FilterButton count={t.activeFilterCount} onPress={t.openFilter} />
      </View>

      <FilterChips active={t.activeFilter} onChange={t.setActiveFilter} />

      {t.emptyVariant !== 'none' ? (
        <View style={styles.body}>
          <EmptyState
            variant={t.emptyVariant === 'noData' ? 'transactions' : 'transactionsNoResults'}
          />
        </View>
      ) : (
        <SectionList
          sections={t.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
          renderItem={({ item }) => (
            <TransactionRow
              tx={item}
              account={t.accountsById.get(item.account_id)}
              toAccount={item.to_account_id ? t.accountsById.get(item.to_account_id) : undefined}
              category={item.category_id ? t.categoriesById.get(item.category_id) : undefined}
              onPress={() => router.push(`/transactions/detail/${item.id}`)}
            />
          )}
          onEndReached={t.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={t.loading && t.hasMore ? <LoadingFooter /> : null}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={open}>
        <MaterialCommunityIcons name="plus" size={ms(28)} color={Colors.shared.midnightBlue} />
      </Pressable>

      <AddTransactionSheet visible={visible} onClose={close} />
      <FilterDrawer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
  },
  searchBar: { flex: 1 },
  body: { flex: 1 },
  listContent: { paddingBottom: Spacing.xxl + ms(56) },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.md,
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
});
```

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Run the full test suite to verify no regression**

Run: `npm test`
Expected: All passing.

- [ ] **Step 4: Run coverage and verify thresholds**

Run: `npm run test:coverage`
Expected: 80% lines / 95% functions / 100% branches met on the logic layer.

If any threshold misses, check the coverage report for the failing file (likely `filter.helpers.ts` or `filter.store.ts`) and add the missing test case before proceeding.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/index.tsx
git commit -m "feat(m2e): mount FilterDrawer and add filter button to search row"
```

---

## Task 23: Manual smoke test

This is a manual verification of the full feature in the running app. Required because UI components don't have automated tests in this project.

- [ ] **Step 1: Start the dev server**

Run: `npm start`
Expected: Expo dev server starts; QR code printed.

- [ ] **Step 2: Open the app on a simulator or device, navigate to Transactions tab**

Verify:
- ✅ Search row shows search input + sliders icon button at the right.
- ✅ Sliders icon is grey (no badge) when no filters are applied.
- ✅ Type chip row renders below the search row, unchanged from before.

- [ ] **Step 3: Tap the sliders icon**

Verify:
- ✅ Bottom sheet slides up from the bottom (~85% height).
- ✅ Header shows ✕ on left, "Filters" centered, "Reset" link on right.
- ✅ Sections appear in order: Accounts row → Categories row → Date list → Amount section → sticky Apply button.

- [ ] **Step 4: Test Account picker**

- ✅ Tap "Accounts" row → multi-select sub-sheet slides up.
- ✅ Non-archived accounts listed; checkboxes empty.
- ✅ Tap two accounts → checkboxes fill gold.
- ✅ Tap "Done" → sub-sheet closes, drawer remains, "Accounts" row summary shows "Name A, Name B".

- [ ] **Step 5: Test Category picker**

- ✅ Tap "Categories" row → multi-select sub-sheet.
- ✅ All categories listed (expense + income mixed) with type captions.
- ✅ Toggle a few; tap "Done" → summary updates.

- [ ] **Step 6: Test Date section**

- ✅ Tap "This month" → radio fills gold; previous selection clears.
- ✅ Tap "Custom..." → custom date sub-sheet opens with two date fields.
- ✅ Pick a "From" and "To" date.
- ✅ "Done" enables once both dates picked; from-date constrained ≤ to-date.
- ✅ Tap "Done" → sub-sheet closes, "Custom..." row shows the formatted range caption.

- [ ] **Step 7: Test Amount section**

- ✅ Type "100" in From, blur → "100" displays comma-formatted.
- ✅ Type "5,000" in To, blur → "5,000" preserved.
- ✅ Tap USD pill → toggle switches; EGP pill goes inactive.

- [ ] **Step 8: Test Reset and Apply**

- ✅ Tap "Reset" → all sections clear, drawer remains open.
- ✅ Re-apply some filters; tap Apply (count) → drawer closes; transaction list re-queries.
- ✅ Filter button on search row now shows gold tint + count badge.

- [ ] **Step 9: Test type chip composition**

- ✅ With drawer filters applied, tap "Income" type chip.
- ✅ List narrows further to income transactions inside the filter set.
- ✅ Switching to "Expense" again narrows accordingly.

- [ ] **Step 10: Test tab blur reset**

- ✅ Navigate to Dashboard tab.
- ✅ Navigate back to Transactions tab.
- ✅ Search is cleared, type chip is "All", filter button has no badge — all reset.

- [ ] **Step 11: Test backdrop dismiss**

- ✅ Open drawer, tap above it (backdrop) → drawer closes; applied state unchanged.

- [ ] **Step 12: Test M2A–M2D regression**

- ✅ Add a transaction (M2B) — works.
- ✅ Tap a transaction row → detail screen (M2C) — works.
- ✅ Edit transaction (M2D) — works.
- ✅ Delete transaction (M2C) — works.

If anything fails, fix before continuing.

---

## Task 24: Push branch

- [ ] **Step 1: Push to remote**

Run: `git push -u origin claude/start-m2e-module-ZPL7L`
Expected: Branch pushed.

If the push fails due to network errors, retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s).

---

## Part 5 — Definition of Done (and overall M2e completion)

- ✅ `SearchBar` accepts `style` prop and drops its outer margin.
- ✅ `transactions.hook.ts` reads `appliedFilters`, calls `setQuery` with merged filter set, exposes `openFilter` and `activeFilterCount`.
- ✅ `transactions/index.tsx` renders the search row with `<FilterButton/>`, mounts `<FilterDrawer/>`, and dismisses the drawer on tab blur.
- ✅ `npm test` and `npm run typecheck` are green.
- ✅ `npm run test:coverage` meets the 80/95/100 thresholds on the logic layer.
- ✅ Manual smoke test passes for all 12 verification points.
- ✅ Branch pushed to remote.
- ✅ All tasks across Parts 1–5 committed independently with conventional commit messages.

The full M2E spec (`docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md`) Definition of Done is satisfied at this point.
