import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';

jest.mock('heroui-native', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { TextInput: RNTextInput } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' '),
    Input: ReactLocal.forwardRef<
      React.ComponentRef<typeof RNTextInput>,
      React.ComponentProps<typeof RNTextInput>
    >((props, ref) => ReactLocal.createElement(RNTextInput, { ...props, ref })),
  };
});

jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));

import { AmountHero } from '@/modules/transactions/screens/transactions/transaction_form/components/amount_hero';

describe('AmountHero', () => {
  beforeEach(() => useAddTransactionStore.getState().reset());

  it('does not focus or select the amount when the sheet opens', async () => {
    const { getByTestId } = await render(
      <AmountHero
        onChange={jest.fn()}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    expect(getByTestId('amount-hero-value')).not.toHaveProp('autoFocus', true);
    expect(getByTestId('amount-hero-value')).not.toHaveProp('selectTextOnFocus', true);
  });

  it('allows the amount to remain empty while the user edits', async () => {
    useAddTransactionStore.getState().setAmountStr('125');
    const onChange = jest.fn((value: string) =>
      useAddTransactionStore.getState().setAmountStr(value),
    );
    const { getByTestId } = await render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    await fireEvent.changeText(getByTestId('amount-hero-value'), '');

    expect(onChange).toHaveBeenCalledWith('');
  });

  it('keeps only one decimal separator and two fraction digits', async () => {
    const onChange = jest.fn((value: string) =>
      useAddTransactionStore.getState().setAmountStr(value),
    );
    const { getByTestId } = await render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    await fireEvent.changeText(getByTestId('amount-hero-value'), '1a2.345.6');

    expect(onChange).toHaveBeenCalledWith('12.34');
  });

  it('normalizes a leading decimal to a value accepted by submission parsing', async () => {
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    await fireEvent.changeText(getByTestId('amount-hero-value'), '.5');

    expect(onChange).toHaveBeenCalledWith('0.5');
  });
});
