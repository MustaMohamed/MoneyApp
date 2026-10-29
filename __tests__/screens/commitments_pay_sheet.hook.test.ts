import { act, renderHook } from '@testing-library/react-native';

import { AmountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';
import {
  resolvePaySheetSaveError,
  usePaySheet,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.hook';
import { usePaySheetState } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { TransactionAmountError } from '@/modules/transactions/domain/transaction_amounts';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
const mockRouterPush = jest.fn();
jest.mock('expo-router', () => ({
  router: { push: (...args: unknown[]) => mockRouterPush(...args) },
}));
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
    getPaymentsByCommitment: jest.fn().mockResolvedValue([]),
  },
}));

const OWNER = 'owner-a';
// The detail's local calendar date, passed in; the hook never reads the clock.
const TODAY = '2026-10-20';

// Stateful mock so `act()`-wrapped setters actually update what the hook reads.
const CLEAN_PAY_SHEET = {
  visible: false,
  saving: false,
  settled: false,
  rateOverride: false,
  opensAddAccountOnClose: false,
  saveError: undefined as string | undefined,
};
let paySheetStateInner = { ...CLEAN_PAY_SHEET };
const mockPaySheetState = {
  get entries() {
    return { [OWNER]: paySheetStateInner };
  },
  setVisible: jest.fn((_owner: string, v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, visible: v };
  }),
  setSaving: jest.fn((_owner: string, v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, saving: v };
  }),
  setSettled: jest.fn((_owner: string, v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, settled: v };
  }),
  setRateOverride: jest.fn((_owner: string, v: boolean) => {
    paySheetStateInner = { ...paySheetStateInner, rateOverride: v };
  }),
  setSaveError: jest.fn((_owner: string, message?: string) => {
    paySheetStateInner = { ...paySheetStateInner, saveError: message };
  }),
  requestAccountCreation: jest.fn((_owner: string): boolean => {
    if (!paySheetStateInner.visible || paySheetStateInner.saving) return false;
    paySheetStateInner = { ...paySheetStateInner, visible: false, opensAddAccountOnClose: true };
    return true;
  }),
  completeClose: jest.fn((_owner: string): 'addAccount' | undefined => {
    if (!paySheetStateInner.opensAddAccountOnClose) return undefined;
    paySheetStateInner = { ...paySheetStateInner, opensAddAccountOnClose: false };
    return 'addAccount';
  }),
  open: jest.fn(),
  release: jest.fn(),
  reset: jest.fn(),
};

jest.mock('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state', () => ({
  ...jest.requireActual<
    typeof import('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state')
  >('@/modules/commitments/screens/commitments/detail/components/pay_sheet.state'),
  usePaySheetState: jest.fn(),
}));

