import { Separator, Surface, Typography } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { MonthFilter } from '@/components/ui/month_filter';
import { Screen } from '@/components/ui/screen';
import { SegmentFilter, type SegmentFilterOption } from '@/components/ui/segment_filter';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { ms } from '@/utils/responsive';

import { AccountChips } from './components/account_chips';
import { DayCardRow } from './components/day_card_row';
import { resolveDayCardSwipeCorners } from './components/day_card_row.helpers';
import { DayHeader } from './components/day_header';
import { SearchRow } from './components/search_row';
import { SearchTally } from './components/search_tally';
import { TransactionLoadError } from './components/transaction_load_error';
import { TransactionRow } from './components/transaction_row';
import { TransactionRowsSkeleton } from './components/transaction_rows_skeleton';
import { TransactionsHero } from './components/transactions_hero';
import {
  TRANSACTIONS_RAIL,
  TRANSACTIONS_RAIL_STYLE,
  TRANSACTIONS_RAIL_TABS_STYLE,
} from './components/transactions_rail.geometry';
import { TxDeleteDialog } from './components/tx_delete_dialog';
import { FilterSheet } from './filter';
import { useTransactions } from './transactions.hook';
import type { TransactionSection } from './transactions.hook';
import type { TransactionFilter } from './transactions.store';

const TRANSACTION_FILTERS: ReadonlyArray<SegmentFilterOption<TransactionFilter>> = [
  {
    value: 'all',
    label: Strings.filterAll,
    icon: { name: 'view-grid', color: Colors.dark.text2 },
  },
  {
    value: TransactionType.Income,
    label: Strings.addTxTypeIncome,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.Income],
  },
  {
    value: TransactionType.Expense,
    label: Strings.addTxTypeExpense,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.Expense],
  },
  {
    value: TransactionType.Transfer,
    label: Strings.addTxTypeTransfer,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.Transfer],
  },
  {
    value: TransactionType.CCPayment,
    label: Strings.filterCcPayment,
    icon: TRANSACTION_TYPE_ICONS[TransactionType.CCPayment],
  },
];

const LIST_BOTTOM_CLEARANCE = ms(160);
const SKELETON_DAY_CARDS = 2;
const SKELETON_ROWS_PER_DAY = 3;
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
  const tally = useMemo(() => <SearchTally model={state.tally} />, [state.tally]);
  const accountChips = useMemo(
    () => <AccountChips chips={state.accountChips} onToggle={toggleAccountChip} />,
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
        <TransactionRowsSkeleton dayCards={SKELETON_DAY_CARDS} rows={SKELETON_ROWS_PER_DAY} />
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

      <View testID="transactions-rail" className="px-4" style={TRANSACTIONS_RAIL_STYLE}>
        <MonthFilter
          selectedMonth={state.selectedMonth}
          onSelectedMonthChange={setSelectedMonth}
          rowHitSlop={TRANSACTIONS_RAIL.monthRowHitSlop}
        />
        <View style={TRANSACTIONS_RAIL_TABS_STYLE}>
          <SegmentFilter
            selectedFilter={state.activeFilter}
            onSelectedFilterChange={setActiveFilter}
            filters={TRANSACTION_FILTERS}
            accessibilityLabel={Strings.transactionTypeFilterAccessibility}
            corners="form"
            triggerHitSlop={TRANSACTIONS_RAIL.tabsHitSlop}
          />
        </View>
      </View>

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
