import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect } from 'react';
import { BackHandler, RefreshControl, SectionList, View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

import { DateHeader } from './components/date_header';
import { DateRangeSheet } from './components/date_range_sheet';
import { MonthCarousel } from './components/month_carousel';
import { SearchRow } from './components/search_row';
import { TotalsStrip } from './components/totals_strip';
import { TransactionRow } from './components/transaction_row';
import { TxDeleteConfirmSheet } from './components/tx_delete_confirm_sheet';
import { TypeChips } from './components/type_chips';
import { FilterSheet } from './filter';
import { useFilterState } from './filter/filter.state';
import { AddTransactionSheet, EditTransactionSheet } from './transaction_form';
import { useAddTransactionState } from './transaction_form/add_transaction.state';
import { useAddTransactionStore } from './transaction_form/add_transaction.store';
import { useEditTransactionState } from './transaction_form/edit_transaction.state';
import { useEditTransactionStore } from './transaction_form/edit_transaction.store';
import { useTransactions } from './transactions.hook';

export default function TransactionsScreen(): React.ReactElement {
  const t = useTransactions();
  const { state: addTxState, open: openAddTx } = useAddTransactionState(
    useShallow((s) => ({ state: s.state, open: s.open })),
  );

  // Edit sheet state — opened imperatively from goToEdit in the hook
  const { state: editTxUiState } = useEditTransactionState(useShallow((s) => ({ state: s.state })));
  const { state: editTxDataState } = useEditTransactionStore(
    useShallow((s) => ({ state: s.state })),
  );

  // Delete confirm gate for list-swipe delete
  const { deleteTransaction } = useTransactionStore(
    useShallow((s) => ({ deleteTransaction: s.deleteTransaction })),
  );
  const {
    pendingPayload: pendingDeleteId,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<string>((id) => deleteTransaction(id));

  // Consume an open request from the global FAB. React to `pendingOpen`
  // directly (NOT useFocusEffect): a FAB tap while ALREADY on the Transactions
  // tab is a no-op navigation that fires no focus change, so a focus-gated
  // effect would never run and the sheet wouldn't open. The 250ms defers the
  // open until the tab-slide transition settles for the CROSS-tab case, so the
  // HeroUI sheet presents instead of only mounting its children (the "keyboard
  // opens but sheet doesn't" symptom). Harmless quarter-second on same-tab.
  useEffect(() => {
    if (!addTxState.pendingOpen) return undefined;
    const timer = setTimeout(() => openAddTx(), 250);
    return () => clearTimeout(timer);
  }, [addTxState.pendingOpen, openAddTx]);

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
        <Text className="font-sora text-foreground text-[19px] font-bold">
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
        onScrollBeginDrag={closeAllRows}
        renderItem={({ item }) => (
          <TransactionRow
            tx={item}
            account={t.state.accountsById.get(item.account_id)}
            toAccount={
              item.to_account_id ? t.state.accountsById.get(item.to_account_id) : undefined
            }
            category={item.category_id ? t.state.categoriesById.get(item.category_id) : undefined}
            onPress={() => t.goToDetail(item.id)}
            onEdit={() => t.goToEdit(item.id)}
            onDelete={() => requestDelete(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            variant={t.state.emptyVariant === 'noData' ? 'transactions' : 'filtered'}
            onAction={t.state.emptyVariant === 'noData' ? openAddTx : t.resetFilters}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={t.state.refreshing}
            onRefresh={() => {
              void t.onRefresh();
            }}
            tintColor={GoldTokens[500]}
            colors={[GoldTokens[500]]}
          />
        }
        onEndReached={() => {
          void t.onEndReached();
        }}
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
      <EditTransactionSheet
        visible={editTxUiState.visible}
        tx={editTxDataState.editingTx}
        onClose={() => {
          useEditTransactionStore.getState().reset();
          useEditTransactionState.getState().close();
        }}
        onSaved={() => {
          useEditTransactionStore.getState().reset();
          useEditTransactionState.getState().close();
        }}
      />
      <TxDeleteConfirmSheet
        isOpen={pendingDeleteId !== null}
        busy={deleteBusy}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
      <FilterSheet />
      <DateRangeSheet
        isOpen={filterUiState.dateRangeSheetVisible}
        initialFrom={t.state.customRange?.from}
        initialTo={t.state.customRange?.to}
        onOpenChange={(open) => {
          if (!open) setDateRangeSheetVisible(false);
        }}
        onConfirm={(from, to) => {
          t.setCustomRange({ from, to });
          t.setPeriod({ type: 'custom', from, to });
          setDateRangeSheetVisible(false);
        }}
        onReset={() => {
          t.setCustomRange(null);
          t.setPeriod({ type: 'all' });
          setDateRangeSheetVisible(false);
        }}
      />
    </Screen>
  );
}
