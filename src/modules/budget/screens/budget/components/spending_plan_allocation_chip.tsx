import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Size, Spacing } from '@/constants/theme';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanCardAllocationChipVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanAllocationChipProps {
  allocation: SpendingPlanCardAllocationChipVM;
}

export function SpendingPlanAllocationChip({
  allocation,
}: SpendingPlanAllocationChipProps): React.ReactElement {
  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      accessibilityRole="text"
      accessibilityLabel={allocation.accessibilityLabel}
      className="bg-background min-h-[25px] max-w-full flex-row items-center gap-0.5 rounded-full py-0 pr-1 pl-0.5"
    >
      <BudgetRing
        pct={allocation.pct}
        color={allocation.bandColor}
        size={Size.checkCircle}
        stroke={Spacing.xxxs}
      >
        <MaterialCommunityIcons
          name={toIconName(allocation.icon, 'tag-outline')}
          size={Size.iconMicro}
          color={allocation.color}
        />
      </BudgetRing>
      <View
        testID={`spending-plan-allocation-chip-copy:${allocation.categoryId}`}
        className="items-start"
      >
        <Text className="font-inter text-foreground text-[9px] font-semibold" numberOfLines={1}>
          {allocation.amountLabel}
        </Text>
        <Text className="font-inter text-muted mt-px text-[7.5px] font-semibold">
          {allocation.percentageLabel}
        </Text>
      </View>
    </Chip>
  );
}
