import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { useAccountsList } from '@/modules/accounts/screens/accounts/list/accounts_list.hook';
import { useAccountsListState } from '@/modules/accounts/screens/accounts/list/accounts_list.state';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useBaseCurrencyStore } from '@/modules/currency/store/base_currency.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

const mockPush = jest.fn();
const mockBack = jest.fn();
const mockLoadAccounts = jest.fn<Promise<void>, []>();

jest.mock('zustand/react/shallow', () => ({
  useShallow: <T>(selector: T): T => selector,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
// Mocked for the caption inputs, and because the real modules pull the settings repo and the DB.
jest.mock('@/modules/currency/store/currency.store', () => ({
  useCurrencyStore: jest.fn(),
}));
jest.mock('@/modules/currency/store/base_currency.store', () => ({
  useBaseCurrencyStore: jest.fn(),
}));
jest.mock('@/modules/dashboard/screens/dashboard/dashboard.store', () => ({
  useDashboardStore: jest.fn(),
}));

const accounts = [
  makeTestAccount({
    id: 'acc-1',
    name: 'CIB Current',
    type: AccountType.Bank,
    currency: Currency.EGP,
    sort_order: 0,
  }),
  makeTestAccount({ id: 'acc-2', name: 'Cash', sort_order: 1 }),
];

const usdWallet = makeTestAccount({
  id: 'acc-3',
  name: 'Instapay',
  type: AccountType.SmartWallet,
  currency: Currency.USD,
  current_balance: 100,
  opening_balance: 100,
  sort_order: 2,
});

let storeState = { accounts, archivedCount: 0, loadError: false, loadAccounts: mockLoadAccounts };

let currencyState: {
  rate: number;
  isManualOverride: boolean;
  // The store's field name: the real selector reads `s.rate_updated_at`, the hook renames it.
  rate_updated_at: string | null;
};

let dashboardStoreState: {
  snapshot: { statsMap: Record<string, { month_in: number; month_out: number }> } | undefined;
};

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadAccounts.mockResolvedValue(undefined);
  storeState = { accounts, archivedCount: 0, loadError: false, loadAccounts: mockLoadAccounts };
  currencyState = {
    rate: 50,
    isManualOverride: false,
    rate_updated_at: '2026-09-01T09:00:00.000Z',
  };
  dashboardStoreState = {
    snapshot: {
      statsMap: { 'acc-1': { month_in: 22300, month_out: 14950 } },
    },
  };

  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => storeState);
  attachMockSelectorStore(useCurrencyStore, () => currencyState);
  attachMockSelectorStore(useBaseCurrencyStore, () => ({ baseCurrency: Currency.EGP }));
  attachMockSelectorStore(useDashboardStore, () => dashboardStoreState);
  useAccountsListState.getState().reset();
});

describe('useAccountsList', () => {
  it('exposes the store rows by reference, in store order, on All', async () => {
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.selectedType).toBe('all');
    expect(result.current.state.rows.map((row) => row.account)).toEqual(accounts);
    expect(result.current.state.rows[0].account).toBe(accounts[0]);
    expect(result.current.state.rows[1].account).toBe(accounts[1]);
  });

  it('reports no empty state while rows exist, whatever the archived count', async () => {
    storeState = { accounts, archivedCount: 1, loadError: false, loadAccounts: mockLoadAccounts };
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.emptyState).toBe('none');
  });

  it('reports archivedOnly with no rows and archived accounts, carrying the count', async () => {
    storeState = {
      accounts: [],
      archivedCount: 2,
      loadError: false,
      loadAccounts: mockLoadAccounts,
    };
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.emptyState).toBe('archivedOnly');
    expect(result.current.state.archivedCount).toBe(2);
  });

  it('reports noAccounts with no rows and nothing archived', async () => {
    storeState = {
      accounts: [],
      archivedCount: 0,
      loadError: false,
      loadAccounts: mockLoadAccounts,
    };
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.emptyState).toBe('noAccounts');
  });

  it('opens a row at its detail route', async () => {
    const { result } = await renderHook(() => useAccountsList());
    await act(() => {
      result.current.goToAccount('acc-1');
    });
    expect(mockPush.mock.calls).toEqual([['/accounts/acc-1']]);
  });

  it('opens the add-account form from the header', async () => {
    const { result } = await renderHook(() => useAccountsList());
    await act(() => {
      result.current.goToAddAccount();
    });
    expect(mockPush.mock.calls).toEqual([['/accounts/add_account']]);
  });

  it('back pops once and pushes nothing', async () => {
    const { result } = await renderHook(() => useAccountsList());
    await act(() => {
      result.current.onBack();
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('retry reloads once and holds isRetrying until the reload settles', async () => {
    const reload = deferred<void>();
    mockLoadAccounts.mockReturnValueOnce(reload.promise);
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.isRetrying).toBe(false);

    let pending: Promise<void> = Promise.resolve();
    await act(() => {
      pending = result.current.retry();
    });

    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
    expect(result.current.state.isRetrying).toBe(true);

    await act(async () => {
      reload.resolve();
      await pending;
    });

    expect(result.current.state.isRetrying).toBe(false);
  });

  it('a failed retry settles isRetrying and does not throw at the screen', async () => {
    mockLoadAccounts.mockRejectedValueOnce(new Error('db error'));
    const { result } = await renderHook(() => useAccountsList());

    await act(async () => {
      await expect(result.current.retry()).resolves.toBeUndefined();
    });

    expect(result.current.state.isRetrying).toBe(false);
  });

  it('a second tap while the retry is in flight reloads only once', async () => {
    const reload = deferred<void>();
    mockLoadAccounts.mockReturnValueOnce(reload.promise);
    const { result } = await renderHook(() => useAccountsList());

    let first: Promise<void> = Promise.resolve();
    let second: Promise<void> = Promise.resolve();
    await act(() => {
      first = result.current.retry();
    });
    await act(() => {
      second = result.current.retry();
    });

    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);

    await act(async () => {
      reload.resolve();
      await Promise.all([first, second]);
    });
  });

  it('shows the error body over the rows when the last read failed', async () => {
    storeState = { accounts, archivedCount: 0, loadError: true, loadAccounts: mockLoadAccounts };
    const { result } = await renderHook(() => useAccountsList());

    expect(result.current.state.content).toBe('error');
  });
});

