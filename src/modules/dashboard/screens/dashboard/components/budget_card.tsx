import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, PressableFeedback, Skeleton } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Text } from '@/components/ui/text';
import {
  resolveFitAmountTextProps,
  resolveLoneWordLines,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Type } from '@/constants/theme';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/utils/budget_summary';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import { formatCurrencyAmount, formatOwnedAmount } from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';
import { wholePercent } from '@/utils/money';
import { ms } from '@/utils/responsive';

import { DASHBOARD_CARD_PADDING } from './dashboard_card.geometry';
import { DASHBOARD_SKELETON_ANIMATION } from './skeleton_animation';

interface Props {
  summary: BudgetDashboardSummaryVM;
  yearMonth: string;
  isLoading: boolean;
  onPress: () => void;
}

const VALUE_ROW_HEIGHT = ms(32);
const PROGRESS_HEIGHT = ms(3);
const META_ROW_HEIGHT = ms(13);

function BudgetCardSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <>
      <View
        testID="dashboard-budget-skeleton-values-row"
        style={{
          flexDirection: 'row',
          gap: ms(8),
          minHeight: resolveSkeletonBarHeight(VALUE_ROW_HEIGHT, fontScale),
        }}
      >
        {[0, 1, 2].map((item) => (
          <View key={item} style={{ flex: 1, gap: ms(4) }}>
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="w-16 rounded-md"
              style={{ height: resolveSkeletonBarHeight(ms(8), fontScale) }}
            />
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="w-20 rounded-md"
              style={{ height: resolveSkeletonBarHeight(ms(14), fontScale) }}
            />
          </View>
        ))}
      </View>
      <Skeleton
        testID="dashboard-budget-skeleton-progress"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-full rounded-[2px]"
        style={{ height: PROGRESS_HEIGHT }}
      />
      <Skeleton
        testID="dashboard-budget-skeleton-meta"
        animation={DASHBOARD_SKELETON_ANIMATION}
        className="w-24 rounded-md"
        style={{ height: resolveSkeletonBarHeight(META_ROW_HEIGHT, fontScale) }}
      />
    </>
  );
}

export function BudgetCard({ summary, yearMonth, isLoading, onPress }: Props) {
  const { fontScale } = useWindowDimensions();
  const metaText = scaledTextStyle(Type.micro, fontScale);
  const monthLabel = formatMonthYear(yearMonth);
  const progressPct = wholePercent(summary.spent, summary.budgeted);
  const bandColor = budgetBandColor(summary.spent, summary.budgeted);
  // `buildDashboardBudgetSummary` snaps `left`; below zero once over budget, an owned amount (#375).
  const leftText = formatOwnedAmount(summary.left, Currency.EGP);

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.budgetTitle}
    >
      <Card
        testID="dashboard-budget-card"
        className="border-border mx-4 mt-4 rounded-2xl border p-0"
        style={{
          ...DASHBOARD_CARD_PADDING,
          gap: ms(8),
          boxShadow: 'none',
        }}
      >
        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
            <View
              className="items-center justify-center rounded-full"
              style={{
                width: ms(22),
                height: ms(22),
                backgroundColor: Colors.dark.goldTint,
              }}
            >
              <MaterialCommunityIcons
                name="chart-pie"
                size={ms(13)}
                color={Colors.shared.cairoGold}
              />
            </View>
            <Text variant="caption" className="font-inter-semibold text-foreground">
              {Strings.budgetTitle}
            </Text>
          </View>
          <Text variant="caption" className="text-muted">
            {monthLabel}
          </Text>
        </View>

        {isLoading ? (
          <BudgetCardSkeleton />
        ) : (
          <>
            {/* Budgets are EGP-only end to end (no currency column); the code is disclosure, not
                conversion (#347). */}
            <View style={{ flexDirection: 'row', gap: ms(8), minHeight: VALUE_ROW_HEIGHT }}>
              <Figure
                fontScale={fontScale}
                label={Strings.budgetSummaryBudgeted}
                value={formatCurrencyAmount(summary.budgeted, Currency.EGP)}
              />
              <Figure
                fontScale={fontScale}
                label={Strings.budgetSummarySpent}
                value={formatCurrencyAmount(summary.spent, Currency.EGP)}
              />
              <Figure
                fontScale={fontScale}
                label={Strings.budgetSummaryLeft}
                value={leftText}
                valueClassName={summary.left < 0 ? 'text-danger' : 'text-success'}
              />
            </View>

            <View
              className="overflow-hidden rounded"
              style={{ height: PROGRESS_HEIGHT, backgroundColor: Colors.dark.surfaceEl }}
            >
              <LinearGradient
                colors={[bandColor, bandColor]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  height: PROGRESS_HEIGHT,
                  width: `${Math.min(100, progressPct)}%`,
                  borderRadius: ms(2),
                }}
              />
            </View>

            <View
              style={{
                minHeight: META_ROW_HEIGHT,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Text
                allowFontScaling={false}
                className="font-inter-semibold text-muted"
                style={metaText}
              >
                {Strings.budgetCategoryCountLabel(summary.categoryCount)}
              </Text>
              <Text
                allowFontScaling={false}
                className="font-sora-bold"
                style={{ ...metaText, color: bandColor }}
              >
                {`${progressPct}% ${Strings.budgetUsedSuffix}`}
              </Text>
            </View>
          </>
        )}
      </Card>
    </PressableFeedback>
  );
}

function Figure({
  label,
  value,
  valueClassName = 'text-foreground',
  fontScale,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  fontScale: number;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text
        allowFontScaling={false}
        numberOfLines={resolveLoneWordLines(label, 2, fontScale)}
        style={scaledTextStyle(Type.pillLabel, fontScale)}
        className="font-inter-semibold text-muted uppercase"
      >
        {label}
      </Text>
      <Text
        {...resolveFitAmountTextProps(Type.body, fontScale)}
        className={`font-sora-bold ${valueClassName}`}
      >
        {value}
      </Text>
    </View>
  );
}
