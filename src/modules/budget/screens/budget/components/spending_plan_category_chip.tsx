import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Size } from '@/constants/theme';
import type { SpendingPlanCardCategoryChipVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanCategoryChipProps {
  category: SpendingPlanCardCategoryChipVM;
}

export function SpendingPlanCategoryChip({
  category,
}: SpendingPlanCategoryChipProps): React.ReactElement {
  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      accessibilityRole="text"
      accessibilityLabel={category.accessibilityLabel}
      className="bg-background min-h-[25px] max-w-full flex-row items-center rounded-full p-0.5"
    >
      <View className="bg-default h-6.5 w-6.5 items-center justify-center rounded-full">
        <MaterialCommunityIcons
          name={toIconName(category.icon, 'tag-outline')}
          size={Size.iconXs}
          color={category.color}
        />
      </View>
    </Chip>
  );
}
