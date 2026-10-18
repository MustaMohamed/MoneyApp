import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { BackButton } from '@/components/ui/back_button';
import { Button } from '@/components/ui/button';
import { HeaderIconAction } from '@/components/ui/header_icon_action';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import {
  Colors,
  FontFamily,
  Radius,
  Size,
  Spacing,
  Type,
  lineHeightFor,
  withAlpha,
} from '@/constants/theme';
import { useCategoryDetail } from '@/modules/budget/screens/budget/category_detail/category_detail.hook';
import { CategoryDetailSkeleton } from '@/modules/budget/screens/budget/category_detail/components/category_detail_skeleton';
import { CategoryDetailTitle } from '@/modules/budget/screens/budget/category_detail/components/category_detail_title';
import { LiveMonthCard } from '@/modules/budget/screens/budget/category_detail/components/live_month_card';
import { MonthLedger } from '@/modules/budget/screens/budget/category_detail/components/month_ledger';
import { MonthlyResultChart } from '@/modules/budget/screens/budget/category_detail/components/monthly_result_chart';
import { StatTiles } from '@/modules/budget/screens/budget/category_detail/components/stat_tiles';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export default function CategoryBudgetDetailScreen() {
  const { state, goBack, editBudget, retry } = useCategoryDetail();

  if (!state.hasLoaded) {
    return (
      <Screen>
        {state.loadError ? (
          <>
            <View className="px-4 py-2">
              <BackButton onPress={goBack} />
            </View>
            <View className="flex-1 items-center justify-center gap-3 px-6">
              <Text className="font-inter text-muted text-center">{Strings.budgetLoadError}</Text>
              <Button
                variant="secondary"
                size="sm"
                label={Strings.budgetLoadRetry}
                accessibilityLabel={Strings.budgetLoadRetry}
                onPress={retry}
              />
            </View>
          </>
        ) : (
          <CategoryDetailSkeleton onBack={goBack} />
        )}
      </Screen>
    );
  }

  return (
    <Screen>
      <View style={styles.header}>
        <BackButton onPress={goBack} />
        <View style={[styles.icon, { backgroundColor: withAlpha(state.color, '22') }]}>
          <MaterialCommunityIcons
            name={toIconName(state.icon, 'tag-outline')}
            size={ms(16)}
            color={state.color}
          />
        </View>
        <CategoryDetailTitle name={state.name} />
        {state.liveMonth && state.canEditLiveBudget && (
          <HeaderIconAction
            icon="pencil"
            iconSize={Size.iconBack}
            iconColor={Colors.dark.gold}
            accessibilityLabel={Strings.budgetEditTitle}
            onPress={editBudget}
          />
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
            {/* One month renders as a single full-width bar that reads as an empty box. */}
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
  content: { paddingHorizontal: Spacing.md, paddingBottom: ms(96) },
  section: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    lineHeight: lineHeightFor(Type.micro),
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
});
