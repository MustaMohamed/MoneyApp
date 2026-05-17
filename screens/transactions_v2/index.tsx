import React, { useCallback } from 'react';
import { BackHandler, RefreshControl, SectionList, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { EmptyState } from '@/components/ui/empty_state';
import { Strings } from '@/constants/strings';

import { AddTransactionSheet } from '@/screens/transactions/transaction_form';
import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';
import { useAddTransactionStore } from '@/screens/transactions/transaction_form/add_transaction.store';

import { DateHeader } from './components/date_header';
import { DateRangeSheet } from './components/date_range_sheet';
import { MonthCarousel } from './components/month_carousel';
import { SearchRow } from './components/search_row';
import { TotalsStrip } from './components/totals_strip';
import { TransactionRow } from './components/transaction_row';
import { TypeChips } from './components/type_chips';
import { FilterSheet } from './filter';
import { useFilterState } from './filter/filter.state';
import { useTransactions } from './transactions.hook';

export default function TransactionsScreenV2(): React.ReactElement {
  const t = useTransactions();
  const { state: addTxState, open: openAddTx } = useAddTransactionState(
    useShallow((s) => ({ state: s.state, open: s.open })),
  );
  const { state: filterUiState, setDateRangeSheetVisible } = useFilterState(
    useShallow((s) => ({
      state: s.state,
      setDateRangeSheetVisible: s.setDateRangeSheetVisible,
    })),
  );

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (useAddTransactionState.getState().state.visible) {
          useAddTransactionState.getState().close();
          useAddTransactionStore.getState().reset();
          return true;
        }
        if (useFilterState.getState().state.visible) {
          useFilterState.getState().close();
          return true;
        }
        if (useFilterState.getState().state.dateRangeSheetVisible) {
          useFilterState.getState().setDateRangeSheetVisible(false);
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  return (
    <Screen edges={['top']}>
      <View className="px-4 pt-3 pb-1">
        <Text className="font-sora font-bold text-[19px] text-foreground">
          {Strings.transactions}
        </Text>
      </View>

      <View className="mt-3">
        <MonthCarousel
          selection={t.state.period}
          customRange={t.state.customRange}
          onSelect={t.setPeriod}
          onOpenCustom={() => setDateRangeSheetVisible(true)}
        />
      </View>

      {t.state.period.type !== 'all' && t.state.totals ? (
        <TotalsStrip
          current={t.state.totals.current}
          previous={t.state.totals.previous}
          previousLabel={t.state.previousLabel}
        />
      ) : null}

      <SearchRow
        value={t.state.searchQuery}
        onChange={t.setSearchQuery}
        onClear={t.clearSearch}
        onOpenFilter={t.openFilter}
        activeFilterCount={t.state.activeFilterCount}
      />

      <TypeChips value={t.state.activeFilter} onChange={t.setActiveFilter} />

      <SectionList
        sections={t.state.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            account={t.state.accountsById.get(item.account_id)}
            toAccount={item.to_account_id ? t.state.accountsById.get(item.to_account_id) : undefined}
            category={item.category_id ? t.state.categoriesById.get(item.category_id) : undefined}
            onPress={() => t.goToDetail(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            variant={t.state.emptyVariant === 'noData' ? 'transactions' : 'filtered'}
            onAction={openAddTx}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={t.state.refreshing}
            onRefresh={t.onRefresh}
            tintColor="#D4AF37"
            colors={['#D4AF37']}
          />
        }
        onEndReached={t.onEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
      />

      <AddTransactionSheet
        visible={addTxState.visible}
        onClose={() => {
          useAddTransactionState.getState().close();
          useAddTransactionStore.getState().reset();
        }}
      />
      <FilterSheet />
      <DateRangeSheet
        visible={filterUiState.dateRangeSheetVisible}
        initialFrom={t.state.customRange?.from}
        initialTo={t.state.customRange?.to}
        onClose={() => setDateRangeSheetVisible(false)}
        onConfirm={(from, to) => {
          t.setCustomRange({ from, to });
          t.setPeriod({ type: 'custom', from, to });
          setDateRangeSheetVisible(false);
        }}
      />
    </Screen>
  );
}