describe('useAccountsList — the type filter narrows the rows', () => {
  // Two non-adjacent Banks: a narrow written as a regroup or a re-sort fails this.
  const banks = [
    makeTestAccount({ id: 'acc-1', name: 'CIB Current', type: AccountType.Bank, sort_order: 0 }),
    makeTestAccount({ id: 'acc-2', name: 'Cash', type: AccountType.PhysicalWallet, sort_order: 1 }),
    makeTestAccount({ id: 'acc-4', name: 'QNB', type: AccountType.Bank, sort_order: 2 }),
  ];

  it('shows only the selected type, in store order, and All restores the list', async () => {
    storeState = {
      accounts: banks,
      archivedCount: 0,
      loadError: false,
      loadAccounts: mockLoadAccounts,
    };
    const { result } = await renderHook(() => useAccountsList());

    await act(() => {
      result.current.selectType(AccountType.Bank);
    });

    expect(result.current.state.rows.map((row) => row.account.id)).toEqual(['acc-1', 'acc-4']);
    expect(result.current.state.emptyState).toBe('none');

    await act(() => {
      result.current.selectType('all');
    });

    expect(result.current.state.rows.map((row) => row.account.id)).toEqual([
      'acc-1',
      'acc-2',
      'acc-4',
    ]);
  });

  it('keeps the surviving rows and their captions as the objects All showed', async () => {
    const { result } = await renderHook(() => useAccountsList());
    const allRows = result.current.state.rows;

    await act(() => {
      result.current.selectType(AccountType.Bank);
    });

    expect(result.current.state.rows).toHaveLength(1);
    expect(result.current.state.rows[0]).toBe(allRows[0]);
    expect(result.current.state.rows[0].caption).toBe(allRows[0].caption);
  });

  it('names the section after the selected type and keeps the content on rows', async () => {
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.sectionTitle).toBe('Your accounts');

    await act(() => {
      result.current.selectType(AccountType.CreditCard);
    });

    expect(result.current.state.sectionTitle).toBe('Credit cards');
    expect(result.current.state.rows).toEqual([]);
    expect(result.current.state.emptyState).toBe('filtered');
    expect(result.current.state.content).toBe('rows');
  });

  it('keeps the archived-only block on every segment', async () => {
    storeState = {
      accounts: [],
      archivedCount: 2,
      loadError: false,
      loadAccounts: mockLoadAccounts,
    };
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.emptyState).toBe('archivedOnly');

    await act(() => {
      result.current.selectType(AccountType.Bank);
    });

    expect(result.current.state.emptyState).toBe('archivedOnly');
  });
});

describe('useAccountsList — the caption reads the dashboard snapshot', () => {
  it("takes each row's figures from the snapshot entry keyed by the account id", async () => {
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.rows[0].caption).toBe('Month in 22,300 · out 14,950');
  });

  it('falls back to zeros when the dashboard holds no snapshot', async () => {
    dashboardStoreState = { snapshot: undefined };
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.rows[0].caption).toBe('Month in 0 · out 0');
  });
});

describe('useAccountsList — the smart wallet caption follows the rate gate, not the rate', () => {
  beforeEach(() => {
    storeState = { ...storeState, accounts: [usdWallet] };
  });

  it('takes the bank caption at the placeholder rate with no provenance', async () => {
    currencyState = { rate: 50, isManualOverride: false, rate_updated_at: null };
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.rows[0].caption).toBe('Month in 0.00 · out 0.00');
  });

  it('takes the equivalent caption once the rate has provenance', async () => {
    const { result } = await renderHook(() => useAccountsList());
    expect(result.current.state.rows[0].caption).toBe('≈ 5,000 EGP at 50.00');
  });
});
