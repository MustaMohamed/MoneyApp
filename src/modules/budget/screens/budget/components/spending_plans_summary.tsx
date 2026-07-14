import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Chip } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlansSummaryVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { formatAmount } from '@/utils/format_amount';

interface SpendingPlansSummaryProps {
  summary: SpendingPlansSummaryVM;
}

const BALANCE_SUFFIX_COPY = {
  left: Strings.budgetPlansLeftStatus,
  over: Strings.budgetPlansOverStatus,
} as const;

export function SpendingPlansSummary({ summary }: SpendingPlansSummaryProps) {
  const balanceSuffix = Strings.budgetPlansCardBalanceMeta(
    Strings.currencyEgp,
    BALANCE_SUFFIX_COPY[summary.balanceStatus],
  );
  const usedLabel = Strings.budgetPlansSummaryUsed(summary.usedPercentage);

  return (
    <Card className="bg-surface border-border rounded-xl border p-0 shadow-none">
      <Card.Body className="px-2 py-1.5">
        <Text className="font-inter text-content-secondary text-[13px] font-semibold tracking-[0.3px] uppercase">
          {summary.eyebrowLabel}
        </Text>

        <View className="mt-0.5 flex-row items-center justify-between gap-3">
          <Text
            className="font-sora shrink text-[31px] font-bold"
            style={{ color: summary.balanceColor }}
          >
            {formatAmount(summary.balanceAmount)}
            <Text className="font-inter text-content-secondary text-[13px] font-medium">
              {' '}
              {balanceSuffix}
            </Text>
          </Text>
          {summary.needsAttentionCount > 0 ? (
            <Chip
              accessibilityRole="text"
              size="sm"
              variant="soft"
              color="danger"
              animation="disable-all"
              className="min-h-7 px-2 py-0"
            >
              <Chip.Label className="font-inter text-[13px] font-semibold capitalize">
                {Strings.budgetPlansSummaryAttentionCount(summary.needsAttentionCount)}
              </Chip.Label>
            </Chip>
          ) : null}
        </View>

        <View className="mt-0.5 flex-row items-center justify-between gap-3">
          <View className="flex-row gap-0.5">
            <Text className="font-inter text-foreground shrink text-[15px] font-semibold">
              {formatAmount(summary.spent)}
            </Text>
            <Text className="font-inter text-content-secondary text-[15px]">
              {Strings.budgetPlansSummarySpentOf()}
            </Text>
            <Text className="font-inter text-foreground shrink text-[15px] font-semibold">
              {formatAmount(summary.planned)}
            </Text>
          </View>
          <Text className="font-sora text-content-secondary text-[15px]">{usedLabel}</Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={usedLabel}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: summary.progressPercentage,
          }}
          className="mt-1"
        >
          <BudgetBar
            pct={summary.pct}
            status={summary.barStatus}
            color={summary.barColor}
            height={Size.spendingPlanProgressTrack}
          />
        </View>

        <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
          <SummaryMetric
            label={Strings.budgetPlansSummaryLifecycleLabel}
            value={Strings.budgetPlansSummaryActiveCount(summary.activeCount)}
          />
          <View className="bg-border w-px" />
          <SummaryMetric
            label={Strings.budgetPlansSummaryUpcomingLabel}
            value={Strings.budgetPlansSummaryUpcomingPlansCount(summary.upcomingCount)}
          />
          <View className="bg-border w-px" />
          <SummaryMetric
            value={Strings.budgetPlansSummaryItemized(
              formatAmount(summary.itemizedAmount),
              summary.itemizedPercentage,
            )}
            label={Strings.budgetPlansSummaryItemizedLabel}
          />
        </View>

        <View className="mt-1.5 flex-row flex-wrap">
          {summary.statusItems.map((item) => (
            <View key={item.key} className="w-1/2 flex-row items-center gap-1 py-0.5">
              <MaterialCommunityIcons
                accessible={false}
                name={item.icon}
                size={Size.iconXs}
                color={item.color}
              />
              <Text className="font-inter text-content-secondary text-[13px] font-medium">
                {item.label}
              </Text>
            </View>
          ))}
        </View>
      </Card.Body>
    </Card>
  );
}

function SummaryMetric({ value, label }: { value: string; label?: string }) {
  return (
    <View className="flex-1 items-center justify-center px-1">
      {label ? (
        <Text className="font-inter text-content-secondary text-center text-[11.5px]">{label}</Text>
      ) : null}
      <Text className="font-sora text-foreground mt-px text-center text-[15px] font-semibold">
        {value}
      </Text>
    </View>
  );
}
