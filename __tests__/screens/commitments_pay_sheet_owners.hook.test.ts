import { act, renderHook, waitFor } from '@testing-library/react-native';

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
import {
  INITIAL_PAY_SHEET_ENTRY,
  usePaySheetState,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { formatStoredMoneyText } from '@/utils/money_text';

const mockMarkAsPaid = jest.fn();
const mockLoadAccounts = jest.fn();
const mockGetLastPaidPayment = jest.fn();

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
    getLastPaidPayment: (...args: unknown[]) => mockGetLastPaidPayment(...args),
  },
}));

const RATE = 55;
const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';

// No account on the commitment, so every prefill that runs queries the last paid payment.
const commitment: Commitment = {
  id: 'c1',
  name: 'Internet',
  amount_type: AmountType.Fixed,
  amount: 15,
  currency: Currency.EGP,
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

const egpAccount = { id: 'acc-egp', currency: Currency.EGP } as unknown as Account;
const ACCOUNTS: Account[] = [egpAccount];

const p1: CommitmentPayment = {
  id: 'p1',
  commitment_id: commitment.id,
  due_date: '2026-05-01',
  amount_due: 15,
  amount_paid: null,
  currency: Currency.EGP,
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
const p2: CommitmentPayment = { ...p1, id: 'p2', due_date: '2026-06-01' };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

const entries = () => usePaySheetState.getState().entries;

async function mountTwoSheets() {
  const a = await renderHook(() => usePaySheet(OWNER_A, commitment, p1));
  const b = await renderHook(() => usePaySheet(OWNER_B, commitment, p2));
  return { a, b };
}

type Sheet = Awaited<ReturnType<typeof mountTwoSheets>>['a'];

async function openAndPrefill(...sheets: [owner: string, sheet: Sheet][]) {
  await act(async () => {
    for (const [owner] of sheets) usePaySheetState.getState().open(owner);
  });
  for (const [, sheet] of sheets) {
    await waitFor(() => expect(sheet.result.current.form.getValues('account_id')).toBe('acc-egp'));
  }
}

beforeEach(() => {
  jest.clearAllMocks();
  usePaySheetState.getState().reset();
  mockMarkAsPaid.mockResolvedValue(undefined);
  mockLoadAccounts.mockResolvedValue(undefined);
  mockGetLastPaidPayment.mockResolvedValue(null);
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    markAsPaid: mockMarkAsPaid,
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: ACCOUNTS,
    loadAccounts: mockLoadAccounts,
  }));
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: RATE,
    rate_updated_at: null,
  }));
});

describe('usePaySheet under two owners', () => {
  it('opening one copy sheet leaves the other closed and runs only the opened prefill', async () => {
    const { a, b } = await mountTwoSheets();

    await openAndPrefill([OWNER_A, a]);

    expect(a.result.current.state.visible).toBe(true);
    expect(b.result.current.state.visible).toBe(false);
    expect(mockGetLastPaidPayment).toHaveBeenCalledTimes(1);
    expect(b.result.current.form.getValues('amountText')).toBe('');
  });

  it('a save in progress on one copy leaves the other copy free to submit its own payment', async () => {
    const saveA = deferred<void>();
    const saveB = deferred<void>();
    mockMarkAsPaid.mockReturnValueOnce(saveA.promise).mockReturnValueOnce(saveB.promise);
    const { a, b } = await mountTwoSheets();
    await openAndPrefill([OWNER_A, a], [OWNER_B, b]);

    let submitA: Promise<void> | undefined;
    await act(async () => {
      submitA = a.result.current.onSubmit();
    });
    await waitFor(() => expect(a.result.current.state.saving).toBe(true));
    expect(b.result.current.state.saving).toBe(false);

    let submitB: Promise<void> | undefined;
    await act(async () => {
      submitB = b.result.current.onSubmit();
    });
    await waitFor(() => expect(mockMarkAsPaid).toHaveBeenCalledTimes(2));
    expect(mockMarkAsPaid).toHaveBeenNthCalledWith(1, p1.id, expect.anything());
    expect(mockMarkAsPaid).toHaveBeenNthCalledWith(2, p2.id, expect.anything());

    await act(async () => {
      saveA.resolve();
      saveB.resolve();
      await Promise.all([submitA, submitB]);
    });

    expect(a.result.current.state.saving).toBe(false);
    expect(b.result.current.state.saving).toBe(false);
  });

  it('a failed save banners on the copy that submitted only', async () => {
    mockMarkAsPaid.mockRejectedValueOnce(new Error('write failed'));
    const { a, b } = await mountTwoSheets();
    await openAndPrefill([OWNER_A, a], [OWNER_B, b]);

    await act(async () => {
      await a.result.current.onSubmit();
    });

    expect(a.result.current.state.saveError).toBe(Strings.commitmentsPayError);
    expect(b.result.current.state.saveError).toBeUndefined();
    expect(b.result.current.state.visible).toBe(true);
  });

  it('the rate override and the account picker on one copy change that copy only', async () => {
    const { a, b } = await mountTwoSheets();
    await openAndPrefill([OWNER_A, a], [OWNER_B, b]);
    await act(async () => {
      b.result.current.toggleRateOverride();
      a.result.current.form.setValue('exchange_rate', '60');
      b.result.current.form.setValue('exchange_rate', '60');
    });

    await act(async () => {
      a.result.current.toggleRateOverride();
      a.result.current.openAccountPicker();
    });
    await act(async () => a.result.current.toggleRateOverride());

    expect(a.result.current.state.rateOverride).toBe(false);
    expect(a.result.current.state.accountPickerVisible).toBe(true);
    expect(a.result.current.form.getValues('exchange_rate')).toBe(formatStoredMoneyText(RATE));
    expect(b.result.current.state.rateOverride).toBe(true);
    expect(b.result.current.state.accountPickerVisible).toBe(false);
    expect(b.result.current.form.getValues('exchange_rate')).toBe('60');
  });

  it('closing one copy, by hand or by a successful save, leaves the other copy open', async () => {
    const { a, b } = await mountTwoSheets();
    await openAndPrefill([OWNER_A, a], [OWNER_B, b]);

    await act(async () => a.result.current.setVisible(false));

    expect(a.result.current.state.visible).toBe(false);
    expect(b.result.current.state.visible).toBe(true);

    const before = entries()[OWNER_B];
    await act(async () => {
      await a.result.current.onSubmit();
    });

    expect(mockMarkAsPaid).toHaveBeenCalledWith(p1.id, expect.anything());
    expect(entries()[OWNER_A]).toEqual(INITIAL_PAY_SHEET_ENTRY);
    expect(entries()[OWNER_B]).toBe(before);
    expect(b.result.current.state.visible).toBe(true);
  });

  it('a save that resolves after its copy released writes nothing back', async () => {
    const saveA = deferred<void>();
    mockMarkAsPaid.mockReturnValueOnce(saveA.promise);
    const { a, b } = await mountTwoSheets();
    await openAndPrefill([OWNER_A, a], [OWNER_B, b]);

    let submitA: Promise<void> | undefined;
    await act(async () => {
      submitA = a.result.current.onSubmit();
    });
    await waitFor(() => expect(mockMarkAsPaid).toHaveBeenCalledTimes(1));
    await act(async () => usePaySheetState.getState().release(OWNER_A));

    await act(async () => {
      saveA.resolve();
      await submitA;
    });

    expect(OWNER_A in entries()).toBe(false);
    expect(Object.keys(entries())).toEqual([OWNER_B]);
    expect(mockMarkAsPaid).toHaveBeenCalledWith(p1.id, expect.anything());
  });
});
