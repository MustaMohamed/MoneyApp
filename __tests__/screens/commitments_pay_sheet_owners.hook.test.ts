import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import type { CommitmentPayment } from '@/modules/commitments/entities/commitment_payment.entity';
import { usePaySheet } from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.hook';
import {
  INITIAL_PAY_SHEET_ENTRY,
  usePaySheetState,
} from '@/modules/commitments/screens/commitments/detail/components/pay_sheet.state';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { makeTestCommitment, makeTestPayment } from '@/test_helpers/commitment';
import { deferred } from '@/test_helpers/deferred';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { formatStoredMoneyText } from '@/utils/money_text';

const mockMarkAsPaid = jest.fn();
const mockLoadAccounts = jest.fn();

jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));

const RATE = 55;
const OWNER_A = 'owner-a';
const OWNER_B = 'owner-b';
const TODAY = '2026-10-20';

// The commitment's account is loaded, so every prefill that runs lights it.
const commitment = makeTestCommitment({
  name: 'Internet',
  amount: 15,
  category_id: 'cat1',
  account_id: 'acc-egp',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});

const egpAccount = { id: 'acc-egp', name: 'Cash', currency: Currency.EGP } as unknown as Account;
const ACCOUNTS: Account[] = [egpAccount];

const p1 = makeTestPayment({
  commitment_id: commitment.id,
  due_date: '2026-05-01',
  amount_due: 15,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
});
const p2: CommitmentPayment = { ...p1, id: 'p2', due_date: '2026-06-01' };

const entries = () => usePaySheetState.getState().entries;

async function mountTwoSheets() {
  const a = await renderHook(() => usePaySheet(OWNER_A, commitment, p1, TODAY));
  const b = await renderHook(() => usePaySheet(OWNER_B, commitment, p2, TODAY));
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
    expect(a.result.current.form.getValues('account_id')).toBe('acc-egp');
    expect(b.result.current.form.getValues('account_id')).toBe('');
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

  it('the rate override on one copy changes that copy only', async () => {
    const { a, b } = await mountTwoSheets();
    await openAndPrefill([OWNER_A, a], [OWNER_B, b]);
    await act(async () => {
      b.result.current.commitRate('60');
    });
    await act(async () => {
      a.result.current.commitRate('60');
    });
    await act(async () => {
      a.result.current.commitRate(formatStoredMoneyText(RATE));
    });

    const { entries } = usePaySheetState.getState();
    expect(entries[OWNER_A].rateOverride).toBe(false);
    expect(a.result.current.form.getValues('exchange_rate')).toBe(formatStoredMoneyText(RATE));
    expect(entries[OWNER_B].rateOverride).toBe(true);
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
    expect(entries()[OWNER_A]).toEqual({ ...INITIAL_PAY_SHEET_ENTRY, settled: true });
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
