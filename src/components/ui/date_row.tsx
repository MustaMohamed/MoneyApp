import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatWeekdayDate } from '@/utils/format_date';

import { DatePickerSheet } from './date_picker_sheet';
import { useDateRowPicker } from './date_picker_sheet.hook';
import { FormPickerRow } from './form_picker_row';

interface Props {
  ownerId: string;
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  divider?: boolean;
  label?: string;
  testID?: string;
  pickerTitle?: string;
  capsAtToday?: boolean;
  disabled?: boolean;
}

export function DateRow({
  ownerId,
  value,
  onChange,
  divider,
  label = Strings.addTxDateLabel,
  testID = 'date-row',
  pickerTitle = Strings.addTxDatePickerTitle,
  capsAtToday = true,
  disabled,
}: Props): React.ReactElement {
  const picker = useDateRowPicker(ownerId, value, onChange, { capsAtToday });
  const formatted = formatWeekdayDate(value);

  return (
    <View>
      <FormPickerRow
        testID={testID}
        label={label}
        value={formatted}
        onPress={picker.open}
        disabled={disabled}
        divider={divider}
        accessibilityLabel={`${label}: ${formatted}`}
        suffix={
          <MaterialCommunityIcons name="calendar" size={Size.iconSm} color={CoreTokens.text2} />
        }
      />

      {picker.state.showAndroidPicker ? (
        <DateTimePicker
          testID="date-picker-android"
          value={picker.state.pickerDate}
          mode="date"
          display="default"
          maximumDate={picker.state.maximumDate}
          onValueChange={picker.selectAndroid}
          onDismiss={picker.dismissAndroid}
        />
      ) : null}

      {Platform.OS === 'ios' && picker.state.shouldRenderIos ? (
        <DatePickerSheet
          isOpen={picker.state.isOpen}
          title={pickerTitle}
          value={picker.state.pickerDate}
          maximumDate={picker.state.maximumDate}
          onValueChange={picker.selectIos}
          onCancel={picker.cancelIos}
          onDone={picker.commitIos}
          onCloseComplete={picker.completeIosClose}
        />
      ) : null}
    </View>
  );
}
