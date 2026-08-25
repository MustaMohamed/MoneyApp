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

// W1B: the schema now refuses an `account_id` the store's loaded list does not
// hold, so a fixture pair is needed wherever a submit is expected to reach the
// store. The EGP pair also needs no rate, which is what lets the amount battery
// below isolate the amount (spec §3 row 10).
const egpCommitment: Commitment = { ...fixedCommitment, currency: Currency.EGP };
const egpAccount = { id: 'acc-egp', currency: Currency.EGP } as unknown as Account;
const usdAccount = { id: 'acc-usd', currency: Currency.USD } as unknown as Account;

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
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', egpAccount.id);
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
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', egpAccount.id);
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
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', egpAccount.id);
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
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', egpAccount.id);
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

  // W1B (#312, spec §3 row 10): an EGP commitment paid from a loaded EGP
  // account. Both halves are load-bearing for what this battery claims to
  // isolate — the loaded account clears the membership refine, and the
  // matching currency means no rate is demanded, so every row that reds here
  // reds on the amount it typed and on nothing else.
  async function submitAmount(typed: string) {
    mockAccounts = [egpAccount];
    const { result, rerender } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', egpAccount.id);
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
  // ---------------------------------------------------------------------
  // P8 cycle 1 — F1/F2/F3. Three regressions the rate-required superRefine
  // introduced by requiring a value that nothing seeds, plus a stale error
  // flag that outlives the sheet.
  // ---------------------------------------------------------------------

  // F1: picking an account that flips `requiresRate` on must bring the global
  // rate with it. Without it the schema demands a rate the user was never
  // offered a populated field for.
  it('F1: seeds the global rate when the picked account turns the requirement on', async () => {
    mockAccounts = [
      { id: 'acc-egp', currency: Currency.EGP } as unknown as Account,
      { id: 'acc-usd', currency: Currency.USD } as unknown as Account,
    ];
    const { result, rerender } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });
    await act(() => rerender(undefined));
    expect(result.current.state.requiresRate).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBeUndefined();

    await act(() => {
      result.current.selectAccount(mockAccounts[1]);
    });
    await act(() => rerender(undefined));

    expect(result.current.state.requiresRate).toBe(true);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(mockPaySheetState.setRateOverride).toHaveBeenLastCalledWith(false);
  });

  // F1, the half that is NOT the transaction form's condition: a USD
  // commitment needs a rate whatever the account's currency is, so an EGP
  // account has to seed too. A copied `account.currency === USD` guard reds here.
  it('F1: seeds the global rate for a USD commitment paid from an EGP account', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('exchange_rate', '');
    });
    await act(() => {
      result.current.selectAccount(mockAccounts[0]);
    });
    await act(() => rerender(undefined));

    expect(result.current.state.requiresRate).toBe(true);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
  });

  it('F1: leaves the rate alone when neither side is USD', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.selectAccount(mockAccounts[0]);
    });
    expect(result.current.form.getValues('exchange_rate')).toBeUndefined();
  });

  // G1: `AccountPickerSheet` fires `onSelect` for every row, the checked one
  // included, so re-tapping the already-selected account is a tap that means
  // nothing. Before the `!rateOverride` guard it re-seeded the global rate and
  // cleared the override, discarding a rate the user had typed.
  it('G1: keeps a typed override rate when the already-selected account is re-picked', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });
    await act(() => result.current.toggleRateOverride());
    await act(() => {
      result.current.form.setValue('exchange_rate', '60');
    });
    await act(() => rerender(undefined));
    expect(result.current.state.rateOverride).toBe(true);

    await act(() => {
      result.current.selectAccount(mockAccounts[0]);
    });
    await act(() => rerender(undefined));

    expect(result.current.form.getValues('exchange_rate')).toBe('60');
    expect(result.current.state.rateOverride).toBe(true);
  });

  // F2: "reset to global" has to hand the global rate back. Turning the
  // override off after clearing the field used to leave '' in the form with
  // no input on screen to correct it.
  it('F2: restores the global rate when the override is turned back off', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });

    await act(() => result.current.toggleRateOverride());
    await act(() => rerender(undefined));
    expect(result.current.state.rateOverride).toBe(true);

    // The user clears the field while the override is on.
    await act(() => {
      result.current.form.setValue('exchange_rate', '');
    });

    await act(() => result.current.toggleRateOverride());
    await act(() => rerender(undefined));

    expect(result.current.state.rateOverride).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
  });

  it('F2: does not overwrite the typed rate when the override is turned on', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('exchange_rate', '48.6');
    });
    await act(() => result.current.toggleRateOverride());
    expect(result.current.form.getValues('exchange_rate')).toBe('48.6');
  });

  // F3 sequence (a): fail -> dismiss -> reopen. The flag lives in a
  // module-level store, so without a clear on open the banner renders on a
  // different payment before the user has touched anything.
  it('F3: clears a stale save error when the sheet is reopened after a dismiss', async () => {
    mockAccounts = [{ id: 'acc-usd', currency: Currency.USD } as unknown as Account];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));

    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(async () => {});
    // The prefill supplies a complete, valid form: amount, account and rate.
    expect(result.current.form.getValues('exchange_rate')).toBe('55');

    await act(async () => {
      await result.current.onSubmit();
    });
    await act(() => rerender(undefined));
    expect(result.current.state.saveError).toBe(true);

    mockPaySheetState.setSaveError.mockClear();

    // Swipe-down: the sheet closes without going through onValid's reset().
    await act(() => result.current.setVisible(false));
    await act(async () => {
      rerender(undefined);
    });
    // Reopened on a later payment.
    await act(() => result.current.setVisible(true));
    await act(async () => {
      rerender(undefined);
    });
    await act(() => rerender(undefined));

    expect(mockPaySheetState.setSaveError).toHaveBeenCalledWith(false);
    expect(result.current.state.saveError).toBe(false);
  });

  // F3 sequence (b): fail -> mistype -> submit. Validation rejects, so
  // `onValid` never runs and nothing clears the flag; the sheet showed the
  // field error and the save-failed banner together, for a submit that never
  // reached the store.
  it('F3: clears the save error on a submit that fails validation', async () => {
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
    const { result, rerender } = await submitAmount('15');
    await act(() => rerender(undefined));
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.state.saveError).toBe(true);

    mockPaySheetState.setSaveError.mockClear();

    await act(() => {
      result.current.form.setValue('amountText', '12abc');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    await act(() => rerender(undefined));

    // The second submit never reached the store.
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.errAmountInvalid,
    );
    expect(mockPaySheetState.setSaveError).toHaveBeenCalledWith(false);
    expect(result.current.state.saveError).toBe(false);
  });

  // ---------------------------------------------------------------------
  // P8 cycle 3 — H1. The rate row is not a `Controller`, so `setValue` is the
  // only thing that can revalidate it. Pinned `shouldValidate: false`, the
  // required refine D6 added kept its error on screen while the user typed the
  // fix; the amount field beside it, which goes through a `Controller`, cleared
  // live. The gate is `isSubmitted`, which is what a registered field does
  // under `mode: 'onSubmit'` + `reValidateMode: 'onChange'`.
  // ---------------------------------------------------------------------

  it('H1: seeding the rate after a failed submit clears the rate error without a second submit', async () => {
    mockAccounts = [
      { id: 'acc-egp', currency: Currency.EGP } as unknown as Account,
      { id: 'acc-usd', currency: Currency.USD } as unknown as Account,
    ];
    const { result, rerender } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    // An EGP commitment paid from an EGP account: no rate required yet.
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    // Switch to the USD account WITHOUT the seed, so the submit below fails on
    // the rate. `setValue` is the raw form write; `selectAccount` is the seed.
    await act(() => {
      result.current.form.setValue('account_id', 'acc-usd');
    });
    await act(() => rerender(undefined));
    expect(result.current.state.requiresRate).toBe(true);

    await act(async () => {
      await result.current.onSubmit();
    });
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('exchange_rate').error?.message).toBe(
      Strings.addTxErrRateRequired,
    );

    // Re-picking the account seeds the global rate. That is the user fixing the
    // field, so the error has to go with it — no second Save tap. The revalidate
    // `setValue` schedules is async, hence the microtask flush.
    await act(async () => {
      result.current.selectAccount(mockAccounts[1]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));

    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
  });

  // H4. `toggleRateOverride` is the THIRD write to `exchange_rate` and had the
  // same pinned-false default. Turning the override off after a failed submit is
  // the user handing the field back to the global rate — the error it fixes has
  // to go with it. Unlike the row's own onChange this site can only ever CLEAR
  // one: `String(rate)` is a positive global rate, so no input reaches it that
  // D6's refine would reject. Staleness only, which is exactly what is asserted.
  it('H4: turning the override off after a failed submit clears the stale rate error', async () => {
    mockAccounts = [{ id: 'acc-usd', currency: Currency.USD } as unknown as Account];
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-usd');
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(() => rerender(undefined));
    expect(result.current.state.requiresRate).toBe(true);

    // Override on, then the field cleared — the shape F2 already covers.
    await act(() => result.current.toggleRateOverride());
    await act(() => rerender(undefined));
    await act(() => {
      result.current.form.setValue('exchange_rate', '');
    });

    await act(async () => {
      await result.current.onSubmit();
    });
    await act(() => rerender(undefined));
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('exchange_rate').error?.message).toBe(
      Strings.addTxErrRateRequired,
    );

    // "Reset to global" hands the rate back. The revalidate `setValue`
    // schedules is async, hence the microtask flush.
    await act(async () => {
      result.current.toggleRateOverride();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));

    expect(result.current.state.rateOverride).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
  });

  it('H1: seeding the rate before any submit raises no error', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(async () => {
      result.current.selectAccount(mockAccounts[0]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));

    expect(result.current.form.formState.isSubmitted).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    // Nothing raised, on any field. `setValue(name, …, { shouldValidate })`
    // publishes errors only at `name`, so pinning true HERE would in fact be
    // harmless — the seeded global rate is always positive, and the amount and
    // account errors the superRefine also computes are discarded. That is why
    // this case does not red under a pinned-true mutation and the row's own
    // onChange does: there the user can type a rate that fails. The gate is
    // kept at both sites so one write cannot drift from the other.
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
    expect(result.current.form.getFieldState('amountText').error).toBeUndefined();
    expect(result.current.form.getFieldState('account_id').error).toBeUndefined();
  });

  // ---------------------------------------------------------------------
  // W1B — account membership (spec §3 rows 6/7) and the sub-floor mirror
  // (row 5). The store publishes non-archived accounts only, so "archived",
  // "deleted" and "not loaded yet" are one shape at this layer: an id the
  // list does not hold.
  // ---------------------------------------------------------------------

  async function submitWithAccountId(commitment: Commitment, accountId: string) {
    const { result } = await renderHook(() => usePaySheet(commitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', accountId);
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    return result;
  }

  it.each([
    ['an archived account', 'acc-archived'],
    ['an account that no longer exists', 'acc-gone'],
  ] as const)('rejects %s at the field and writes nothing', async (_label, accountId) => {
    mockAccounts = [egpAccount];
    const result = await submitWithAccountId(egpCommitment, accountId);

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('account_id').error?.message).toBe(
      Strings.commitmentsPayErrAccountUnavailable,
    );
  });

  // The loading window is pinned deliberately: a commitment carrying an
  // account_id, opened before the store has published its accounts, errors
  // rather than submitting an id the write path cannot resolve.
  it('rejects a set account_id while the store list is still empty', async () => {
    const result = await submitWithAccountId(egpCommitment, 'acc-egp');

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('account_id').error?.message).toBe(
      Strings.commitmentsPayErrAccountUnavailable,
    );
  });

  it('accepts an account_id the loaded list holds', async () => {
    mockAccounts = [egpAccount];
    const result = await submitWithAccountId(egpCommitment, egpAccount.id);

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.form.getFieldState('account_id').error).toBeUndefined();
  });

  // An empty selection is the field's own `min(1)`, not the membership refine.
  // Merging the two messages would tell a user who has picked nothing that
  // their account is unavailable.
  it('keeps the plain required message when nothing is selected', async () => {
    mockAccounts = [egpAccount];
    const result = await submitWithAccountId(egpCommitment, '');

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('account_id').error?.message).toBe(
      Strings.commitmentsPayErrAccountRequired,
    );
  });

  // The defect this refine exists for: `accounts.find(...)` returning
  // undefined made `needsRate` false, so a USD commitment sailed through with
  // no rate and failed at the store with the generic banner. The membership
  // issue now precedes the rate demand, and the hook's own `requiresRate`
  // stays false because its !selectedAccount guard is untouched.
  it('does not fall through to "no rate needed" when the account is missing from the list', async () => {
    mockAccounts = [egpAccount];
    const result = await submitWithAccountId(fixedCommitment, 'acc-gone');

    expect(result.current.state.requiresRate).toBe(false);
    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('account_id').error?.message).toBe(
      Strings.commitmentsPayErrAccountUnavailable,
    );
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
  });

  // Spec §3 row 7. `commitment.account_id` is a durable copy that outlives the
  // account being archived, so prefilling it unchanged opens the sheet already
  // invalid on a field the user never touched.
  it('drops a prefilled account_id the list does not hold and falls back to the first account', async () => {
    mockAccounts = [egpAccount];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet({ ...egpCommitment, account_id: 'acc-archived' }, duePayment),
    );
    await act(async () => {});

    expect(result.current.form.getValues('account_id')).toBe(egpAccount.id);
  });

  it('leaves the account empty when the prefilled id is dropped and nothing is loaded', async () => {
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet({ ...egpCommitment, account_id: 'acc-archived' }, duePayment),
    );
    await act(async () => {});

    expect(result.current.form.getValues('account_id')).toBe('');
  });

  // Spec §3 row 5. 0.01 EGP at 49.06 is 0.00 USD: above the Amount field's own
  // floor, below the floor in the currency actually debited. The write path
  // refuses it at validateTransactionPolicy with the generic banner, so the
  // schema mirrors the resolver to name the reason on the field instead.
  // (The mockup's 0.40 EGP illustration does NOT reach this branch —
  // roundMoney(0.40 / 49.06) is 0.01.)
  it('blocks a save whose converted amount rounds below the money floor', async () => {
    mockAccounts = [usdAccount];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', usdAccount.id);
      result.current.form.setValue('amountText', '0.01');
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', '49.06');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.commitmentsPayErrConvertedBelowMin,
    );
  });

  // The same amount at a rate that leaves it on the floor saves. Without this
  // row a refine that always raised would pass the case above.
  it('saves the same amount when the rate leaves the converted value on the floor', async () => {
    mockAccounts = [usdAccount];
    const { result } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', usdAccount.id);
      result.current.form.setValue('amountText', '0.01');
      result.current.form.setValue('paid_date', '2026-05-20');
      result.current.form.setValue('exchange_rate', '1');
    });
    await act(async () => {
      await result.current.onSubmit();
    });

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.form.getFieldState('amountText').error).toBeUndefined();
  });

  // ---------------------------------------------------------------------
  // W1B — the render facts the sheet used to compute in its own body
  // (spec §3 rows 1-5, mockup frames 1-4). Every figure here is
  // `resolveCommitmentPaymentAmounts` output, which is the point: the old
  // `amountWatch * rateNum` was 2,407× out on row 2.
  // ---------------------------------------------------------------------

  async function renderPreview(
    commitment: Commitment,
    account: Account,
    amountText: string,
    exchangeRate?: string,
  ) {
    mockAccounts = [account];
    const { result, rerender } = await renderHook(() => usePaySheet(commitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', account.id);
      result.current.form.setValue('amountText', amountText);
      if (exchangeRate !== undefined) {
        result.current.form.setValue('exchange_rate', exchangeRate);
      }
    });
    await act(() => rerender(undefined));
    return result.current.state;
  }

  // Frame 1. Correct before this ticket too, by coincidence: multiplying is
  // the right operation in exactly this one of the four currency pairs.
  it('row 1: a USD commitment paid from an EGP account converts by multiplying', async () => {
    const state = await renderPreview(fixedCommitment, egpAccount, '100', '49.06');

    expect(state.convertedTotal).toEqual({ amount: 4906, currency: Currency.EGP });
    expect(state.convertedBelowMin).toBe(false);
    expect(state.previewEgpAmount).toBe(4906);
    expect(state.previewHidden).toBe(false);
    expect(state.purposeCaption).toBeUndefined();
  });

  // Frame 2, the defect this ticket exists for: the shipped sheet rendered
  // 5,000 × 49.06 = 245,300 USD against a 101.92 USD debit. The rate row's EGP
  // preview is suppressed here because the entered amount already IS the EGP
  // one, so the line would echo the Amount field a row above.
  it('row 2: an EGP commitment paid from a USD account converts by dividing', async () => {
    const state = await renderPreview(egpCommitment, usdAccount, '5000', '49.06');

    expect(state.convertedTotal).toEqual({ amount: 101.92, currency: Currency.USD });
    expect(state.previewHidden).toBe(true);
    expect(state.purposeCaption).toBeUndefined();
  });

  // Frame 3. The rate stays demanded — egp_amount is the ledger's storage
  // currency — so the line's gate cannot be `requiresRate`, and the row
  // explains why a field is required for a payment that converts nothing.
  it('row 3: a USD commitment paid from a USD account shows no line and captions the rate', async () => {
    const state = await renderPreview(fixedCommitment, usdAccount, '100', '49.06');

    expect(state.requiresRate).toBe(true);
    expect(state.convertedTotal).toBeUndefined();
    expect(state.previewEgpAmount).toBe(4906);
    expect(state.previewHidden).toBe(false);
    expect(state.purposeCaption).toBe(Strings.commitmentsPayRatePurposeEgp);
  });

  // Row 4. `parsePositiveDecimal` is the gate: 0 and 0.004 are both refused,
  // the latter because roundMoney(0.004) is 0 and the resolver throws on it —
  // in a render, where a throw is a red screen.
  it.each([
    ['a typed zero', '0'],
    ['an amount under the floor', '0.004'],
    ['an amount the parser cannot read', '1,23'],
  ] as const)('row 4: shows no line for %s', async (_label, amountText) => {
    const state = await renderPreview(fixedCommitment, egpAccount, amountText, '49.06');

    expect(state.convertedTotal).toBeUndefined();
    expect(state.previewEgpAmount).toBeUndefined();
  });

  // Frame 4: no account, so no rate row and no line. The hook's own
  // !selectedAccount guard is what keeps `requiresRate` false here.
  it('row 4: shows no line and demands no rate before an account is picked', async () => {
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('amountText', '100');
    });

    expect(result.current.state.requiresRate).toBe(false);
    expect(result.current.state.convertedTotal).toBeUndefined();
    expect(result.current.state.previewEgpAmount).toBeUndefined();
  });

  // Row 5. 0.01 EGP at 49.06 resolves to 0.00 USD, so the line must not render
  // a confident zero; the flag drives the Amount-field message instead.
  it('row 5: flags a converted amount below the floor instead of rendering it', async () => {
    const state = await renderPreview(egpCommitment, usdAccount, '0.01', '49.06');

    expect(state.convertedBelowMin).toBe(true);
    expect(state.convertedTotal).toBeUndefined();
  });

  // The half-even edge at the surface rather than at the resolver: 1 / 40 is
  // 0.025 exactly and banker's rounding takes it DOWN. A preview that divided
  // once with Math.round would show 0.03, a cent the write never persists.
  it('renders the resolver rounding, not a re-derived one: 1.00 EGP at 40 is 0.02 USD', async () => {
    const state = await renderPreview(egpCommitment, usdAccount, '1', '40');

    expect(state.convertedTotal).toEqual({ amount: 0.02, currency: Currency.USD });
  });
});
