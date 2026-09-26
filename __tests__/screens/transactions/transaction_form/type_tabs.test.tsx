import { render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

import type { SegmentedTabsProps } from '@/components/ui/tabs';
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';

const mockSegmentedTabs = jest.fn((props: SegmentedTabsProps<TransactionType>) => (
  <View testID="segmented-tabs" {...props} />
));

jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: (props: SegmentedTabsProps<TransactionType>) => mockSegmentedTabs(props),
}));

import { TypeTabs } from '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs';

const ICONS_IN_TAB_ORDER = [
  TRANSACTION_TYPE_ICONS[TransactionType.Expense],
  TRANSACTION_TYPE_ICONS[TransactionType.Income],
  TRANSACTION_TYPE_ICONS[TransactionType.Transfer],
  TRANSACTION_TYPE_ICONS[TransactionType.CCPayment],
];

describe('TypeTabs', () => {
  beforeEach(() => mockSegmentedTabs.mockClear());

  it('uses the canonical compact HeroUI segmented control with stable labels', async () => {
    const onSelect = jest.fn();
    await render(
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

  it('draws each type with its icon in form corners, the income label overridden', async () => {
    await render(
      <TypeTabs
        active={TransactionType.Income}
        incomeLabel={Strings.addTxTypeCardCredit}
        onSelect={jest.fn()}
        isDisabled={false}
      />,
    );

    const props = mockSegmentedTabs.mock.calls[0]?.[0];
    expect(props).toBeDefined();

    expect(props.corners).toBe('form');
    expect(props.segments.map(({ icon }) => icon)).toEqual(ICONS_IN_TAB_ORDER);
    expect(props.segments.map(({ label }) => label)).toEqual([
      'Expense',
      'Card credit',
      'Transfer',
      'CC Payment',
    ]);
  });

  it('keeps the icons on the tabs when the type is locked for edit', async () => {
    await render(
      <TypeTabs
        active={TransactionType.Expense}
        incomeLabel={Strings.addTxTypeIncome}
        onSelect={jest.fn()}
        isDisabled
      />,
    );

    const props = mockSegmentedTabs.mock.calls[0]?.[0];
    expect(props).toBeDefined();

    expect(props.isDisabled).toBe(true);
    expect(props.segments.map(({ icon }) => icon)).toEqual(ICONS_IN_TAB_ORDER);
  });
});
