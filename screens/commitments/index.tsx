import { RefreshControl, SectionList } from 'react-native';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import { DateHeader } from '@/screens/transactions/components/date_header';

import { useCommitments } from './commitments.hook';
import { CommitmentHeader } from './components/commitment_header';
import { CommitmentRow } from './components/commitment_row';
import { CommitmentsEmptyState } from './components/empty_state';
import { MonthNavigator } from './components/month_navigator';
import { StatusFilterChips } from './components/status_filter_chips';
import { SummaryHeader } from './components/summary_header';

export default function CommitmentsScreen() {
  const t = useCommitments();

  return (
    <Screen edges={['top']}>
      <CommitmentHeader title={Strings.commitmentsTitle} />

      {!t.state.hasCommitments ? (
        <CommitmentsEmptyState onAdd={t.goToAdd} />
      ) : (
        <SectionList
          sections={t.state.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
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
            t.state.statusFilter === 'all' ? (
              <EmptyState variant="commitmentsMonth" />
            ) : (
              <EmptyState variant="filtered" onAction={() => t.setStatusFilter('all')} />
            )
          }
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}
        />
      )}
    </Screen>
  );
}
