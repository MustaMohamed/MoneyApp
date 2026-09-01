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
  Button: ({ label, onPress }: { label: string; onPress?: () => void }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text onPress={onPress}>{label}</Text>;
  },
}));
jest.mock('@/modules/accounts/components/account_picker_sheet', () => ({
  AccountPickerSheet: () => null,
}));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row',
  () => ({
    ExchangeRateRow: ({ onChange, error }: { onChange: (v: string) => void; error?: string }) => {
      const { Text, TextInput, View } =
        jest.requireActual<typeof import('react-native')>('react-native');
      return (
        <View>
          <TextInput testID="rate-input" onChangeText={onChange} />
          {error ? <Text testID="rate-error">{error}</Text> : null}
        </View>
      );
    },
  }),
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

// A USD commitment paid from an EGP account, so `requiresRate` is on and the rate row renders.
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

const mockMarkAsPaid = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkAsPaid.mockResolvedValue(undefined);
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    markAsPaid: mockMarkAsPaid,
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

async function renderOpenSheet() {
  const utils = await render(<PaySheet commitment={variableCommitment} payment={duePayment} />);
  // The prefill effect that seeds the exchange rate is async, hence the wait.
  await waitFor(() => expect(utils.getByTestId('pay-sheet')).toBeTruthy());
  return utils;
}

describe('PaySheet exchange-rate error', () => {
  it('clears the rate error as soon as a valid rate is typed, with no second Save', async () => {
    const { getByTestId, getByText, queryByTestId } = await renderOpenSheet();

    await fireEvent.changeText(getByTestId('rate-input'), '');
    await fireEvent.press(getByText(Strings.commitmentsPayConfirm));
    await waitFor(() =>
      expect(getByTestId('rate-error')).toHaveTextContent(Strings.addTxErrRateRequired),
    );
    expect(mockMarkAsPaid).not.toHaveBeenCalled();

    await fireEvent.changeText(getByTestId('rate-input'), '48.6');
    await waitFor(() => expect(queryByTestId('rate-error')).toBeNull());
  });

  it('revalidates rather than just clearing: an unreadable rate swaps the message', async () => {
    const { getByTestId, getByText } = await renderOpenSheet();

    await fireEvent.changeText(getByTestId('rate-input'), '');
    await fireEvent.press(getByText(Strings.commitmentsPayConfirm));
    await waitFor(() =>
      expect(getByTestId('rate-error')).toHaveTextContent(Strings.addTxErrRateRequired),
    );

    // "48." is present but unreadable, so the required message must give way to the invalid one.
    await fireEvent.changeText(getByTestId('rate-input'), '48.');
    await waitFor(() =>
      expect(getByTestId('rate-error')).toHaveTextContent(Strings.addTxErrRateInvalid),
    );
  });

  it('raises no rate error while typing before the first Save', async () => {
    const { getByTestId, queryByTestId } = await renderOpenSheet();

    await fireEvent.changeText(getByTestId('rate-input'), '');
    expect(queryByTestId('rate-error')).toBeNull();
    await fireEvent.changeText(getByTestId('rate-input'), '4');
    expect(queryByTestId('rate-error')).toBeNull();
  });
});
