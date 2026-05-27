import { Spinner } from 'heroui-native';
import { RefreshControl, SectionList, View } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { closeAllRows } from '@/components/ui/swipeable_row';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import { DateHeader } from '@/modules/transactions/screens/transactions/components/date_header';
import { useConfirmAction } from '@/utils/use_confirm_action.hook';

import { useCommitments } from './commitments.hook';
import { CommitmentDeleteConfirmSheet } from './components/commitment_delete_confirm_sheet';
import { CommitmentHeader } from './components/commitment_header';
import { CommitmentRow } from './components/commitment_row';
import { CommitmentsEmptyState } from './components/empty_state';
import { MonthNavigator } from './components/month_navigator';
import { StatusFilterChips } from './components/status_filter_chips';
import { SummaryHeader } from './components/summary_header';
import { SkipConfirmSheet } from './detail/components/skip_confirm_sheet';

export default function CommitmentsScreen() {
  const t = useCommitments();

  // Delete (deactivate) gate — payload is commitment id (soft-delete, history preserved)
  const {
    pendingPayload: pendingDeleteId,
    busy: deleteBusy,
    request: requestDelete,
    confirm: confirmDelete,
    cancel: cancelDelete,
  } = useConfirmAction<string>((id) => t.deactivateCommitment(id));

  // Skip gate — payload is payment id
  const {
    pendingPayload: pendingSkipId,
    busy: _skipBusy,
    request: requestSkip,
    confirm: confirmSkip,
    cancel: cancelSkip,
  } = useConfirmAction<string>((id) => t.skipPayment(id));

  return (
    <Screen edges={['top']}>
      <CommitmentHeader title={Strings.commitmentsTitle} />

      {!t.state.commitmentsLoaded ? (
        <View className="items-center justify-center py-12">
          <Spinner />
        </View>
      ) : !t.state.hasCommitments ? (
        <CommitmentsEmptyState onAdd={t.goToAdd} />
      ) : (
        <SectionList
          sections={t.state.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          onScrollBeginDrag={closeAllRows}
          renderSectionHeader={({ section }) => <DateHeader label={section.title} />}
          renderItem={({ item }) => {
            const commitment = t.state.commitmentsById.get(item.commitment_id);
            const category = commitment
              ? t.state.categoriesById.get(commitment.category_id)
              : undefined;
            return (
              <CommitmentRow
                payment={item}
                commitment={commitment}
                category={category}
                onPress={() => t.goToDetail(item.id)}
                onSkip={() => requestSkip(item.id)}
                onEdit={() => t.goToEdit(commitment?.id)}
                onDelete={() => {
                  if (commitment?.id) requestDelete(commitment.id);
                }}
              />
            );
          }}
          ListHeaderComponent={
            <>
              <MonthNavigator
                yearMonth={t.state.selectedMonth}
                onPrev={() => t.navigateMonth('prev')}
                onNext={() => t.navigateMonth('next')}
              />
              <SummaryHeader counts={t.state.counts} totalsByCurrency={t.state.totalsByCurrency} />
              <StatusFilterChips active={t.state.statusFilter} onChange={t.setStatusFilter} />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={t.state.refreshing}
              onRefresh={() => void t.onRefresh()}
              tintColor={GoldTokens[500]}
            />
          }
          ListEmptyComponent={
            !t.state.paymentsLoaded ? (
              <View className="items-center justify-center py-12">
                <Spinner />
              </View>
            ) : t.state.statusFilter === 'all' ? (
              <EmptyState variant="commitmentsMonth" />
            ) : (
              <EmptyState variant="filtered" onAction={() => t.setStatusFilter('all')} />
            )
          }
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
    </Screen>
  );
}
