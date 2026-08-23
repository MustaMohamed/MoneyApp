import { Switch } from 'heroui-native';
import type { BlurEvent, FocusEvent } from 'react-native';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Category } from '@/modules/categories/entities/category.entity';

/**
 * Reserved height for one allocation field plus its error line. `HTextField`'s
 * root is a column and `FieldError` is a sibling of the input inside it, so
 * without a reserved slot that column grows by 26px (the 6 gap plus the 20
 * line box below) the instant an error appears, and every allocation row
 * beneath it shifts down by that much. The category label beside the field is
 * not what moves: the row is `flex-row items-start`, so the label is top-aligned
 * and every pixel of the growth falls downward, onto the rows below.
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
 * The first term only holds because the Input also carries `min-h-0`.
 * `.input__input` sets `min-height: calc(var(--spacing) * 12)` = 48
 * (input.css:9), which outranks `h-9`'s 36 and would make the true content
 * 48 + 6 + 20 = 74. `min-h-0` is load-bearing geometry, not a tidy-up reset —
 * remove it and this slot under-reserves by 12px.
 *
 * Deliberately NOT wrapped in `ms()`, which is where `FILTER_AMOUNT_FIELD_SLOT_HEIGHT`
 * and the earlier `ms(52)` here went wrong: every term above is an unscaled
 * Tailwind value, so a scaled slot reserves 53px for the same 62px of content
 * on a 0.85-scale phone — under-reserving hardest exactly where the screen is
 * smallest. The message is capped at one line (`errorNumberOfLines` below) so
 * the third term stays a single line box.
 *
 * Applied as `minHeight`, never `height` — the house ruling in
 * `account_form.geometry.ts:18-21`. `allowFontScaling` defaults on and no
 * `maxFontSizeMultiplier` is set on this field, so at accessibility font sizes
 * a hard `height` clips the error line with zero slack. `errorNumberOfLines={1}`
 * below bounds the growth to one *taller* line rather than an unbounded
 * reflow, so the floor costs a small, bounded push of the rows below where the
 * ceiling cost a clip.
 */
export const ALLOCATION_FIELD_SLOT_HEIGHT = 62;

/**
 * Reserved slot for the over-allocation line: one `text-[11px]` line of
 * `font-inter`, applied as `minHeight` under the same ruling as the field slot
 * above.
 *
 * Unscaled for the reason `account_form.geometry.ts:39-41` states: the line box
 * this reserves is itself unscaled, so matching it with an unscaled literal
 * keeps the slot correct at every `ms()` scale rather than only near 1.0. The
 * `ms(16)` this replaces resolved to 14 at the 0.85 clamp, under the 15.74 the
 * line actually occupies — a clip on exactly the smallest screens.
 *
 * Measured from the face this renders in, Inter_400Regular
 * (`@expo-google-fonts/inter/400Regular`, unitsPerEm 2048), not assumed:
 *
 *   iOS      hhea/typo 1984 asc + 494 desc + 0 gap = 1.2100 em -> 13.31px
 *   Android  head bbox 2269 yMax + 660 |yMin|      = 1.4302 em -> 15.74px
 *
 * Android is the taller of the two because RN `Text` leaves
 * `includeFontPadding` on, which lays the line out against the face's full
 * bounding box instead of its ascent/descent. 16 is the ceiling of the larger.
 */
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
              {/*
                The width lives on the slot, not on the Input: `FieldError` is a
                sibling of the field inside `HTextField`'s column, so an
                unbounded column takes its intrinsic width from the unwrapped
                message and the field would jump from 128px to the message's
                width the instant an error appeared, squeezing the `flex-1`
                category label beside it.
              */}
              <View className="w-32" style={{ minHeight: ALLOCATION_FIELD_SLOT_HEIGHT }}>
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
