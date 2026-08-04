import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { SpendingPlanDatePickerTarget } from '@/modules/budget/screens/budget/spending_plan_sheet/spending_plan_sheet.state';
import { formatShortDate } from '@/utils/format_date';

interface SpendingPlanDateRangeProps {
  startDate: string;
  endDate: string;
  datePickerTarget: SpendingPlanDatePickerTarget | undefined;
  datePickerValue: Date;
  openDatePicker: (target: SpendingPlanDatePickerTarget) => void;
  onDateChange: (
    target: SpendingPlanDatePickerTarget,
    event: DateTimePickerEvent,
    date?: Date,
  ) => void;
}

export function SpendingPlanDateRange({
  startDate,
  endDate,
  datePickerTarget,
  datePickerValue,
  openDatePicker,
  onDateChange,
}: SpendingPlanDateRangeProps) {
  return (
    <>
      <View className="mt-2 flex-row gap-2">
        <PressableFeedback
          accessibilityRole="button"
          accessibilityLabel={Strings.budgetPlanStartDate}
          onPress={() => openDatePicker('start')}
          className="bg-background border-border min-h-12 flex-1 rounded-lg border px-3 py-2"
        >
          <Text className="font-inter-medium text-muted text-[11px]">
            {Strings.budgetPlanStartDate}
          </Text>
          <Text className="font-sora-semibold text-foreground mt-0.5 text-[12px]">
            {startDate ? formatShortDate(startDate) : '-'}
          </Text>
        </PressableFeedback>
        <PressableFeedback
          accessibilityRole="button"
          accessibilityLabel={Strings.budgetPlanEndDate}
          onPress={() => openDatePicker('end')}
          className="bg-background border-border min-h-12 flex-1 rounded-lg border px-3 py-2"
        >
          <Text className="font-inter-medium text-muted text-[11px]">
            {Strings.budgetPlanEndDate}
          </Text>
          <Text className="font-sora-semibold text-foreground mt-0.5 text-[12px]">
            {endDate ? formatShortDate(endDate) : '-'}
          </Text>
        </PressableFeedback>
      </View>

      {datePickerTarget ? (
        <DateTimePicker
          testID={`spending-plan-date-picker-${datePickerTarget}`}
          value={datePickerValue}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          themeVariant="dark"
          onChange={(event, date) => onDateChange(datePickerTarget, event, date)}
        />
      ) : null}
    </>
  );
}
