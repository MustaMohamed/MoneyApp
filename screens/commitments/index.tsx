import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { Strings } from '@/constants/strings';

import { useCommitments } from './commitments.hook';
import { CommitmentRow } from './components/commitment_row';
import { MonthNavigator } from './components/month_navigator';
import { SummaryHeader } from './components/summary_header';
import { CommitmentsEmptyState } from './components/empty_state';
import { DateHeader } from '@/screens/transactions/components/date_header';

export default function CommitmentsScreen() {
  const t = useCommitments();

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.commitmentsTitle}</Text>
      </View>

      {t.state.isEmpty ? (
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
              <SummaryHeader
                paidCount={t.state.paidCount}
                totalCount={t.state.totalCount}
                totalCommitted={t.state.totalCommitted}
                currency={t.state.currency}
              />
            </>
          }
          refreshControl={
            <RefreshControl
              refreshing={t.state.refreshing}
              onRefresh={t.onRefresh}
              tintColor={Colors.shared.cairoGold}
            />
          }
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={t.goToAdd}
      >
        <MaterialCommunityIcons name="plus" size={ms(28)} color={Colors.shared.midnightBlue} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  listContent: { flexGrow: 1, paddingBottom: Spacing.xxl + ms(56) },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.md,
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
});
