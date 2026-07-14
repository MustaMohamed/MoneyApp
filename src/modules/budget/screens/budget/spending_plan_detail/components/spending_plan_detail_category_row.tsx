import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Size, Spacing } from '@/constants/theme';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanDetailCategoryRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanDetailCategoryRowProps {
  row: SpendingPlanDetailCategoryRowVM;
}

export function SpendingPlanDetailCategoryRow({ row }: SpendingPlanDetailCategoryRowProps) {
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      className="border-border min-h-[46px] flex-row items-center gap-3 border-b py-1"
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
            size={Size.iconMicro}
            color={row.color}
          />
        </BudgetRing>
      ) : (
        <View className="bg-default h-7 w-7 items-center justify-center rounded-full">
          <MaterialCommunityIcons
            accessible={false}
            name={toIconName(row.icon, 'tag-outline')}
            size={Size.iconMicro}
            color={row.color}
          />
        </View>
      )}

      <View className="min-w-0 flex-1">
        <Text className="font-inter text-foreground text-[12px] font-semibold" numberOfLines={1}>
          {row.categoryName}
        </Text>
        <Text
          className="font-inter text-content-secondary mt-0.5 text-[7.5px]"
          style={row.kind === 'allocated' ? { color: row.progressColor } : undefined}
          numberOfLines={1}
        >
          {row.supportingLabel}
        </Text>
      </View>

      <View className="items-end">
        <Text className="font-sora text-foreground text-[11px] font-semibold">
          {row.amountLabel}
        </Text>
        {row.kind === 'allocated' ? (
          <Text
            className="font-inter text-content-secondary mt-0.5 text-[7.5px] font-medium"
            style={{ color: row.balanceColor }}
          >
            {row.balanceLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
