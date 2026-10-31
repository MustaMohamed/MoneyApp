import { Separator, Surface, Typography } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

import { AccountChips } from '@/components/ui/account_chips';
import { DayCardRow } from '@/components/ui/day_card_row';
import { resolveDayCardSwipeCorners } from '@/components/ui/day_card_row.helpers';
import { SKELETON_DAY_CARDS, SKELETON_ROWS_PER_CARD } from '@/components/ui/day_cards_skeleton';
import { DayHeader } from '@/components/ui/day_header';
import { EmptyState } from '@/components/ui/empty_state';
import { LIST_RAIL_ALL_OPTION, ListRail } from '@/components/ui/list_rail';
import { Screen } from '@/components/ui/screen';
import { SearchTally } from '@/components/ui/search_tally';
import type { SegmentFilterOption } from '@/components/ui/segment_filter';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';
import { TransactionRow } from '@/modules/transactions/components/transaction_row';
import { TransactionRowsSkeleton } from '@/modules/transactions/components/transaction_rows_skeleton';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import type { TransactionFilter } from '@/modules/transactions/store/transactions.store';
import { orderByRank } from '@/utils/rank_order';
import { ms } from '@/utils/responsive';

import { SearchRow } from './components/search_row';
import { TransactionLoadError } from './components/transaction_load_error';
import { TransactionsHero } from './components/transactions_hero';
import { TxDeleteDialog } from './components/tx_delete_dialog';
import { FilterSheet } from './filter';
import { useTransactions } from './transactions.hook';
import type { TransactionSection } from './transactions.hook';

const TYPE_RAIL_RANK = {
  [TransactionType.Income]: 0,
  [TransactionType.Expense]: 1,
  [TransactionType.Transfer]: 2,
  [TransactionType.CCPayment]: 3,
} satisfies Record<TransactionType, number>;

const TYPE_RAIL_LABELS: Record<TransactionType, string> = {
  [TransactionType.Income]: Strings.addTxTypeIncome,
  [TransactionType.Expense]: Strings.addTxTypeExpense,
  [TransactionType.Transfer]: Strings.addTxTypeTransfer,
  [TransactionType.CCPayment]: Strings.filterCcPayment,
};

const TRANSACTION_FILTERS: ReadonlyArray<SegmentFilterOption<TransactionFilter>> = [
  LIST_RAIL_ALL_OPTION,
  ...orderByRank(TYPE_RAIL_RANK).map((type) => ({
    value: type,
    label: TYPE_RAIL_LABELS[type],
    icon: TRANSACTION_TYPE_ICONS[type],
  })),
];

const LIST_BOTTOM_CLEARANCE = ms(160);
const SCROLL_POSITION_THROTTLE_MS = 100;

export default function TransactionsScreen(): React.ReactElement {
  const t = useTransactions();
  const {
    state,
    setSelectedMonth,
    setSearchQuery,
    openFilter,
    setActiveFilter,
    goToDetail,
    goToEdit,
    resetFilters,
    toggleAccountChip,
    onRefresh,
    onEndReached,
    onListScroll,
    onListScrollEnd,
    retryFailedLoads,
    openAddTransaction,
    backToThisMonth,
    requestDelete,
    confirmDelete,
    cancelDelete,
  } = t;

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<Transaction, TransactionSection> }) => (
      <DayHeader section={section} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item, index, section }: SectionListRenderItemInfo<Transaction, TransactionSection>) => {
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      return (
        <DayCardRow isFirst={isFirst} isLast={isLast}>
          <TransactionRow
            tx={item}
            account={state.accountsById.get(item.account_id)}
            toAccount={item.to_account_id ? state.accountsById.get(item.to_account_id) : undefined}
            category={item.category_id ? state.categoriesById.get(item.category_id) : undefined}
            onPress={goToDetail}
            onEdit={goToEdit}
            onDelete={requestDelete}
            showSeparator={!isLast}
            swipeContainerStyle={resolveDayCardSwipeCorners(isFirst, isLast)}
          />
        </DayCardRow>
      );
    },
    [goToDetail, goToEdit, requestDelete, state.accountsById, state.categoriesById],
  );

  const showRowsSkeleton = state.showInitialSkeleton;
  const listSections = state.sections;

  // A memoised element lets React skip the hero when the header re-renders on a keystroke (M25).
  const hero = useMemo(() => <TransactionsHero model={state.hero} />, [state.hero]);
  const tally = useMemo(
    () => <SearchTally model={state.tally} testID="transactions-search-tally" />,
    [state.tally],
  );
  const accountChips = useMemo(
    () => (
      <AccountChips
        chips={state.accountChips}
        onToggle={toggleAccountChip}
        testID="transactions-account-chips"
      />
    ),
    [state.accountChips, toggleAccountChip],
  );

  const listHeaderComponent = useMemo(
    () => (
      <View testID="transactions-list-header">
        {hero}
        {accountChips}
        <SearchRow
          value={state.searchQuery}
          onChange={setSearchQuery}
          onOpenFilter={openFilter}
          activeFilterCount={state.activeFilterCount}
          isDisabled={state.searchDisabled}
        />
        {tally}
      </View>
    ),
    [
      accountChips,
      hero,
      openFilter,
      setSearchQuery,
      state.activeFilterCount,
      state.searchDisabled,
      state.searchQuery,
      tally,
    ],
  );

  const listEmptyComponent = useMemo(
    () =>
      showRowsSkeleton ? (
        <TransactionRowsSkeleton dayCards={SKELETON_DAY_CARDS} rows={SKELETON_ROWS_PER_CARD} />
      ) : state.showFirstLoadError ? (
        <TransactionLoadError variant="initial" onRetry={() => void retryFailedLoads()} />
      ) : state.emptyVariant === 'noData' ? (
        <EmptyState variant="transactions" onAction={openAddTransaction} />
      ) : state.emptyVariant === 'emptyMonth' ? (
        <EmptyState
          variant="transactionsMonth"
          monthName={state.emptyMonthName}
          showsBackLink={state.showsBackToThisMonth}
          onAction={backToThisMonth}
        />
      ) : state.emptyVariant === 'noResults' ? (
        <EmptyState variant="filtered" onAction={resetFilters} />
      ) : null,
    [
      backToThisMonth,
      openAddTransaction,
      resetFilters,
      retryFailedLoads,
      showRowsSkeleton,
      state.emptyMonthName,
      state.emptyVariant,
      state.showFirstLoadError,
      state.showsBackToThisMonth,
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
          <Typography.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.transactions}
          </Typography.Heading>
        </View>
      </Surface>
      <Separator />

      <ListRail
        testID="transactions-rail"
        selectedMonth={state.selectedMonth}
        onSelectedMonthChange={setSelectedMonth}
        selectedFilter={state.activeFilter}
        onSelectedFilterChange={setActiveFilter}
        filters={TRANSACTION_FILTERS}
        accessibilityLabel={Strings.transactionTypeFilterAccessibility}
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

      <TxDeleteDialog
        isOpen={state.pendingDeleteId !== null}
        body={state.deleteBody}
        busy={state.deleteBusy}
        errorMessage={state.deleteErrorMessage}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />
      <FilterSheet />
    </Screen>
  );
}
