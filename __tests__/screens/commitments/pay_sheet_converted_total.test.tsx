import { fireEvent, render, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { PaySheet } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { formatCurrencyAmount } from '@/utils/format_amount';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: unknown) => sel }));

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
jest.mock('@react-native-community/datetimepicker', () => ({
  __esModule: true,
  default: () => null,
  DateTimePickerAndroid: { open: jest.fn() },
}));
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 120,
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
jest.mock('@/modules/accounts/components/account_picker_sheet', () => ({
  AccountPickerSheet: () => null,
}));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row',
  () => ({ ExchangeRateRow: () => null }),
);
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: {
    getLastPaidPayment: jest.fn().mockResolvedValue(null),
    getPaymentsByCommitment: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  usePaySheetState: jest.fn(),
}));

const RATE = 55;

// The preview renders in the pay-from account's currency, not the commitment's.
const payAccount = {
  id: 'acc-egp',
  name: 'Bank',
  currency: Currency.EGP,
  current_balance: 1000,
  color: null,
} as unknown as Account;

const variableCommitment: Commitment = {
  id: 'c1',
  name: 'Server',
  amount_type: AmountType.Variable,
  amount: null,
  currency: Currency.USD,
  category_id: 'cat1',
  recurrence_every: 1,
  recurrence_period: RecurrencePeriod.Months,
  start_date: '2026-01-01',
  account_id: null,
  notes: null,
  duration_type: DurationType.Forever,
  end_date: null,
  end_after_count: null,
  is_active: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const duePayment: CommitmentPayment = {
  id: 'p1',
  commitment_id: 'c1',
  due_date: '2026-05-01',
  amount_due: null,
  amount_paid: null,
  currency: Currency.USD,
  status: CommitmentPaymentStatus.Due,
  paid_date: null,
  skipped_date: null,
  account_id: null,
  exchange_rate_snapshot: null,
  transaction_id: null,
  notes: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const paySheetState = {
  visible: true,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
  saveError: false,
  setVisible: jest.fn(),
  setSaving: jest.fn(),
  setAccountPickerVisible: jest.fn(),
  setRateOverride: jest.fn(),
  setSaveError: jest.fn(),
  reset: jest.fn(),
};

beforeEach(() => {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    markAsPaid: jest.fn().mockResolvedValue(undefined),
    loadPaymentsForMonth: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [payAccount],
    loadAccounts: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: RATE,
    isManualOverride: false,
    rate_updated_at: null,
  }));
  attachMockSelectorStore(usePaySheetState as unknown as jest.Mock, () => paySheetState);
});

// Matching the "= " prefix rather than a value is what makes a hidden row assertable.
const CONVERTED_ROW = /^=\s/;

async function renderOpenSheet() {
  const utils = await render(<PaySheet commitment={variableCommitment} payment={duePayment} />);
  // The prefill effect is async and seeds the exchange rate the preview multiplies by.
  await waitFor(() => expect(utils.getByTestId('pay-sheet')).toBeTruthy());
  return utils;
}

describe('PaySheet converted-total preview', () => {
  it.each([
    ['1', 55],
    ['1234', 67870],
    ['1234.5', 67897.5],
    ['1234.56', 67900.8],
  ] as const)('shows the converted total for a readable amount "%s"', async (typed, expected) => {
    const { getByPlaceholderText, getByText } = await renderOpenSheet();
    await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), typed);
    expect(getByText(`= ${formatCurrencyAmount(expected, Currency.EGP)}`)).toBeTruthy();
  });

  it.each([['1.'], ['0'], ['']] as const)(
    'hides the converted total while the amount reads "%s"',
    async (typed) => {
      const { getByPlaceholderText, queryByText } = await renderOpenSheet();
      // Reach a state where the row shows, so the assertion below is a transition.
      await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '1');
      expect(queryByText(CONVERTED_ROW)).not.toBeNull();

      await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), typed);
      expect(queryByText(CONVERTED_ROW)).toBeNull();
    },
  );

  // The mask refuses untypeable and ambiguous comma text wholesale, keeping field and preview.
  it.each([['12abc'], ['1,234']] as const)(
    'keeps the preview when a refused edit "%s" leaves the field unchanged',
    async (typed) => {
      const { getByPlaceholderText, queryByText } = await renderOpenSheet();
      await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '1');
      expect(queryByText(CONVERTED_ROW)).not.toBeNull();

      await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), typed);
      expect(queryByText(CONVERTED_ROW)).not.toBeNull();
      expect(getByPlaceholderText(Strings.commitmentsAmountPlaceholder).props.value).toBe('1');
    },
  );

  // `parsePositiveDecimal` refuses 0, so the resolver throws and cannot be called from a render.
  it('hides the converted total for a typed zero', async () => {
    const { getByPlaceholderText, queryByText } = await renderOpenSheet();
    await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '1');
    expect(queryByText(CONVERTED_ROW)).not.toBeNull();

    await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '0');
    expect(queryByText(CONVERTED_ROW)).toBeNull();
  });
});
