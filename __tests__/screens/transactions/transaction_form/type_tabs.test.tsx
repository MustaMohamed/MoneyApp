import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import type { SegmentedTabsProps } from '@/components/ui/tabs';
import { TransactionType } from '@/constants/enums';

const mockSegmentedTabs = jest.fn((props: SegmentedTabsProps<TransactionType>) => (
  <View testID="segmented-tabs" {...props} />
));

jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: (props: SegmentedTabsProps<TransactionType>) => mockSegmentedTabs(props),
}));

import { TypeTabs } from '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs';

describe('TypeTabs', () => {
  beforeEach(() => mockSegmentedTabs.mockClear());

  it('uses the canonical compact HeroUI segmented control with stable labels', () => {
    const onSelect = jest.fn();
    render(
      <TypeTabs
        active={TransactionType.Expense}
        incomeLabel="Transfer in"
        onSelect={onSelect}
        isDisabled={false}
      />,
    );

    const props = mockSegmentedTabs.mock.calls[0]?.[0];
    expect(props).toBeDefined();

    expect(props.segments.map(({ value }) => value)).toEqual([
      TransactionType.Expense,
      TransactionType.Income,
      TransactionType.Transfer,
      TransactionType.CCPayment,
    ]);
    expect(props.segments[1].label).toBe('Transfer in');
    expect(props.variant).toBe('solid-gold');
    expect(props.density).toBe('compact');
    expect(props.listClassName).toContain('w-full');

    props.onValueChange(TransactionType.Transfer);
    expect(onSelect).toHaveBeenCalledWith(TransactionType.Transfer);
  });
});
