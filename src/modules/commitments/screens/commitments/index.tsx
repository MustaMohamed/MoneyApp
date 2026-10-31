import { Separator, Surface, Typography } from 'heroui-native';
import { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

import { AccountChips } from '@/components/ui/account_chips';
import { DayCardRow } from '@/components/ui/day_card_row';
import { resolveDayCardSwipeCorners } from '@/components/ui/day_card_row.helpers';
import { DayHeader } from '@/components/ui/day_header';
import { EmptyState } from '@/components/ui/empty_state';
import { ErrorState } from '@/components/ui/error_state';
import { LIST_RAIL_ALL_OPTION, ListRail } from '@/components/ui/list_rail';
import { LoadErrorAlert } from '@/components/ui/load_error_alert';
import { TAB_FLOATING_ALERT_PROPS } from '@/components/ui/load_error_alert.geometry';
import { Screen } from '@/components/ui/screen';
import { SearchTally } from '@/components/ui/search_tally';
import type { SegmentFilterOption } from '@/components/ui/segment_filter';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import { resolveCommitmentRowAccountId } from '@/modules/commitments/domain/payment_state';
import type { CommitmentMonthPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import {
  STATUS_COLORS,
  STATUS_ICONS,
  STATUS_LABELS,
} from '@/modules/commitments/utils/commitment_status';

import { SECTION_ORDER, type CommitmentsSection } from './commitments.helpers';
import { useCommitments } from './commitments.hook';
import type { CommitmentStatusFilter } from './commitments.state';
import { CommitmentRow } from './components/commitment_row';
import { CommitmentRowsSkeleton } from './components/commitment_rows_skeleton';
import { CommitmentsHero } from './components/commitments_hero';
import { CommitmentsEmptyState } from './components/empty_state';
import { CommitmentSearchRow } from './components/search_row';
import { PaySheet } from './detail/components/pay_sheet';
import { CommitmentFilterSheet } from './filter';

const COMMITMENT_FILTERS: ReadonlyArray<SegmentFilterOption<CommitmentStatusFilter>> = [
  LIST_RAIL_ALL_OPTION,
  ...SECTION_ORDER.map((status) => ({
    value: status,
    label: STATUS_LABELS[status],
    icon: { name: STATUS_ICONS[status], color: STATUS_COLORS[status] },
  })),
];

export default function CommitmentsScreen() {
  const t = useCommitments();
  const {
    state,
    selectMonth,
    onRefresh,
    retryLoad,
    retryAccountLookup,
    goToDetail,
    goToAdd,
    payRow,
    skipRow,
    setStatusFilter,
    setSearchQuery,
    openFilter,
    toggleAccountChip,
    resetFilters,
  } = t;

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<CommitmentMonthPayment, CommitmentsSection> }) => (
      <DayHeader section={section} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({
      item,
      index,
      section,
    }: SectionListRenderItemInfo<CommitmentMonthPayment, CommitmentsSection>) => {
      if (state.today === undefined) return null;
      const commitment = state.commitmentsById.get(item.commitment_id);
      const category = commitment ? state.categoriesById.get(commitment.category_id) : undefined;
      const accountId = resolveCommitmentRowAccountId(item, commitment);
      const isFirst = index === 0;
      const isLast = index === section.data.length - 1;
      return (
        <DayCardRow isFirst={isFirst} isLast={isLast} tone={section.tone}>
          <CommitmentRow
            payment={item}
            today={state.today}
            liveRate={state.liveRate}
            commitment={commitment}
            category={category}
            account={accountId === undefined ? undefined : state.accountsById.get(accountId)}
            onPress={goToDetail}
            onPay={payRow}
            onSkip={skipRow}
            showSeparator={!isLast}
            swipeContainerStyle={resolveDayCardSwipeCorners(isFirst, isLast)}
          />
        </DayCardRow>
      );
    },
    [
      goToDetail,
      payRow,
      skipRow,
      state.accountsById,
      state.categoriesById,
      state.commitmentsById,
      state.liveRate,
      state.today,
    ],
  );

  // Memoised elements let React skip the hero and the chips when the header re-renders on a keystroke.
  const hero = useMemo(() => <CommitmentsHero model={state.hero} />, [state.hero]);
  const accountChips = useMemo(
    () => (
      <AccountChips
        chips={state.accountChips}
        onToggle={toggleAccountChip}
        testID="commitments-account-chips"
      />
    ),
    [state.accountChips, toggleAccountChip],
  );
  const tally = useMemo(
    () => <SearchTally model={state.tally} testID="commitments-search-tally" />,
    [state.tally],
  );

  const listHeaderComponent = useMemo(
    () => (
      <View testID="commitments-list-header">
        {hero}
        {accountChips}
        <CommitmentSearchRow
          value={state.searchQuery}
          onChange={setSearchQuery}
          onOpenFilter={openFilter}
          activeFilterCount={state.activeFilterCount}
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
      state.searchQuery,
      tally,
    ],
  );

  const listEmptyComponent = useMemo(
    () =>
      state.presentation === 'coldLoading' ? (
        <CommitmentRowsSkeleton />
      ) : state.emptyVariant === 'emptyMonth' ? (
        <EmptyState variant="commitmentsMonth" monthName={state.emptyMonthName} />
      ) : state.emptyVariant === 'noResults' ? (
        <EmptyState variant="filtered" onAction={resetFilters} />
      ) : null,
    [resetFilters, state.emptyMonthName, state.emptyVariant, state.presentation],
  );

  const handleSelectedMonthChange = useCallback(
    (month: string) => void selectMonth(month),
    [selectMonth],
  );
  const handleRefresh = useCallback(() => void onRefresh(), [onRefresh]);

  return (
    <Screen edges={['top']}>
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View style={{ minHeight: Size.headerHeight, justifyContent: 'center' }}>
          <Typography.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.commitmentsTitle}
          </Typography.Heading>
        </View>
      </Surface>
      <Separator />
      <ListRail
        testID="commitments-rail"
        selectedMonth={state.selectedMonth}
        onSelectedMonthChange={handleSelectedMonthChange}
        selectedFilter={state.statusFilter}
        onSelectedFilterChange={setStatusFilter}
        filters={COMMITMENT_FILTERS}
        accessibilityLabel={Strings.commitmentStatusFilterAccessibility}
      />

      {state.floatingAlert === 'list' ? (
        <LoadErrorAlert
          {...TAB_FLOATING_ALERT_PROPS}
          title={Strings.commitmentsRefreshError}
          retryLabel={Strings.commitmentsLoadRetry}
          onRetry={() => void retryLoad()}
          testID="commitments-load-error"
        />
      ) : null}

      {state.floatingAlert === 'accounts' ? (
        <LoadErrorAlert
          {...TAB_FLOATING_ALERT_PROPS}
          title={Strings.transactionsAccountLookupError}
          retryLabel={Strings.transactionsLoadRetry}
          onRetry={() => void retryAccountLookup()}
          testID="commitments-account-lookup-error"
        />
      ) : null}

      {state.presentation === 'coldError' ? (
        <ErrorState
          edges={[]}
          flat
          clearsFab
          iconName="alert-circle-outline"
          title={Strings.commitmentsLoadError}
          description={Strings.commitmentsLoadErrorDescription}
          actionLabel={Strings.commitmentsLoadRetry}
          actionAccessibilityLabel={Strings.commitmentsLoadRetry}
          onAction={() => void retryLoad()}
          testID="commitments-load-error"
        />
      ) : state.emptyVariant === 'noCommitments' ? (
        <CommitmentsEmptyState onAdd={goToAdd} />
      ) : (
        // A kept list holds the sticky offsets of the rows it left, so each commitment mounts its own.
        <SectionList
          key={state.listKey}
          ref={state.listRef}
          sections={state.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          onScrollBeginDrag={closeAllRows}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderItem}
          ListHeaderComponent={listHeaderComponent}
          refreshControl={
            <RefreshControl
              refreshing={state.refreshing}
              onRefresh={handleRefresh}
              tintColor={GoldTokens[500]}
            />
          }
          ListEmptyComponent={listEmptyComponent}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: Size.tabScreenBottomClearance }}
        />
      )}

      <PaySheet
        owner={state.payOwner}
        commitment={state.payTarget?.commitment}
        payment={state.payTarget?.payment}
        today={state.payToday}
      />
      <CommitmentFilterSheet />
    </Screen>
  );
}
