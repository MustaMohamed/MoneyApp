import { fireEvent, render, waitFor, within } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { PaySheet } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet';
import { resolvePayButtonLabel } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.helpers';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
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
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));
// The rendered `Sheet`'s `onCloseComplete`, which a case calls as the settled close would.
let mockSheetCloseComplete: (() => void) | undefined;
jest.mock('@/components/ui/sheet', () => ({
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  Sheet: ({
    isOpen,
    children,
    footer,
    onCloseComplete,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
    onCloseComplete?: () => void;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    mockSheetCloseComplete = onCloseComplete;
    return isOpen ? (
      <View testID="pay-sheet">
        {children}
        {footer === undefined ? null : <View testID="sheet-footer">{footer}</View>}
      </View>
    ) : null;
  },
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({
    label,
    onPress,
    testID,
  }: {
    label: string;
    onPress?: () => void;
    testID?: string;
  }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Text testID={testID} onPress={onPress}>
        {label}
      </Text>
    );
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

// A USD commitment paid from an EGP account, so `requiresRate` is on and the rate row renders.
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

const mockMarkAsPaid = jest.fn().mockResolvedValue(undefined);
let suiteAccounts: Account[] = [payAccount];

beforeEach(() => {
  jest.clearAllMocks();
  mockMarkAsPaid.mockResolvedValue(undefined);
  suiteAccounts = [payAccount];
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    markAsPaid: mockMarkAsPaid,
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
  // The prefill seeds the exchange rate as the sheet opens.
  await waitFor(() => expect(utils.getByTestId('pay-sheet')).toBeTruthy());
  return utils;
}

// MA-219: an unreadable stored rate prefills no rate, so a press rings the Rate row and counts its fault.
describe('PaySheet press with no readable rate', () => {
  it('rings the Rate row and counts its fault on the track, with the amount filled and the account lit', async () => {
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: Number.NaN,
      isManualOverride: false,
      rate_updated_at: null,
    }));
    const { getByTestId, getByText, queryByTestId } = await renderOpenSheet();
    await fireEvent.changeText(getByTestId('amount-hero-value'), '15');
    expect(queryByTestId('rate-ring')).toBeNull();

    await fireEvent.press(getByText(resolvePayButtonLabel('15', Currency.USD)));

    await waitFor(() => expect(getByTestId('rate-ring')).toBeTruthy());
    expect(getByTestId('pay-sheet-status')).toHaveTextContent(Strings.fixFieldsMarkedAbove(1));
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
  });
});

// Acceptance 7: the press's faults reach the hero, the strip and the track only through a render.
describe('PaySheet press with the amount empty and no account lit', () => {
  const noAccountCommitment = { ...variableCommitment, account_id: null };

  it('rings the strip, underlines the hero, counts both faults on the track and writes nothing', async () => {
    const { getByTestId, getByText, queryByTestId } = await renderOpenSheet(noAccountCommitment);
    expect(queryByTestId('account-strip-ring')).toBeNull();
    expect(queryByTestId('amount-hero-error-line')).toBeNull();

    await fireEvent.press(getByText(Strings.commitmentsPayCtaBare));

    await waitFor(() => expect(getByTestId('account-strip-ring')).toBeTruthy());
    expect(getByTestId('amount-hero-error-line')).toBeTruthy();
    expect(within(getByTestId('amount-error-slot')).getByText('Enter an amount')).toBeTruthy();
    expect(getByTestId('pay-sheet-status')).toHaveTextContent('Fix the 2 fields marked above.');
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
  });
});

// MA-219: with no active accounts the sheet draws the shared no-accounts state, and its Add account hands off.
describe('PaySheet with no active accounts', () => {
  it('draws the no-accounts state with no footer, and its Add account requests the hand-off', async () => {
    suiteAccounts = [];
    const { getByTestId, getByText, queryByTestId } = await renderOpenSheet({
      ...variableCommitment,
      account_id: null,
    });

    expect(getByText(Strings.addTxNoAccountsTitle)).toBeTruthy();
    expect(queryByTestId('sheet-footer')).toBeNull();

    await fireEvent.press(getByTestId('no-accounts-cta'));

    expect(paySheetState.requestAccountCreation).toHaveBeenCalledWith('owner-a');

    paySheetState.completeClose.mockReturnValueOnce('addAccount');
    mockSheetCloseComplete?.();

    expect(paySheetState.completeClose).toHaveBeenCalledWith('owner-a');
    expect(mockRouterPush).toHaveBeenCalledTimes(1);
    expect(mockRouterPush).toHaveBeenCalledWith('/accounts/add_account');
  });

  it('draws no cycle line, where the same sheet with an account draws one', async () => {
    const withAccount = await renderOpenSheet();
    expect(withAccount.getByTestId('pay-sheet-cycle-line')).toBeTruthy();
    await withAccount.unmount();

    suiteAccounts = [];
    const { getByText, queryByTestId } = await renderOpenSheet({
      ...variableCommitment,
      account_id: null,
    });

    expect(getByText(Strings.addTxNoAccountsTitle)).toBeTruthy();
    expect(queryByTestId('pay-sheet-cycle-line')).toBeNull();
  });
});

// MA-265: the tag, its icon and the nested distance reach the sheet only through a render.
describe('PaySheet cycle line', () => {
  it('draws the status tag with its icon, then the due day and its distance', async () => {
    const { getByTestId, getByText } = await renderOpenSheet();

    expect(getByText(Strings.commitmentsStatusOverdue)).toBeTruthy();
    expect(getByTestId('icon-alert-circle')).toBeTruthy();
    expect(getByTestId('pay-sheet-cycle-line')).toHaveTextContent('Fri 1 May 2026 · 172 days late');
  });
});
