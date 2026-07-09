import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { SpendingPlanDatePickerTarget } from '@/modules/budget/screens/budget/components/spending_plan_sheet.state';
import { spendingPlanSheetStyles as styles } from '@/modules/budget/screens/budget/components/spending_plan_sheet.styles';
import { formatShortDate } from '@/utils/format_date';

interface SpendingPlanDateRangeProps {
  startDate: string;
  endDate: string;
  datePickerTarget: SpendingPlanDatePickerTarget | null;
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
      <View style={styles.dateRow}>
        <PressableFeedback
          accessibilityRole="button"
          accessibilityLabel={Strings.budgetPlanStartDate}
          onPress={() => openDatePicker('start')}
          style={styles.dateBox}
        >
          <Text style={styles.dateLabel}>{Strings.budgetPlanStartDate}</Text>
          <Text style={styles.dateValue}>{startDate ? formatShortDate(startDate) : '-'}</Text>
        </PressableFeedback>
        <PressableFeedback
          accessibilityRole="button"
          accessibilityLabel={Strings.budgetPlanEndDate}
          onPress={() => openDatePicker('end')}
          style={styles.dateBox}
        >
          <Text style={styles.dateLabel}>{Strings.budgetPlanEndDate}</Text>
          <Text style={styles.dateValue}>{endDate ? formatShortDate(endDate) : '-'}</Text>
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
