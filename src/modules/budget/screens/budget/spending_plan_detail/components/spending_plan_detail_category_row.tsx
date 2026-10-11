import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  resolveRowStacking,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanDetailCategoryRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanDetailCategoryRowProps {
  row: SpendingPlanDetailCategoryRowVM;
}

export function SpendingPlanDetailCategoryRow({ row }: SpendingPlanDetailCategoryRowProps) {
  const { fontScale } = useWindowDimensions();
  // Above font scale 1 the status line wraps with no cap and the row grows under its minimum height.
  const statusLines = resolveRowStacking(fontScale) === 'stacked' ? undefined : 1;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      className="border-border min-h-[52px] flex-row items-center gap-2 border-b py-1"
    >
      {row.kind === 'allocated' ? (
        <BudgetRing
          pct={row.pct}
          color={row.progressColor}
          size={Size.spendingPlanDetailRing}
          stroke={Spacing.xxxs}
        >
          <MaterialCommunityIcons
            accessible={false}
            name={toIconName(row.icon, 'tag-outline')}
            size={Size.iconXs}
            color={row.color}
          />
        </BudgetRing>
      ) : (
        <View className="bg-default h-7 w-7 items-center justify-center rounded-full">
          <MaterialCommunityIcons
            accessible={false}
            name={toIconName(row.icon, 'tag-outline')}
            size={Size.iconXs}
            color={row.color}
          />
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text
          className="font-inter-semibold text-foreground text-[15px]"
          {...resolveOneLineTextProps(scaledTextStyleAboveOne(Type.bodyStrong, fontScale))}
        >
          {row.categoryName}
        </Text>
        <Text
          className="font-inter text-content-secondary mt-px text-[11.5px]"
          style={row.kind === 'allocated' ? { color: row.progressColor } : undefined}
          numberOfLines={statusLines}
        >
          {row.supportingLabel}
        </Text>
      </View>

      <View className="items-end">
        <Text className="font-sora-semibold text-foreground text-[15px]">{row.amountLabel}</Text>
        {row.kind === 'allocated' ? (
          <Text
            className="font-inter-medium text-content-secondary mt-px text-[11.5px]"
            style={{ color: row.balanceColor }}
          >
            {row.balanceLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
