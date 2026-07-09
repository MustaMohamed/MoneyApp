import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';

import { type MonthFilterProps, useMonthFilter } from './month_filter.hook';
import { Sheet } from './sheet';
import { Text } from './text';

interface IconButtonProps {
  icon: 'chevron-left' | 'chevron-right';
  accessibilityLabel: string;
  onPress: () => void;
  testID?: string;
}

function IconButton({ icon, accessibilityLabel, onPress, testID }: IconButtonProps) {
  return (
    <PressableFeedback
      testID={testID}
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="bg-default/60 h-8 w-8 items-center justify-center rounded-full"
    >
      <MaterialCommunityIcons name={icon} size={20} color={Colors.dark.text1} />
    </PressableFeedback>
  );
}

export function MonthFilter(props: MonthFilterProps) {
  const monthFilter = useMonthFilter(props);
  const showStepButtons = props.showStepButtons ?? true;

  return (
    <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs }}>
        {showStepButtons && (
          <IconButton
            testID="month-filter-previous"
            icon="chevron-left"
            accessibilityLabel={Strings.monthFilterPreviousA11y}
            onPress={monthFilter.onPreviousMonth}
          />
        )}
        <PressableFeedback
          testID="month-filter-open"
          onPress={monthFilter.onOpenPicker}
          accessibilityRole="button"
          accessibilityLabel={monthFilter.state.openPickerAccessibilityLabel}
          className="bg-accent h-8 flex-1 items-center justify-center rounded-full px-2.5"
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs }}>
            <Text className="font-sora text-accent-foreground text-[11px] font-bold">
              {monthFilter.state.selectedLabel}
            </Text>
            <MaterialCommunityIcons
              name="chevron-down"
              size={14}
              color={Colors.shared.midnightBlue}
            />
          </View>
        </PressableFeedback>
        {showStepButtons && (
          <IconButton
            testID="month-filter-next"
            icon="chevron-right"
            accessibilityLabel={Strings.monthFilterNextA11y}
            onPress={monthFilter.onNextMonth}
          />
        )}
      </View>

      <Sheet
        isOpen={monthFilter.state.isPickerOpen}
        onOpenChange={monthFilter.onPickerOpenChange}
        title={Strings.monthPickerTitle}
        fitContent
      >
        <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: Spacing.sm,
            }}
          >
            <IconButton
              icon="chevron-left"
              accessibilityLabel={Strings.monthPickerPreviousYearA11y}
              onPress={monthFilter.onPreviousPickerYear}
            />
            <Text className="font-sora text-foreground text-[17px] font-bold">
              {monthFilter.state.pickerYear}
            </Text>
            <IconButton
              icon="chevron-right"
              accessibilityLabel={Strings.monthPickerNextYearA11y}
              onPress={monthFilter.onNextPickerYear}
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
            {monthFilter.state.pickerMonths.map((month) => (
              <PressableFeedback
                key={month.key}
                onPress={month.onPress}
                accessibilityRole="button"
                accessibilityLabel={month.accessibilityLabel}
                accessibilityState={month.accessibilityState}
                style={{ width: '31.5%' }}
                className={month.buttonClassName}
              >
                <Text className={month.labelClassName}>{month.label}</Text>
              </PressableFeedback>
            ))}
          </View>
        </View>
      </Sheet>
    </>
  );
}

export type { MonthFilterProps };
