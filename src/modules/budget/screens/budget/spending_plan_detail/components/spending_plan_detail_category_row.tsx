import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import {
  resolveOneLineTextProps,
  resolveUncappedLinesAboveOne,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { Size, Type } from '@/constants/theme';
import type { SpendingPlanDetailUnlimitedRowVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanDetailCategoryRowProps {
  row: SpendingPlanDetailUnlimitedRowVM;
}

export function SpendingPlanDetailCategoryRow({ row }: SpendingPlanDetailCategoryRowProps) {
  const { fontScale } = useWindowDimensions();
  const statusLines = resolveUncappedLinesAboveOne(1, fontScale);
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={row.accessibilityLabel}
      className="border-border min-h-[52px] flex-row items-center gap-2 border-b py-1"
    >
      <View className="bg-default h-7 w-7 items-center justify-center rounded-full">
        <MaterialCommunityIcons
          accessible={false}
          name={toIconName(row.icon, 'tag-outline')}
          size={Size.iconXs}
          color={row.color}
        />
      </View>

      <View className="min-w-0 flex-1">
        <Text
          className="font-inter-semibold text-foreground text-[15px]"
          {...resolveOneLineTextProps(scaledTextStyleAboveOne(Type.bodyStrong, fontScale))}
        >
          {row.categoryName}
        </Text>
        <Text
          className="font-inter text-content-secondary mt-px text-[11.5px]"
          numberOfLines={statusLines}
        >
          {row.supportingLabel}
        </Text>
      </View>

      <View className="items-end">
        <Text className="font-sora-semibold text-foreground text-[15px]">{row.amountLabel}</Text>
      </View>
    </View>
  );
}
