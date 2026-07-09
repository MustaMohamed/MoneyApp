import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { formatAmount } from '@/utils/format_amount';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface SpendingPlanCardProps {
  row: SpendingPlanRowVM;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function SpendingPlanCard({ row, onEdit, onDelete }: SpendingPlanCardProps) {
  const bandColor = row.isOver ? Colors.dark.negative : budgetBandColor(row.pct);
  const leftColor = row.left < 0 ? Colors.dark.negative : Colors.dark.positive;

  return (
    <PressableFeedback
      accessibilityRole="button"
      accessibilityLabel={row.name}
      onPress={() => onEdit(row.id)}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text style={styles.title} numberOfLines={1}>
            {row.name}
          </Text>
          <Text style={styles.meta}>
            {Strings.budgetPlansDateRange(
              formatShortDate(row.startDate),
              formatShortDate(row.endDate),
            )}
            {' · '}
            {Strings.budgetPlansCategoriesCount(row.categoryCount)}
          </Text>
        </View>
        <View style={styles.amountWrap}>
          <Text style={[styles.amount, { color: leftColor }]}>
            {formatAmount(Math.abs(row.left))}
          </Text>
          <Text style={styles.amountSub}>
            {row.left < 0 ? Strings.budgetPlansOverStatus : Strings.budgetPlansLeftStatus}
          </Text>
        </View>
      </View>

      <View style={styles.chips}>
        {row.categoryChips.slice(0, 4).map((category) => (
          <View key={category.id} style={styles.chip}>
            <MaterialCommunityIcons
              name={toIconName(category.icon, 'tag')}
              size={ms(11)}
              color={category.color}
            />
            <Text style={styles.chipText}>{category.name}</Text>
          </View>
        ))}
      </View>

      <BudgetBar pct={row.pct} status="under" color={bandColor} height={ms(8)} />

      {row.allocationRows.length > 0 ? (
        <View style={styles.allocations}>
          {row.allocationRows.map((allocation) => (
            <View key={allocation.categoryId} style={styles.allocation}>
              <View style={styles.allocationTop}>
                <Text style={styles.allocationName}>{allocation.categoryName}</Text>
                <Text style={[styles.allocationValue, allocation.isOver && styles.negative]}>
                  {formatAmount(allocation.spent)} / {formatAmount(allocation.allocatedAmount)}
                </Text>
              </View>
              <BudgetBar
                pct={allocation.pct}
                status="under"
                color={allocation.isOver ? Colors.dark.negative : budgetBandColor(allocation.pct)}
                height={ms(5)}
              />
            </View>
          ))}
          {row.buffer > 0 ? (
            <Text style={styles.buffer}>
              {Strings.budgetPlansAllocationBuffer(formatAmount(row.buffer))}
            </Text>
          ) : null}
        </View>
      ) : null}

      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={`${Strings.budgetPlansRemoveA11y} ${row.name}`}
        onPress={() => onDelete(row.id)}
        style={styles.deleteButton}
      >
        <MaterialCommunityIcons name="trash-can-outline" size={ms(15)} color={Colors.dark.text2} />
      </PressableFeedback>
    </PressableFeedback>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    backgroundColor: Colors.dark.surface,
    padding: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  titleWrap: { flex: 1 },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  meta: {
    marginTop: ms(3),
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  amountWrap: { alignItems: 'flex-end' },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
  },
  amountSub: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: ms(6),
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderRadius: Radius.full,
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(4),
  },
  chipText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  allocations: {
    marginTop: Spacing.sm,
    gap: Spacing.xs,
  },
  allocation: {
    gap: ms(4),
  },
  allocationTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.sm,
  },
  allocationName: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  allocationValue: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  negative: { color: Colors.dark.negative },
  buffer: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  deleteButton: {
    position: 'absolute',
    right: Spacing.sm,
    bottom: Spacing.sm,
    width: ms(28),
    height: ms(28),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
