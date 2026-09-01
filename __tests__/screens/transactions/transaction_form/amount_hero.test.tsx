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

  it('refuses untypeable text wholesale instead of splicing digits out of it', async () => {
    useAddTransactionStore.getState().setAmountStr('12');
    const onChange = jest.fn();
    const { getByTestId } = await render(
      <AmountHero
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
        mode="add"
      />,
    );

    await fireEvent.changeText(getByTestId('amount-hero-value'), '1a2.345.6');

    expect(onChange).not.toHaveBeenCalled();
  });

  it('never truncates decimals: a prefilled 0.005 survives the next keystroke intact', async () => {
    useAddTransactionStore.getState().setAmountStr('0.005');
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

    await fireEvent.changeText(getByTestId('amount-hero-value'), '0.0051');

    expect(onChange).toHaveBeenCalledWith('0.0051');
  });

  it('carries a comma keystroke to the decimal point, like every other money field', async () => {
    useAddTransactionStore.getState().setAmountStr('1');
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

    await fireEvent.changeText(getByTestId('amount-hero-value'), '1,');

    expect(onChange).toHaveBeenCalledWith('1.');
  });
});
