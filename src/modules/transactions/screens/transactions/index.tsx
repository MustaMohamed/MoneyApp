import { useFocusEffect } from 'expo-router';
import { Separator, Spinner, Surface, Text as HeroText } from 'heroui-native';
import React, { useCallback, useEffect, useMemo } from 'react';
import { BackHandler, RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { EmptyState } from '@/components/ui/empty_state';
import { MonthFilter } from '@/components/ui/month_filter';
import { Screen } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

import { DateHeader } from './components/date_header';
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

type TransactionSection = { key: string; data: Transaction[] };

export default function TransactionsScreen(): React.ReactElement {
  const t = useTransactions();
  const {
    state,
    setSelectedMonth,
    setSearchQuery,
    clearSearch,
    openFilter,
    setActiveFilter,
    goToDetail,
    goToEdit,
    resetFilters,
    onRefresh,
    onEndReached,
  } = t;
  const { addTxVisible, addTxPendingOpen } = useAddTransactionState(
    useShallow((s) => ({
      addTxVisible: s.visible,
      addTxPendingOpen: s.pendingOpen,
    })),
  );
  const openAddTx = useAddTransactionState.getState().open;

  const editTxVisible = useEditTransactionState.useState.visible();
  const editingTx = useEditTransactionStore.useState.editingTx();

  const deleteTransaction = useTransactionStore.getState().deleteTransaction;
  const {
    pendingPayload: pendingDeleteId,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<string>((id) => deleteTransaction(id));

  // Global FAB taps set pendingOpen; same-tab taps do not fire focus.
  // Delay keeps cross-tab sheet presentation after the tab transition settles.
  useEffect(() => {
    if (!addTxPendingOpen) return undefined;
    const timer = setTimeout(() => openAddTx(), 250);
    return () => clearTimeout(timer);
  }, [addTxPendingOpen, openAddTx]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        if (useAddTransactionState.getState().visible) {
          useAddTransactionState.getState().close();
          useAddTransactionStore.getState().reset();
          return true;
        }
        if (useFilterState.getState().visible) {
          useFilterState.getState().close();
          return true;
        }
        return false;
      });
      return () => sub.remove();
    }, []),
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Transaction, TransactionSection> }) => (
      <DateHeader label={section.key} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<Transaction, TransactionSection>) => (
      <TransactionRow
        tx={item}
        account={state.accountsById.get(item.account_id)}
        toAccount={item.to_account_id ? state.accountsById.get(item.to_account_id) : undefined}
        category={item.category_id ? state.categoriesById.get(item.category_id) : undefined}
        onPress={goToDetail}
        onEdit={goToEdit}
        onDelete={requestDelete}
      />
    ),
    [goToDetail, goToEdit, requestDelete, state.accountsById, state.categoriesById],
  );

  const listEmptyComponent = useMemo(
    () =>
      state.emptyVariant === 'none' ? (
        <View className="items-center justify-center py-12">
          <Spinner />
        </View>
      ) : (
        <EmptyState
          variant={state.emptyVariant === 'noData' ? 'transactions' : 'filtered'}
          onAction={state.emptyVariant === 'noData' ? openAddTx : resetFilters}
        />
      ),
    [openAddTx, resetFilters, state.emptyVariant],
  );

  const handleRefresh = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const handleEndReached = useCallback(() => {
    void onEndReached();
  }, [onEndReached]);

  return (
    <Screen edges={['top']}>
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View style={{ minHeight: Size.headerHeight, justifyContent: 'center' }}>
          <HeroText.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.transactions}
          </HeroText.Heading>
        </View>
      </Surface>
      <Separator />

      <MonthFilter yearMonth={state.selectedMonth} onChange={setSelectedMonth} />

      {state.totals ? (
        <TotalsStrip
          current={state.totals.current}
          previous={state.totals.previous}
          previousLabel={state.previousLabel}
        />
      ) : null}

      <SearchRow
        value={state.searchQuery}
        onChange={setSearchQuery}
        onClear={clearSearch}
        onOpenFilter={openFilter}
        activeFilterCount={state.activeFilterCount}
      />

      <TypeChips value={state.activeFilter} onChange={setActiveFilter} />

      <SectionList
        sections={state.sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled
        renderSectionHeader={renderSectionHeader}
        onScrollBeginDrag={closeAllRows}
        renderItem={renderItem}
        ListEmptyComponent={listEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={state.refreshing}
            onRefresh={handleRefresh}
            tintColor={GoldTokens[500]}
            colors={[GoldTokens[500]]}
          />
        }
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 96 }}
      />

      <AddTransactionSheet
        visible={addTxVisible}
        onClose={() => {
          useAddTransactionState.getState().close();
          useAddTransactionStore.getState().reset();
        }}
      />
      <EditTransactionSheet
        visible={editTxVisible}
        tx={editingTx}
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
    </Screen>
  );
}
