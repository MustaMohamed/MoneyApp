import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, PressableFeedback, Skeleton } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { BudgetDashboardSummaryVM } from '@/modules/budget/screens/budget/budget.helpers';
import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';
import { formatAmount } from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

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
  return (
    <>
      <View
        testID="dashboard-budget-skeleton-values-row"
        style={{ flexDirection: 'row', gap: ms(8), minHeight: VALUE_ROW_HEIGHT }}
      >
        {[0, 1, 2].map((item) => (
          <View key={item} style={{ flex: 1, gap: ms(4) }}>
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="w-16 rounded-md"
              style={{ height: ms(8) }}
            />
            <Skeleton
              animation={DASHBOARD_SKELETON_ANIMATION}
              className="w-20 rounded-md"
              style={{ height: ms(14) }}
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
        style={{ height: META_ROW_HEIGHT }}
      />
    </>
  );
}

export function BudgetCard({ summary, yearMonth, isLoading, onPress }: Props) {
  const monthLabel = formatMonthYear(yearMonth);
  const progressPct = Math.round(summary.pct * 100);
  const bandColor = budgetBandColor(summary.pct);

  return (
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.budgetTitle}
    >
      <Card
        testID="dashboard-budget-card"
        className="border-border mx-4 mt-4 rounded-2xl border p-0 px-3 py-2"
        style={{
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
            <View style={{ flexDirection: 'row', gap: ms(8), minHeight: VALUE_ROW_HEIGHT }}>
              <Figure
                label={Strings.budgetSummaryBudgeted}
                value={formatAmount(summary.budgeted)}
              />
              <Figure label={Strings.budgetSummarySpent} value={formatAmount(summary.spent)} />
              <Figure
                label={Strings.budgetSummaryLeft}
                value={formatAmount(summary.left)}
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
              <Text className="font-inter-semibold text-muted text-[11px]">
                {Strings.budgetCategoryCountLabel(summary.categoryCount)}
              </Text>
              <Text className="font-sora-bold text-[11px]" style={{ color: bandColor }}>
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
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text className="font-inter-semibold text-muted text-[10px] uppercase">{label}</Text>
      <Text className={`font-sora-bold text-[14px] ${valueClassName}`} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
