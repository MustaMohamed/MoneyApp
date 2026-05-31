import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { budgetBandColor, remainingLabel } from '@/modules/budget/screens/budget/budget.helpers';
import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget.hook';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export interface CategoryBudgetRowProps {
  row: CategoryBudgetRowVM;
  onPress: (categoryId: string) => void;
  onEdit: (categoryId: string) => void;
  onDelete: (payload: { id: string; name: string }) => void;
}

function CategoryBudgetRowComponent({ row, onPress, onEdit, onDelete }: CategoryBudgetRowProps) {
  const bandColor = budgetBandColor(row.pct);
  const pctText = `${Math.round(row.pct * 100)}%`;
  const remaining = row.limit - row.spent;
  const { magnitude, label } = remainingLabel(remaining);

  const handlePress = useCallback(() => onPress(row.categoryId), [onPress, row.categoryId]);
  const handleEdit = useCallback(() => onEdit(row.categoryId), [onEdit, row.categoryId]);
  const handleDelete = useCallback(
    () => onDelete({ id: row.categoryId, name: row.name }),
    [onDelete, row.categoryId, row.name],
  );
  const actions: SwipeAction[] = useMemo(
    () => [
      {
        key: 'edit',
        label: Strings.swipeEdit,
        icon: 'pencil-outline',
        variant: 'neutral',
        onPress: handleEdit,
      },
      {
        key: 'delete',
        label: Strings.swipeDelete,
        icon: 'trash-can-outline',
        variant: 'destructive',
        onPress: handleDelete,
      },
    ],
    [handleDelete, handleEdit],
  );

  return (
    <SwipeableRow
      rowId={row.categoryId}
      actions={actions}
      accessibilityLabel={`${row.name} budget, ${pctText}`}
    >
      <PressableFeedback
        onPress={handlePress}
        style={styles.row}
        accessibilityRole="button"
        accessibilityLabel={`${row.name} budget`}
      >
        {/* Left: ring + icon */}
        <BudgetRing pct={row.pct} color={bandColor}>
          <MaterialCommunityIcons
            name={toIconName(row.icon, 'tag-outline')}
            size={ms(18)}
            color={row.color}
          />
        </BudgetRing>

        {/* Center: name + pct */}
        <View style={styles.center}>
          <Text style={styles.name}>{row.name}</Text>
          <Text style={[styles.pct, { color: bandColor }]}>{pctText}</Text>
        </View>

        {/* Right: remaining + spent/limit */}
        <View style={styles.right}>
          <View style={styles.remainingRow}>
            <Text style={[styles.remainingAmount, { color: bandColor }]}>
              {formatAmount(magnitude)}
            </Text>
            <Text style={styles.remainingLabel}>{` ${label}`}</Text>
          </View>
          <Text style={styles.spentBudget}>
            {`${formatAmount(row.spent)} / ${formatAmount(row.limit)}`}
          </Text>
        </View>
      </PressableFeedback>
    </SwipeableRow>
  );
}

export const CategoryBudgetRow = React.memo(CategoryBudgetRowComponent);
CategoryBudgetRow.displayName = 'CategoryBudgetRow';

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  center: { flex: 1 },
  name: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  pct: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    marginTop: ms(2),
  },
  right: { alignItems: 'flex-end' },
  remainingRow: { flexDirection: 'row', alignItems: 'baseline' },
  remainingAmount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
  },
  remainingLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  spentBudget: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    marginTop: ms(2),
  },
});
