import { Separator, Spinner, Surface, Text as HeroText } from 'heroui-native';
import { useCallback, useMemo } from 'react';
import { RefreshControl, SectionList, View } from 'react-native';
import type { SectionListData, SectionListRenderItemInfo } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { FilterRail, type FilterRailOption } from '@/components/ui/filter_rail';
import { Screen } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { CommitmentPaymentStatus } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

import { useCommitments } from './commitments.hook';
import type { CommitmentStatusFilter } from './commitments.state';
import { CommitmentDeleteConfirmSheet } from './components/commitment_delete_confirm_sheet';
import { CommitmentRow } from './components/commitment_row';
import { CommitmentsEmptyState } from './components/empty_state';
import { SummaryHeader } from './components/summary_header';
import { SkipConfirmSheet } from './detail/components/skip_confirm_sheet';

type CommitmentSection = { title: string; data: CommitmentPayment[] };

const COMMITMENT_FILTERS: FilterRailOption<CommitmentStatusFilter>[] = [
  { value: 'all', label: Strings.filterAll },
  { value: CommitmentPaymentStatus.Overdue, label: Strings.commitmentsStatusOverdue },
  { value: CommitmentPaymentStatus.Due, label: Strings.commitmentsStatusDue },
  { value: CommitmentPaymentStatus.Upcoming, label: Strings.commitmentsStatusUpcoming },
  { value: CommitmentPaymentStatus.Paid, label: Strings.commitmentsStatusPaid },
  { value: CommitmentPaymentStatus.Skipped, label: Strings.commitmentsStatusSkipped },
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
    () => <SummaryHeader counts={state.counts} totalsByCurrency={state.totalsByCurrency} />,
    [state.counts, state.totalsByCurrency],
  );

  const listEmptyComponent = useMemo(
    () =>
      !state.paymentsLoaded ? (
        <View className="items-center justify-center py-12">
          <Spinner />
        </View>
      ) : state.statusFilter === 'all' ? (
        <EmptyState variant="commitmentsMonth" />
      ) : (
        <EmptyState variant="filtered" onAction={() => setStatusFilter('all')} />
      ),
    [setStatusFilter, state.paymentsLoaded, state.statusFilter],
  );

  const handleRefresh = useCallback(() => void onRefresh(), [onRefresh]);

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

      {!state.commitmentsLoaded ? (
        <View className="items-center justify-center py-12">
          <Spinner />
        </View>
      ) : !state.hasCommitments ? (
        <CommitmentsEmptyState onAdd={goToAdd} />
      ) : (
        <>
          <SectionList
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
            contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
          />
        </>
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
    </Screen>
  );
}
