import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { formatConvertedAmount } from '@/components/ui/form_sheet.helpers';
import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { PaySheet } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type { CommitmentPaymentAmounts } from '@/modules/transactions/domain/transaction_amounts';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name }: { name: string }) => <View testID={`icon-${name}`} />;
});
jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BottomSheetScrollView: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    children,
    footer,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View testID="pay-sheet">
        {children}
        {footer}
      </View>
    ) : null;
  },
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({ label }: { label: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{label}</Text>;
  },
}));
jest.mock('@/components/ui/date_row', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { DateRow: () => <View testID="date-row" /> };
});
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  ...jest.requireActual<
    typeof import('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state')
  >('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state'),
  usePaySheetState: jest.fn(),
}));

const RATE = 55;
const TODAY = '2026-10-20';

// The preview renders in the pay-from account's currency, not the commitment's.
const payAccount = {
  id: 'acc-egp',
  name: 'Bank',
  currency: Currency.EGP,
  current_balance: 1000,
  color: null,
} as unknown as Account;

const variableCommitment = makeTestCommitment({
  name: 'Server',
  amount_type: AmountType.Variable,
  amount: null,
  currency: Currency.USD,
  category_id: 'cat1',
  account_id: 'acc-egp',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const duePayment = makeTestPayment({
  commitment_id: variableCommitment.id,
  due_date: '2026-05-01',
  amount_due: null,
  currency: Currency.USD,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const paySheetState = {
  entries: {
    'owner-a': {
      visible: true,
      saving: false,
      rateOverride: false,
      saveError: undefined,
    },
  },
  setVisible: jest.fn(),
  setSaving: jest.fn(),
  setRateOverride: jest.fn(),
  setSaveError: jest.fn(),
  requestAccountCreation: jest.fn(),
  completeClose: jest.fn(),
  open: jest.fn(),
  release: jest.fn(),
  reset: jest.fn(),
};

const PAID_AMOUNTS: CommitmentPaymentAmounts = {
  paymentAmount: 1,
  accountNativeAmount: 1,
  accountCurrency: Currency.EGP,
  egpAmount: 1,
  exchangeRate: null,
};

const usdPayAccount = {
  ...payAccount,
  id: 'acc-usd',
  name: 'Dollars',
  currency: Currency.USD,
} as unknown as Account;
let suiteAccounts: Account[] = [payAccount];

beforeEach(() => {
  suiteAccounts = [payAccount];
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    markAsPaid: jest.fn().mockResolvedValue(PAID_AMOUNTS),
    loadPaymentsForMonth: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: suiteAccounts,
    hasLoaded: true,
    loadError: false,
    loadAccounts: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: RATE,
    isManualOverride: false,
    rate_updated_at: null,
  }));
  attachMockSelectorStore(usePaySheetState as unknown as jest.Mock, () => paySheetState);
});

async function renderOpenSheet(commitment = variableCommitment) {
  const utils = await render(
    <PaySheet owner="owner-a" commitment={commitment} payment={duePayment} today={TODAY} />,
  );
  // The prefill seeds the exchange rate the line converts by.
  await waitFor(() => expect(utils.getByTestId('pay-sheet')).toBeTruthy());
  return utils;
}

const lineText = (amount: number, currency: Currency) =>
  formatConvertedAmount({ amount, currency });

// MA-219: the converted line sits under the hero, gated on the commitment or the account being USD.
describe('PaySheet converted amount under the hero', () => {
  it.each([
    ['1', 55],
    ['1234', 67870],
    ['1234.5', 67897.5],
    ['1234.56', 67900.8],
  ] as const)(
    'reads the EGP amount of a USD commitment for a readable amount "%s"',
    async (typed, expected) => {
      const { getByTestId } = await renderOpenSheet();
      await fireEvent.changeText(getByTestId('amount-hero-value'), typed);
      expect(getByTestId('converted-amount-line')).toHaveTextContent(
        lineText(expected, Currency.EGP),
      );
    },
  );

  it.each([['1.'], ['0'], ['']] as const)(
    'reads the dash with no code while the amount reads "%s"',
    async (typed) => {
      const { getByTestId } = await renderOpenSheet();
      // Reach a state where the line shows an amount, so the assertion below is a transition.
      await fireEvent.changeText(getByTestId('amount-hero-value'), '1');
      expect(getByTestId('converted-amount-line')).toHaveTextContent(lineText(55, Currency.EGP));

      await fireEvent.changeText(getByTestId('amount-hero-value'), typed);
      expect(getByTestId('converted-amount-line')).toHaveTextContent(
        Strings.addTxConvertedAmountNone,
      );
    },
  );

  // The mask refuses untypeable and ambiguous comma text wholesale, keeping field and line.
  it.each([['12abc'], ['1,234']] as const)(
    'keeps the line when a refused edit "%s" leaves the field unchanged',
    async (typed) => {
      const { getByTestId } = await renderOpenSheet();
      await fireEvent.changeText(getByTestId('amount-hero-value'), '1');

      await fireEvent.changeText(getByTestId('amount-hero-value'), typed);
      expect(getByTestId('converted-amount-line')).toHaveTextContent(lineText(55, Currency.EGP));
      expect(getByTestId('amount-hero-value').props.value).toBe('1');
    },
  );

  it('draws the Rate row for a USD commitment paid from an EGP account', async () => {
    const { getByTestId } = await renderOpenSheet();
    expect(getByTestId('exchange-rate-row')).toBeTruthy();
  });

  it.each([
    ['a USD commitment paid from a USD account', Currency.USD, '1', 55, Currency.EGP],
    ['an EGP commitment paid from a USD account', Currency.EGP, '5500', 100, Currency.USD],
  ] as const)(
    'reads the converted line and draws the Rate row for %s',
    async (_label, commitmentCurrency, typed, amount, currency) => {
      suiteAccounts = [usdPayAccount];
      const { getByTestId } = await renderOpenSheet({
        ...variableCommitment,
        currency: commitmentCurrency,
        account_id: usdPayAccount.id,
      });

      await fireEvent.changeText(getByTestId('amount-hero-value'), typed);

      expect(getByTestId('converted-amount-line')).toHaveTextContent(lineText(amount, currency));
      expect(getByTestId('exchange-rate-row')).toBeTruthy();
    },
  );

  it('draws neither the converted line nor the Rate row for an EGP commitment paid from an EGP account', async () => {
    const { getByTestId, queryByTestId } = await renderOpenSheet({
      ...variableCommitment,
      currency: Currency.EGP,
    });

    await fireEvent.changeText(getByTestId('amount-hero-value'), '5500');

    expect(queryByTestId('converted-amount-line')).toBeNull();
    expect(queryByTestId('exchange-rate-row')).toBeNull();
  });
});
