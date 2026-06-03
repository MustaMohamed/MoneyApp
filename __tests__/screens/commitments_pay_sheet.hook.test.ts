/**
 * commitments_pay_sheet.hook.test.ts
 *
 * Tests the pay-sheet hook's prefill, rateOverride flag, and the ISO paid_date
 * setter introduced in §8 (date-picker upgrade, OQ-2). Mirrors the mocking
 * style of commitments_detail.hook.test.ts: external MobX stores are mocked
 * with direct store objects and the pay-sheet Signals state hook stays real.
 */

import { act, renderHook } from '@testing-library/react-native';

import {
  AmountType,
  CommitmentPaymentStatus,
  Currency,
  DurationType,
  RecurrencePeriod,
} from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { usePaySheet } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.hook';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';

jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({
  useCurrencyStore: jest.fn(),
}));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: {
    getLastPaidPayment: jest.fn().mockResolvedValue(null),
    getPaymentsByCommitment: jest.fn().mockResolvedValue([]),
  },
}));

const fixedCommitment: Commitment = {
  id: 'c1',
  name: 'Netflix',
  amount_type: AmountType.Fixed,
  amount: 15,
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
  amount_due: 15,
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

// Stable, capturable mocks: markAsPaid so we can assert the persisted snapshot,
// and an injectable accounts list so requiresRate (currency mismatch) can be exercised.
const mockMarkAsPaid = jest.fn().mockResolvedValue(undefined);
let mockAccounts: Account[] = [];
const mockLoadPaymentsForMonth = jest.fn().mockResolvedValue(undefined);
const mockInitAccounts = jest.fn().mockResolvedValue(undefined);

function setupStoreMocks() {
  jest.mocked(useCommitmentStore).mockReturnValue({
    commitments: [],
    payments: [],
    selectedMonth: '2026-05',
    markAsPaid: mockMarkAsPaid,
    loadPaymentsForMonth: mockLoadPaymentsForMonth,
  } as unknown as ReturnType<typeof useCommitmentStore>);
  jest.mocked(useAccountStore).mockReturnValue({
    get accounts() {
      return mockAccounts;
    },
    init: mockInitAccounts,
  } as unknown as ReturnType<typeof useAccountStore>);
  jest.mocked(useCurrencyStore).mockReturnValue({
    rate: 55,
    isManualOverride: false,
    rate_updated_at: null,
  } as unknown as ReturnType<typeof useCurrencyStore>);
}

function resetPaySheetState() {
  const { result, unmount } = renderHook(() => usePaySheetState());
  act(() => result.current.reset());
  unmount();
}

describe('usePaySheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetPaySheetState();
    mockAccounts = [];
    mockMarkAsPaid.mockClear();
    mockMarkAsPaid.mockResolvedValue(undefined);
    mockLoadPaymentsForMonth.mockClear();
    mockLoadPaymentsForMonth.mockResolvedValue(undefined);
    mockInitAccounts.mockClear();
    mockInitAccounts.mockResolvedValue(undefined);
    setupStoreMocks();
  });

  it('prefills the fixed amount from amount_due when the sheet is visible on mount', async () => {
    // Start with visible=true so the prefill useEffect fires on first render
    const opener = renderHook(() => usePaySheetState());
    act(() => opener.result.current.setVisible(true));
    opener.unmount();

    const { result } = renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // prefill runs in a useEffect; flush microtasks
    await act(async () => {});
    expect(result.current.form.getValues('amount')).toBe(15);
    expect(result.current.form.getValues('paid_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('starts with rateOverride false on open', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // rateOverride starts false (initial state, sheet not yet opened)
    expect(result.current.state.rateOverride).toBe(false);
  });

  it('toggleRateOverride flips the flag', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // Initial state: rateOverride = false
    expect(result.current.state.rateOverride).toBe(false);

    act(() => result.current.toggleRateOverride());

    expect(result.current.state.rateOverride).toBe(true);
  });

  it('setPaidDate writes an ISO string into the form (date-picker upgrade)', async () => {
    const { result } = renderHook(() => usePaySheet(fixedCommitment, duePayment));
    act(() => result.current.setPaidDate('2026-05-20'));
    expect(result.current.form.getValues('paid_date')).toBe('2026-05-20');
  });

  // Render-safety + default cases (folded in from the former pay_sheet.hook.test.ts
  // during §8 cleanup — that file duplicated this hook's mock setup).
  it('renders without throwing when commitment and payment are undefined', () => {
    expect(() => renderHook(() => usePaySheet(undefined, undefined))).not.toThrow();
  });

  it('saving defaults to false', () => {
    const { result } = renderHook(() => usePaySheet(undefined, undefined));
    expect(result.current.state.saving).toBe(false);
  });

  // Regression (stale-rate guard): if the user enters a rate for a foreign-currency
  // account then switches to a same-currency account (requiresRate flips false),
  // the leftover rate must NOT be persisted as the snapshot — the payment needs no
  // conversion, so exchange_rate_snapshot must be undefined.
  it('does not snapshot a stale exchange_rate when the account currency matches the commitment', async () => {
    mockAccounts = [{ id: 'acc-usd', currency: Currency.USD } as unknown as Account];
    const { result } = renderHook(() => usePaySheet(fixedCommitment, duePayment));
    act(() => {
      result.current.form.setValue('account_id', 'acc-usd');
      result.current.form.setValue('amount', 15);
      result.current.form.setValue('paid_date', '2026-05-20');
      // stale value carried over from a previously-selected foreign account
      result.current.form.setValue('exchange_rate', 99);
    });
    expect(result.current.state.requiresRate).toBe(false);
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    const arg = mockMarkAsPaid.mock.calls[0][1] as { exchange_rate_snapshot?: number };
    expect(arg.exchange_rate_snapshot).toBeUndefined();
  });

  it('snapshots the entered rate when the payment crosses currencies', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = renderHook(() => usePaySheet(fixedCommitment, duePayment));
    act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
      result.current.form.setValue('amount', 15);
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', 52);
    });
    expect(result.current.state.requiresRate).toBe(true);
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    const arg = mockMarkAsPaid.mock.calls[0][1] as { exchange_rate_snapshot?: number };
    expect(arg.exchange_rate_snapshot).toBe(52);
  });
});
