import { Separator, Surface, Text as HeroText } from 'heroui-native';
import { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { FilterRail, type FilterRailOption } from '@/components/ui/filter_rail';
import { Screen } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

import { STATUS_COLORS, STATUS_ICONS, STATUS_LABELS } from './commitment_status';
import { useCommitments } from './commitments.hook';
import type { CommitmentStatusFilter } from './commitments.state';
import { CommitmentDeleteConfirmSheet } from './components/commitment_delete_confirm_sheet';
import { CommitmentRow } from './components/commitment_row';
import { CommitmentRowsSkeleton } from './components/commitment_rows_skeleton';
import { CommitmentsEmptyState } from './components/empty_state';
import { CommitmentSearchRow } from './components/search_row';
import { SummaryHeader } from './components/summary_header';
import { SkipConfirmSheet } from './detail/components/skip_confirm_sheet';
import { CommitmentFilterSheet } from './filter';

type CommitmentSection = { title: string; data: CommitmentPayment[] };

const COMMITMENT_FILTERS: FilterRailOption<CommitmentStatusFilter>[] = [
  {
    value: 'all',
    label: Strings.filterAll,
    icon: { name: 'view-grid', color: Colors.dark.text2 },
  },
  {
    value: CommitmentPaymentStatus.Overdue,
    label: STATUS_LABELS[CommitmentPaymentStatus.Overdue],
    icon: {
      name: STATUS_ICONS[CommitmentPaymentStatus.Overdue],
      color: STATUS_COLORS[CommitmentPaymentStatus.Overdue],
    },
  },
  {
    value: CommitmentPaymentStatus.Due,
    label: STATUS_LABELS[CommitmentPaymentStatus.Due],
    icon: {
      name: STATUS_ICONS[CommitmentPaymentStatus.Due],
      color: STATUS_COLORS[CommitmentPaymentStatus.Due],
    },
  },
  {
    value: CommitmentPaymentStatus.Upcoming,
    label: STATUS_LABELS[CommitmentPaymentStatus.Upcoming],
    icon: {
      name: STATUS_ICONS[CommitmentPaymentStatus.Upcoming],
      color: STATUS_COLORS[CommitmentPaymentStatus.Upcoming],
    },
  },
  {
    value: CommitmentPaymentStatus.Paid,
    label: STATUS_LABELS[CommitmentPaymentStatus.Paid],
    icon: {
      name: STATUS_ICONS[CommitmentPaymentStatus.Paid],
      color: STATUS_COLORS[CommitmentPaymentStatus.Paid],
    },
  },
  {
    value: CommitmentPaymentStatus.Skipped,
    label: STATUS_LABELS[CommitmentPaymentStatus.Skipped],
    icon: {
      name: STATUS_ICONS[CommitmentPaymentStatus.Skipped],
      color: STATUS_COLORS[CommitmentPaymentStatus.Skipped],
    },
  },
];

export default function CommitmentsScreen() {
  const t = useCommitments();
  const {
    state,
    selectMonth,
    onRefresh,
    goToDetail,
    goToAdd,
    goToEdit,
    skipPayment,
    deactivateCommitment,
    setStatusFilter,
    setSearchQuery,
    clearSearch,
    openFilter,
    resetFilters,
  } = t;

  const {
    pendingPayload: pendingDeleteId,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<string>((id) => deactivateCommitment(id));

  const {
    pendingPayload: pendingSkipId,
    busy: _skipBusy,
    request: requestSkip,
    confirm: confirmSkip,
    cancel: cancelSkip,
  } = useConfirmAction<string>((id) => skipPayment(id));

  const requestCommitmentDelete = useCallback(
    (commitmentId: string | undefined) => {
      if (commitmentId) requestDelete(commitmentId);
    },
    [requestDelete],
  );

  const renderSectionHeader = useCallback(
    ({ section }: { section: SectionListData<CommitmentPayment, CommitmentSection> }) => (
      <DateHeader label={section.title} />
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: SectionListRenderItemInfo<CommitmentPayment, CommitmentSection>) => {
      const commitment = state.commitmentsById.get(item.commitment_id);
      const category = commitment ? state.categoriesById.get(commitment.category_id) : undefined;
      return (
        <CommitmentRow
          payment={item}
          commitment={commitment}
          category={category}
          onPress={goToDetail}
          onSkip={requestSkip}
          onEdit={goToEdit}
          onDelete={requestCommitmentDelete}
        />
      );
    },
    [
      goToDetail,
      goToEdit,
      requestCommitmentDelete,
      requestSkip,
      state.categoriesById,
      state.commitmentsById,
    ],
  );

  const listHeaderComponent = useMemo(
    () => (
      <>
        <SummaryHeader
          counts={state.counts}
          totalsByCurrency={state.totalsByCurrency}
          isLoading={!state.paymentsLoaded || state.refreshing}
        />
        <CommitmentSearchRow
          value={state.searchQuery}
          onChange={setSearchQuery}
          onClear={clearSearch}
          onOpenFilter={openFilter}
          activeFilterCount={state.activeFilterCount}
        />
      </>
    ),
    [
      clearSearch,
      openFilter,
      setSearchQuery,
      state.activeFilterCount,
      state.counts,
      state.paymentsLoaded,
      state.refreshing,
      state.searchQuery,
      state.totalsByCurrency,
    ],
  );

  const isRowsLoading = state.refreshing || !state.commitmentsLoaded || !state.paymentsLoaded;
  const listSections = isRowsLoading ? [] : state.sections;

  const listEmptyComponent = useMemo(
    () =>
      isRowsLoading ? (
        <CommitmentRowsSkeleton />
      ) : !state.hasListFilters ? (
        <EmptyState variant="commitmentsMonth" />
      ) : (
        <EmptyState variant="filtered" onAction={resetFilters} />
      ),
    [isRowsLoading, resetFilters, state.hasListFilters],
  );

  const handleRefresh = useCallback(() => void onRefresh(), [onRefresh]);
  const showCommitmentsEmptyState =
    state.commitmentsLoaded && !state.refreshing && !state.hasCommitments;

  return (
    <Screen edges={['top']}>
      <Surface variant="transparent" className="rounded-none px-4 py-0 shadow-none">
        <View style={{ minHeight: Size.headerHeight, justifyContent: 'center' }}>
          <HeroText.Heading type="h3" weight="bold" truncate className="font-sora">
            {Strings.commitmentsTitle}
          </HeroText.Heading>
        </View>
      </Surface>
      <Separator />
      <FilterRail
        selectedMonth={state.selectedMonth}
        onSelectedMonthChange={selectMonth}
        selectedFilter={state.statusFilter}
        onSelectedFilterChange={setStatusFilter}
        filters={COMMITMENT_FILTERS}
        filterAccessibilityLabel="Commitment status filter"
      />

      {showCommitmentsEmptyState ? (
        <CommitmentsEmptyState onAdd={goToAdd} />
      ) : (
        <SectionList
          sections={listSections}
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
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        />
      )}

      <CommitmentDeleteConfirmSheet
        isOpen={pendingDeleteId !== null}
        busy={deleteBusy}
        onCancel={cancelDelete}
        onConfirm={() => {
          void confirmDelete();
        }}
      />

      <SkipConfirmSheet
        isOpen={pendingSkipId !== null}
        onCancel={cancelSkip}
        onConfirm={() => {
          void confirmSkip();
        }}
      />
      <CommitmentFilterSheet />
    </Screen>
  );
}
