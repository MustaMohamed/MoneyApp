import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { Strings } from '@/constants/strings';

import { useCommitments } from './commitments.hook';
import { useCommitmentsAnim } from './commitments.anim';
import { CommitmentRow } from './components/commitment_row';
import { MonthNavigator } from './components/month_navigator';
import { SummaryHeader } from './components/summary_header';
import { CommitmentsEmptyState } from './components/empty_state';

export default function CommitmentsScreen() {
  const t = useCommitments();
  const anim = useCommitmentsAnim();
  const animStyle = useAnimatedStyle(() => ({
    opacity: anim.opacity.value,
    transform: [{ translateY: anim.translateY.value }],
  }));

  if (t.state.isEmpty) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.title}>{Strings.commitmentsTitle}</Text>
        </View>
        <CommitmentsEmptyState onAdd={t.goToAdd} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.commitmentsTitle}</Text>
      </View>
      <Animated.View style={[styles.flex, animStyle]}>
        <MonthNavigator
          yearMonth={t.state.selectedMonth}
          onPrev={() => t.navigateMonth('prev')}
          onNext={() => t.navigateMonth('next')}
        />
        <SectionList
          sections={t.state.sections}
          keyExtractor={(item) => item.id}
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
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
          )}
          ListHeaderComponent={
            <SummaryHeader
              paidCount={t.state.paidCount}
              totalCount={t.state.totalCount}
              totalCommitted={t.state.totalCommitted}
              currency={t.state.currency}
            />
          }
          refreshControl={
            <RefreshControl
              refreshing={t.state.refreshing}
              onRefresh={t.onRefresh}
              tintColor={Colors.shared.cairoGold}
            />
          }
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
        />
      </Animated.View>
      {/* FAB */}
      <Pressable onPress={t.goToAdd} style={styles.fabWrap}>
        <LinearGradient colors={[Colors.shared.cairoGold, Colors.dark.gold]} style={styles.fab}>
          <MaterialCommunityIcons name="plus" size={ms(28)} color={Colors.shared.midnightBlue} />
        </LinearGradient>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.dark.bg },
  flex: { flex: 1 },
  header: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.title, color: Colors.dark.text1 },
  sectionHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    backgroundColor: Colors.dark.bg,
  },
  sectionTitle: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  listContent: { paddingBottom: ms(100) },
  fabWrap: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    borderRadius: ms(28),
    overflow: 'hidden',
  },
  fab: {
    width: ms(56),
    height: ms(56),
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: ms(28),
  },
});
