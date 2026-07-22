// modules/transactions/screens/transactions/transaction_form/components/date_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate } from '@/utils/format_date';
import { ms } from '@/utils/responsive';

import { DatePickerSheet } from './date_picker_sheet';
import { useTransactionDatePicker } from './date_picker_sheet.hook';

interface Props {
  ownerId: string;
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
}

export const DATE_ROW_HEIGHT = ms(54);

export function DateRow({ ownerId, value, onChange }: Props): React.ReactElement {
  const picker = useTransactionDatePicker(ownerId, value, onChange);
  const formatted = formatLongDate(value);

  return (
    <View className="mt-2">
      <PressableFeedback
        testID="date-row"
        onPress={picker.open}
        accessibilityRole="button"
        accessibilityLabel={`${Strings.addTxDateLabel}: ${formatted}`}
        className="bg-default rounded-md px-3"
        style={{
          height: DATE_ROW_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <View>
          <Text className="font-inter text-muted" style={{ fontSize: Type.micro }}>
            {Strings.addTxDateLabel}
          </Text>
          <Text
            className="font-sora text-foreground font-semibold"
            style={{ fontSize: Type.bodyStrong }}
          >
            {formatted}
          </Text>
        </View>
        <MaterialCommunityIcons name="calendar" size={Size.iconSm} color={CoreTokens.text2} />
      </PressableFeedback>

      {picker.state.showAndroidPicker ? (
        <DateTimePicker
          testID="date-picker-android"
          value={picker.state.pickerDate}
          mode="date"
          display="default"
          maximumDate={picker.state.maximumDate}
          onChange={picker.changeAndroid}
        />
      ) : null}

      {Platform.OS === 'ios' && picker.state.shouldRenderIos ? (
        <DatePickerSheet
          isOpen={picker.state.isOpen}
          value={picker.state.pickerDate}
          maximumDate={picker.state.maximumDate}
          onChange={picker.changeIos}
          onCancel={picker.cancelIos}
          onDone={picker.commitIos}
          onCloseComplete={picker.completeIosClose}
        />
      ) : null}
    </View>
  );
}
