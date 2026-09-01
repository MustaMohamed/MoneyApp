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
import {
  resolvePaySheetSaveError,
  usePaySheet,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.hook';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { TransactionAmountError } from '@/modules/transactions/domain/transaction_amounts';
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

// Stateful mock so `act()`-wrapped setters actually update what the hook reads.
let paySheetStateInner = {
  visible: false,
  saving: false,
  accountPickerVisible: false,
  rateOverride: false,
  saveError: undefined as string | undefined,
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
  setSaveError: jest.fn((message?: string) => {
    paySheetStateInner = { ...paySheetStateInner, saveError: message };
  }),
  reset: jest.fn(() => {
    paySheetStateInner = {
      visible: false,
      saving: false,
      accountPickerVisible: false,
      rateOverride: false,
      saveError: undefined,
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

// The schema refuses an `account_id` the loaded list does not hold, so a submit needs this pair.
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
    // Re-wire setters after `clearAllMocks`.
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
    mockPaySheetState.setSaveError.mockImplementation((message?: string) => {
      paySheetStateInner = { ...paySheetStateInner, saveError: message };
    });
    mockPaySheetState.reset.mockImplementation(() => {
      paySheetStateInner = {
        visible: false,
        saving: false,
        accountPickerVisible: false,
        rateOverride: false,
        saveError: undefined,
      };
    });
    mockAccounts = [];
    mockMarkAsPaid.mockClear();
    mockMarkAsPaid.mockResolvedValue(undefined);
    mockLoadPaymentsForMonth.mockClear();
    mockLoadPaymentsForMonth.mockResolvedValue(undefined);
    mockLoadAccounts.mockClear();
    mockLoadAccounts.mockResolvedValue(undefined);
    // Re-setup store mocks after `clearAllMocks`.
    setupStoreMocks();
  });

  it('prefills the fixed amount from amount_due when the sheet is visible on mount', async () => {
    // Start with `visible: true` so the prefill `useEffect` fires on first render.
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    // Prefill runs in a `useEffect`; flush microtasks.
    await act(async () => {});
    expect(result.current.form.getValues('amountText')).toBe('15');
    expect(result.current.form.getValues('paid_date')).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  // Housekeeping mints payments from legacy `commitments.amount`, so `amount_due` can be sub-cent.
  it.each([
    [0.005, '0.005'],
    [1e-7, '0.0000001'],
  ])('prefills amount_due %p as %p through amountText', async (amountDue, expected) => {
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet(fixedCommitment, { ...duePayment, amount_due: amountDue }),
    );
    await act(async () => {});
    expect(result.current.form.getValues('amountText')).toBe(expected);
  });

  it('rejects a prefilled amount_due of 1e-7 on submit as the floor message', async () => {
    mockAccounts = [egpAccount];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet(egpCommitment, { ...duePayment, amount_due: 1e-7 }),
    );
    await act(async () => {});
    expect(result.current.form.getValues('amountText')).toBe('0.0000001');

    await act(async () => {
      await result.current.onSubmit();
    });

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.commitmentsPayErrAmountMin,
    );
  });

  it('starts with rateOverride false on open', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    expect(result.current.state.rateOverride).toBe(false);
  });

  it('toggleRateOverride flips the flag', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    expect(result.current.state.rateOverride).toBe(false);
    await act(() => result.current.toggleRateOverride());
    expect(mockPaySheetState.setRateOverride).toHaveBeenCalledWith(true);
  });

  it('setPaidDate writes an ISO string into the form (date-picker upgrade)', async () => {
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => result.current.setPaidDate('2026-05-20'));
    expect(result.current.form.getValues('paid_date')).toBe('2026-05-20');
  });

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
    // `formState.errors` is vacuous under `renderHook`; `getFieldState` reads the live field.
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.commitmentsPayErrAmountMin,
    );
  });

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

  // EGP commitment paid from a loaded EGP account, so a failure here is the typed amount only.
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

  // These are the unrounded values handed to the store; `roundMoney` runs later in the repository.
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
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(message);
  });

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
    // Rate text is unfloored by `parseRateText`, so a rate below `MIN_MONEY_AMOUNT` accepts.
    ['A2-09', '0.005', 0.005],
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

  it('surfaces a failed save and keeps the sheet open', async () => {
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
    const { result, rerender } = await submitAmount('15');

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(mockPaySheetState.setSaveError).toHaveBeenLastCalledWith(Strings.commitmentsPayError);
    // The mocked selector store does not subscribe, so the flag reaches state on the next render.
    await act(() => rerender(undefined));
    expect(result.current.state.saveError).toBe(Strings.commitmentsPayError);
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

  // A USD commitment needs a rate whatever the account's currency is.
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

  // `AccountPickerSheet` fires `onSelect` for every row, the already-checked one included.
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

  it('F2: restores the global rate when the override is turned back off', async () => {
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });

    await act(() => result.current.toggleRateOverride());
    await act(() => rerender(undefined));
    expect(result.current.state.rateOverride).toBe(true);

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

  // `String(1e-7)` is exponential text `parseRateText` rejects; the prefill must stay typeable.
  it('prefills an exponential-band global rate as positional text the schema accepts', async () => {
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 1e-7,
      isManualOverride: false,
      rate_updated_at: null,
    }));
    mockAccounts = [{ id: 'acc-usd', currency: Currency.USD } as unknown as Account];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(async () => {});

    expect(result.current.form.getValues('exchange_rate')).toBe('0.0000001');
  });

  it('reseeds positional text when the override toggles back off at that rate', async () => {
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 1e-7,
      isManualOverride: false,
      rate_updated_at: null,
    }));
    mockAccounts = [{ id: 'acc-egp', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(() => result.current.toggleRateOverride());
    await act(() => result.current.form.setValue('exchange_rate', '48.6'));
    await act(() => result.current.toggleRateOverride());

    expect(result.current.form.getValues('exchange_rate')).toBe('0.0000001');
  });

  // The save-error flag lives in a module-level store, so it survives a dismiss.
  it('F3: clears a stale save error when the sheet is reopened after a dismiss', async () => {
    mockAccounts = [{ id: 'acc-usd', currency: Currency.USD } as unknown as Account];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));

    const { result, rerender } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
    await act(async () => {});
    expect(result.current.form.getValues('exchange_rate')).toBe('55');

    await act(async () => {
      await result.current.onSubmit();
    });
    await act(() => rerender(undefined));
    expect(result.current.state.saveError).toBe(Strings.commitmentsPayError);

    mockPaySheetState.setSaveError.mockClear();

    // Swipe-down: the sheet closes without going through `onValid`'s `reset()`.
    await act(() => result.current.setVisible(false));
    await act(async () => {
      rerender(undefined);
    });
    await act(() => result.current.setVisible(true));
    await act(async () => {
      rerender(undefined);
    });
    await act(() => rerender(undefined));

    expect(mockPaySheetState.setSaveError).toHaveBeenCalledWith(undefined);
    expect(result.current.state.saveError).toBeUndefined();
  });

  it('F3: clears the save error on a submit that fails validation', async () => {
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
    const { result, rerender } = await submitAmount('15');
    await act(() => rerender(undefined));
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.state.saveError).toBe(Strings.commitmentsPayError);

    mockPaySheetState.setSaveError.mockClear();

    await act(() => {
      result.current.form.setValue('amountText', '12abc');
    });
    await act(async () => {
      await result.current.onSubmit();
    });
    await act(() => rerender(undefined));

    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(
      Strings.errAmountInvalid,
    );
    expect(mockPaySheetState.setSaveError).toHaveBeenCalledWith(undefined);
    expect(result.current.state.saveError).toBeUndefined();
  });

  // The rate row is not a `Controller`, so `setValue` is the only thing that can revalidate it.
  it('H1: seeding the rate after a failed submit clears the rate error without a second submit', async () => {
    mockAccounts = [
      { id: 'acc-egp', currency: Currency.EGP } as unknown as Account,
      { id: 'acc-usd', currency: Currency.USD } as unknown as Account,
    ];
    const { result, rerender } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    // `setValue` is the raw form write; `selectAccount` is what seeds the rate.
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

    // The revalidate `setValue` schedules is async, hence the microtask flush.
    await act(async () => {
      result.current.selectAccount(mockAccounts[1]);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));

    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
  });

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

    // The revalidate `setValue` schedules is async, hence the microtask flush.
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
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
    expect(result.current.form.getFieldState('amountText').error).toBeUndefined();
    expect(result.current.form.getFieldState('account_id').error).toBeUndefined();
  });

  // The store publishes non-archived accounts only: archived, deleted and unloaded are one shape.
  describe('account membership', () => {
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
    it('keeps the plain required message when nothing is selected', async () => {
      mockAccounts = [egpAccount];
      const result = await submitWithAccountId(egpCommitment, '');

      expect(mockMarkAsPaid).not.toHaveBeenCalled();
      expect(result.current.form.getFieldState('account_id').error?.message).toBe(
        Strings.commitmentsPayErrAccountRequired,
      );
    });

    // The membership issue precedes the rate demand, and `requiresRate` stays false without one.
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

    // `commitment.account_id` is a durable copy that outlives the account being archived.
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
  });

  describe('sub-floor conversions', () => {
    // 0.01 EGP at 49.06 rounds to 0.00 USD: over the amount floor, under the debited one.
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
        Strings.commitmentsPayErrConvertedBelowMin(Currency.USD),
      );
    });

    // `roundMoney(0.50 * 0.01)` is 0.00, so the shortfall is in EGP, the currency debited.
    it('names the paying account currency, not USD, when the shortfall is in EGP', async () => {
      mockAccounts = [egpAccount];
      const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
      await act(() => {
        result.current.form.setValue('account_id', egpAccount.id);
        result.current.form.setValue('amountText', '0.50');
        result.current.form.setValue('paid_date', '2026-05-20');
        result.current.form.setValue('exchange_rate', '0.01');
      });
      await act(async () => {
        await result.current.onSubmit();
      });

      expect(mockMarkAsPaid).not.toHaveBeenCalled();
      expect(result.current.form.getFieldState('amountText').error?.message).toBe(
        Strings.commitmentsPayErrConvertedBelowMin(Currency.EGP),
      );
    });

    // An amount that overflows the resolver returns undefined instead of throwing in a render.
    it('shows no converted line for an amount that overflows the resolver output guard', async () => {
      mockAccounts = [egpAccount];
      const { result } = await renderHook(() => usePaySheet(fixedCommitment, duePayment));
      await act(() => {
        result.current.form.setValue('account_id', egpAccount.id);
        result.current.form.setValue('amountText', '99999999999999999999');
        result.current.form.setValue('exchange_rate', '49.06');
      });

      expect(result.current.state.convertedTotal).toBeUndefined();
    });

    // A huge finite amount clears the refine, so the resolver throws at `markAsPaid`, not here.
    it('an oversized amount clears field validation; a markAsPaid rejection surfaces the unstorable copy with no write', async () => {
      mockAccounts = [egpAccount];
      mockMarkAsPaid.mockRejectedValueOnce(
        new TransactionAmountError('Computed amount exceeds the storable range', 'unstorable'),
      );
      const { result, rerender } = await renderHook(() => usePaySheet(egpCommitment, duePayment));
      await act(() => {
        result.current.form.setValue('account_id', egpAccount.id);
        result.current.form.setValue('amountText', '99999999999999999999');
        result.current.form.setValue('paid_date', '2026-05-20');
      });
      await act(async () => {
        await result.current.onSubmit();
      });

      expect(result.current.form.getFieldState('amountText').error).toBeUndefined();
      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
      expect(mockPaySheetState.setVisible).not.toHaveBeenCalledWith(false);

      // Deterministic failure gets its own copy, not the retry-implying banner.
      await act(() => rerender(undefined));
      expect(result.current.state.saveError).toBe(Strings.commitmentsPayErrAmountUnstorable);
    });

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
  });

  // Every expected figure here is `resolveCommitmentPaymentAmounts` output, not a re-derived one.
  describe('render facts', () => {
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

    it('row 1: a USD commitment paid from an EGP account converts by multiplying', async () => {
      const state = await renderPreview(fixedCommitment, egpAccount, '100', '49.06');

      expect(state.convertedTotal).toEqual({ amount: 4906, currency: Currency.EGP });
      expect(state.convertedBelowMin).toBe(false);
      expect(state.previewEgpAmount).toBe(4906);
      expect(state.previewHidden).toBe(false);
      expect(state.purposeCaption).toBeUndefined();
    });

    // The rate-row preview is hidden here because the entered amount already is the EGP one.
    it('row 2: an EGP commitment paid from a USD account converts by dividing', async () => {
      const state = await renderPreview(egpCommitment, usdAccount, '5000', '49.06');

      expect(state.convertedTotal).toEqual({ amount: 101.92, currency: Currency.USD });
      expect(state.previewHidden).toBe(true);
      expect(state.purposeCaption).toBeUndefined();
    });

    // A rate is still demanded USD to USD because `egp_amount` is the ledger's storage currency.
    it('row 3: a USD commitment paid from a USD account shows no line and captions the rate', async () => {
      const state = await renderPreview(fixedCommitment, usdAccount, '100', '49.06');

      expect(state.requiresRate).toBe(true);
      expect(state.convertedTotal).toBeUndefined();
      expect(state.previewEgpAmount).toBe(4906);
      expect(state.previewHidden).toBe(false);
      expect(state.purposeCaption).toBe(Strings.commitmentsPayRatePurposeEgp);
    });

    // `roundMoney(0.004)` is 0 and the resolver throws on it, which in a render is a red screen.
    it.each([
      ['a typed zero', '0'],
      ['an amount under the floor', '0.004'],
      ['an amount the parser cannot read', '1,23'],
    ] as const)('row 4: shows no line for %s', async (_label, amountText) => {
      const state = await renderPreview(fixedCommitment, egpAccount, amountText, '49.06');

      expect(state.convertedTotal).toBeUndefined();
      expect(state.previewEgpAmount).toBeUndefined();
    });

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

    // The line must not render a confident zero, so the flag drives the amount-field message.
    it('row 5: flags a converted amount below the floor instead of rendering it', async () => {
      const state = await renderPreview(egpCommitment, usdAccount, '0.01', '49.06');

      expect(state.convertedBelowMin).toBe(true);
      expect(state.convertedTotal).toBeUndefined();
    });

    // Below the floor the rate-row preview must go quiet too, not render a confident 0.00 EGP.
    it('row 5: suppresses the rate-row preview below the floor, not just the line', async () => {
      const state = await renderPreview(fixedCommitment, egpAccount, '0.50', '0.01');

      expect(state.convertedBelowMin).toBe(true);
      expect(state.previewHidden).toBe(false);
      expect(state.previewEgpAmount).toBeUndefined();
      expect(state.convertedTotal).toBeUndefined();
    });

    // The resolver rounds the amount to 1.00 first, so 0.02, not `roundMoney(1.005 / 40)` = 0.03.
    it('renders the resolver rounding, not a re-derived one: 1.005 EGP at 40 is 0.02 USD', async () => {
      const state = await renderPreview(egpCommitment, usdAccount, '1.005', '40');

      expect(state.convertedTotal).toEqual({ amount: 0.02, currency: Currency.USD });
    });

    it('row 1-4 fourth pair: EGP commitment paid from an EGP account converts nothing', async () => {
      const state = await renderPreview(egpCommitment, egpAccount, '5000');

      expect(state.requiresRate).toBe(false);
      expect(state.convertedTotal).toBeUndefined();
      expect(state.convertedBelowMin).toBe(false);
      expect(state.previewEgpAmount).toBe(5000);
      expect(state.previewHidden).toBe(true);
      expect(state.purposeCaption).toBeUndefined();
    });
  });
});

describe('resolvePaySheetSaveError', () => {
  it("maps the discriminated 'unstorable' reason to its own copy, ignoring the message", () => {
    expect(
      resolvePaySheetSaveError(new TransactionAmountError('arbitrary internal text', 'unstorable')),
    ).toBe(Strings.commitmentsPayErrAmountUnstorable);
  });

  it('falls through an undiscriminated TransactionAmountError to the retry banner', () => {
    expect(
      resolvePaySheetSaveError(new TransactionAmountError('A positive USD exchange rate is required')),
    ).toBe(Strings.commitmentsPayError);
  });

  it('keeps the retry banner for everything else, where retrying is accurate', () => {
    expect(resolvePaySheetSaveError(new Error('disk full'))).toBe(Strings.commitmentsPayError);
    expect(resolvePaySheetSaveError(undefined)).toBe(Strings.commitmentsPayError);
  });
});
