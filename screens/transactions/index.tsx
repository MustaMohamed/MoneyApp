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
import { useAddTransactionState } from './transaction_form/add_transaction.state';
import { useAddTransactionStore } from './transaction_form/add_transaction.store';
import { DateHeader } from './components/date_header';
import { FilterButton } from './components/filter_button';
import { FilterChips } from './components/filter_chips';
import { LoadingFooter } from './components/loading_footer';
import { SearchBar } from './components/search_bar';
import { TransactionRow } from './components/transaction_row';
import { FilterDrawer } from './filter';
import { useFilterDrawerState } from './filter/filter.state';
import { useShallow } from 'zustand/react/shallow';

import { useTransactions } from './transactions.hook';
import { useTransactionsScreenStore } from './transactions.store';

export default function TransactionsScreen() {
  const t = useTransactions();
  const { state: addTxState, open } = useAddTransactionState(
    useShallow((s) => ({ state: s.state, open: s.open })),
  );

  // Closing the sheet must reset BOTH the UI state (visibility + flags) and the
  // data store (form draft: type + amountStr) so the next FAB tap starts clean.
  const handleClose = useCallback(() => {
    useAddTransactionState.getState().close();
    useAddTransactionStore.getState().reset();
  }, []);

  // On tab blur: reset both screen-local UI (chip + search + applied filters)
  // AND the global query so the data array is unfiltered before the user
  // returns. Also dismiss the filter drawer and the add-transaction sheet
  // (both UI flags + data draft) if they're open.
  useFocusEffect(
    useCallback(() => {
      return () => {
        useTransactionsScreenStore.getState().reset();
        useFilterDrawerState.getState().close();
        useAddTransactionState.getState().close();
        useAddTransactionStore.getState().reset();
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
          value={t.state.searchQuery}
          onChange={t.setSearchQuery}
          onClear={t.clearSearch}
        />
        <FilterButton count={t.state.activeFilterCount} onPress={t.openFilter} />
      </View>

      <FilterChips active={t.state.activeFilter} onChange={t.setActiveFilter} />

      {t.state.emptyVariant !== 'none' ? (
        <View style={styles.body}>
          <EmptyState
            variant={t.state.emptyVariant === 'noData' ? 'transactions' : 'transactionsNoResults'}
          />
        </View>
      ) : (
        <SectionList
          sections={t.state.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
          renderItem={({ item }) => (
            <TransactionRow
              tx={item}
              account={t.state.accountsById.get(item.account_id)}
              toAccount={
                item.to_account_id ? t.state.accountsById.get(item.to_account_id) : undefined
              }
              category={item.category_id ? t.state.categoriesById.get(item.category_id) : undefined}
              onPress={() => router.push(`/transactions/detail/${item.id}`)}
            />
          )}
          onEndReached={t.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={t.state.loading && t.state.hasMore ? <LoadingFooter /> : null}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={open}>
        <MaterialCommunityIcons name="plus" size={ms(28)} color={Colors.shared.midnightBlue} />
      </Pressable>

      <AddTransactionSheet visible={addTxState.visible} onClose={handleClose} />
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