const fixedCommitment = makeTestCommitment({
  name: 'Netflix',
  amount: 15,
  currency: Currency.USD,
  category_id: 'cat1',
  account_id: null,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

// The schema refuses an `account_id` the loaded list does not hold, so a submit needs this pair.
const egpCommitment: Commitment = { ...fixedCommitment, currency: Currency.EGP };
const egpAccount = { id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account;
const usdAccount = { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account;

const duePayment = makeTestPayment({
  commitment_id: fixedCommitment.id,
  due_date: '2026-05-01',
  amount_due: 15,
  currency: Currency.USD,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const mockMarkAsPaid = jest.fn().mockResolvedValue(undefined);
const mockLoadPaymentsForMonth = jest.fn().mockResolvedValue(undefined);
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);
let mockAccounts: Account[] = [];
let mockHasLoaded = false;
let mockLoadError = false;

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
    get hasLoaded() {
      return mockHasLoaded;
    },
    get loadError() {
      return mockLoadError;
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
    paySheetStateInner = { ...CLEAN_PAY_SHEET };
    jest.clearAllMocks();
    // Re-wire setters after `clearAllMocks`.
    mockPaySheetState.setVisible.mockImplementation((_owner: string, v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, visible: v };
    });
    mockPaySheetState.setSaving.mockImplementation((_owner: string, v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, saving: v };
    });
    mockPaySheetState.setRateOverride.mockImplementation((_owner: string, v: boolean) => {
      paySheetStateInner = { ...paySheetStateInner, rateOverride: v };
    });
    mockPaySheetState.setSaveError.mockImplementation((_owner: string, message?: string) => {
      paySheetStateInner = { ...paySheetStateInner, saveError: message };
    });
    mockAccounts = [];
    mockHasLoaded = false;
    mockLoadError = false;
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
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    // Prefill runs in a `useEffect`; flush microtasks.
    await act(async () => {});
    expect(result.current.form.getValues('amountText')).toBe('15');
    expect(result.current.form.getValues('paid_date')).toBe(TODAY);
  });

  // 2028-02-29 is not the clock's date, so a `new Date()` default reads another day.
  it('dates the payment on the today passed in, a leap day, not the clock', async () => {
    mockAccounts = [egpAccount];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, egpCommitment, duePayment, '2028-02-29'),
    );
    await act(async () => {});
    await act(() => rerender(undefined));

    expect(result.current.form.getValues('paid_date')).toBe('2028-02-29');
    expect(result.current.state.paidDate).toBe('2028-02-29');
  });

  it('defaults the date to empty and the button to the bare label before the detail loads', async () => {
    const { result } = await renderHook(() => usePaySheet(OWNER, undefined, undefined, undefined));

    expect(result.current.form.getValues('paid_date')).toBe('');
    expect(result.current.state.ctaLabel).toBe('Pay');
  });

  // Housekeeping mints payments from legacy `commitments.amount`, so `amount_due` can be sub-cent.
  it.each([
    [0.005, '0.005'],
    [1e-7, '0.0000001'],
  ])('prefills amount_due %p as %p through amountText', async (amountDue, expected) => {
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, { ...duePayment, amount_due: amountDue }, TODAY),
    );
    await act(async () => {});
    expect(result.current.form.getValues('amountText')).toBe(expected);
  });

  it('rejects a prefilled amount_due of 1e-7 on submit as the floor message', async () => {
    mockAccounts = [egpAccount];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, egpCommitment, { ...duePayment, amount_due: 1e-7 }, TODAY),
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

  it('commitRate of a typed rate writes it as typed and turns the override on', async () => {
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    let committed = false;
    await act(() => {
      committed = result.current.commitRate('48.6');
    });

    expect(committed).toBe(true);
    expect(result.current.form.getValues('exchange_rate')).toBe('48.6');
    expect(mockPaySheetState.setRateOverride).toHaveBeenLastCalledWith(OWNER, true);
  });

  it('commitRate of the stored rate writes the stored text and turns the override off', async () => {
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.commitRate('48.6');
    });
    let committed = false;
    await act(() => {
      committed = result.current.commitRate('55');
    });

    expect(committed).toBe(true);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(mockPaySheetState.setRateOverride).toHaveBeenLastCalledWith(OWNER, false);
    expect(paySheetStateInner.rateOverride).toBe(false);
  });

  it('commitRate of a text the rate parser refuses returns false and changes nothing', async () => {
    mockAccounts = [egpAccount];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.commitRate('48.6');
    });
    mockPaySheetState.setRateOverride.mockClear();
    let committed = true;
    await act(() => {
      committed = result.current.commitRate('0');
    });

    expect(committed).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBe('48.6');
    expect(mockPaySheetState.setRateOverride).not.toHaveBeenCalled();
    expect(paySheetStateInner.rateOverride).toBe(true);
  });

  it('setPaidDate writes an ISO string into the form (date-picker upgrade)', async () => {
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => result.current.setPaidDate('2026-05-20'));
    expect(result.current.form.getValues('paid_date')).toBe('2026-05-20');
  });

  it('renders without throwing when commitment and payment are undefined', async () => {
    await expect(
      renderHook(() => usePaySheet(OWNER, undefined, undefined, TODAY)),
    ).resolves.toBeDefined();
  });

  it('saving defaults to false', async () => {
    const { result } = await renderHook(() => usePaySheet(OWNER, undefined, undefined, TODAY));
    expect(result.current.state.saving).toBe(false);
  });

  it('captures the EGP reporting rate for a USD commitment paid from a USD account', async () => {
    mockAccounts = [
      { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account,
    ];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
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
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
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
    const { result } = await renderHook(() => usePaySheet(OWNER, egpCommitment, duePayment, TODAY));
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
    const { result } = await renderHook(() => usePaySheet(OWNER, egpCommitment, duePayment, TODAY));
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
    const { result } = await renderHook(() => usePaySheet(OWNER, egpCommitment, duePayment, TODAY));
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
    const { result } = await renderHook(() => usePaySheet(OWNER, egpCommitment, duePayment, TODAY));
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
    expect(mockPaySheetState.setVisible).toHaveBeenCalledWith(OWNER, false);
    expect(mockPaySheetState.setSettled).toHaveBeenCalledWith(OWNER, true);
    expect(consoleSpy).toHaveBeenCalledWith(
      '[paySheet] account revalidation failed:',
      refreshError,
    );
    consoleSpy.mockRestore();
  });

  // EGP commitment paid from a loaded EGP account, so a failure here is the typed amount only.
  async function submitAmount(typed: string) {
    mockAccounts = [egpAccount];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
    );
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
    ['A1-17', '48.', Strings.errAmountInvalid],
    ['A1-18', '0.0', Strings.commitmentsPayErrAmountMin],
  ] as const)('%s: rejects "%s" at the field and writes nothing', async (_id, typed, message) => {
    const { result } = await submitAmount(typed);

    expect(mockMarkAsPaid).not.toHaveBeenCalled();
    expect(result.current.form.getFieldState('amountText').error?.message).toBe(message);
  });

  async function submitRate(typed: string) {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
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
    ['A2-10', '0.0', Strings.addTxErrRateInvalid],
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
    expect(mockPaySheetState.setSaveError).toHaveBeenLastCalledWith(
      OWNER,
      Strings.commitmentsPayError,
    );
    // The mocked selector store does not subscribe, so the flag reaches state on the next render.
    await act(() => rerender(undefined));
    expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayError);
    expect(mockPaySheetState.setVisible).not.toHaveBeenCalledWith(OWNER, false);
  });

  it('A2-04: omits the rate snapshot when the payment stays in one currency', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, { ...fixedCommitment, currency: Currency.EGP }, duePayment, TODAY),
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
      { id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account,
      { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account,
    ];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });
    await act(() => rerender(undefined));
    expect(result.current.state.requiresRate).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBeUndefined();

    await act(() => {
      result.current.selectAccount(mockAccounts[1].id);
    });
    await act(() => rerender(undefined));

    expect(result.current.state.requiresRate).toBe(true);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(mockPaySheetState.setRateOverride).toHaveBeenLastCalledWith(OWNER, false);
  });

  // A USD commitment needs a rate whatever the account's currency is.
  it('F1: seeds the global rate for a USD commitment paid from an EGP account', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.form.setValue('exchange_rate', '');
    });
    await act(() => {
      result.current.selectAccount(mockAccounts[0].id);
    });
    await act(() => rerender(undefined));

    expect(result.current.state.requiresRate).toBe(true);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
  });

  it('F1: leaves the rate alone when neither side is USD', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() => usePaySheet(OWNER, egpCommitment, duePayment, TODAY));
    await act(() => {
      result.current.selectAccount(mockAccounts[0].id);
    });
    expect(result.current.form.getValues('exchange_rate')).toBeUndefined();
  });

  // `AccountStrip` fires `onSelect` for every chip, the lit one included.
  it('G1: keeps a typed override rate when the already-selected account is re-picked', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });
    await act(() => {
      result.current.commitRate('60');
    });
    await act(() => rerender(undefined));
    expect(paySheetStateInner.rateOverride).toBe(true);

    await act(() => {
      result.current.selectAccount(mockAccounts[0].id);
    });
    await act(() => rerender(undefined));

    expect(result.current.form.getValues('exchange_rate')).toBe('60');
    expect(paySheetStateInner.rateOverride).toBe(true);
  });

  it('F2: restores the global rate when the stored rate is committed after a typed one', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.form.setValue('account_id', 'acc-egp');
    });

    await act(() => {
      result.current.commitRate('48.6');
    });
    await act(() => rerender(undefined));
    expect(paySheetStateInner.rateOverride).toBe(true);

    await act(() => {
      result.current.form.setValue('exchange_rate', '');
    });

    await act(() => {
      result.current.commitRate('55');
    });
    await act(() => rerender(undefined));

    expect(paySheetStateInner.rateOverride).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
  });

  it('F2: commits a typed rate over a seeded one, not the global rate', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.selectAccount('acc-egp');
    });
    expect(result.current.form.getValues('exchange_rate')).toBe('55');

    await act(() => {
      result.current.commitRate('48.6');
    });
    expect(result.current.form.getValues('exchange_rate')).toBe('48.6');
  });

  // `String(1e-7)` is exponential text `parseRateText` rejects; the prefill must stay typeable.
  it('prefills an exponential-band global rate as positional text the schema accepts', async () => {
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 1e-7,
      isManualOverride: false,
      rate_updated_at: null,
    }));
    mockAccounts = [
      { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account,
    ];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(async () => {});

    expect(result.current.form.getValues('exchange_rate')).toBe('0.0000001');
  });

  it('commits positional text when the stored exponential-band rate is committed', async () => {
    attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
      rate: 1e-7,
      isManualOverride: false,
      rate_updated_at: null,
    }));
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.commitRate('48.6');
    });
    await act(() => {
      result.current.commitRate('0.0000001');
    });

    expect(result.current.form.getValues('exchange_rate')).toBe('0.0000001');
    expect(paySheetStateInner.rateOverride).toBe(false);
  });

  // The save-error flag lives in a module-level store, so it survives a dismiss.
  it('F3: clears a stale save error when the sheet is reopened after a dismiss', async () => {
    mockAccounts = [
      { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account,
    ];
    paySheetStateInner = { ...paySheetStateInner, visible: true };
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));

    // The prefill lights the commitment's own account only, so the commitment names it.
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, { ...fixedCommitment, account_id: 'acc-usd' }, duePayment, TODAY),
    );
    await act(async () => {});
    expect(result.current.form.getValues('exchange_rate')).toBe('55');

    await act(async () => {
      await result.current.onSubmit();
    });
    await act(() => rerender(undefined));
    expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayError);

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

    expect(mockPaySheetState.setSaveError).toHaveBeenCalledWith(OWNER, undefined);
    expect(result.current.state.statusMessage).toBeUndefined();
  });

  it('F3: clears the save error on a submit that fails validation', async () => {
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
    const { result, rerender } = await submitAmount('15');
    await act(() => rerender(undefined));
    expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
    expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayError);

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
    expect(mockPaySheetState.setSaveError).toHaveBeenCalledWith(OWNER, undefined);
    expect(result.current.state.statusMessage).toBe(Strings.fixFieldsMarkedAbove(1));
  });

  // The rate row is not a `Controller`, so `setValue` is the only thing that can revalidate it.
  describe('MA-115 half-typed amount and rate', () => {
    type PayHookResult = { current: ReturnType<typeof usePaySheet> };

    // Lets the validation a keystroke started resolve before the next read.
    async function typeAmount(result: PayHookResult, text: string) {
      await act(async () => {
        result.current.setAmountText(text);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    async function commitRate(result: PayHookResult, text: string): Promise<boolean> {
      let committed = false;
      await act(async () => {
        committed = result.current.commitRate(text);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      return committed;
    }

    const amountError = (result: PayHookResult) =>
      result.current.form.getFieldState('amountText').error?.message;
    const rateError = (result: PayHookResult) =>
      result.current.form.getFieldState('exchange_rate').error?.message;

    it.each(['48.', '0', '0.', '0.0'])(
      'after a refused Save the amount shows no error at %p',
      async (text) => {
        const { result } = await submitAmount('');
        expect(amountError(result)).toBe(Strings.commitmentsPayErrAmountRequired);

        await typeAmount(result, text);

        expect(result.current.form.getValues('amountText')).toBe(text);
        expect(amountError(result)).toBeUndefined();
      },
    );

    it('after a refused Save a complete amount under the floor shows the floor message', async () => {
      const { result } = await submitAmount('');

      await typeAmount(result, '0.001');

      expect(amountError(result)).toBe(Strings.commitmentsPayErrAmountMin);
    });

    it('after a refused Save an amount cleared to empty shows required', async () => {
      const { result } = await submitAmount('');
      await typeAmount(result, '5');
      expect(amountError(result)).toBeUndefined();

      await typeAmount(result, '');

      expect(amountError(result)).toBe(Strings.commitmentsPayErrAmountRequired);
    });

    it.each(['48.', '0', '0.', '0.0', '48x'])(
      'after a refused Save the rate commit refuses %p and leaves the field and its fault as they were',
      async (text) => {
        const result = await submitRate('');
        expect(rateError(result)).toBe(Strings.addTxErrRateRequired);

        expect(await commitRate(result, text)).toBe(false);

        expect(result.current.form.getValues('exchange_rate')).toBe('');
        expect(rateError(result)).toBe(Strings.addTxErrRateRequired);
      },
    );

    it('after a refused Save a rate commit that parses clears the fault with no second Save', async () => {
      const result = await submitRate('');
      expect(rateError(result)).toBe(Strings.addTxErrRateRequired);

      expect(await commitRate(result, '48.5')).toBe(true);

      expect(result.current.form.getValues('exchange_rate')).toBe('48.5');
      expect(rateError(result)).toBeUndefined();
      expect(mockMarkAsPaid).not.toHaveBeenCalled();
    });

    it('before any Save neither field raises anything at "48."', async () => {
      mockAccounts = [egpAccount];
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
      );

      const rateBefore = result.current.form.getValues('exchange_rate');

      await typeAmount(result, '48.');
      expect(await commitRate(result, '48.')).toBe(false);

      expect(result.current.form.getValues('amountText')).toBe('48.');
      expect(result.current.form.getValues('exchange_rate')).toBe(rateBefore);
      expect(amountError(result)).toBeUndefined();
      expect(rateError(result)).toBeUndefined();
    });

    it('before any Save the amount raises nothing at "0.001" or when typed and then cleared', async () => {
      mockAccounts = [egpAccount];
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );

      await typeAmount(result, '0.001');
      expect(result.current.form.getValues('amountText')).toBe('0.001');
      expect(amountError(result)).toBeUndefined();

      await typeAmount(result, '');
      expect(result.current.form.getValues('amountText')).toBe('');
      expect(amountError(result)).toBeUndefined();
    });

    it('a clear and "48." sent back to back leave no amount fault once the validation settles', async () => {
      const { result } = await submitAmount('');
      await typeAmount(result, '5');
      expect(amountError(result)).toBeUndefined();

      await act(async () => {
        result.current.setAmountText('');
        result.current.setAmountText('48.');
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(result.current.form.getValues('amountText')).toBe('48.');
      expect(amountError(result)).toBeUndefined();
    });

    it('a refused "" and "48." committed back to back keep the parsed rate and raise no fault', async () => {
      const result = await submitRate('');
      expect(await commitRate(result, '50')).toBe(true);
      expect(rateError(result)).toBeUndefined();

      const committed: boolean[] = [];
      await act(async () => {
        committed.push(result.current.commitRate(''));
        committed.push(result.current.commitRate('48.'));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(committed).toEqual([false, false]);
      expect(result.current.form.getValues('exchange_rate')).toBe('50');
      expect(rateError(result)).toBeUndefined();
    });
  });

  it('H1: seeding the rate after a failed submit clears the rate error without a second submit', async () => {
    mockAccounts = [
      { id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account,
      { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account,
    ];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
    );
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
      result.current.selectAccount(mockAccounts[1].id);
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));

    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
  });

  it('H4: committing the stored rate after a failed submit clears the stale rate error', async () => {
    mockAccounts = [
      { id: 'acc-usd', name: 'Dollars', currency: Currency.USD } as unknown as Account,
    ];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.form.setValue('account_id', 'acc-usd');
      result.current.form.setValue('amountText', '15');
      result.current.form.setValue('paid_date', '2026-05-20');
    });
    await act(() => rerender(undefined));
    expect(result.current.state.requiresRate).toBe(true);

    await act(() => {
      result.current.commitRate('48.6');
    });
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
      result.current.commitRate('55');
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));

    expect(paySheetStateInner.rateOverride).toBe(false);
    expect(result.current.form.getValues('exchange_rate')).toBe('55');
    expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
  });

  it('H1: seeding the rate before any submit raises no error', async () => {
    mockAccounts = [{ id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
    );
    await act(async () => {
      result.current.selectAccount(mockAccounts[0].id);
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
      const { result } = await renderHook(() => usePaySheet(OWNER, commitment, duePayment, TODAY));
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

    // The membership issue precedes the rate demand; a USD commitment demands the rate with no account lit.
    it('does not fall through to "no rate needed" when the account is missing from the list', async () => {
      mockAccounts = [egpAccount];
      const result = await submitWithAccountId(fixedCommitment, 'acc-gone');

      expect(result.current.state.requiresRate).toBe(true);
      expect(mockMarkAsPaid).not.toHaveBeenCalled();
      expect(result.current.form.getFieldState('account_id').error?.message).toBe(
        Strings.commitmentsPayErrAccountUnavailable,
      );
      expect(result.current.form.getFieldState('exchange_rate').error).toBeUndefined();
    });

    async function openWithPrefill(commitment: Commitment) {
      paySheetStateInner = { ...paySheetStateInner, visible: true };
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, commitment, duePayment, TODAY),
      );
      await act(async () => {});
      await act(() => rerender(undefined));
      return result;
    }

    const litChipIds = (result: { current: ReturnType<typeof usePaySheet> }) =>
      result.current.state.stripChips.filter((chip) => chip.selected).map((chip) => chip.id);

    it("lights the commitment's account while it is active", async () => {
      mockAccounts = [usdAccount, egpAccount];
      const result = await openWithPrefill({ ...egpCommitment, account_id: egpAccount.id });

      expect(result.current.form.getValues('account_id')).toBe(egpAccount.id);
      expect(litChipIds(result)).toEqual([egpAccount.id]);
    });

    // `commitment.account_id` is a durable copy that outlives the account being archived.
    it('lights no account when the commitment holds an archived one', async () => {
      mockAccounts = [egpAccount];
      const result = await openWithPrefill({ ...egpCommitment, account_id: 'acc-archived' });

      expect(result.current.form.getValues('account_id')).toBe('');
      expect(litChipIds(result)).toEqual([]);
    });

    it('lights no account, not the first loaded one, for a commitment with none', async () => {
      mockAccounts = [egpAccount];
      const result = await openWithPrefill({ ...egpCommitment, account_id: null });

      expect(result.current.form.getValues('account_id')).toBe('');
      expect(litChipIds(result)).toEqual([]);
    });
  });

  describe('sub-floor conversions', () => {
    // 0.01 EGP at 49.06 rounds to 0.00 USD: over the amount floor, under the debited one.
    it('blocks a save whose converted amount rounds below the money floor', async () => {
      mockAccounts = [usdAccount];
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );
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
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
      );
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
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
      );
      await act(() => {
        result.current.form.setValue('account_id', egpAccount.id);
        result.current.form.setValue('amountText', '99999999999999999999');
        result.current.form.setValue('exchange_rate', '49.06');
      });

      expect(result.current.state).toHaveProperty('converted', undefined);
    });

    // A huge finite amount clears the refine, so the resolver throws at `markAsPaid`, not here.
    it('an oversized amount clears field validation; a markAsPaid rejection surfaces the unstorable copy with no write', async () => {
      mockAccounts = [egpAccount];
      mockMarkAsPaid.mockRejectedValueOnce(
        new TransactionAmountError('Computed amount exceeds the storable range', 'unstorable'),
      );
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );
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
      expect(mockPaySheetState.setVisible).not.toHaveBeenCalledWith(OWNER, false);

      // Deterministic failure gets its own copy, not the retry-implying banner.
      await act(() => rerender(undefined));
      expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayErrAmountUnstorable);
      expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayErrAmountUnstorable);
    });

    it('saves the same amount when the rate leaves the converted value on the floor', async () => {
      mockAccounts = [usdAccount];
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );
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
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, commitment, duePayment, TODAY),
      );
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

      expect(state.converted).toEqual({ amount: 4906, currency: Currency.EGP });
      expect(state.errors.amount).toBeUndefined();
    });

    it('row 2: an EGP commitment paid from a USD account converts by dividing', async () => {
      const state = await renderPreview(egpCommitment, usdAccount, '5000', '49.06');

      expect(state.converted).toEqual({ amount: 101.92, currency: Currency.USD });
    });

    // A rate is still demanded USD to USD because `egp_amount` is the ledger's storage currency.
    it('row 3: a USD commitment paid from a USD account reads the EGP amount on the line', async () => {
      const state = await renderPreview(fixedCommitment, usdAccount, '100', '49.06');

      expect(state.requiresRate).toBe(true);
      expect(state.converted).toEqual({ amount: 4906, currency: Currency.EGP });
    });

    // `roundMoney(0.004)` is 0 and the resolver throws on it, which in a render is a red screen.
    it.each([
      ['a typed zero', '0'],
      ['an amount under the floor', '0.004'],
      ['an amount the parser cannot read', '1,23'],
    ] as const)('row 4: shows no line for %s', async (_label, amountText) => {
      const state = await renderPreview(fixedCommitment, egpAccount, amountText, '49.06');

      expect(state).toHaveProperty('converted', undefined);
    });

    it('row 4: a USD commitment demands a rate and reads the EGP amount before an account is picked', async () => {
      mockAccounts = [egpAccount];
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, fixedCommitment, duePayment, TODAY),
      );
      await act(() => {
        result.current.form.setValue('amountText', '100');
        result.current.form.setValue('exchange_rate', '49.06');
      });

      expect(result.current.state.requiresRate).toBe(true);
      expect(result.current.state.converted).toEqual({ amount: 4906, currency: Currency.EGP });
    });

    // The line must not render a confident zero, so the flag drives the amount-field message.
    it('row 5: flags a converted amount below the floor instead of rendering it', async () => {
      const state = await renderPreview(egpCommitment, usdAccount, '0.01', '49.06');

      expect(state.errors.amount).toBe(Strings.commitmentsPayErrConvertedBelowMin(Currency.USD));
      expect(state).toHaveProperty('converted', undefined);
    });

    // Below the floor the line must go quiet too, not render a confident 0 EGP.
    it('row 5: reads no converted amount below the floor into EGP', async () => {
      const state = await renderPreview(fixedCommitment, egpAccount, '0.50', '0.01');

      expect(state.errors.amount).toBe(Strings.commitmentsPayErrConvertedBelowMin(Currency.EGP));
      expect(state).toHaveProperty('converted', undefined);
    });

    // The resolver rounds the amount to 1.00 first, so 0.02, not `roundMoney(1.005 / 40)` = 0.03.
    it('renders the resolver rounding, not a re-derived one: 1.005 EGP at 40 is 0.02 USD', async () => {
      const state = await renderPreview(egpCommitment, usdAccount, '1.005', '40');

      expect(state.converted).toEqual({ amount: 0.02, currency: Currency.USD });
    });

    it('row 1-4 fourth pair: EGP commitment paid from an EGP account converts nothing', async () => {
      const state = await renderPreview(egpCommitment, egpAccount, '5000');

      expect(state.requiresRate).toBe(false);
      expect(state).toHaveProperty('converted', undefined);
      expect(state.errors.amount).toBeUndefined();
    });
  });

  // Named accounts, so the preview's `on {account}` reads a real name.
  const cib = makeTestAccount({ id: 'acc-cib', name: 'CIB', currency: Currency.EGP });
  const payoneer = makeTestAccount({ id: 'acc-pay', name: 'Payoneer', currency: Currency.USD });

  async function renderTrack(
    commitment: Commitment,
    account: Account,
    amountText: string,
    exchangeRate?: string,
  ) {
    mockAccounts = [account];
    const { result, rerender } = await renderHook(() =>
      usePaySheet(OWNER, commitment, duePayment, TODAY),
    );
    await act(() => {
      result.current.form.setValue('account_id', account.id);
      result.current.form.setValue('amountText', amountText);
      if (exchangeRate !== undefined) {
        result.current.form.setValue('exchange_rate', exchangeRate);
      }
    });
    await act(() => rerender(undefined));
    return { result, rerender };
  }

  type PayHook = Awaited<ReturnType<typeof renderTrack>>;

  async function settle({ result, rerender }: PayHook, edit: () => void) {
    await act(async () => {
      edit();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    await act(() => rerender(undefined));
    return result.current.state;
  }

  describe('status track', () => {
    it.each([
      [
        'a USD commitment from an EGP account',
        fixedCommitment,
        cib,
        '15',
        '49',
        'Writes an expense of 735 EGP on CIB, dated today.',
      ],
      [
        'an EGP commitment from a USD account',
        egpCommitment,
        payoneer,
        '4906',
        '49.06',
        'Writes an expense of 100.00 USD on Payoneer, dated today.',
      ],
      [
        'an EGP commitment from an EGP account',
        egpCommitment,
        cib,
        '8000',
        undefined,
        'Writes an expense of 8,000 EGP on CIB, dated today.',
      ],
      [
        'a USD commitment from a USD account',
        fixedCommitment,
        payoneer,
        '15',
        '49',
        'Writes an expense of 15.00 USD on Payoneer, dated today.',
      ],
    ] as [string, Commitment, Account, string, string | undefined, string][])(
      "previews the resolver's account amount for %s",
      async (_label, commitment, account, amountText, rate, expected) => {
        const { result } = await renderTrack(commitment, account, amountText, rate);

        expect(result.current.state.trackFootnote).toBe(expected);
        expect(result.current.state.statusMessage).toBeUndefined();
      },
    );

    it("labels Pay in the commitment's currency while the track reads the account's", async () => {
      const { result } = await renderTrack(fixedCommitment, cib, '15', '49');

      expect(result.current.state.ctaLabel).toBe('Pay 15.00 USD');
      expect(result.current.state.trackFootnote).toBe(
        'Writes an expense of 735 EGP on CIB, dated today.',
      );
    });

    it('labels Pay with the amount, and bare once the amount is cleared', async () => {
      const { result, rerender } = await renderTrack(egpCommitment, cib, '8000');
      expect(result.current.state.ctaLabel).toBe('Pay 8,000 EGP');

      const state = await settle({ result, rerender }, () => result.current.setAmountText(''));

      expect(state.amountText).toBe('');
      expect(state.ctaLabel).toBe('Pay');
    });

    it("goes idle when a fixed commitment's amount is cleared", async () => {
      const { result, rerender } = await renderTrack(egpCommitment, cib, '8000');
      expect(result.current.state.trackFootnote).toBe(
        'Writes an expense of 8,000 EGP on CIB, dated today.',
      );

      const state = await settle({ result, rerender }, () => result.current.setAmountText(''));

      expect(state.trackFootnote).toBeUndefined();
      expect(state.statusMessage).toBeUndefined();
    });

    it('goes idle when the rate cannot be read', async () => {
      const { result, rerender } = await renderTrack(fixedCommitment, cib, '15', '49');
      expect(result.current.state.trackFootnote).toBe(
        'Writes an expense of 735 EGP on CIB, dated today.',
      );

      const state = await settle({ result, rerender }, () =>
        result.current.form.setValue('exchange_rate', ''),
      );

      expect(state.trackFootnote).toBeUndefined();
      expect(state.statusMessage).toBeUndefined();
    });

    it('dates the preview on the day picked', async () => {
      const { result, rerender } = await renderTrack(egpCommitment, cib, '8000');

      const state = await settle({ result, rerender }, () =>
        result.current.setPaidDate('2026-10-01'),
      );

      expect(state.paidDate).toBe('2026-10-01');
      expect(state.trackFootnote).toBe('Writes an expense of 8,000 EGP on CIB, dated Thu 1 Oct.');
    });

    const variableCommitment = makeTestCommitment({
      id: 'c-var',
      name: 'Electricity',
      amount_type: AmountType.Variable,
      amount: 500,
      currency: Currency.EGP,
      account_id: null,
    });
    const variablePayment = makeTestPayment({
      commitment_id: 'c-var',
      amount_due: 600,
      currency: Currency.EGP,
    });

    async function openSheet(commitment: Commitment, payment: typeof duePayment) {
      mockAccounts = [cib];
      paySheetStateInner = { ...paySheetStateInner, visible: true };
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, commitment, payment, TODAY),
      );
      await act(async () => {});
      await act(() => rerender(undefined));
      return result.current.state;
    }

    it("reads the estimate hint from the payment's amount due on a variable commitment", async () => {
      const state = await openSheet(variableCommitment, variablePayment);

      expect(state.amountText).toBe('');
      expect(state.trackFootnote).toBe('Estimated 600 EGP. Enter the amount on the bill.');
      expect(state.ctaLabel).toBe('Pay');
    });

    it('reads the bare hint on a variable commitment with no estimate', async () => {
      const state = await openSheet(
        { ...variableCommitment, amount: null },
        { ...variablePayment, amount_due: null },
      );

      expect(state.amountText).toBe('');
      expect(state.trackFootnote).toBe('Enter the amount on the bill.');
      expect(state.ctaLabel).toBe('Pay');
    });

    it('is idle before a press with the amount prefilled and no account lit', async () => {
      const state = await openSheet(makeTestCommitment({ account_id: null }), makeTestPayment());

      expect(state.amountText).toBe('8000');
      expect(state.stripChips.some((chip) => chip.selected)).toBe(false);
      expect(state.trackFootnote).toBeUndefined();
      expect(state.statusMessage).toBeUndefined();
      expect(state.errors).toEqual({});
      expect(state.ctaLabel).toBe('Pay 8,000 EGP');
    });

    // ADR 2026-08-25 §5: 0.01 EGP at 49.06 rounds to 0.00 USD.
    it('marks a conversion below the floor under the hero before a press, counting nothing', async () => {
      const { result } = await renderTrack(egpCommitment, payoneer, '0.01', '49.06');

      expect(result.current.state.errors.amount).toBe(
        Strings.commitmentsPayErrConvertedBelowMin(Currency.USD),
      );
      expect(result.current.state.statusMessage).toBeUndefined();
      expect(result.current.state.trackFootnote).toBeUndefined();
    });
  });

  describe('a press with faults', () => {
    it('marks the empty amount and the unlit strip, counts both and writes nothing', async () => {
      mockAccounts = [cib];
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );
      await act(async () => {
        await result.current.onSubmit();
      });
      await act(() => rerender(undefined));

      expect(mockMarkAsPaid).not.toHaveBeenCalled();
      expect(result.current.state.errors.amount).toBe('Enter an amount');
      expect(result.current.state.errors.account).toBe('Select an account');
      expect(result.current.state.statusMessage).toBe('Fix the 2 fields marked above.');
      expect(result.current.state.saving).toBe(false);

      const state = await settle({ result, rerender }, () => result.current.selectAccount(cib.id));

      expect(result.current.form.getValues('account_id')).toBe(cib.id);
      expect(state.stripChips.filter((chip) => chip.selected).map((chip) => chip.id)).toEqual([
        cib.id,
      ]);
      expect(state.errors.account).toBeUndefined();
      expect(state.statusMessage).toBe('Fix the 1 field marked above.');
    });

    it("counts the rate's fault, whose line stays in the rate card", async () => {
      const { result, rerender } = await renderTrack(fixedCommitment, cib, '15', '');
      await act(async () => {
        await result.current.onSubmit();
      });
      await act(() => rerender(undefined));

      expect(mockMarkAsPaid).not.toHaveBeenCalled();
      expect(result.current.state.errors.rate).toBe(Strings.addTxErrRateRequired);
      expect(result.current.state.errors.amount).toBeUndefined();
      expect(result.current.state.statusMessage).toBe('Fix the 1 field marked above.');
    });
  });

  describe('after a press', () => {
    it('re-validates every field when a pick follows a failed press', async () => {
      mockAccounts = [cib, payoneer];
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );
      await act(() => {
        result.current.form.setValue('account_id', payoneer.id);
        result.current.form.setValue('amountText', '4906');
        result.current.form.setValue('exchange_rate', '');
      });
      await act(async () => {
        await result.current.onSubmit();
      });
      await act(() => rerender(undefined));
      expect(result.current.state.errors.rate).toBe(Strings.addTxErrRateRequired);

      const state = await settle({ result, rerender }, () => result.current.selectAccount(cib.id));

      expect(state.errors.rate).toBeUndefined();
      expect(state.statusMessage).toBeUndefined();
      expect(mockMarkAsPaid).not.toHaveBeenCalled();
    });

    it('writes once when Pay is pressed again while the sheet closes, and again after a re-open', async () => {
      // On the commitment's own account, so the re-open's prefill lights it.
      const { result, rerender } = await renderTrack(
        { ...egpCommitment, account_id: cib.id },
        cib,
        '8000',
      );
      await act(async () => {
        await result.current.onSubmit();
      });
      await act(() => rerender(undefined));
      expect(result.current.state.settled).toBe(true);

      await act(async () => {
        await result.current.onSubmit();
      });
      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);

      // What the real `open` writes: a clean entry, visible.
      paySheetStateInner = {
        visible: true,
        saving: false,
        settled: false,
        rateOverride: false,
        opensAddAccountOnClose: false,
        saveError: undefined,
      };
      await act(() => rerender(undefined));
      expect(result.current.state.settled).toBe(false);
      await act(async () => {
        await result.current.onSubmit();
      });
      expect(mockMarkAsPaid).toHaveBeenCalledTimes(2);
    });

    it('keeps the write preview on the closing render after a successful save', async () => {
      const { result, rerender } = await renderTrack(egpCommitment, cib, '8000');
      const before = result.current.state.trackFootnote;
      expect(before).toBe('Writes an expense of 8,000 EGP on CIB, dated today.');

      await act(async () => {
        await result.current.onSubmit();
      });
      await act(() => rerender(undefined));

      expect(result.current.state.visible).toBe(false);
      expect(result.current.state.trackFootnote).toBe(before);
    });
  });

  describe('MA-219 failed write, unavailable account, no accounts and the add-account hand-off', () => {
    const walletAccount = {
      id: 'acc-wallet',
      name: 'Wallet',
      currency: Currency.EGP,
    } as unknown as Account;

    async function renderLit(accounts: Account[], payment = duePayment, today = TODAY) {
      mockHasLoaded = true;
      mockAccounts = accounts;
      const hook = await renderHook(() => usePaySheet(OWNER, egpCommitment, payment, today));
      await act(() => {
        hook.result.current.form.setValue('account_id', egpAccount.id);
        hook.result.current.form.setValue('amountText', '15');
        hook.result.current.form.setValue('paid_date', '2026-05-20');
      });
      return hook;
    }

    async function press(result: { current: ReturnType<typeof usePaySheet> }) {
      await act(async () => {
        await result.current.onSubmit();
      });
    }

    it('a failed write reads the failed-write copy on the status track, keeps the sheet open, and a second Pay retries', async () => {
      paySheetStateInner = { ...paySheetStateInner, visible: true };
      mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
      const { result, rerender } = await renderLit([egpAccount]);

      await press(result);
      await act(() => rerender(undefined));

      expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayError);
      expect(result.current.state.visible).toBe(true);
      expect(mockPaySheetState.setVisible).not.toHaveBeenCalledWith(OWNER, false);

      await press(result);
      expect(mockMarkAsPaid).toHaveBeenCalledTimes(2);
    });

    it('a failed write whose account reload also fails reloads once and still reads the failed-write copy', async () => {
      mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
      mockLoadAccounts.mockImplementationOnce(async () => {
        mockLoadError = true;
        throw new Error('reload failed');
      });
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const { result, rerender } = await renderLit([egpAccount]);

      await press(result);
      await act(() => rerender(undefined));

      expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
      expect(result.current.state.statusMessage).toBe(Strings.commitmentsPayError);
      expect(result.current.state.errors.account).toBeUndefined();
      consoleSpy.mockRestore();
    });

    it('a failed write whose reload drops the lit account rings the strip with the unavailable copy, counts it, and sets no save error', async () => {
      mockMarkAsPaid.mockRejectedValueOnce(new Error('account archived'));
      mockLoadAccounts.mockImplementationOnce(async () => {
        mockAccounts = [walletAccount];
      });
      const { result, rerender } = await renderLit([egpAccount, walletAccount]);

      await press(result);
      await act(() => rerender(undefined));

      expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
      expect(result.current.state.errors.account).toBe(Strings.commitmentsPayErrAccountUnavailable);
      expect(result.current.state.statusMessage).toBe(Strings.fixFieldsMarkedAbove(1));
      expect(mockPaySheetState.setSaveError).not.toHaveBeenCalledWith(
        OWNER,
        Strings.commitmentsPayError,
      );
    });

    it('a reload that drops the lit account before any press rings the strip and counts nothing', async () => {
      const { result, rerender } = await renderLit([egpAccount, walletAccount]);
      expect(result.current.state.errors.account).toBeUndefined();

      mockAccounts = [walletAccount];
      await act(() => rerender(undefined));

      expect(result.current.state.errors.account).toBe(Strings.commitmentsPayErrAccountUnavailable);
      expect(result.current.state.statusMessage).toBeUndefined();
      expect(mockMarkAsPaid).not.toHaveBeenCalled();
    });

    it('a failed write that settles after a close and reopen marks nothing on the new open', async () => {
      paySheetStateInner = { ...paySheetStateInner, visible: true };
      let rejectWrite: (error: Error) => void = () => undefined;
      mockMarkAsPaid.mockImplementationOnce(
        () =>
          new Promise((_resolve, reject: (error: Error) => void) => {
            rejectWrite = reject;
          }),
      );
      mockLoadAccounts.mockImplementationOnce(async () => {
        mockAccounts = [walletAccount];
      });
      const { result, rerender } = await renderLit([egpAccount, walletAccount]);

      let submitted: Promise<void> = Promise.resolve();
      await act(async () => {
        submitted = result.current.onSubmit();
      });
      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
      paySheetStateInner = { ...paySheetStateInner, visible: false };
      await act(() => rerender(undefined));
      paySheetStateInner = { ...paySheetStateInner, visible: true };
      await act(() => rerender(undefined));

      await act(async () => {
        rejectWrite(new Error('account archived'));
        await submitted;
      });
      await act(() => rerender(undefined));

      expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
      expect(result.current.form.getFieldState('account_id').error).toBeUndefined();
      expect(mockPaySheetState.setSaveError).not.toHaveBeenCalledWith(
        OWNER,
        Strings.commitmentsPayError,
      );
    });

    it('reads noAccounts once the accounts load empty, not before the load and not with an account', async () => {
      mockAccounts = [];
      const { result, rerender } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );
      expect(result.current.state.noAccounts).toBe(false);

      mockHasLoaded = true;
      await act(() => rerender(undefined));
      expect(result.current.state.noAccounts).toBe(true);

      mockAccounts = [egpAccount];
      await act(() => rerender(undefined));
      expect(result.current.state.noAccounts).toBe(false);
    });

    it('opens add account on the close after a hand-off, once, and on no plain close', async () => {
      mockHasLoaded = true;
      paySheetStateInner = { ...paySheetStateInner, visible: true };
      const { result } = await renderHook(() =>
        usePaySheet(OWNER, egpCommitment, duePayment, TODAY),
      );

      await act(() => result.current.handleCloseComplete());
      expect(mockRouterPush).not.toHaveBeenCalled();

      await act(() => result.current.requestAccountCreation());
      expect(mockPaySheetState.requestAccountCreation).toHaveBeenCalledWith(OWNER);
      await act(() => result.current.handleCloseComplete());
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
      expect(mockRouterPush).toHaveBeenCalledWith('/accounts/add_account');

      await act(() => result.current.handleCloseComplete());
      expect(mockRouterPush).toHaveBeenCalledTimes(1);
    });

    it('writes the picked day as the paid date: a leap day', async () => {
      const { result } = await renderLit([egpAccount]);
      await act(() => result.current.setPaidDate('2024-02-29'));

      await press(result);

      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
      expect(mockMarkAsPaid.mock.calls[0][1]).toMatchObject({ paid_date: '2024-02-29' });
    });

    it('pays a cycle carried from an earlier month by its own id', async () => {
      const carried = makeTestPayment({
        commitment_id: egpCommitment.id,
        due_date: '2026-03-31',
        amount_due: 15,
        currency: Currency.EGP,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      });
      const { result } = await renderLit([egpAccount], carried, '2026-05-08');
      await act(() => result.current.setPaidDate('2026-05-08'));

      await press(result);

      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
      expect(mockMarkAsPaid.mock.calls[0][0]).toBe(carried.id);
      expect(mockMarkAsPaid.mock.calls[0][1]).toMatchObject({ paid_date: '2026-05-08' });
    });
  });

  describe('note', () => {
    async function typeNoteAndSubmit(note: string) {
      const { result, rerender } = await renderTrack(egpCommitment, cib, '8000');
      const state = await settle({ result, rerender }, () => result.current.setNote(note));
      await act(async () => {
        await result.current.onSubmit();
      });
      return state;
    }

    it('keeps the typed note and writes it trimmed', async () => {
      const state = await typeNoteAndSubmit('  Paid at the counter ');

      expect(state.note).toBe('  Paid at the counter ');
      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
      const arg = mockMarkAsPaid.mock.calls[0][1] as { notes?: string; paid_date: string };
      expect(arg.notes).toBe('Paid at the counter');
      expect(arg.paid_date).toBe(TODAY);
    });

    it('writes no note for a whitespace-only one', async () => {
      await typeNoteAndSubmit('   ');

      expect(mockMarkAsPaid).toHaveBeenCalledTimes(1);
      const arg = mockMarkAsPaid.mock.calls[0][1] as { notes?: string };
      expect(arg.notes).toBeUndefined();
    });
  });
});

