import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Platform, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate } from '@/utils/format_date';

import { DatePickerSheet } from './date_picker_sheet';
import { useTransactionDatePicker } from './date_picker_sheet.hook';
import { FormPickerRow } from './form_picker_row';

interface Props {
  ownerId: string;
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
  divider?: boolean;
}

export function DateRow({ ownerId, value, onChange, divider }: Props): React.ReactElement {
  const picker = useTransactionDatePicker(ownerId, value, onChange);
  const formatted = formatLongDate(value);

  return (
    <View>
      <FormPickerRow
        testID="date-row"
        label={Strings.addTxDateLabel}
        value={formatted}
        onPress={picker.open}
        divider={divider}
        accessibilityLabel={`${Strings.addTxDateLabel}: ${formatted}`}
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
