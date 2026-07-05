import { useCallback, useEffect, useMemo, useState } from 'react';

import { Strings } from '@/constants/strings';
import { formatMonthYear } from '@/utils/format_date';
import {
  MONTHS_SHORT,
  monthNumberFromYearMonth,
  shiftYearMonth,
  toYearMonth,
  yearFromYearMonth,
} from '@/utils/year_month';

export interface MonthFilterProps {
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
}

interface PickerMonth {
  key: string;
  label: string;
  accessibilityLabel: string;
  accessibilityState: { selected: boolean };
  buttonClassName: string;
  labelClassName: string;
  onPress: () => void;
}

const selectedMonthClassName = 'bg-accent items-center rounded-xl py-2.5';
const unselectedMonthClassName = 'bg-default/60 items-center rounded-xl py-2.5';
const selectedLabelClassName = 'font-inter text-accent-foreground text-[12px] font-bold';
const unselectedLabelClassName = 'font-inter text-foreground text-[12px] font-semibold';

export function useMonthFilter({ selectedMonth, onSelectedMonthChange }: MonthFilterProps) {
  const selectedLabel = formatMonthYear(selectedMonth);
  const selectedYear = yearFromYearMonth(selectedMonth);
  const selectedMonthNumber = monthNumberFromYearMonth(selectedMonth);
  const [isPickerOpen, setPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(selectedYear);

  useEffect(() => {
    if (isPickerOpen) setPickerYear(selectedYear);
  }, [isPickerOpen, selectedYear]);

  const onPreviousMonth = useCallback(() => {
    onSelectedMonthChange(shiftYearMonth(selectedMonth, -1));
  }, [onSelectedMonthChange, selectedMonth]);

  const onNextMonth = useCallback(() => {
    onSelectedMonthChange(shiftYearMonth(selectedMonth, 1));
  }, [onSelectedMonthChange, selectedMonth]);

  const onOpenPicker = useCallback(() => {
    setPickerOpen(true);
  }, []);

  const onPreviousPickerYear = useCallback(() => {
    setPickerYear((year) => year - 1);
  }, []);

  const onNextPickerYear = useCallback(() => {
    setPickerYear((year) => year + 1);
  }, []);

  const selectMonth = useCallback(
    (monthNumber: number) => {
      onSelectedMonthChange(toYearMonth(pickerYear, monthNumber));
      setPickerOpen(false);
    },
    [onSelectedMonthChange, pickerYear],
  );

  const pickerMonths = useMemo<PickerMonth[]>(
    () =>
      MONTHS_SHORT.map((label, index) => {
        const monthNumber = index + 1;
        const selected = pickerYear === selectedYear && monthNumber === selectedMonthNumber;

        return {
          key: label,
          label,
          accessibilityLabel: `${label} ${pickerYear}`,
          accessibilityState: { selected },
          buttonClassName: selected ? selectedMonthClassName : unselectedMonthClassName,
          labelClassName: selected ? selectedLabelClassName : unselectedLabelClassName,
          onPress: () => selectMonth(monthNumber),
        };
      }),
    [pickerYear, selectMonth, selectedMonthNumber, selectedYear],
  );

  return {
    selectedLabel,
    openPickerAccessibilityLabel: Strings.monthFilterOpenA11y(selectedLabel),
    isPickerOpen,
    onPickerOpenChange: setPickerOpen,
    onOpenPicker,
    onPreviousMonth,
    onNextMonth,
    pickerYear,
    onPreviousPickerYear,
    onNextPickerYear,
    pickerMonths,
  };
}
