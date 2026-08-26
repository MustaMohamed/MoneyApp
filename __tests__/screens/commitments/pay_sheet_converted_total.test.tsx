/**
 * pay_sheet_converted_total.test.tsx
 *
 * The converted-total preview's render gate as the SHEET binds it: the row
 * appears and disappears with what the Amount field holds. W1B moved the
 * derivation into `usePaySheet` (debt D2 paid off), so the arithmetic, the
 * currency label, the sub-floor case and the rate-row facts are asserted in
 * the logic-only `commitments_pay_sheet.hook.test.ts` instead. What stays here
 * is the render-to-gate wiring nothing else covers.
 *
 * Amended, not extended (`.claude/rules/tests.md`): no case was added, and the
 * typed-zero case at the bottom reverses under the new floor gate. Mocking
 * style follows set_budget_sheet.test.tsx: the sheet chrome, the icons and the
 * sibling sheets are stubbed, the hook under test is real.
 */

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
// Stubbed on purpose: the rate row's own preview is the half of this defect
// that stays filed as debt, so asserting it here would assert the wrong thing.
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

// A USD commitment paid from an EGP account: `requiresRate` is on, the
// prefill seeds the rate from the store, and the preview's currency is the
// pay-from account's.
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

// Anything the row can render starts with "= ". Matching the prefix rather
// than a value is what makes the HIDDEN rows assertable at all.
const CONVERTED_ROW = /^=\s/;

async function renderOpenSheet() {
  const utils = await render(<PaySheet commitment={variableCommitment} payment={duePayment} />);
  // The prefill effect is async (it may consult getLastPaidPayment) and is
  // what seeds the exchange rate the preview multiplies by.
  await waitFor(() => expect(utils.getByTestId('pay-sheet')).toBeTruthy());
  return utils;
}

describe('PaySheet converted-total preview', () => {
  // Spec §3 A3 accepted HIDING for input the parser cannot read on the rate
  // side. Coercing the amount to 0 did the opposite: four of the nine states
  // of typing "1,234.56" one keystroke at a time rendered a confidently
  // formatted "= 0 EGP" beside an Amount field reading "1,23".
  it.each([
    ['1', 55],
    ['1,234', 67870],
    ['1,234.5', 67897.5],
    ['1,234.56', 67900.8],
  ] as const)('shows the converted total for a readable amount "%s"', async (typed, expected) => {
    const { getByPlaceholderText, getByText } = await renderOpenSheet();
    await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), typed);
    expect(getByText(`= ${formatCurrencyAmount(expected, Currency.EGP)}`)).toBeTruthy();
  });

  it.each([['1,'], ['1,2'], ['1,23'], ['1,234.'], ['12abc'], ['']] as const)(
    'hides the converted total while the amount reads "%s"',
    async (typed) => {
      const { getByPlaceholderText, queryByText } = await renderOpenSheet();
      // Reach a state where the row IS showing, so the assertion below is a
      // transition and not a row that never rendered.
      await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '1');
      expect(queryByText(CONVERTED_ROW)).not.toBeNull();

      await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), typed);
      expect(queryByText(CONVERTED_ROW)).toBeNull();
    },
  );

  // Reversed at W1B, deliberately and with the spec's sanction (§3 row 4).
  // The gate is now the resolver's own floor — `parsePositiveDecimal`, which
  // refuses 0 — because the resolver throws on an amount that rounds to zero
  // and cannot be called speculatively from a render. "= 0 EGP" was true but
  // useless: nothing is being paid, and the old assertion was written to stop
  // the gate widening into unreadable input, which the rows above still guard.
  it('hides the converted total for a typed zero', async () => {
    const { getByPlaceholderText, queryByText } = await renderOpenSheet();
    await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '1');
    expect(queryByText(CONVERTED_ROW)).not.toBeNull();

    await fireEvent.changeText(getByPlaceholderText(Strings.commitmentsAmountPlaceholder), '0');
    expect(queryByText(CONVERTED_ROW)).toBeNull();
  });
});
