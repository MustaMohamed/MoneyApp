import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';
import { LiveMonthCard } from '@/modules/budget/screens/budget/category_detail/components/live_month_card';
import { MonthLedger } from '@/modules/budget/screens/budget/category_detail/components/month_ledger';
import { MonthlyResultChart } from '@/modules/budget/screens/budget/category_detail/components/monthly_result_chart';
import { StatTiles } from '@/modules/budget/screens/budget/category_detail/components/stat_tiles';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export default function CategoryBudgetDetailScreen() {
  const { state, goBack, editBudget } = useCategoryDetail();

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
        <View style={[styles.icon, { backgroundColor: `${state.color}22` }]}>
          <MaterialCommunityIcons
            name={toIconName(state.icon, 'tag-outline')}
            size={ms(16)}
            color={state.color}
          />
        </View>
        <Text style={styles.title}>{state.name}</Text>
        {state.liveMonth && (
          <PressableFeedback
            onPress={editBudget}
            hitSlop={ms(8)}
            accessibilityRole="button"
            accessibilityLabel={Strings.budgetEditTitle}
            style={styles.editBtn}
          >
            <MaterialCommunityIcons name="pencil" size={ms(20)} color={Colors.dark.gold} />
          </PressableFeedback>
        )}
      </View>

      <ScreenScroll contentContainerStyle={styles.content}>
        {state.liveMonth && (
          <LiveMonthCard result={state.liveMonth} daysLeft={state.daysLeft} color={state.color} />
        )}
        {state.history.monthsTotal > 0 && (
          <>
            <StatTiles history={state.history} />
            <Text style={styles.section}>{Strings.budgetDetailMonthlyResult}</Text>
            {/* The bar chart is a trend — only meaningful with ≥2 months. With a
                single (in-progress) month it renders as one full-width bar that
                reads as a confusing empty box, so show just the ledger row. */}
            {state.history.monthsTotal >= 2 && (
              <>
                <MonthlyResultChart results={state.history.results} />
                <View style={{ height: Spacing.sm }} />
              </>
            )}
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
  title: {
    flex: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  editBtn: { padding: ms(4) },
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
