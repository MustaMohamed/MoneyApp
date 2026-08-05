import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { MonthFilter } from '@/components/ui/month_filter';
import { Strings } from '@/constants/strings';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: ReactNode }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View>
        <Text>{title}</Text>
        {children}
      </View>
    );
  },
}));

describe('MonthFilter', () => {
  it('uses compact controls inside the filter rail', async () => {
    const { getByTestId, getByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={jest.fn()} />,
    );

    expect(getByTestId('month-filter-previous')).toHaveProp(
      'className',
      expect.stringContaining('h-8'),
    );
    expect(getByTestId('month-filter-open')).toHaveProp(
      'className',
      expect.stringContaining('h-8'),
    );
    expect(getByTestId('month-filter-next')).toHaveProp(
      'className',
      expect.stringContaining('w-8'),
    );
    expect(getByText('August 2026')).toHaveProp(
      'className',
      expect.stringContaining('text-[11px]'),
    );
  });

  it('shows the selected month without the extra label', async () => {
    const { getByText, queryByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={jest.fn()} />,
    );

    expect(getByText('August 2026')).toBeTruthy();
    expect(queryByText(Strings.monthFilterLabel)).toBeNull();
  });

  it('changes to the previous and next month from the step buttons', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, rerender } = await render(
      <MonthFilter selectedMonth="2026-01" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterPreviousA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2025-12');

    await rerender(
      <MonthFilter selectedMonth="2026-12" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterNextA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2027-01');
  });

  it('opens the picker and changes to the selected month', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, getByText, queryByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));
    expect(getByText(Strings.monthPickerTitle)).toBeTruthy();

    await fireEvent.press(getByLabelText('Nov 2026'));

    expect(onSelectedMonthChange).toHaveBeenCalledWith('2026-11');
    expect(queryByText(Strings.monthPickerTitle)).toBeNull();
  });

  it('changes picker year before selecting a month', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, getByText } = await render(
      <MonthFilter selectedMonth="2026-08" onSelectedMonthChange={onSelectedMonthChange} />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));
    await fireEvent.press(getByLabelText(Strings.monthPickerNextYearA11y));

    expect(getByText('2027')).toBeTruthy();

    await fireEvent.press(getByLabelText('Feb 2027'));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2027-02');
  });
});
