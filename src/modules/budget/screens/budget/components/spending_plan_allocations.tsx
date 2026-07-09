import { Input, Switch } from 'heroui-native';
import { View, type BlurEvent, type FocusEvent } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/components/spending_plan_sheet.styles';
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

export function SpendingPlanAllocations({
  isEnabled,
  onEnabledChange,
  selectedCategories,
  values,
  helperText,
  isOver,
  onAllocationTextChange,
  onFocus,
  onBlur,
}: SpendingPlanAllocationsProps) {
  return (
    <>
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>{Strings.budgetPlanAllocateByCategory}</Text>
        <Switch
          isSelected={isEnabled}
          onSelectedChange={onEnabledChange}
          accessibilityLabel={Strings.budgetPlanAllocateByCategory}
        />
      </View>

      {isEnabled ? (
        <View style={styles.allocations}>
          <Text style={styles.helperText}>{helperText}</Text>
          {isOver ? <Text style={styles.errorText}>{Strings.budgetPlanAllocationOver}</Text> : null}
          {selectedCategories.map((category) => (
            <View key={category.id} style={styles.allocationRow}>
              <Text style={styles.allocationName}>{category.name}</Text>
              <View style={styles.allocationField}>
                <Input
                  testID={`spending-plan-allocation-${category.id}`}
                  value={values[category.id] === undefined ? '' : String(values[category.id])}
                  onChangeText={(text) => onAllocationTextChange(category.id, text)}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderColorClassName="text-muted"
                  className="h-7 min-h-0 flex-1 border-0 bg-transparent p-0"
                  style={styles.allocationInput}
                  accessibilityLabel={`${Strings.budgetPlanAllocateByCategory} ${category.name}`}
                />
                <Text style={styles.suffix}>EGP</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
