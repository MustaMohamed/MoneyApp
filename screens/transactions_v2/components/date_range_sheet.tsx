import React, { useState, useEffect } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { toLocalDateString } from '@/utils/format_date';

interface Props {
  visible: boolean;
  initialFrom?: string;
  initialTo?: string;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
}

export function DateRangeSheet({
  visible,
  initialFrom,
  initialTo,
  onClose,
  onConfirm,
}: Props): React.ReactElement {
  const [from, setFrom] = useState<Date>(() => (initialFrom ? new Date(initialFrom) : new Date()));
  const [to, setTo] = useState<Date>(() => (initialTo ? new Date(initialTo) : new Date()));

  useEffect(() => {
    if (visible) {
      setFrom(initialFrom ? new Date(initialFrom) : new Date());
      setTo(initialTo ? new Date(initialTo) : new Date());
    }
  }, [visible, initialFrom, initialTo]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={Strings.dateRangePickerTitle}
      size="md"
      footer={
        <View className="px-4 pt-3 pb-6 flex-row gap-2">
          <View className="flex-1">
            <Button variant="ghost" label={Strings.dateRangePickerCancel} onPress={onClose} />
          </View>
          <View className="flex-1">
            <Button
              variant="primary"
              label={Strings.dateRangePickerConfirm}
              onPress={() => onConfirm(toLocalDateString(from), toLocalDateString(to))}
            />
          </View>
        </View>
      }
    >
      <Sheet.Body>
        <View className="px-4 py-2">
          <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/60 mb-1">
            {Strings.dateRangePickerFromLabel}
          </Text>
          <DateTimePicker
            value={from}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => d && setFrom(d)}
            maximumDate={to}
          />
          <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/60 mt-4 mb-1">
            {Strings.dateRangePickerToLabel}
          </Text>
          <DateTimePicker
            value={to}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => d && setTo(d)}
            minimumDate={from}
            maximumDate={new Date()}
          />
        </View>
      </Sheet.Body>
    </Sheet>
  );
}
