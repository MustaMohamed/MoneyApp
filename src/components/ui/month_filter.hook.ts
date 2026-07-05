import { useCallback, useEffect, useMemo } from 'react';

import { Strings } from '@/constants/strings';
import { formatMonthYear } from '@/utils/format_date';
import {
  MONTHS_SHORT,
  monthNumberFromYearMonth,
  shiftYearMonth,
  toYearMonth,
  yearFromYearMonth,
} from '@/utils/year_month';

import { useMonthFilterState } from './month_filter.state';

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
  const {
    state: monthFilterState,
    setPickerOpen,
    setPickerYear,
    shiftPickerYear,
  } = useMonthFilterState(selectedYear);

  useEffect(() => {
    if (monthFilterState.isPickerOpen) setPickerYear(selectedYear);
  }, [monthFilterState.isPickerOpen, selectedYear, setPickerYear]);

  const onPreviousMonth = useCallback(() => {
    onSelectedMonthChange(shiftYearMonth(selectedMonth, -1));
  }, [onSelectedMonthChange, selectedMonth]);

  const onNextMonth = useCallback(() => {
    onSelectedMonthChange(shiftYearMonth(selectedMonth, 1));
  }, [onSelectedMonthChange, selectedMonth]);

  const onOpenPicker = useCallback(() => {
    setPickerYear(selectedYear);
    setPickerOpen(true);
  }, [selectedYear, setPickerOpen, setPickerYear]);

  const onPreviousPickerYear = useCallback(() => {
    shiftPickerYear(-1);
  }, [shiftPickerYear]);

  const onNextPickerYear = useCallback(() => {
    shiftPickerYear(1);
  }, [shiftPickerYear]);

  const selectMonth = useCallback(
    (monthNumber: number) => {
      onSelectedMonthChange(toYearMonth(monthFilterState.pickerYear, monthNumber));
      setPickerOpen(false);
    },
    [monthFilterState.pickerYear, onSelectedMonthChange, setPickerOpen],
  );

  const pickerMonths = useMemo<PickerMonth[]>(
    () =>
      MONTHS_SHORT.map((label, index) => {
        const monthNumber = index + 1;
        const selected =
          monthFilterState.pickerYear === selectedYear && monthNumber === selectedMonthNumber;

        return {
          key: label,
          label,
          accessibilityLabel: `${label} ${monthFilterState.pickerYear}`,
          accessibilityState: { selected },
          buttonClassName: selected ? selectedMonthClassName : unselectedMonthClassName,
          labelClassName: selected ? selectedLabelClassName : unselectedLabelClassName,
          onPress: () => selectMonth(monthNumber),
        };
      }),
    [monthFilterState.pickerYear, selectMonth, selectedMonthNumber, selectedYear],
  );

  return {
    state: {
      selectedLabel,
      openPickerAccessibilityLabel: Strings.monthFilterOpenA11y(selectedLabel),
      isPickerOpen: monthFilterState.isPickerOpen,
      pickerYear: monthFilterState.pickerYear,
      pickerMonths,
    },
    onPickerOpenChange: setPickerOpen,
    onOpenPicker,
    onPreviousMonth,
    onNextMonth,
    onPreviousPickerYear,
    onNextPickerYear,
  };
}
