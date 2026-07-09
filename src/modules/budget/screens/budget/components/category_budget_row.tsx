import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { SwipeableRow, type SwipeAction } from '@/components/ui/swipeable_row';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import { budgetBandColor, remainingLabel } from '@/modules/budget/screens/budget/budget.helpers';
import type {
  CategoryBudgetItemVM,
  CategoryBudgetRowVM,
} from '@/modules/budget/screens/budget/budget.hook';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { formatAmount } from '@/utils/format_amount';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

export interface CategoryBudgetRowProps {
  row: CategoryBudgetRowVM;
  onPress: (categoryId: string) => void;
  onEdit: (budgetId: string) => void;
  onDelete: (payload: { id: string; name: string }) => void;
}

interface BudgetItemRowProps {
  budget: CategoryBudgetItemVM;
  isLast: boolean;
  onEdit: (budgetId: string) => void;
  onDelete: (payload: { id: string; name: string }) => void;
}

function BudgetItemRow({ budget, isLast, onEdit, onDelete }: BudgetItemRowProps) {
  const handleEdit = useCallback(() => onEdit(budget.id), [budget.id, onEdit]);
  const handleDelete = useCallback(
    () => onDelete({ id: budget.id, name: budget.name }),
    [budget.id, budget.name, onDelete],
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
    <SwipeableRow rowId={budget.id} actions={actions} accessibilityLabel={`${budget.name} budget`}>
      <View style={[styles.budgetRow, isLast && styles.lastBudgetRow]}>
        <View style={styles.budgetMarker} />
        <Text style={styles.budgetName}>{budget.name}</Text>
        <Text style={styles.budgetAmount}>{formatAmount(budget.amount)}</Text>
      </View>
    </SwipeableRow>
  );
}

function CategoryBudgetRowComponent({ row, onPress, onEdit, onDelete }: CategoryBudgetRowProps) {
  const bandColor = budgetBandColor(row.pct);
  const pctText = `${Math.round(row.pct * 100)}%`;
  const remaining = row.limit - row.spent;
  const { magnitude, label } = remainingLabel(remaining);
  const budgetCountText = Strings.budgetCountLabel(row.budgetCount);

  const handlePress = useCallback(() => onPress(row.categoryId), [onPress, row.categoryId]);

  return (
    <View style={styles.group}>
      <PressableFeedback
        onPress={handlePress}
        style={styles.categoryRow}
        accessibilityRole="button"
        accessibilityLabel={`${row.name} category budget, ${pctText}`}
      >
        <BudgetRing pct={row.pct} color={bandColor}>
          <MaterialCommunityIcons
            name={toIconName(row.icon, 'tag-outline')}
            size={ms(18)}
            color={row.color}
          />
        </BudgetRing>

        <View style={styles.center}>
          <Text style={styles.name}>{row.name}</Text>
          <Text
            style={[styles.pct, { color: bandColor }]}
          >{`${budgetCountText} / ${pctText}`}</Text>
        </View>

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
      {row.budgets.map((budget, index) => (
        <BudgetItemRow
          key={budget.id}
          budget={budget}
          isLast={index === row.budgets.length - 1}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </View>
  );
}

export const CategoryBudgetRow = React.memo(CategoryBudgetRowComponent);
CategoryBudgetRow.displayName = 'CategoryBudgetRow';

const styles = StyleSheet.create({
  group: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.dark.border,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ms(10),
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
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
  budgetRow: {
    minHeight: ms(34),
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginLeft: ms(58),
    paddingRight: Spacing.md,
    paddingVertical: ms(5),
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  lastBudgetRow: {
    marginBottom: ms(3),
  },
  budgetMarker: {
    width: ms(6),
    height: ms(6),
    borderRadius: ms(3),
    backgroundColor: Colors.dark.text3,
  },
  budgetName: {
    flex: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  budgetAmount: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
});
