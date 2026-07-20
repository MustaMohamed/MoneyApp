// modules/transactions/screens/transactions/transaction_form/components/date_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import { useState } from 'react';
import { Platform, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
}

export function DateRow({ value, onChange }: Props): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const dateAsDate = new Date(`${value}T12:00:00`);
  const formatted = formatLongDate(value);
  const maximumDate = new Date();

  const handlePress = () => setShowPicker(true);

  const handleAndroidChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && d) onChange(toLocalDateString(d));
  };

  const handleIosChange = (_event: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(toLocalDateString(d));
  };

  return (
    <View className="mt-3">
      <PressableFeedback
        testID="date-row"
        onPress={handlePress}
        className="bg-default rounded-md px-3 py-3"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View>
          <Text className="font-inter text-muted text-[11px]">{Strings.addTxDateLabel}</Text>
          <Text className="font-sora text-foreground text-[15px] font-semibold">{formatted}</Text>
        </View>
        <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
      </PressableFeedback>

      {Platform.OS === 'android' && showPicker ? (
        <DateTimePicker
          testID="date-picker-android"
          value={dateAsDate}
          mode="date"
          display="default"
          maximumDate={maximumDate}
          onChange={handleAndroidChange}
        />
      ) : null}

      {Platform.OS === 'ios' && showPicker ? (
        <DateTimePicker
          testID="date-picker-ios"
          value={dateAsDate}
          mode="date"
          display="spinner"
          themeVariant="dark"
          maximumDate={maximumDate}
          onChange={handleIosChange}
        />
      ) : null}
    </View>
  );
}
