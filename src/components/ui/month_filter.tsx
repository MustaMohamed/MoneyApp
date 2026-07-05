import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Spacing } from '@/constants/theme';
import { formatMonthYear } from '@/utils/format_date';
import {
  MONTHS_SHORT,
  monthNumberFromYearMonth,
  shiftYearMonth,
  toYearMonth,
  yearFromYearMonth,
} from '@/utils/year_month';

import { Sheet } from './sheet';
import { Text } from './text';

interface MonthFilterProps {
  yearMonth: string;
  onChange: (yearMonth: string) => void;
}

interface IconButtonProps {
  icon: 'chevron-left' | 'chevron-right';
  accessibilityLabel: string;
  onPress: () => void;
}

function IconButton({ icon, accessibilityLabel, onPress }: IconButtonProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="bg-default/60 h-10 w-10 items-center justify-center rounded-full"
    >
      <MaterialCommunityIcons name={icon} size={24} color={Colors.dark.text1} />
    </PressableFeedback>
  );
}

export function MonthFilter({ yearMonth, onChange }: MonthFilterProps) {
  const selectedLabel = formatMonthYear(yearMonth);
  const selectedYear = yearFromYearMonth(yearMonth);
  const selectedMonth = monthNumberFromYearMonth(yearMonth);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  useEffect(() => {
    if (isPickerOpen) setPickerYear(selectedYear);
  }, [isPickerOpen, selectedYear]);

  const months = useMemo(
    () => MONTHS_SHORT.map((label, index) => ({ label, monthNumber: index + 1 })),
    [],
  );

  const stepMonth = useCallback(
    (delta: number) => {
      onChange(shiftYearMonth(yearMonth, delta));
    },
    [onChange, yearMonth],
  );

  const selectMonth = useCallback(
    (monthNumber: number) => {
      onChange(toYearMonth(pickerYear, monthNumber));
      setPickerOpen(false);
    },
    [onChange, pickerYear],
  );

  return (
    <>
      <View className="px-4 pt-1 pb-2">
        <View
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}
          className="bg-default/40 border-border rounded-2xl border p-1.5"
        >
          <IconButton
            icon="chevron-left"
            accessibilityLabel={Strings.monthFilterPreviousA11y}
            onPress={() => stepMonth(-1)}
          />
          <PressableFeedback
            onPress={() => setPickerOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={Strings.monthFilterOpenA11y(selectedLabel)}
            className="bg-accent h-10 flex-1 items-center justify-center rounded-full px-4"
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs }}>
              <Text className="font-sora text-accent-foreground text-[13px] font-bold">
                {selectedLabel}
              </Text>
              <MaterialCommunityIcons
                name="chevron-down"
                size={18}
                color={Colors.shared.midnightBlue}
              />
            </View>
          </PressableFeedback>
          <IconButton
            icon="chevron-right"
            accessibilityLabel={Strings.monthFilterNextA11y}
            onPress={() => stepMonth(1)}
          />
        </View>
      </View>

      <Sheet
        isOpen={isPickerOpen}
        onOpenChange={setPickerOpen}
        title={Strings.monthPickerTitle}
        fitContent
      >
        <View style={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: Spacing.sm,
            }}
          >
            <IconButton
              icon="chevron-left"
              accessibilityLabel={Strings.monthPickerPreviousYearA11y}
              onPress={() => setPickerYear((year) => year - 1)}
            />
            <Text className="font-sora text-foreground text-[17px] font-bold">{pickerYear}</Text>
            <IconButton
              icon="chevron-right"
              accessibilityLabel={Strings.monthPickerNextYearA11y}
              onPress={() => setPickerYear((year) => year + 1)}
            />
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
            {months.map(({ label, monthNumber }) => {
              const selected = pickerYear === selectedYear && monthNumber === selectedMonth;
              return (
                <PressableFeedback
                  key={label}
                  onPress={() => selectMonth(monthNumber)}
                  accessibilityRole="button"
                  accessibilityLabel={`${label} ${pickerYear}`}
                  accessibilityState={{ selected }}
                  style={{ width: '31.5%' }}
                  className={
                    selected
                      ? 'bg-accent items-center rounded-xl py-2.5'
                      : 'bg-default/60 items-center rounded-xl py-2.5'
                  }
                >
                  <Text
                    className={
                      selected
                        ? 'font-inter text-accent-foreground text-[12px] font-bold'
                        : 'font-inter text-foreground text-[12px] font-semibold'
                    }
                  >
                    {label}
                  </Text>
                </PressableFeedback>
              );
            })}
          </View>
        </View>
      </Sheet>
    </>
  );
}
