import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion, Chip, PressableFeedback, Text as HeroText } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import type { CategoryBudgetRowVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetRing } from '@/modules/budget/screens/budget/components/budget_ring';
import { NamedBudgetRow } from '@/modules/budget/screens/budget/components/named_budget_row';
import { UnassignedSpendingRow } from '@/modules/budget/screens/budget/components/unassigned_spending_row';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

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
          className="gap-0 px-4 py-2"
          style={{ paddingHorizontal: ms(16), paddingVertical: ms(8), gap: 0 }}
        >
          <View className="flex-row items-center gap-2.5" style={{ flex: 1 }}>
            <View className="w-[46px] items-center">
              <BudgetRing pct={row.usedPct} color={row.ringColor} size={ms(42)}>
                <MaterialCommunityIcons
                  name={toIconName(row.icon, 'tag-outline')}
                  size={ms(17)}
                  color={row.color}
                />
              </BudgetRing>
            </View>
            <View style={{ flex: 1 }}>
              <View className="flex-row items-center gap-1.5">
                <HeroText
                  numberOfLines={1}
                  className="font-sora text-foreground shrink text-[14px] font-semibold"
                >
                  {row.name}
                </HeroText>
                <Chip size="sm" variant="soft" color={row.statusChipColor} className="h-5 py-0">
                  <Chip.Label
                    style={{ color: row.ringColor }}
                    className="font-inter text-[8px] font-bold uppercase"
                  >
                    {row.statusLabel}
                  </Chip.Label>
                </Chip>
              </View>
              <HeroText className="font-inter text-muted mt-0.5 text-[10px]">
                {row.spentPlannedUsedLabel}
              </HeroText>
            </View>
            <View className="items-end">
              <HeroText
                style={{ color: row.ringColor }}
                className="font-sora text-[15px] font-bold"
              >
                {row.balanceAmountLabel}
              </HeroText>
              <HeroText className="font-inter text-muted text-[9px]">
                {row.balanceMetaLabel}
              </HeroText>
            </View>
            <Accordion.Indicator isAnimatedStyleActive={false}>
              <MaterialCommunityIcons
                name={props.isExpanded ? 'chevron-up' : 'chevron-down'}
                size={ms(17)}
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
            <View className="w-[46px] items-center">
              <View className="border-accent/30 bg-accent/10 h-8 w-8 items-center justify-center rounded-full border">
                <MaterialCommunityIcons
                  name="chart-box-outline"
                  size={ms(16)}
                  color={Colors.dark.gold}
                />
              </View>
            </View>
            <HeroText className="font-inter text-accent flex-1 text-[11px] font-semibold">
              {Strings.budgetViewCategoryDetails(row.name)}
            </HeroText>
            <MaterialCommunityIcons name="chevron-right" size={ms(16)} color={Colors.dark.gold} />
          </PressableFeedback>
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

export const CategoryBudgetRow = React.memo(CategoryBudgetRowComponent);
CategoryBudgetRow.displayName = 'CategoryBudgetRow';
