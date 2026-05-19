import { render } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { TransactionFormBody } from '@/screens/transactions/transaction_form_v2/transaction_form_body';

// @gorhom/bottom-sheet pulls in reanimated + gesture-handler at import time;
// substitute lightweight RN equivalents so we can render the body in isolation.
// Behavior of the inputs/scroll itself isn't asserted here — those are covered
// by AmountHero's own test.
jest.mock('@gorhom/bottom-sheet', () => {
  const { TextInput, ScrollView } = jest.requireActual('react-native');
  return { BottomSheetTextInput: TextInput, BottomSheetScrollView: ScrollView };
});

const baseProps = {
  visible: true,
  locked: false,
  type: TransactionType.Expense,
  onSelectType: () => {},
  amountStr: '0',
  setAmountStr: () => {},
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

  it('does not render the legacy Numpad keys (replaced by system decimal-pad keyboard)', () => {
    const { queryByTestId } = render(<TransactionFormBody {...baseProps} />);
    // Custom 4×3 numpad is gone — AmountHero now uses BottomSheetTextInput
    // with keyboardType="decimal-pad" so the system keyboard drives entry.
    expect(queryByTestId('numpad-key-0')).toBeNull();
    expect(queryByTestId('numpad-key-decimal')).toBeNull();
    expect(queryByTestId('numpad-key-backspace')).toBeNull();
  });
});
