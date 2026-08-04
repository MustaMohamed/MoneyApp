import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion, Chip, PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Size, Spacing, Type } from '@/constants/theme';
import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { NamedBudgetRow } from '@/modules/budget/screens/budget/components/named_budget_row';
import { UnassignedSpendingRow } from '@/modules/budget/screens/budget/components/unassigned_spending_row';
import { toIconName } from '@/utils/icon_name_guard';

export interface CategoryBudgetRowProps {
  row: CategoryBudgetRowVM;
  isExpanded: boolean;
  onExpandedChange: (categoryId: string | undefined) => void;
  onViewDetails: (categoryId: string) => void;
  onEdit: (budgetId: string) => void;
  onDelete: (payload: { id: string; name: string }) => void;
}

function CategoryBudgetRowComponent(props: CategoryBudgetRowProps) {
  const { row } = props;
  return (
    <Accordion
      selectionMode="single"
      value={props.isExpanded ? row.categoryId : ''}
      onValueChange={(value: string | undefined) =>
        props.onExpandedChange(value === row.categoryId ? row.categoryId : undefined)
      }
      hideSeparator
      className="border-separator border-b"
    >
      <Accordion.Item value={row.categoryId}>
        <Accordion.Trigger
          accessibilityLabel={row.accessibilityLabel}
          accessibilityState={{ expanded: props.isExpanded }}
          className="gap-0 px-4 py-2"
          style={{ paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, gap: 0 }}
        >
          <View className="flex-row items-center gap-2.5" style={{ flex: 1 }}>
            <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
              <BudgetRing pct={row.usedPct} color={row.ringColor} size={Size.budgetCategoryRing}>
                <MaterialCommunityIcons
                  name={toIconName(row.icon, 'tag-outline')}
                  size={Size.iconXs}
                  color={row.color}
                />
              </BudgetRing>
            </View>
            <View style={{ flex: 1 }}>
              <View className="flex-row items-start gap-1.5">
                <Typography
                  numberOfLines={2}
                  style={{ fontSize: Type.body }}
                  className="font-sora text-foreground flex-1 font-semibold"
                >
                  {row.name}
                </Typography>
                <Chip
                  size="sm"
                  variant="soft"
                  color={row.statusChipColor}
                  className="h-5 py-0"
                  style={{ flexShrink: 0 }}
                  accessibilityRole="text"
                  accessibilityLabel={row.statusLabel}
                >
                  <Chip.Label
                    numberOfLines={1}
                    style={{ color: row.ringColor, fontSize: Type.chipMeta }}
                    className="font-inter font-bold uppercase"
                  >
                    {row.statusLabel}
                  </Chip.Label>
                </Chip>
              </View>
              <Typography style={{ fontSize: Type.micro }} className="font-inter text-muted mt-0.5">
                {row.spentPlannedUsedLabel}
              </Typography>
            </View>
            <View className="items-end">
              <Typography
                style={{ color: row.ringColor, fontSize: Type.bodyStrong }}
                className="font-sora font-bold"
              >
                {row.balanceAmountLabel}
              </Typography>
              <Typography style={{ fontSize: Type.chip }} className="font-inter text-muted">
                {row.balanceMetaLabel}
              </Typography>
            </View>
            <Accordion.Indicator isAnimatedStyleActive={false}>
              <MaterialCommunityIcons
                name={props.isExpanded ? 'chevron-up' : 'chevron-down'}
                size={Size.iconXs}
                color={Colors.dark.text2}
              />
            </Accordion.Indicator>
          </View>
        </Accordion.Trigger>
        <Accordion.Content className="bg-background/30 px-0 pb-0" style={{ padding: 0 }}>
          {row.budgets.map((budget) => (
            <NamedBudgetRow
              key={budget.id}
              budget={budget}
              onEdit={props.onEdit}
              onDelete={props.onDelete}
            />
          ))}
          {row.unassignedSpend > 0 ? (
            <UnassignedSpendingRow amountLabel={row.unassignedSpendLabel} />
          ) : null}
          <PressableFeedback
            accessibilityRole="button"
            accessibilityLabel={Strings.budgetViewCategoryDetailsA11y(row.name)}
            onPress={() => props.onViewDetails(row.categoryId)}
            className="min-h-11 flex-row items-center gap-2 px-4"
          >
            <View className="items-center" style={{ width: Size.budgetCategoryColumn }}>
              <View className="border-border bg-default h-8 w-8 items-center justify-center rounded-full border">
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={Size.iconXs}
                  color={Colors.dark.text2}
                />
              </View>
            </View>
            <Typography
              style={{ fontSize: Type.micro }}
              className="font-inter text-foreground flex-1 font-semibold"
            >
              {Strings.budgetViewCategoryDetails(row.name)}
            </Typography>
            <MaterialCommunityIcons
              name="chevron-right"
              size={Size.iconXs}
              color={Colors.dark.text2}
            />
          </PressableFeedback>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

export const CategoryBudgetRow = React.memo(CategoryBudgetRowComponent);
CategoryBudgetRow.displayName = 'CategoryBudgetRow';
