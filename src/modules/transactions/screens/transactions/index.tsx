import { Separator, Surface, Text as HeroText } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { FilterRail, type FilterRailOption } from '@/components/ui/filter_rail';
import { Screen } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { AccentCCTokens, GoldTokens, InfoTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { ms } from '@/utils/responsive';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

import { DateHeader } from './components/date_header';
import { SearchRow } from './components/search_row';
import { TotalsStrip } from './components/totals_strip';
import { TransactionLoadError } from './components/transaction_load_error';
import { TransactionRow } from './components/transaction_row';
import { TransactionRowsSkeleton } from './components/transaction_rows_skeleton';
import { TxDeleteConfirmSheet } from './components/tx_delete_confirm_sheet';
import { FilterSheet } from './filter';
import { useTransactionFormV2State } from './transaction_form_v2/transaction_form_v2.state';
import { useTransactions } from './transactions.hook';
import type { TransactionSection } from './transactions.hook';
import type { TransactionFilter } from './transactions.store';

const TRANSACTION_FILTERS: FilterRailOption<TransactionFilter>[] = [
  {
    value: 'all',
    label: Strings.filterAll,
    icon: { name: 'view-grid', color: Colors.dark.text2 },
  },
  {
    value: TransactionType.Income,
    label: Strings.addTxTypeIncome,
    icon: { name: 'arrow-down-circle-outline', color: SemanticTokens.positive },
  },
  {
    value: TransactionType.Expense,
    label: Strings.addTxTypeExpense,
    icon: { name: 'arrow-up-circle-outline', color: SemanticTokens.negative },
  },
  {
    value: TransactionType.Transfer,
    label: Strings.addTxTypeTransfer,
    icon: { name: 'swap-horizontal', color: InfoTokens[500] },
  },
  {
    value: TransactionType.CCPayment,
    label: Strings.filterCcPayment,
    icon: { name: 'credit-card-refund', color: AccentCCTokens[500] },
  },
];

const LIST_BOTTOM_CLEARANCE = ms(160);
const SCROLL_POSITION_THROTTLE_MS = 100;

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
    onListScroll,
    onListScrollEnd,
    retryFailedLoads,
  } = t;
  const openAddTx = useTransactionFormV2State.getState().openAdd;

  const deleteTransaction = useTransactionStore.getState().deleteTransaction;
  const {
    pendingPayload: pendingDeleteId,
    busy: deleteBusy,
    error: deleteError,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<string>((id) => deleteTransaction(id));

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Transaction, TransactionSection> }) => (
      <DateHeader label={section.key} contextLabel={state.appliedFilterSummary} />
    ),
    [state.appliedFilterSummary],
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

  const showRowsSkeleton = state.showInitialSkeleton;
  const listSections = state.sections;

  const listHeaderComponent = useMemo(
    () => (
      <View testID="transactions-list-header">
        <TotalsStrip
          current={state.totals?.current ?? null}
          previous={state.totals?.previous ?? null}
          previousLabel={state.previousLabel}
          isLoading={state.totals === null}
        />
        <SearchRow
          value={state.searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          onOpenFilter={openFilter}
          activeFilterCount={state.activeFilterCount}
        />
      </View>
    ),
    [
      clearSearch,
      openFilter,
      setSearchQuery,
      state.activeFilterCount,
      state.previousLabel,
      state.searchQuery,
      state.totals,
    ],
  );

  const listEmptyComponent = useMemo(
    () =>
      showRowsSkeleton ? (
        <TransactionRowsSkeleton />
      ) : state.showFirstLoadError ? (
        <TransactionLoadError variant="initial" onRetry={() => void retryFailedLoads()} />
      ) : state.emptyVariant === 'none' ? null : (
        <EmptyState
          variant={state.emptyVariant === 'noData' ? 'transactions' : 'filtered'}
          onAction={state.emptyVariant === 'noData' ? openAddTx : resetFilters}
        />
      ),
    [
      openAddTx,
      resetFilters,
      retryFailedLoads,
      showRowsSkeleton,
      state.emptyVariant,
      state.showFirstLoadError,
    ],
  );

  const handleRefresh = useCallback(() => {
    void onRefresh();
  }, [onRefresh]);

  const handleEndReached = useCallback(() => {
    void onEndReached();
  }, [onEndReached]);

  const listFooterComponent = useMemo(
    () =>
      state.paginationError ? (
        <TransactionLoadError variant="pagination" onRetry={handleEndReached} />
      ) : null,
    [handleEndReached, state.paginationError],
  );

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

      <FilterRail
        selectedMonth={state.selectedMonth}
        onSelectedMonthChange={setSelectedMonth}
        selectedFilter={state.activeFilter}
        onSelectedFilterChange={setActiveFilter}
        filters={TRANSACTION_FILTERS}
        filterAccessibilityLabel="Transaction type filter"
      />

      <View style={{ flex: 1 }}>
        <SectionList
          testID="transactions-list"
          ref={state.listRef}
          sections={listSections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={renderSectionHeader}
          onScroll={onListScroll}
          scrollEventThrottle={SCROLL_POSITION_THROTTLE_MS}
          onScrollEndDrag={onListScrollEnd}
          onMomentumScrollEnd={onListScrollEnd}
          onScrollBeginDrag={closeAllRows}
          renderItem={renderItem}
          ListHeaderComponent={listHeaderComponent}
          ListEmptyComponent={listEmptyComponent}
          ListFooterComponent={listFooterComponent}
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: LIST_BOTTOM_CLEARANCE }}
        />
        {state.loadErrorVariant !== 'none' ? (
          <TransactionLoadError
            variant={state.loadErrorVariant}
            onRetry={() => void retryFailedLoads()}
          />
        ) : null}
      </View>

      <TxDeleteConfirmSheet
        isOpen={pendingDeleteId !== null}
        busy={deleteBusy}
        errorMessage={deleteError ? Strings.errDeleteFailed : undefined}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
      <FilterSheet />
    </Screen>
  );
}
