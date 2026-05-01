import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty_states';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { AddTransactionSheet } from './add_transaction';
import { useAddTransactionStore } from './add_transaction/add_transaction.store';
import { DateHeader } from './components/date_header';
import { FilterChips } from './components/filter_chips';
import { LoadingFooter } from './components/loading_footer';
import { SearchBar } from './components/search_bar';
import { TransactionRow } from './components/transaction_row';
import { useTransactions } from './transactions.hook';
import { useTransactionsScreenStore } from './transactions.store';

export default function TransactionsScreen() {
  const t = useTransactions();
  const open = useAddTransactionStore((s) => s.open);
  const close = useAddTransactionStore((s) => s.close);
  const visible = useAddTransactionStore((s) => s.visible);

  // Reset filter + search when leaving the tab.
  useFocusEffect(
    useCallback(() => {
      return () => useTransactionsScreenStore.getState().reset();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.transactions}</Text>
      </View>

      <SearchBar value={t.searchQuery} onChange={t.setSearchQuery} onClear={t.clearSearch} />
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
        />
      )}

      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]} onPress={open}>
        <MaterialCommunityIcons name="plus" size={ms(28)} color={Colors.shared.midnightBlue} />
      </Pressable>

      <AddTransactionSheet visible={visible} onClose={close} />
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
  body: { flex: 1 },
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
