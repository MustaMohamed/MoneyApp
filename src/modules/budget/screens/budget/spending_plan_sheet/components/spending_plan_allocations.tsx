import { Switch } from 'heroui-native';
import type { BlurEvent, FocusEvent } from 'react-native';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.styles';
import type { Category } from '@/modules/categories/entities/category.entity';

interface SpendingPlanAllocationsProps {
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedCategories: Category[];
  values: Record<string, number | undefined>;
  helperText: string;
  isOver: boolean;
  onAllocationTextChange: (categoryId: string, text: string) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
}

export function SpendingPlanAllocations(props: SpendingPlanAllocationsProps) {
  return (
    <>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{Strings.budgetPlanAllocateByCategory}</Text>
        <Switch
          isSelected={props.isEnabled}
          onSelectedChange={props.onEnabledChange}
          accessibilityLabel={Strings.budgetPlanAllocateByCategory}
        />
      </View>
      {props.isEnabled ? (
        <View style={styles.allocations}>
          <Text style={styles.helperText}>{props.helperText}</Text>
          {props.isOver ? (
            <Text style={styles.errorText}>{Strings.budgetPlanAllocationOver}</Text>
          ) : null}
          {props.selectedCategories.map((category) => (
            <View key={category.id} style={styles.allocationRow}>
              <Text style={styles.allocationName}>{category.name}</Text>
              <Input
                testID={`spending-plan-allocation-${category.id}`}
                value={
                  props.values[category.id] === undefined ? '' : String(props.values[category.id])
                }
                onChangeText={(text) => props.onAllocationTextChange(category.id, text)}
                onFocus={props.onFocus}
                onBlur={props.onBlur}
                keyboardType="number-pad"
                placeholder={Strings.zeroAmountPlaceholder}
                className="border-border bg-background h-9 min-h-0 w-32 px-2"
                style={styles.allocationInput}
                suffix={<Text style={styles.suffix}>{Strings.currencyEgp}</Text>}
                accessibilityLabel={`${Strings.budgetPlanAllocateByCategory} ${category.name}`}
              />
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
