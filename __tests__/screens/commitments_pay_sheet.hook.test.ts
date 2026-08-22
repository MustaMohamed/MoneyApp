/**
 * commitments_pay_sheet.hook.test.ts
 *
 * Tests the pay-sheet hook's prefill, rateOverride flag, and the ISO paid_date
 * setter introduced in §8 (date-picker upgrade, OQ-2). Mirrors the mocking
 * style of commitments_detail.hook.test.ts: all external stores are mocked,
 * usePaySheetState is mocked with a stateful in-memory object so state
 * transitions can be tracked across act() calls.
 */

import { act, renderHook } from '@testing-library/react-native';

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
import { usePaySheet } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.hook';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
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

// Stateful mock for usePaySheetState — holds the state in a mutable object
// so act()-wrapped setters actually update what the hook reads.
let paySheetStateInner = {
  visible: false,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
};
const mockPaySheetState = {
  get visible() {
    return paySheetStateInner.visible;
  },
  get saving() {
    return paySheetStateInner.saving;
  },
  get accountPickerVisible() {
    return paySheetStateInner.accountPickerVisible;
  },
  get rateOverride() {
    return paySheetStateInner.rateOverride;
  },
  setVisible: jest.fn((v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, visible: v };
  }),
  setSaving: jest.fn((v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, saving: v };
  }),
  setAccountPickerVisible: jest.fn((v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, accountPickerVisible: v };
  }),
  setRateOverride: jest.fn((v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, rateOverride: v };
  }),
  reset: jest.fn(() => {
    paySheetStateInner = {
      visible: false,
      saving: false,
      accountPickerVisible: false,
      rateOverride: false,
    };
  }),
};

jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  usePaySheetState: jest.fn(),
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
const mockLoadPaymentsForMonth = jest.fn().mockResolvedValue(undefined);
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);
let mockAccounts: Account[] = [];

function setupStoreMocks() {
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    commitments: [],
    payments: [],
    selectedMonth: '2026-05',
    markAsPaid: mockMarkAsPaid,
    loadPaymentsForMonth: mockLoadPaymentsForMonth,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    get accounts() {
      return mockAccounts;
    },
    loadAccounts: mockLoadAccounts,
  }));
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: 55,
    isManualOverride: false,
    rate_updated_at: null,
  }));
  attachMockSelectorStore(usePaySheetState as unknown as jest.Mock, () => mockPaySheetState);
}

describe('usePaySheet', () => {
  beforeEach(() => {
    setupStoreMocks();
    mockPaySheetState.reset();
    jest.clearAllMocks();
    // Re-wire setters after clearAllMocks
    mockPaySheetState.setVisible.mockImplementation((v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, visible: v };
    });
    mockPaySheetState.setSaving.mockImplementation((v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, saving: v };
    });
    mockPaySheetState.setAccountPickerVisible.mockImplementation((v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, accountPickerVisible: v };
    });
    mockPaySheetState.setRateOverride.mockImplementation((v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, rateOverride: v };
    });
    mockPaySheetState.reset.mockImplementation(() => {
      paySheetStateInner = {
        visible: false,
        saving: false,
        accountPickerVisible: false,
        rateOverride: false,
      };
    });
    // Reset the capturable store mocks
    mockAccounts = [];
    mockMarkAsPaid.mockClear();
    mockMarkAsPaid.mockResolvedValue(undefined);
    mockLoadPaymentsForMonth.mockClear();
    mockLoadPaymentsForMonth.mockResolvedValue(undefined);
    mockLoadAccounts.mockClear();
    mockLoadAccounts.mockResolvedValue(undefined);
    // Re-setup store mocks after clearAllMocks
    setupStoreMocks();
  });

  it('prefills the fixed amount from amount_due when the sheet is visible on mount', async () => {
    // Start with visible=true so the prefill useEffect fires on first render
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // prefill runs in a useEffect; flush microtasks
    await act(async () => {});
    expect(result.current.form.getValues('amount')).toBe(15);
    expect(result.current.form.getValues('paid_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('starts with rateOverride false on open', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // rateOverride starts false (initial state, sheet not yet opened)
    expect(result.current.state.rateOverride).toBe(false);
  });

  it('toggleRateOverride flips the flag', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // Initial state: rateOverride = false
    expect(result.current.state.rateOverride).toBe(false);
    // Toggle: calls setRateOverride(!false) = setRateOverride(true)
    await act(() => result.current.toggleRateOverride());
    expect(mockPaySheetState.setRateOverride).toHaveBeenCalledWith(true);
  });

  it('setPaidDate writes an ISO string into the form (date-picker upgrade)', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => result.current.setPaidDate('2026-05-20'));
    expect(result.current.form.getValues('paid_date')).toBe('2026-05-20');
  });

  // Render-safety + default cases (folded in from the former pay_sheet.hook.test.ts
  // during §8 cleanup — that file duplicated this hook's mock setup).
  it('renders without throwing when commitment and payment are undefined', async () => {
    await expect(renderHook(() => usePaySheet(undefined, undefined))).resolves.toBeDefined();
  });

  it('saving defaults to false', async () => {
    const { result } = await renderHook(() => usePaySheet(undefined, undefined));
    expect(result.current.state.saving).toBe(false);
  });

  it('captures the EGP reporting rate for a USD commitment paid from a USD account', async () => {
    mockAccounts = [{ id: 'acc-usd', currency: Currency.USD } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-usd');
      result.current.form.setValue('amount', 15);
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', 99);
    });
    expect(result.current.state.requiresRate).toBe(true);
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(mockLoadPaymentsForMonth).not.toHaveBeenCalled();
    const arg = mockMarkAsPaid.mock.calls[0][1] as { exchange_rate_snapshot?: number };
    expect(arg.exchange_rate_snapshot).toBe(99);
  });

  it('snapshots the entered rate when the payment crosses currencies', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
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

  // c7 step 3: the floor is Layla row 25's resolver throw made unreachable
  // from the UI. Gate: swap the `.refine` back to `.positive()` and this
  // assertion goes red — markAsPaid gets called with the raw 0.005.
  it('rejects a sub-cent amount at the field and leaves markAsPaid uncalled', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-1');
      result.current.form.setValue('amount', 0.005);
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    // formState.errors is a vacuous read under renderHook (MA-008 T6) — RHF
    // only re-renders it once something has READ it during a render, which
    // nothing here does. getFieldState reads the live field directly.
    expect(result.current.form.getFieldState('amount').error?.message).toBe(
      Strings.commitmentsPayErrAmountMin,
    );
  });

  it('accepts the floor amount 0.01 and submits', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-1');
      result.current.form.setValue('amount', 0.01);
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    const arg = mockMarkAsPaid.mock.calls[0][1] as { amount_paid: number };
    expect(arg.amount_paid).toBe(0.01);
  });

  it('closes after a committed payment when account revalidation fails', async () => {
    const refreshError = new Error('account refresh failed');
    mockLoadAccounts.mockRejectedValueOnce(refreshError);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
      result.current.form.setValue('amount', 15);
      result.current.form.setValue('paid_date', '2026-05-20');
    });

    await act(async () => {
      await result.current.onSubmit();
      await Promise.resolve();
    });

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
    expect(mockPaySheetState.setVisible).toHaveBeenCalledWith(false);
    expect(mockPaySheetState.reset).toHaveBeenCalledTimes(1);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[paySheet] account revalidation failed:',
      refreshError,
    );
    consoleSpy.mockRestore();
  });
});
