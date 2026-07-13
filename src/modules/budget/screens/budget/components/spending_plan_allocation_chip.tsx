import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanCardAllocationChipVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
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
      style={styles.chip}
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
      <Text style={[styles.value, { color: allocation.bandColor }]} numberOfLines={1}>
        {allocation.amountLabel}
      </Text>
      <Text style={[styles.pct, { color: allocation.bandColor }]}>
        {allocation.percentageLabel}
      </Text>
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: Size.compactChipHeight,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingLeft: Spacing.xxxs,
    paddingRight: Spacing.xxs,
    paddingVertical: 0,
  },
  value: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.chip,
  },
  pct: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.surfaceEl,
    paddingHorizontal: Spacing.xxxs,
    paddingVertical: Size.hairline,
    fontFamily: FontFamily.interSemi,
    fontSize: Type.chipMeta,
  },
});
