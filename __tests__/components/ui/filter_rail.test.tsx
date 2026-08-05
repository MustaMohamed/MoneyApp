import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { FilterRail } from '@/components/ui/filter_rail';
import { Strings } from '@/constants/strings';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: ({
    segments,
    onValueChange,
    accessibilityLabel,
  }: {
    segments: ReadonlyArray<{ value: string; label: string; accessibilityLabel?: string }>;
    onValueChange: (value: string) => void;
    accessibilityLabel?: string;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View accessibilityLabel={accessibilityLabel}>
        {segments.map((segment) => (
          <Pressable
            key={segment.value}
            accessibilityRole="tab"
            accessibilityLabel={segment.accessibilityLabel ?? segment.label}
            onPress={() => onValueChange(segment.value)}
          >
            <Text>{segment.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));
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

const filters = [
  { value: 'all', label: 'All' },
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
] as const;

describe('FilterRail', () => {
  it('uses compact rounded rail spacing', async () => {
    const { getByTestId } = await render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={jest.fn()}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    expect(getByTestId('filter-rail-container')).toHaveProp(
      'className',
      expect.stringContaining('pb-1'),
    );
    expect(getByTestId('filter-rail-surface')).toHaveProp(
      'className',
      expect.stringContaining('rounded-3xl'),
    );
    expect(getByTestId('filter-rail-surface')).toHaveProp(
      'className',
      expect.stringContaining('overflow-hidden'),
    );
    expect(getByTestId('filter-rail-surface')).toHaveProp(
      'className',
      expect.stringContaining('p-1'),
    );
  });

  it('renders the selected month and every dynamic filter', async () => {
    const { getByText } = await render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={jest.fn()}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    expect(getByText('August 2026')).toBeTruthy();
    expect(getByText('All')).toBeTruthy();
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
  });

  it('changes to the previous and next month from the step buttons', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, rerender } = await render(
      <FilterRail
        selectedMonth="2026-01"
        onSelectedMonthChange={onSelectedMonthChange}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterPreviousA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2025-12');

    await rerender(
      <FilterRail
        selectedMonth="2026-12"
        onSelectedMonthChange={onSelectedMonthChange}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterNextA11y));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2027-01');
  });

  it('opens the picker and changes to the selected month', async () => {
    const onSelectedMonthChange = jest.fn();
    const { getByLabelText, getByText } = await render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={onSelectedMonthChange}
        selectedFilter="all"
        onSelectedFilterChange={jest.fn()}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('August 2026')));
    expect(getByText(Strings.monthPickerTitle)).toBeTruthy();

    await fireEvent.press(getByLabelText('Nov 2026'));
    expect(onSelectedMonthChange).toHaveBeenCalledWith('2026-11');
  });

  it('selects a dynamic filter by value', async () => {
    const onSelectedFilterChange = jest.fn();
    const { getByText } = await render(
      <FilterRail
        selectedMonth="2026-08"
        onSelectedMonthChange={jest.fn()}
        selectedFilter="all"
        onSelectedFilterChange={onSelectedFilterChange}
        filters={filters}
        filterAccessibilityLabel="Transaction type filter"
      />,
    );

    await fireEvent.press(getByText('Expense'));
    expect(onSelectedFilterChange).toHaveBeenCalledWith('expense');
  });
});
