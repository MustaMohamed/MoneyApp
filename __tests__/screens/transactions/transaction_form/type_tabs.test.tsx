import { render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, View } from 'react-native';

import type { SegmentedTabsProps } from '@/components/ui/tabs';
import { AmountType, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TRANSACTION_TYPE_ICONS } from '@/constants/transaction_type_icons';

const mockSegmentedTabs = jest.fn((props: SegmentedTabsProps<TransactionType>) => (
  <View testID="segmented-tabs" {...props} />
));

jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: (props: SegmentedTabsProps<TransactionType>) => mockSegmentedTabs(props),
}));

import {
  ACCOUNT_STRIP_WRAPPER_PADDING_Y,
  resolveFormSupportLineTextProps,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { FormTypeTabs } from '@/components/ui/form_type_tabs';
import { TypeTabs } from '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs';

const STRIP_CHILD = <View testID="strip-child" />;

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
        supportText={Strings.addTxSupportExpense}
      >
        {STRIP_CHILD}
      </TypeTabs>,
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
    const geometry = resolveTypeTabsGeometry(Dimensions.get('window').fontScale);
    expect(props.listStyle).toEqual({ height: geometry.listHeight });
    // Without this, an undefined slop would compare equal below.
    expect(geometry.triggerHitSlop).toBeDefined();
    expect(props.triggerHitSlop).toEqual(geometry.triggerHitSlop);

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
        supportText={Strings.addTxSupportExpense}
      >
        {STRIP_CHILD}
      </TypeTabs>,
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
        supportText={Strings.addTxSupportExpense}
      >
        {STRIP_CHILD}
      </TypeTabs>,
    );

    const props = mockSegmentedTabs.mock.calls[0]?.[0];
    expect(props).toBeDefined();

    expect(props.isDisabled).toBe(true);
    expect(props.segments.map(({ icon }) => icon)).toEqual(ICONS_IN_TAB_ORDER);
  });

  it('MA-254: draws the support line on one line under the tabs and the strip child inside the strip row', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    await render(
      <TypeTabs
        active={TransactionType.Expense}
        incomeLabel={Strings.addTxTypeIncome}
        onSelect={jest.fn()}
        isDisabled={false}
        supportText={Strings.addTxSupportExpense}
      >
        {STRIP_CHILD}
      </TypeTabs>,
    );

    const expected = resolveFormSupportLineTextProps('one', fontScale);
    const line = screen.getByTestId('form-type-tabs-support-line');
    expect(line).toHaveTextContent(Strings.addTxSupportExpense);
    expect(line).toHaveProp('numberOfLines', expected.numberOfLines);
    expect(line).toHaveProp('allowFontScaling', expected.allowFontScaling);
    expect(line).toHaveStyle(expected.style);

    const stripRow = screen.getByTestId('form-strip-row');
    expect(within(stripRow).getByTestId('strip-child')).toBeTruthy();
    expect(stripRow).toHaveStyle({ paddingVertical: ACCOUNT_STRIP_WRAPPER_PADDING_Y });
  });

  it('MA-254: lets the commitment support line wrap whole, scaled as the shared piece scales it, with no line cap and no shrink', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    await render(
      <FormTypeTabs<AmountType>
        segments={[
          { value: AmountType.Fixed, label: Strings.commitmentsTypeFixedAmount },
          { value: AmountType.Variable, label: Strings.commitmentsTypeVariesEachTime },
        ]}
        value={AmountType.Variable}
        onValueChange={jest.fn()}
        accessibilityLabel={Strings.commitmentsAmountTypeSelectorA11y}
        supportText={Strings.commitmentsTypeVariableSupport}
        supportLines="wrap"
      >
        {STRIP_CHILD}
      </FormTypeTabs>,
    );

    const expected = resolveFormSupportLineTextProps('wrap', fontScale);
    const line = screen.getByTestId('form-type-tabs-support-line');
    expect(line).toHaveTextContent(Strings.commitmentsTypeVariableSupport);
    expect(line).toHaveProp('allowFontScaling', expected.allowFontScaling);
    expect(line).toHaveStyle(expected.style);
    const lineCap: unknown = line.props.numberOfLines;
    expect(lineCap).toBeUndefined();
    expect(line).not.toHaveStyle({ flexShrink: 1 });
  });
});
