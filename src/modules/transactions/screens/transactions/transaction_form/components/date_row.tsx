import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate } from '@/utils/format_date';

import { DatePickerSheet } from './date_picker_sheet';
import { useTransactionDatePicker } from './date_picker_sheet.hook';
import { FACT_ROW_MIN_HEIGHT } from './form_picker_row';

interface Props {
  ownerId: string;
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
}

export function DateRow({ ownerId, value, onChange }: Props): React.ReactElement {
  const picker = useTransactionDatePicker(ownerId, value, onChange);
  const formatted = formatLongDate(value);

  return (
    <View>
      <PressableFeedback
        testID="date-row"
        onPress={picker.open}
        accessibilityRole="button"
        accessibilityLabel={`${Strings.addTxDateLabel}: ${formatted}`}
        className="border-separator gap-3 border-b py-2"
        style={{
          minHeight: FACT_ROW_MIN_HEIGHT,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text
          className="font-inter text-content-secondary"
          style={{ flexShrink: 0, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
        >
          {Strings.addTxDateLabel}
        </Text>
        <View
          className="gap-2"
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'flex-end',
          }}
        >
          <Text
            numberOfLines={1}
            className="font-sora text-foreground tabular-nums"
            style={{
              flexShrink: 1,
              textAlign: 'right',
              fontSize: Type.body,
              lineHeight: lineHeightFor(Type.body),
            }}
          >
            {formatted}
          </Text>
          <MaterialCommunityIcons name="calendar" size={Size.iconSm} color={CoreTokens.text2} />
        </View>
      </PressableFeedback>

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