describe('resolvePaySheetSaveError', () => {
  it("maps the discriminated 'unstorable' reason to its own copy, ignoring the message", () => {
    expect(
      resolvePaySheetSaveError(new TransactionAmountError('arbitrary internal text', 'unstorable')),
    ).toBe(Strings.commitmentsPayErrAmountUnstorable);
  });

  // #363: whatever still reaches save after the schema's own zero-destination check already
  // validated — e.g. state changed between validation and submit — gets its own copy too.
  it("maps the discriminated 'zero-destination' reason to its own copy, ignoring the message", () => {
    expect(
      resolvePaySheetSaveError(
        new TransactionAmountError('arbitrary internal text', 'zero-destination'),
      ),
    ).toBe(Strings.commitmentsPayErrDestinationTooSmall);
  });

  it('falls through an undiscriminated TransactionAmountError to the retry banner', () => {
    expect(
      resolvePaySheetSaveError(
        new TransactionAmountError('A positive USD exchange rate is required'),
      ),
    ).toBe(Strings.commitmentsPayError);
  });

  it('keeps the retry banner for everything else, where retrying is accurate', () => {
    expect(resolvePaySheetSaveError(new Error('disk full'))).toBe(Strings.commitmentsPayError);
    expect(resolvePaySheetSaveError(undefined)).toBe(Strings.commitmentsPayError);
  });
});
