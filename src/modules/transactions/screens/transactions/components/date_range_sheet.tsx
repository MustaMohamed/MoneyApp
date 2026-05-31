// modules/transactions/screens/transactions/components/date_range_sheet.tsx
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { PressableFeedback } from 'heroui-native';
import React, { useState, useEffect } from 'react';
import { Platform, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

interface Props {
  isOpen: boolean;
  initialFrom?: string;
  initialTo?: string;
  onOpenChange: (open: boolean) => void;
  onConfirm: (from: string, to: string) => void;
  onReset?: () => void;
}

export function DateRangeSheet({
  isOpen,
  initialFrom,
  initialTo,
  onOpenChange,
  onConfirm,
  onReset,
}: Props): React.ReactElement {
  const [from, setFrom] = useState<Date>(() => (initialFrom ? new Date(initialFrom) : new Date()));
  const [to, setTo] = useState<Date>(() => (initialTo ? new Date(initialTo) : new Date()));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFrom(initialFrom ? new Date(initialFrom) : new Date());
      setTo(initialTo ? new Date(initialTo) : new Date());
      setShowFromPicker(false);
      setShowToPicker(false);
    }
  }, [isOpen, initialFrom, initialTo]);

  return (
    <Sheet
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title={Strings.dateRangePickerTitle}
      snapPoints={['55%']}
      footer={
        <View className="flex-row gap-2">
          <View className="flex-1">
            <Button
              variant="ghost"
              label={Strings.dateRangePickerCancel}
              onPress={() => onOpenChange(false)}
            />
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
      {onReset ? (
        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            paddingHorizontal: 16,
            paddingBottom: 4,
          }}
        >
          <PressableFeedback
            testID="date-range-reset"
            onPress={onReset}
            accessibilityRole="button"
            accessibilityLabel="Reset date range"
          >
            <Text className="font-inter text-accent text-[12px] font-semibold">
              {Strings.filterReset}
            </Text>
          </PressableFeedback>
        </View>
      ) : null}
      {isOpen ? (
        <View className="px-4 py-2">
          <Text className="font-inter text-foreground/60 mb-1 text-[10px] font-semibold uppercase">
            {Strings.dateRangePickerFromLabel}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={from}
              mode="date"
              display="inline"
              onChange={(_, d) => d && setFrom(d)}
              maximumDate={to}
            />
          ) : (
            <>
              <PressableFeedback
                testID="date-range-from-trigger"
                onPress={() => setShowFromPicker(true)}
                className="border-border bg-default/30 rounded-lg border px-3 py-3"
              >
                <Text className="font-inter text-foreground text-[14px]">
                  {formatLongDate(toLocalDateString(from))}
                </Text>
              </PressableFeedback>
              {showFromPicker ? (
                <DateTimePicker
                  value={from}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, d?: Date) => {
                    setShowFromPicker(false);
                    if (event.type === 'set' && d) setFrom(d);
                  }}
                  maximumDate={to}
                />
              ) : null}
            </>
          )}
          <Text className="font-inter text-foreground/60 mt-4 mb-1 text-[10px] font-semibold uppercase">
            {Strings.dateRangePickerToLabel}
          </Text>
          {Platform.OS === 'ios' ? (
            <DateTimePicker
              value={to}
              mode="date"
              display="inline"
              onChange={(_, d) => d && setTo(d)}
              minimumDate={from}
              maximumDate={new Date()}
            />
          ) : (
            <>
              <PressableFeedback
                testID="date-range-to-trigger"
                onPress={() => setShowToPicker(true)}
                className="border-border bg-default/30 rounded-lg border px-3 py-3"
              >
                <Text className="font-inter text-foreground text-[14px]">
                  {formatLongDate(toLocalDateString(to))}
                </Text>
              </PressableFeedback>
              {showToPicker ? (
                <DateTimePicker
                  value={to}
                  mode="date"
                  display="default"
                  onChange={(event: DateTimePickerEvent, d?: Date) => {
                    setShowToPicker(false);
                    if (event.type === 'set' && d) setTo(d);
                  }}
                  minimumDate={from}
                  maximumDate={new Date()}
                />
              ) : null}
            </>
          )}
        </View>
      ) : null}
    </Sheet>
  );
}
