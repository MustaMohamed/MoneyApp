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
  saveError: false,
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
  get saveError() {
    return paySheetStateInner.saveError;
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
  setSaveError: jest.fn((v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, saveError: v };
  }),
  reset: jest.fn(() => {
    paySheetStateInner = {
      visible: false,
      saving: false,
      accountPickerVisible: false,
      rateOverride: false,
      saveError: false,
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
    mockPaySheetState.setSaveError.mockImplementation((v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, saveError: v };
    });
    mockPaySheetState.reset.mockImplementation(() => {
      paySheetStateInner = {
        visible: false,
        saving: false,
        accountPickerVisible: false,
        rateOverride: false,
        saveError: false,
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
    expect(result.current.form.getValues('amountText')).toBe('15');
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
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', '99');
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
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', '52');
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
      result.current.form.setValue('amountText', '0.005');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    // formState.errors is a vacuous read under renderHook (MA-008 T6) — RHF
    // only re-renders it once something has READ it during a render, which
    // nothing here does. getFieldState reads the live field directly.
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.commitmentsPayErrAmountMin,
    );
  });

  // No silent round-up: 0.006 rounds to 0.01, which a rounded-value check
  // would accept. The floor compares the raw parsed value, so it must still
  // reject and leave markAsPaid uncalled.
  it('rejects 0.006 (rounds to the floor but is below it raw) and leaves markAsPaid uncalled', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-1');
      result.current.form.setValue('amountText', '0.006');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.commitmentsPayErrAmountMin,
    );
  });

  it('accepts the floor amount 0.01 and submits', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-1');
      result.current.form.setValue('amountText', '0.01');
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
      result.current.form.setValue('amountText', '15');
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

  // MA-019 spec §3 A1/A2 — the contract for what a TYPED STRING produces.
  // Before this ticket nothing on either path asserted that: every test
  // entered an already-numeric value, so parseFloat's corruptions all
  // survived a green CI.

  async function submitAmount(typed: string) {
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-1');
      result.current.form.setValue('amountText', typed);
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    return { result, rerender };
  }

  // `expectedAmountPaid` is what the hook hands the STORE — the parsed,
  // unrounded value. roundMoney runs later, inside the repository's resolver,
  // which is why A1-16 is 10.999 here and 11 in the database (pinned by
  // commitment.repository.mark_as_paid.test.ts).
  it.each([
    ['A1-01', '12.34', 12.34],
    ['A1-02', '1,234.56', 1234.56],
    ['A1-12', '0.01', 0.01],
    ['A1-16', '10.999', 10.999],
  ] as const)('%s: accepts "%s" and hands the store %p', async (_id, typed, expected) => {
    const { result } = await submitAmount(typed);

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    const arg = mockMarkAsPaid.mock.calls[0][1] as { amount_paid: number };
    expect(arg.amount_paid).toBe(expected);
    expect(result.current.form.getFieldState('amountText').error).toBeUndefined();
  });

  it.each([
    ['A1-03', '12.', Strings.errAmountInvalid],
    ['A1-04', '.5', Strings.errAmountInvalid],
    ['A1-05', '', Strings.commitmentsPayErrAmountRequired],
    ['A1-06', '   ', Strings.errAmountInvalid],
    ['A1-07', '1e3', Strings.errAmountInvalid],
    ['A1-08', '1.2.3', Strings.errAmountInvalid],
    ['A1-09', '12abc', Strings.errAmountInvalid],
    ['A1-10', '0.005', Strings.commitmentsPayErrAmountMin],
    ['A1-11', '0.006', Strings.commitmentsPayErrAmountMin],
    ['A1-13', '0', Strings.commitmentsPayErrAmountMin],
    ['A1-14', '-5', Strings.errAmountInvalid],
    ['A1-15', '1e999', Strings.errAmountInvalid],
  ] as const)('%s: rejects "%s" at the field and writes nothing', async (_id, typed, message) => {
    const { result } = await submitAmount(typed);

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    // getFieldState, not formState.errors — the latter is a vacuous read under
    // renderHook (MA-008 T6), as the comment above the 0.005 case records.
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(message);
  });

  // A USD commitment paid from an EGP account, so requiresRate is true and the
  // rate field is the one under test.
  async function submitRate(typed: string) {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', typed);
    });
    expect(result.current.state.requiresRate).toBe(true);
    await act(async () => {
      await result.current.onSubmit();
    });
    return result;
  }

  it.each([
    ['A2-01', '48.6', 48.6],
    ['A2-07', '1,234', 1234],
  ] as const)('%s: accepts "%s" and snapshots %p', async (_id, typed, expected) => {
    await submitRate(typed);

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    const arg = mockMarkAsPaid.mock.calls[0][1] as { exchange_rate_snapshot?: number };
    expect(arg.exchange_rate_snapshot).toBe(expected);
  });

  it.each([
    ['A2-02', '48.', Strings.addTxErrRateInvalid],
    ['A2-03', '', Strings.addTxErrRateRequired],
    ['A2-05', '0', Strings.addTxErrRateInvalid],
    ['A2-06', 'abc', Strings.addTxErrRateInvalid],
    ['A2-08', '1e999', Strings.addTxErrRateInvalid],
  ] as const)(
    '%s: rejects "%s" at the rate field and writes nothing',
    async (_id, typed, message) => {
      const result = await submitRate(typed);

      expect(mockMarkAsPaid).not.toHaveBeenCalled();
      expect(result.current.form.getFieldState('exchange_rate').error?.message).toBe(message);
    },
  );

  // D7: the catch was `catch { // error logged by store }`, so a failed save
  // left the sheet open, the button idle and the user told nothing —
  // .claude/rules/review.md class 1, reachable from the keyboard.
  it('surfaces a failed save and keeps the sheet open', async () => {
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
    const { result, rerender } = await submitAmount('15');

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(mockPaySheetState.setSaveError).toHaveBeenLastCalledWith(true);
    // The mocked selector store does not subscribe, so the flag only reaches
    // the hook's returned state on the next render — which is what the sheet
    // renders the error row from.
    await act(() => rerender(undefined));
    expect(result.current.state.saveError).toBe(true);
    expect(mockPaySheetState.setVisible).not.toHaveBeenCalledWith(false);
  });

  it('A2-04: omits the rate snapshot when the payment stays in one currency', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() =>
      usePaySheet({ ...fixedCommitment, currency: Currency.EGP }, duePayment),
    );
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    expect(result.current.state.requiresRate).toBe(false);
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    const arg = mockMarkAsPaid.mock.calls[0][1] as { exchange_rate_snapshot?: number };
    expect(arg.exchange_rate_snapshot).toBeUndefined();
  });
});
