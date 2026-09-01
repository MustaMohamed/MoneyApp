import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Chip } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Size, Spacing } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanDetailVM } from '@/modules/budget/screens/budget/spending_plans.types';

interface SpendingPlanDetailSummaryProps {
  detail: SpendingPlanDetailVM;
}

export function SpendingPlanDetailSummary({ detail }: SpendingPlanDetailSummaryProps) {
  return (
    <Card
      className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0"
      style={{ boxShadow: 'none' }}
    >
      <Card.Body className="px-2 py-1.5">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <View
              accessible
              accessibilityRole="text"
              accessibilityLabel={detail.balanceAccessibilityLabel}
            >
              <Text className="font-sora-bold text-[31px]" style={{ color: detail.balanceColor }}>
                {detail.balanceAmountLabel}
                <Text className="font-inter-medium text-content-secondary text-[13px]">
                  {' '}
                  {detail.balanceMetaLabel}
                </Text>
              </Text>
            </View>
            <Text className="font-inter-medium text-content-secondary mt-px text-[13px]">
              {detail.dateLabel}
            </Text>
          </View>
          <Chip
            size="sm"
            variant="soft"
            color={detail.statusTone}
            animation="disable-all"
            accessibilityRole="text"
            accessibilityLabel={detail.statusLabel}
            className="min-h-6 px-2 py-0"
          >
            <Chip.Label className="font-inter-semibold text-[11.5px] capitalize">
              {detail.statusLabel}
            </Chip.Label>
          </Chip>
        </View>

        <View className="mt-1 flex-row items-center justify-between gap-3">
          <Text className="font-inter-medium text-foreground text-[14px]">{detail.spentLabel}</Text>
          <Text className="font-inter-semibold text-content-secondary text-[13px]">
            {detail.percentageLabel}
          </Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={detail.percentageLabel}
          accessibilityValue={{ min: 0, max: 100, now: detail.progressPercentage }}
          className="relative mt-1 justify-center"
        >
          <BudgetBar
            pct={detail.pct}
            status={detail.progressStatus}
            color={detail.progressColor}
            height={Size.spendingPlanProgressTrack}
          />
          {detail.elapsedMarkerPercentage !== undefined &&
          detail.elapsedMarkerColor !== undefined ? (
            <View
              accessibilityElementsHidden
              importantForAccessibility="no-hide-descendants"
              pointerEvents="none"
              className="absolute -top-0.5 h-3 w-0.5 rounded-lg"
              style={{
                left: `${detail.elapsedMarkerPercentage}%`,
                backgroundColor: detail.elapsedMarkerColor,
                transform: [{ translateX: -Spacing.xxxs }],
              }}
            />
          ) : null}
        </View>

        <View className="border-border mt-1.5 flex-row items-stretch border-t pt-1">
          {detail.metrics.map((metric, index) => (
            <React.Fragment key={metric.label}>
              {index > 0 ? <View className="bg-border w-px" /> : null}
              <View className="flex-1 items-center px-0.5">
                <Text className="font-inter text-content-secondary text-center text-[11.5px]">
                  {metric.label}
                </Text>
                <Text className="font-sora-semibold text-foreground mt-px text-center text-[15px]">
                  {metric.value}
                </Text>
              </View>
            </React.Fragment>
          ))}
        </View>

        {detail.insights.length > 0 ? (
          <View className="border-border mt-1.5 flex-row gap-1 border-t pt-1">
            {detail.insights.map((insight) => (
              <View
                key={insight.key}
                className="bg-default min-h-8 flex-1 flex-row items-center gap-1 rounded-lg px-2 py-0.5"
              >
                <MaterialCommunityIcons
                  accessible={false}
                  name={insight.icon}
                  size={Size.iconXs}
                  color={insight.color}
                />
                <Text
                  className="font-inter-medium text-content-secondary flex-1 text-[13px]"
                  numberOfLines={2}
                >
                  {insight.label}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </Card.Body>
    </Card>
  );
}
