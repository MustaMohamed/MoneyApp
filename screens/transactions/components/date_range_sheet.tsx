import React, { useState, useEffect } from 'react';
import { Platform, Pressable, View } from 'react-native';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';

import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { formatLongDate, toLocalDateString } from '@/utils/format_date';

interface Props {
  visible: boolean;
  initialFrom?: string;
  initialTo?: string;
  onClose: () => void;
  onConfirm: (from: string, to: string) => void;
  /** Optional — when provided, a "Reset" link renders top-right. Parent decides
   *  what reset means (typically: clear custom range, switch back to default
   *  period, close sheet). */
  onReset?: () => void;
}

export function DateRangeSheet({
  visible,
  initialFrom,
  initialTo,
  onClose,
  onConfirm,
  onReset,
}: Props): React.ReactElement {
  const [from, setFrom] = useState<Date>(() => (initialFrom ? new Date(initialFrom) : new Date()));
  const [to, setTo] = useState<Date>(() => (initialTo ? new Date(initialTo) : new Date()));
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  useEffect(() => {
    if (visible) {
      setFrom(initialFrom ? new Date(initialFrom) : new Date());
      setTo(initialTo ? new Date(initialTo) : new Date());
      setShowFromPicker(false);
      setShowToPicker(false);
    }
  }, [visible, initialFrom, initialTo]);

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={Strings.dateRangePickerTitle}
      snapPoints={['55%']}
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
        {onReset ? (
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'flex-end',
              paddingHorizontal: 16,
              paddingBottom: 4,
            }}
          >
            <Pressable
              testID="date-range-reset"
              onPress={onReset}
              accessibilityRole="button"
              accessibilityLabel="Reset date range"
            >
              <Text className="font-inter font-semibold text-[12px] text-accent">
                {Strings.filterReset}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {/*
          Picker mounting strategy is platform-split:
          - iOS uses display="inline", which renders the calendar in place and
            updates via onChange without a native modal. Safe to mount while
            the sheet is visible.
          - Android uses display="default", which pops a native modal the
            instant the component renders into the JSX tree. Continuously
            mounting it re-pops the dialog after cancel, trapping the user
            in a loop. Android must use the imperative pattern: tap a date
            button to mount the picker, and unmount it on every onChange
            (regardless of "set" vs "dismissed").

          The outer {visible ? ...} guard is still required so iOS pickers
          and Android trigger buttons don't render while the sheet is closed.
        */}
        {visible ? (
          <View className="px-4 py-2">
            <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/60 mb-1">
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
                <Pressable
                  testID="date-range-from-trigger"
                  onPress={() => setShowFromPicker(true)}
                  className="border border-border bg-default/30 rounded-lg px-3 py-3"
                >
                  <Text className="font-inter text-[14px] text-foreground">
                    {formatLongDate(toLocalDateString(from))}
                  </Text>
                </Pressable>
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
            <Text className="font-inter font-semibold text-[10px] uppercase text-foreground/60 mt-4 mb-1">
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
                <Pressable
                  testID="date-range-to-trigger"
                  onPress={() => setShowToPicker(true)}
                  className="border border-border bg-default/30 rounded-lg px-3 py-3"
                >
                  <Text className="font-inter text-[14px] text-foreground">
                    {formatLongDate(toLocalDateString(to))}
                  </Text>
                </Pressable>
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
      </Sheet.Body>
    </Sheet>
  );
}
