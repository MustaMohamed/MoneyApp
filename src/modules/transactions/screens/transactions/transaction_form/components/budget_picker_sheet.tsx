import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

interface BudgetPickerSheetProps {
  isOpen: boolean;
  budgets: Budget[];
  selectedId: string | undefined;
  onSelect: (budget: Budget) => void;
  onOpenChange: (open: boolean) => void;
}

export function BudgetPickerSheet(props: BudgetPickerSheetProps) {
  return (
    <Sheet
      isOpen={props.isOpen}
      onOpenChange={props.onOpenChange}
      title={Strings.addTxPickBudgetTitle}
      size="md"
      scrollable
    >
      {props.budgets.length === 0 ? (
        <View testID="budget-picker-empty" className="flex-1 items-center justify-center px-8">
          <View className="bg-default mb-3 h-12 w-12 items-center justify-center rounded-full">
            <MaterialCommunityIcons name="wallet-outline" size={ms(22)} color={CoreTokens.text2} />
          </View>
          <Text className="font-sora text-foreground text-center text-[15px] font-semibold">
            {Strings.addTxBudgetEmptyTitle}
          </Text>
          <Text className="font-inter text-muted mt-1 text-center text-[12px] leading-5">
            {Strings.addTxBudgetEmptyBody}
          </Text>
        </View>
      ) : (
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
              <PressableFeedback
                testID={`budget-picker-row-${budget.id}`}
                onPress={() => props.onSelect(budget)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                accessibilityLabel={`${budget.name}, ${formatAmount(budget.limit_amount)} ${Strings.currencyEgp}`}
                className="border-separator min-h-14 gap-3 border-b px-4 py-2.5"
                style={{ flexDirection: 'row', alignItems: 'center' }}
              >
                <View className="bg-default h-8 w-8 items-center justify-center rounded-md">
                  <MaterialCommunityIcons
                    name="wallet-outline"
                    size={ms(17)}
                    color={selected ? GoldTokens[500] : CoreTokens.text2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    className="font-sora text-foreground text-[14px] font-semibold"
                    numberOfLines={1}
                  >
                    {budget.name}
                  </Text>
                  <Text className="font-inter text-muted text-[11px]">
                    {`${formatAmount(budget.limit_amount)} ${Strings.currencyEgp}`}
                  </Text>
                </View>
                {selected ? (
                  <MaterialCommunityIcons
                    testID={`budget-picker-row-${budget.id}-selected`}
                    name="check-circle"
                    size={ms(18)}
                    color={GoldTokens[500]}
                  />
                ) : null}
              </PressableFeedback>
            );
          }}
        />
      )}
    </Sheet>
  );
}
