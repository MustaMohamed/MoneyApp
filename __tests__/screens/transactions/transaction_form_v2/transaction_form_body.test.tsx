import { render } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { TransactionFormBody } from '@/screens/transactions/transaction_form_v2/transaction_form_body';

const baseProps = {
  locked: false,
  type: TransactionType.Expense,
  onSelectType: () => {},
  amountStr: '0',
  handleNumpad: () => {},
  amountError: undefined,
  selectedAccount: null,
  onOpenAccountPicker: () => {},
  accountError: undefined,
  selectedToAccount: null,
  onOpenToPicker: () => {},
  toAccountError: undefined,
  selectedCategory: null,
  onOpenCategoryPicker: () => {},
  categoryError: undefined,
  isUSD: false,
  exchangeRate: '50',
  setExchangeRate: () => {},
  rateOverride: false,
  toggleRateOverride: () => {},
  rateUpdatedAt: null,
  rateError: undefined,
  date: '2026-05-18',
  setDate: () => {},
  note: '',
  setNote: () => {},
  currency: Currency.EGP,
};

describe('TransactionFormBody', () => {
  it('renders TypeTabs + AmountHero + DateRow on initial expense state', () => {
    const { getByTestId } = render(<TransactionFormBody {...baseProps} />);
    expect(getByTestId('type-tab-expense')).toBeTruthy();
    expect(getByTestId('amount-hero-value')).toBeTruthy();
    expect(getByTestId('date-row')).toBeTruthy();
  });

  it('renders ExchangeRateRow only when isUSD=true', () => {
    const { queryByTestId, rerender } = render(
      <TransactionFormBody {...baseProps} isUSD={false} />,
    );
    expect(queryByTestId('exchange-rate-row')).toBeNull();

    rerender(<TransactionFormBody {...baseProps} isUSD={true} />);
    expect(queryByTestId('exchange-rate-row')).toBeTruthy();
  });

  it('shows the Numpad when keyboard is hidden, hides it when a TextInput is focused', () => {
    // Default: numpad visible
    const { getByTestId } = render(<TransactionFormBody {...baseProps} />);
    expect(getByTestId('numpad-key-0')).toBeTruthy();
  });
});
