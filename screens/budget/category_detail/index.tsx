import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { useCategoryDetail } from '@/screens/budget/category_detail/category_detail.hook';
import { LiveMonthCard } from '@/screens/budget/category_detail/components/live_month_card';
import { MonthLedger } from '@/screens/budget/category_detail/components/month_ledger';
import { MonthlyResultChart } from '@/screens/budget/category_detail/components/monthly_result_chart';
import { StatTiles } from '@/screens/budget/category_detail/components/stat_tiles';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export default function CategoryBudgetDetailScreen() {
  const { state, goBack } = useCategoryDetail();

  return (
    <Screen>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          accessibilityRole="button"
          accessibilityLabel="Back"
          hitSlop={8}
        >
          <MaterialCommunityIcons name="chevron-left" size={ms(28)} color={Colors.dark.text2} />
        </Pressable>
        <View style={[styles.icon, { backgroundColor: `${state.color}22` }]}>
          <MaterialCommunityIcons
            name={toIconName(state.icon, 'tag-outline')}
            size={ms(16)}
            color={state.color}
          />
        </View>
        <Text style={styles.title}>{state.name}</Text>
      </View>

      <ScreenScroll contentContainerStyle={styles.content}>
        {state.liveMonth && <LiveMonthCard result={state.liveMonth} daysLeft={state.daysLeft} />}
        {state.history.monthsTotal > 0 && (
          <>
            <StatTiles history={state.history} />
            <Text style={styles.section}>{Strings.budgetDetailMonthlyResult}</Text>
            <MonthlyResultChart results={state.history.results} />
            <View style={{ height: Spacing.sm }} />
            <MonthLedger results={state.history.results} />
          </>
        )}
      </ScreenScroll>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  icon: {
    width: ms(34),
    height: ms(34),
    borderRadius: Radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: { fontFamily: FontFamily.soraBold, fontSize: Type.title, color: Colors.dark.text1 },
  content: { paddingHorizontal: Spacing.md, paddingBottom: ms(96) },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
