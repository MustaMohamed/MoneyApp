import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { TextInput } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

jest.mock('heroui-native', () => {
  const ReactLocal = require('react');
  const { TextInput: RNTextInput } = require('react-native');
  return {
    cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' '),
    Input: ReactLocal.forwardRef((props: object, ref: React.Ref<unknown>) =>
      ReactLocal.createElement(RNTextInput, { ...props, ref }),
    ),
  };
});

jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));

import { AmountHero } from '@/modules/transactions/screens/transactions/transaction_form/components/amount_hero';

describe('AmountHero', () => {
  beforeEach(() => useAddTransactionStore.getState().reset());

  it('does not focus or select the amount when the sheet opens', () => {
    const { getByTestId } = render(
      <AmountHero
        onChange={jest.fn()}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    expect(getByTestId('amount-hero-value').props.autoFocus).not.toBe(true);
    expect(getByTestId('amount-hero-value').props.selectTextOnFocus).not.toBe(true);
  });

  it('allows the amount to remain empty while the user edits', () => {
    useAddTransactionStore.getState().setAmountStr('125');
    const onChange = jest.fn((value: string) =>
      useAddTransactionStore.getState().setAmountStr(value),
    );
    const { getByTestId } = render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    fireEvent.changeText(getByTestId('amount-hero-value'), '');

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('keeps only one decimal separator and two fraction digits', () => {
    const onChange = jest.fn((value: string) =>
      useAddTransactionStore.getState().setAmountStr(value),
    );
    const { UNSAFE_getByType } = render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    fireEvent.changeText(UNSAFE_getByType(TextInput), '1a2.345.6');

    expect(onChange).toHaveBeenCalledWith('12.34');
  });

  it('normalizes a leading decimal to a value accepted by submission parsing', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    fireEvent.changeText(getByTestId('amount-hero-value'), '.5');

    expect(onChange).toHaveBeenCalledWith('0.5');
  });
});
