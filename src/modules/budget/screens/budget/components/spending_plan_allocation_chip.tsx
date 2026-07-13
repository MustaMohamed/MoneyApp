import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius } from '@/constants/theme';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanCardAllocationChipVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { toIconName } from '@/utils/icon_name_guard';
import { ms, msFont } from '@/utils/responsive';

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
      <BudgetRing pct={allocation.pct} color={allocation.bandColor} size={ms(20)} stroke={ms(2)}>
        <MaterialCommunityIcons
          name={toIconName(allocation.icon, 'tag-outline')}
          size={ms(12)}
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
    minHeight: ms(28),
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingLeft: ms(2),
    paddingRight: ms(5),
    paddingVertical: 0,
  },
  value: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(9),
  },
  pct: {
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.surfaceEl,
    paddingHorizontal: ms(2),
    paddingVertical: ms(1),
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(7.5),
  },
});
