import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius } from '@/constants/theme';
import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import type { SpendingPlanAllocationRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms, msFont } from '@/utils/responsive';

interface SpendingPlanAllocationChipProps {
  allocation: SpendingPlanAllocationRowVM;
}

export function SpendingPlanAllocationChip({
  allocation,
}: SpendingPlanAllocationChipProps): React.ReactElement {
  const chipColor = allocation.isOver ? Colors.dark.negative : budgetBandColor(allocation.pct);
  const pctText = `${Math.round(allocation.pct * 100)}%`;
  const amountText = `${formatAmount(allocation.spent)}/${formatAmount(allocation.allocatedAmount)}`;

  return (
    <Chip
      size="sm"
      variant="secondary"
      color="default"
      animation="disable-all"
      accessibilityLabel={`${allocation.categoryName} ${amountText} ${pctText}`}
      style={styles.chip}
    >
      <BudgetRing pct={allocation.pct} color={chipColor} size={ms(20)} stroke={ms(2)}>
        <MaterialCommunityIcons
          name={toIconName(allocation.icon, 'tag-outline')}
          size={ms(12)}
          color={allocation.color}
        />
      </BudgetRing>
      <View style={styles.copy}>
        <Text style={styles.name} numberOfLines={1}>
          {allocation.categoryName}
        </Text>
        <Text style={[styles.value, { color: chipColor }]} numberOfLines={1}>
          {amountText}
        </Text>
      </View>
      <Text style={[styles.pct, { color: chipColor }]}>{pctText}</Text>
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
  copy: {
    minWidth: 0,
  },
  name: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(10.5),
    color: Colors.dark.text1,
  },
  value: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(7.5),
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
