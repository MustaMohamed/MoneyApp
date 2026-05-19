import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { CoreTokens } from '@/constants/theme_tokens';
import { Strings } from '@/constants/strings';
import { formatLongDate } from '@/utils/format_date';

interface Props {
  value: string; // YYYY-MM-DD
  onChange: (next: string) => void;
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function DateRow({ value, onChange }: Props): React.ReactElement {
  const [showPicker, setShowPicker] = useState(false);
  const dateAsDate = new Date(`${value}T12:00:00`);
  const formatted = formatLongDate(value);
  const maximumDate = new Date();

  const handlePress = () => setShowPicker(true);

  const handleAndroidChange = (event: DateTimePickerEvent, d?: Date) => {
    setShowPicker(false);
    if (event.type === 'set' && d) onChange(toISODate(d));
  };

  const handleIosChange = (_event: DateTimePickerEvent, d?: Date) => {
    if (d) onChange(toISODate(d));
  };

  return (
    <View className="mt-3">
      <Pressable
        testID="date-row"
        onPress={handlePress}
        className="rounded-md bg-default px-3 py-3"
        style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <View>
          <Text className="font-inter text-[11px] text-muted">{Strings.addTxDateLabel}</Text>
          <Text className="font-sora font-semibold text-[15px] text-foreground">{formatted}</Text>
        </View>
        <MaterialCommunityIcons name="calendar" size={18} color={CoreTokens.text2} />
      </Pressable>

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
