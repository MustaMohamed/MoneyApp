import { Switch } from 'heroui-native';
import type { BlurEvent, FocusEvent } from 'react-native';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';

/** 36px `h-9` input (needs `min-h-0`) + 6px gap + 20px error line box; unscaled, never `ms()`. */
export const ALLOCATION_FIELD_SLOT_HEIGHT = 62;

/** Ceil of Inter 400's Android line box at 11px (15.74); unscaled, never `ms()`. */
export const ALLOCATION_OVER_SLOT_HEIGHT = 16;

interface SpendingPlanAllocationsProps {
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedCategories: Category[];
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  helperText?: string;
  isOver: boolean;
  onAllocationTextChange: (categoryId: string, text: string) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
}

export function SpendingPlanAllocations(props: SpendingPlanAllocationsProps) {
  return (
    <>
      <View className="flex-row items-center justify-between py-4">
        <Text className="font-inter-semibold text-foreground text-[12px]">
          {Strings.budgetPlanAllocateByCategory}
        </Text>
        <Switch
          isSelected={props.isEnabled}
          onSelectedChange={props.onEnabledChange}
          accessibilityLabel={Strings.budgetPlanAllocateByCategory}
        />
      </View>
      {props.isEnabled ? (
        <View className="gap-2">
          {props.helperText === undefined ? null : (
            <Text className="font-inter text-muted text-[11px]">{props.helperText}</Text>
          )}
          <View className="mt-2 justify-center" style={{ minHeight: ALLOCATION_OVER_SLOT_HEIGHT }}>
            {props.isOver ? (
              <Text accessibilityRole="alert" className="font-inter text-danger text-[11px]">
                {Strings.budgetPlanAllocationOver}
              </Text>
            ) : null}
          </View>
          {props.selectedCategories.map((category) => (
            <View key={category.id} className="flex-row items-start justify-between gap-3">
              <Text className="font-inter-semibold text-foreground flex-1 text-[12px]">
                {category.name}
              </Text>
              {/* Width on the slot: an unbounded column sizes to the `FieldError` text. */}
              <View className="w-32" style={{ minHeight: ALLOCATION_FIELD_SLOT_HEIGHT }}>
                <Input
                  testID={`spending-plan-allocation-${category.id}`}
                  value={props.values[category.id] ?? ''}
                  onChangeText={(text) => props.onAllocationTextChange(category.id, text)}
                  onFocus={props.onFocus}
                  onBlur={props.onBlur}
                  keyboardType="decimal-pad"
                  placeholder={Strings.zeroAmountPlaceholder}
                  isInvalid={props.errors[category.id] !== undefined}
                  errorMessage={props.errors[category.id]}
                  errorNumberOfLines={1}
                  className="border-border bg-background font-sora-bold text-foreground h-9 min-h-0 px-2 text-[12px]"
                  suffix={
                    <Text className="font-inter-semibold text-muted text-[12px]">
                      {Strings.currencyEgp}
                    </Text>
                  }
                  accessibilityLabel={`${Strings.budgetPlanAllocateByCategory} ${category.name}`}
                />
              </View>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}
