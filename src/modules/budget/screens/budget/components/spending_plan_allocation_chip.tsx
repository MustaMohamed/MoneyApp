import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
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
      <View
        testID={`spending-plan-allocation-chip-copy:${allocation.categoryId}`}
        style={styles.copy}
      >
        <Text style={styles.value} numberOfLines={1}>
          {allocation.amountLabel}
        </Text>
        <Text style={styles.pct}>{allocation.percentageLabel}</Text>
      </View>
    </Chip>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: Size.spendingPlanChipHeight,
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxxs,
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingLeft: Spacing.xxxs,
    paddingRight: Spacing.xxs,
    paddingVertical: 0,
  },
  copy: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  value: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.chip,
    color: Colors.dark.text1,
  },
  pct: {
    marginTop: Size.hairline,
    fontFamily: FontFamily.interSemi,
    fontSize: Type.chipMeta,
    color: Colors.dark.text2,
  },
});
