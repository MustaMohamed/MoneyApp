import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { MonthCarousel } from '@/screens/transactions_v2/components/month_carousel';

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

const NOW = new Date('2026-05-17T10:00:00Z');

describe('MonthCarousel', () => {
  it('renders [All] + 6 month pills + [Custom]', () => {
    const { getByText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={() => {}}
        onOpenCustom={() => {}}
      />,
    );
    expect(getByText('All')).toBeTruthy();
    expect(getByText(/Dec 2025/)).toBeTruthy();
    expect(getByText(/May 2026/)).toBeTruthy();
    expect(getByText('Custom')).toBeTruthy();
  });

  it('marks the current month pill as selected by default', () => {
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={() => {}}
        onOpenCustom={() => {}}
      />,
    );
    expect(getByLabelText('May 2026, selected, period filter')).toBeTruthy();
  });

  it('fires onSelect with the correct selection when a month pill is tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={onSelect}
        onOpenCustom={() => {}}
      />,
    );
    fireEvent.press(getByLabelText(/Mar 2026, period filter/));
    expect(onSelect).toHaveBeenCalledWith({ type: 'month', yearMonth: '2026-03' });
  });

  it('fires onSelect with { type: "all" } when All pill is tapped', () => {
    const onSelect = jest.fn();
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={onSelect}
        onOpenCustom={() => {}}
      />,
    );
    fireEvent.press(getByLabelText(/All, period filter/));
    expect(onSelect).toHaveBeenCalledWith({ type: 'all' });
  });

  it('fires onOpenCustom when Custom pill is tapped', () => {
    const onOpenCustom = jest.fn();
    const { getByLabelText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'month', yearMonth: '2026-05' }}
        customRange={null}
        onSelect={() => {}}
        onOpenCustom={onOpenCustom}
      />,
    );
    fireEvent.press(getByLabelText(/Custom, period filter/));
    expect(onOpenCustom).toHaveBeenCalledTimes(1);
  });

  it('shows custom range in Custom pill label when active', () => {
    const { getByText } = render(
      <MonthCarousel
        now={NOW}
        selection={{ type: 'custom', from: '2026-05-01', to: '2026-05-15' }}
        customRange={{ from: '2026-05-01', to: '2026-05-15' }}
        onSelect={() => {}}
        onOpenCustom={() => {}}
      />,
    );
    expect(getByText('2026-05-01 → 2026-05-15')).toBeTruthy();
  });
});
