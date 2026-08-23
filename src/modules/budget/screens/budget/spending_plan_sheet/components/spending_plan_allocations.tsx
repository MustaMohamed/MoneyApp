import { Switch } from 'heroui-native';
import type { BlurEvent, FocusEvent } from 'react-native';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';
import { ms } from '@/utils/responsive';

/**
 * Reserved height for one allocation field plus its error line. `HTextField`'s
 * root is a column and `FieldError` is a sibling of the input inside it, so
 * without a reserved slot the column grows when an error appears and the
 * sibling category label re-centres against it.
 *
 * Measured from the classes the column actually renders — `global.css`
 * overrides neither `--spacing` nor `--text-sm`, so the Tailwind v4 defaults
 * hold (`--spacing: 0.25rem`, `--text-sm: 0.875rem`, at Uniwind's 16px rem):
 *
 *     36  the row's `h-9` Input             9 * `--spacing`
 *   +  6  `.text-field__root` gap           1.5 * `--spacing`
 *   + 20  `.field-error__text` line box     14px * `calc(1.25 / 0.875)`
 *   ----
 *     62
 *
 * Deliberately NOT wrapped in `ms()`, which is where `FILTER_AMOUNT_FIELD_SLOT_HEIGHT`
 * and the earlier `ms(52)` here went wrong: every term above is an unscaled
 * Tailwind value, so a scaled slot reserves 53px for the same 62px of content
 * on a 0.85-scale phone — under-reserving hardest exactly where the screen is
 * smallest. The message is capped at one line (`errorNumberOfLines` below) so
 * the third term stays a single line box.
 */
export const ALLOCATION_FIELD_SLOT_HEIGHT = 62;

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
              {/*
                The width lives on the slot, not on the Input: `FieldError` is a
                sibling of the field inside `HTextField`'s column, so an
                unbounded column takes its intrinsic width from the unwrapped
                message and the field would jump from 128px to the message's
                width the instant an error appeared, squeezing the `flex-1`
                category label beside it.
              */}
              <View className="w-32" style={{ height: ALLOCATION_FIELD_SLOT_HEIGHT }}>
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
