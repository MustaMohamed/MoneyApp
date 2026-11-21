import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { BlurEvent, FocusEvent } from 'react-native';
import { View, useWindowDimensions } from 'react-native';

import { Input } from '@/components/ui/input';
import { SwitchCard } from '@/components/ui/switch_card';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, TouchSize, touchFloorHitSlop } from '@/constants/theme';
import {
  resolveAllocationSlotMinHeight,
  resolveAllocationSlotWidth,
  resolveSpendingPlanFieldGeometry,
  showsAllocationSuffix,
} from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';

interface SpendingPlanAllocationsProps {
  isEnabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedCategories: Category[];
  values: Record<string, string>;
  errors: Record<string, string | undefined>;
  summaryText: string | undefined;
  isOver: boolean;
  overRingedCategoryId: string | undefined;
  onAllocationTextChange: (categoryId: string, text: string) => void;
  onFocus: (event: FocusEvent) => void;
  onBlur: (event: BlurEvent) => void;
}

export function SpendingPlanAllocations(props: SpendingPlanAllocationsProps) {
  const { fontScale } = useWindowDimensions();
  const field = resolveSpendingPlanFieldGeometry('allocation', fontScale);
  const slotMinHeight = resolveAllocationSlotMinHeight(fontScale);
  const slotWidth = resolveAllocationSlotWidth(fontScale);
  return (
    <View className="mt-4">
      <SwitchCard
        label={Strings.budgetPlanAllocateByCategory}
        isOn={props.isEnabled}
        onIsOnChange={props.onEnabledChange}
        testID="spending-plan-allocate-card"
      >
        {props.selectedCategories.map((category) => {
          const value = props.values[category.id] ?? '';
          const error = props.errors[category.id];
          const showsSuffix = showsAllocationSuffix(value, fontScale);
          return (
            <View
              key={category.id}
              className="border-separator items-center gap-3 border-t px-4 py-2.5"
              style={{ flexDirection: 'row', minHeight: TouchSize.min }}
            >
              <MaterialCommunityIcons
                name={toIconName(category.icon, 'tag')}
                size={Size.filterSegmentIcon}
                color={category.color}
              />
              <Text className="font-inter-semibold text-foreground text-[12px]" style={{ flex: 1 }}>
                {category.name}
              </Text>
              {/* Width on the slot: an unbounded column sizes to the `FieldError` text. */}
              <View
                className="justify-center"
                style={{
                  width: slotWidth,
                  minHeight: error === undefined ? field.height : slotMinHeight,
                }}
              >
                <Input
                  testID={`spending-plan-allocation-${category.id}`}
                  value={value}
                  onChangeText={(text) => props.onAllocationTextChange(category.id, text)}
                  onFocus={props.onFocus}
                  onBlur={props.onBlur}
                  keyboardType="decimal-pad"
                  placeholder={Strings.budgetPlanLimitNone}
                  hitSlop={touchFloorHitSlop(field.height)}
                  isInvalid={error !== undefined || props.overRingedCategoryId === category.id}
                  errorMessage={error}
                  errorNumberOfLines={1}
                  allowFontScaling={field.text === undefined}
                  style={{ height: field.height, ...field.text }}
                  className="border-border bg-background font-sora-bold text-foreground min-h-0 px-2 text-[12px]"
                  // An element at every value: a falsy suffix swaps the input element and drops focus.
                  suffix={
                    showsSuffix ? (
                      <Text className="font-inter-semibold text-muted text-[12px]">
                        {Strings.currencyEgp}
                      </Text>
                    ) : (
                      <></>
                    )
                  }
                  suffixClassName={showsSuffix ? undefined : 'px-0'}
                  accessibilityLabel={`${Strings.budgetPlanAllocateByCategory} ${category.name}`}
                />
              </View>
            </View>
          );
        })}
        {props.summaryText === undefined ? null : (
          <View
            className="border-separator justify-center border-t px-4 py-2.5"
            style={{ minHeight: TouchSize.min }}
          >
            <Text
              className={
                props.isOver
                  ? 'font-inter text-danger text-[11px]'
                  : 'font-inter text-muted text-[11px]'
              }
            >
              {props.summaryText}
            </Text>
          </View>
        )}
      </SwitchCard>
    </View>
  );
}
