import { Switch } from 'heroui-native';
import type { BlurEvent, FocusEvent } from 'react-native';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';
import { ms } from '@/utils/responsive';

/**
 * Reserved height for one allocation field plus its error line — 36 for the
 * row's existing `h-9` Input, 16 for the message. `HTextField`'s root is a
 * column and `FieldError` reserves no height, so without this the column grows
 * when an error appears and the sibling category label re-centres against it.
 * Shape copied from `FILTER_AMOUNT_FIELD_SLOT_HEIGHT`.
 */
export const ALLOCATION_FIELD_SLOT_HEIGHT = ms(52);

/** Reserved slot for the over-allocation line: one `text-[11px]` line. */
export const ALLOCATION_OVER_SLOT_HEIGHT = ms(16);

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
          <View className="mt-2 justify-center" style={{ height: ALLOCATION_OVER_SLOT_HEIGHT }}>
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
              <View style={{ height: ALLOCATION_FIELD_SLOT_HEIGHT }}>
                <Input
                  testID={`spending-plan-allocation-${category.id}`}
                  value={props.values[category.id] ?? ''}
                  onChangeText={(text) => props.onAllocationTextChange(category.id, text)}
                  onFocus={props.onFocus}
                  onBlur={props.onBlur}
                  keyboardType="number-pad"
                  placeholder={Strings.zeroAmountPlaceholder}
                  isInvalid={props.errors[category.id] !== undefined}
                  errorMessage={props.errors[category.id]}
                  className="border-border bg-background font-sora-bold text-foreground h-9 min-h-0 w-32 px-2 text-[12px]"
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
