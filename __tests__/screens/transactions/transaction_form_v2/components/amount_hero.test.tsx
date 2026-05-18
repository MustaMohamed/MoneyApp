import { render } from '@testing-library/react-native';

import { TransactionType } from '@/constants/enums';
import { Currency } from '@/constants/enums';
import { AmountHero } from '@/screens/transactions/transaction_form_v2/components/amount_hero';

describe('AmountHero', () => {
  it('renders the currency code on the left', () => {
    const { getByText } = render(
      <AmountHero amountStr="0" type={TransactionType.Expense} currency={Currency.EGP} />,
    );
    expect(getByText('EGP')).toBeTruthy();
  });

  it('renders the amount formatted with thousands separators', () => {
    const { getByTestId } = render(
      <AmountHero amountStr="122300.50" type={TransactionType.Expense} currency={Currency.EGP} />,
    );
    expect(getByTestId('amount-hero-value').props.children).toBe('122,300.50');
  });

  it('preserves a trailing decimal point during entry', () => {
    const { getByTestId } = render(
      <AmountHero amountStr="100." type={TransactionType.Expense} currency={Currency.EGP} />,
    );
    expect(getByTestId('amount-hero-value').props.children).toBe('100.');
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
        <AmountHero amountStr="0" type={type} currency={Currency.EGP} />,
      );
      expect(getByTestId('amount-hero-value').props.className).toContain(klass);
      unmount();
    }
  });

  it('renders USD currency when source account currency is USD', () => {
    const { getByText } = render(
      <AmountHero amountStr="0" type={TransactionType.Expense} currency={Currency.USD} />,
    );
    expect(getByText('USD')).toBeTruthy();
  });
});
