import { fireEvent, render } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { AmountHero } from '@/screens/transactions/transaction_form/components/amount_hero';

// BottomSheetTextInput needs the BottomSheetModal provider at runtime; in
// tests we substitute a plain RN TextInput so we can assert value/onChange
// without spinning up the full sheet container.
jest.mock('@gorhom/bottom-sheet', () => {
  const { TextInput } = jest.requireActual('react-native');
  return { BottomSheetTextInput: TextInput };
});

describe('AmountHero', () => {
  it('renders the currency code on the left', () => {
    const { getByText } = render(
      <AmountHero
        amountStr="0"
        onChange={() => {}}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    expect(getByText('EGP')).toBeTruthy();
  });

  it('renders the editable amount as the TextInput value', () => {
    // Editable AmountHero: the raw entry string (no thousands separators)
    // is what the input displays. Formatting is dropped during entry so the
    // numeric keyboard can drive the field without round-trip parsing.
    const { getByTestId } = render(
      <AmountHero
        amountStr="122300.50"
        onChange={() => {}}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    expect(getByTestId('amount-hero-value').props.value).toBe('122300.50');
  });

  it('preserves a trailing decimal point during entry', () => {
    const { getByTestId } = render(
      <AmountHero
        amountStr="100."
        onChange={() => {}}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    expect(getByTestId('amount-hero-value').props.value).toBe('100.');
  });

  it('sanitizes non-numeric input via onChange', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AmountHero
        amountStr="0"
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    // Letters and stray symbols are stripped; only digits and one decimal point survive.
    fireEvent.changeText(getByTestId('amount-hero-value'), 'a1b2.c5d');
    expect(onChange).toHaveBeenCalledWith('12.5');
  });

  it('caps decimals at two places', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AmountHero
        amountStr="0"
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    fireEvent.changeText(getByTestId('amount-hero-value'), '12.3456');
    expect(onChange).toHaveBeenCalledWith('12.34');
  });

  it('treats empty input as "0" so the form amount stays a number', () => {
    const onChange = jest.fn();
    const { getByTestId } = render(
      <AmountHero
        amountStr="5"
        onChange={onChange}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    fireEvent.changeText(getByTestId('amount-hero-value'), '');
    expect(onChange).toHaveBeenCalledWith('0');
  });

  it('uses keyboardType decimal-pad so the system numeric keyboard appears', () => {
    const { getByTestId } = render(
      <AmountHero
        amountStr="0"
        onChange={() => {}}
        type={TransactionType.Expense}
        currency={Currency.EGP}
      />,
    );
    expect(getByTestId('amount-hero-value').props.keyboardType).toBe('decimal-pad');
  });

  it('applies the type color class to the amount', () => {
    const cases: Array<[TransactionType, string]> = [
      [TransactionType.Expense, 'text-danger'],
      [TransactionType.Income, 'text-success'],
      [TransactionType.Transfer, 'text-info'],
      [TransactionType.CCPayment, 'text-accent-cc'],
    ];
    for (const [type, klass] of cases) {
      const { getByTestId, unmount } = render(
        <AmountHero amountStr="0" onChange={() => {}} type={type} currency={Currency.EGP} />,
      );
      expect(getByTestId('amount-hero-value').props.className).toContain(klass);
      unmount();
    }
  });

  it('renders USD currency when source account currency is USD', () => {
    const { getByText } = render(
      <AmountHero
        amountStr="0"
        onChange={() => {}}
        type={TransactionType.Expense}
        currency={Currency.USD}
      />,
    );
    expect(getByText('USD')).toBeTruthy();
  });
});
