import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Radio, RadioGroup } from 'heroui-native';
import { useCallback, useMemo } from 'react';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { formatAmount } from '@/utils/format_amount';

interface BudgetPickerSheetProps {
  isOpen: boolean;
  budgets: Budget[];
  selectedId: string | undefined;
  onSelect: (budget: Budget) => void;
  onOpenChange: (open: boolean) => void;
  onCloseComplete?: () => void;
}

export function BudgetPickerSheet(props: BudgetPickerSheetProps) {
  const onSelect = props.onSelect;
  const budgetsById = useMemo(
    () => new Map(props.budgets.map((budget) => [budget.id, budget])),
    [props.budgets],
  );
  const handleValueChange = useCallback(
    (budgetId: string) => {
      const budget = budgetsById.get(budgetId);
      if (budget) onSelect(budget);
    },
    [budgetsById, onSelect],
  );

  return (
    <Sheet
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      onCloseComplete={props.onCloseComplete}
      title={Strings.addTxPickBudgetTitle}
      size="md"
      scrollable
    >
      {props.budgets.length === 0 ? (
        <View testID="budget-picker-empty" className="flex-1 items-center justify-center px-8">
          <View className="bg-default mb-3 h-12 w-12 items-center justify-center rounded-full">
            <MaterialCommunityIcons
              name="wallet-outline"
              size={Size.iconMd}
              color={CoreTokens.text2}
            />
          </View>
          <Text
            className="font-sora-semibold text-foreground text-center"
            style={{ fontSize: Type.bodyStrong, lineHeight: lineHeightFor(Type.bodyStrong) }}
          >
            {Strings.addTxBudgetEmptyTitle}
          </Text>
          <Text
            className="font-inter text-muted mt-1 text-center leading-5"
            style={{ fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
          >
            {Strings.addTxBudgetEmptyBody}
          </Text>
        </View>
      ) : (
        <RadioGroup value={props.selectedId} onValueChange={handleValueChange} className="flex-1">
          <BottomSheetFlatList
            testID="budget-picker-list"
            data={props.budgets}
            keyExtractor={(budget) => budget.id}
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingBottom: Spacing.lg }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item: budget }) => {
              const selected = props.selectedId === budget.id;
              return (
                <RadioGroup.Item
                  value={budget.id}
                  testID={`budget-picker-row-${budget.id}`}
                  accessibilityLabel={Strings.addTxBudgetOptionAccessibility(
                    budget.name,
                    formatAmount(budget.limit_amount),
                  )}
                  className="border-separator min-h-14 gap-3 border-b px-4 py-2.5"
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                >
                  <View className="bg-default h-8 w-8 items-center justify-center rounded-md">
                    <MaterialCommunityIcons
                      name="wallet-outline"
                      size={Size.iconXs}
                      color={selected ? GoldTokens[500] : CoreTokens.text2}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      className="font-sora-semibold text-foreground"
                      style={{ fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
                      numberOfLines={1}
                    >
                      {budget.name}
                    </Text>
                    <Text
                      className="font-inter text-muted"
                      style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}
                    >
                      {`${formatAmount(budget.limit_amount)} ${Strings.currencyEgp}`}
                    </Text>
                  </View>
                  <Radio testID={`budget-picker-row-${budget.id}-selected`} />
                </RadioGroup.Item>
              );
            }}
          />
        </RadioGroup>
      )}
    </Sheet>
  );
}
