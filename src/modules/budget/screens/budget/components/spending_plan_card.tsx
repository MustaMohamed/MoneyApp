import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { budgetBandColor } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import { SpendingPlanAllocationChip } from '@/modules/budget/screens/budget/components/spending_plan_allocation_chip';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { formatAmount } from '@/utils/format_amount';
import { formatShortDate } from '@/utils/format_date';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface SpendingPlanCardProps {
  row: SpendingPlanRowVM;
  onOpenDetails: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (plan: { id: string; name: string }) => void;
}

export function SpendingPlanCard({ row, onOpenDetails, onEdit, onDelete }: SpendingPlanCardProps) {
  const bandColor = row.isOver ? Colors.dark.negative : budgetBandColor(row.pct);
  const leftColor = row.left < 0 ? Colors.dark.negative : Colors.dark.positive;
  const showBuffer = row.buffer > 0;
  const allocatedCategoryIds = new Set(
    row.allocationRows.map((allocation) => allocation.categoryId),
  );
  const plainCategoryChips = row.categoryChips.filter(
    (category) => !allocatedCategoryIds.has(category.id),
  );
  const visibleAllocationChips = row.allocationRows.slice(0, 3);
  const visiblePlainChipLimit = Math.max(0, 3 - visibleAllocationChips.length);
  const visiblePlainChips = plainCategoryChips.slice(0, visiblePlainChipLimit);
  const visibleChipCount = visibleAllocationChips.length + visiblePlainChips.length;
  const hiddenChipCount = Math.max(
    0,
    row.allocationRows.length + plainCategoryChips.length - visibleChipCount,
  );

  return (
    <View style={styles.card}>
      <PressableFeedback
        accessibilityRole="button"
        accessibilityLabel={row.name}
        onPress={() => onOpenDetails(row.id)}
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
          {visibleAllocationChips.map((allocation) => (
            <SpendingPlanAllocationChip key={allocation.categoryId} allocation={allocation} />
          ))}
          {visiblePlainChips.map((category) => (
            <View key={category.id} style={styles.chip}>
              <MaterialCommunityIcons
                name={toIconName(category.icon, 'tag')}
                size={ms(11)}
                color={category.color}
              />
              <Text style={styles.chipText}>{category.name}</Text>
            </View>
          ))}
          {hiddenChipCount > 0 ? (
            <View style={styles.chip}>
              <Text style={styles.chipText}>+{hiddenChipCount}</Text>
            </View>
          ) : null}
        </View>

        <BudgetBar pct={row.pct} status="under" color={bandColor} height={ms(5)} />
      </PressableFeedback>

      <View style={styles.footer}>
        <Text style={styles.buffer} numberOfLines={1}>
          {formatAmount(row.spent)} {Strings.budgetPlansSummarySpent.toLowerCase()}
          {showBuffer ? ` · ${Strings.budgetPlansAllocationBuffer(formatAmount(row.buffer))}` : ''}
        </Text>
        <View style={styles.actions}>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlanEditTitle} ${row.name}`}
            onPress={() => onEdit(row.id)}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons name="pencil-outline" size={ms(15)} color={Colors.dark.text2} />
          </PressableFeedback>
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={`${Strings.budgetPlansRemoveA11y} ${row.name}`}
            onPress={() => onDelete({ id: row.id, name: row.name })}
            style={styles.iconButton}
          >
            <MaterialCommunityIcons
              name="trash-can-outline"
              size={ms(15)}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
        </View>
      </View>
    </View>
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
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: ms(2),
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
    gap: ms(5),
    marginTop: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(4),
    borderRadius: Radius.xl,
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.xs,
    paddingVertical: ms(3),
  },
  chipText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  buffer: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: ms(6),
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  iconButton: {
    width: ms(24),
    height: ms(24),
    alignItems: 'center',
    justifyContent: 'center',
  },
});
