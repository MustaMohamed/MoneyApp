import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { getPeriodTotals } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useFilterState } from '@/modules/transactions/screens/transactions/filter/filter.state';
import {
  EMPTY_FILTERS_V2,
  useFilterStore,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactions } from '@/modules/transactions/screens/transactions/transactions.hook';
import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';
import { getTransactionQueryKey } from '@/modules/transactions/store/transaction_query.helpers';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('@/utils/use_debounced_value.hook', () => ({
  useDebouncedValue: (value: unknown) => value,
}));

jest.mock('@/database/client', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/modules/transactions/database/transactions', () => ({
  getPeriodTotals: jest.fn().mockResolvedValue({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 }),
}));

jest.mock('@/modules/accounts/store/account.store', () => ({
  useAccountStore: jest.fn(),
}));

jest.mock('@/modules/categories/store/category.store', () => ({
  useCategoryStore: jest.fn(),
}));

jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: jest.fn(),
}));

const { useAccountStore } = jest.requireMock('@/modules/accounts/store/account.store');
const { useCategoryStore } = jest.requireMock('@/modules/categories/store/category.store');
const { useTransactionStore } = jest.requireMock('@/modules/transactions/store/transaction.store');

const EMPTY_TOTALS = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };

let setQuery: jest.Mock;
let refresh: jest.Mock;
let retry: jest.Mock;
let transactionStoreState: Record<string, unknown>;

const JULY_QUERY = {
  search: undefined,
  type: undefined,
  dateFrom: '2026-07-01',
  dateTo: '2026-07-31',
};

const TRANSACTION: Transaction = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 100,
  currency: Currency.EGP,
  egp_amount: 100,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  revolving_balance_delta: null,
  account_id: 'account-1',
  to_account_id: null,
  category_id: 'category-1',
  budget_id: null,
  note: null,
  transaction_date: '2026-07-12',
  transaction_time: '12:00:00',
  commitment_payment_id: null,
  installment_id: null,
  created_at: '2026-07-12T12:00:00.000Z',
  updated_at: '2026-07-12T12:00:00.000Z',
};

function setupStores(transactionOverrides: Record<string, unknown> = {}) {
  const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
  setQuery = jest.fn().mockResolvedValue(undefined);
  refresh = jest.fn().mockResolvedValue(undefined);
  retry = jest.fn().mockResolvedValue(undefined);

  attachMockSelectorStore(useAccountStore as jest.Mock, () => ({
    accounts: [],
    accountLookup: [],
    loadAccountLookup: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: [],
  }));
  transactionStoreState = {
    transactions: [],
    hasMore: false,
    loadingMore: false,
    query: JULY_QUERY,
    queryKey: getTransactionQueryKey(JULY_QUERY),
    snapshotKey: getTransactionQueryKey(JULY_QUERY),
    status: 'empty',
    mutationVersion: 0,
    setQuery,
    loadMore: jest.fn().mockResolvedValue(undefined),
    refresh,
    retry,
    reset: jest.fn(),
    ...transactionOverrides,
  };
  attachMockSelectorStore(useTransactionStore as jest.Mock, () => transactionStoreState);
}

beforeEach(() => {
  setupStores();
  useTransactionsScreenStore.getState().reset();
  useTransactionsScreenStore.getState().setSelectedMonth('2026-07');
  useTransactionsState.getState().reset();
  useFilterState.getState().reset();
  useFilterStore.getState().resetDraft();
  jest.mocked(getPeriodTotals).mockReset();
  jest.mocked(getPeriodTotals).mockResolvedValue(EMPTY_TOTALS);
});

describe('useTransactions monthly totals', () => {
  it('keeps totals independent from search and filters', async () => {
    renderHook(() => useTransactions());

    await waitFor(() => {
      expect(getPeriodTotals).toHaveBeenCalledTimes(2);
    });
    jest.mocked(getPeriodTotals).mockClear();
    setQuery.mockClear();

    act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
      useTransactionsScreenStore.getState().setAppliedFilters({
        ...EMPTY_FILTERS_V2,
        accountIds: ['acc-1'],
        amountCurrency: Currency.EGP,
        amountMin: 100,
      });
    });

    await waitFor(() => {
      expect(setQuery).toHaveBeenCalled();
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(getPeriodTotals).not.toHaveBeenCalled();
  });

  it('clears loaded totals while a new month is loading', async () => {
    const initialCurrent = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    const initialPrevious = { incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 };
    jest
      .mocked(getPeriodTotals)
      .mockResolvedValueOnce(initialCurrent)
      .mockResolvedValueOnce(initialPrevious)
      .mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals?.current).toEqual(initialCurrent);
    });

    act(() => {
      result.current.setSelectedMonth('2026-06');
    });

    await waitFor(() => {
      expect(result.current.state.totals).toBeNull();
    });
  });

  it('keeps same-month totals visible while revalidating after remount', async () => {
    const initialCurrent = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    const initialPrevious = { incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 };
    jest
      .mocked(getPeriodTotals)
      .mockResolvedValueOnce(initialCurrent)
      .mockResolvedValueOnce(initialPrevious);

    const first = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(first.result.current.state.totals).toEqual({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });

    first.unmount();
    jest.mocked(getPeriodTotals).mockReturnValue(new Promise(() => {}));

    const second = renderHook(() => useTransactions());

    expect(second.result.current.state.totals).toEqual({
      current: initialCurrent,
      previous: initialPrevious,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(second.result.current.state.totals).toEqual({
      current: initialCurrent,
      previous: initialPrevious,
    });
  });

  it('exposes a first-load totals error without writing financial zeroes', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(getPeriodTotals).mockRejectedValue(new Error('db down'));

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals).toBeNull();
      expect(result.current.state.totalsStatus).toBe('firstLoadError');
    });

    consoleSpy.mockRestore();
  });

  it('reloads monthly totals during manual refresh', async () => {
    const initialCurrent = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    const initialPrevious = { incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 };
    const refreshedCurrent = { incomeEgp: 26000, expenseEgp: 12000, netEgp: 14000 };
    const refreshedPrevious = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    jest
      .mocked(getPeriodTotals)
      .mockResolvedValueOnce(initialCurrent)
      .mockResolvedValueOnce(initialPrevious)
      .mockResolvedValueOnce(refreshedCurrent)
      .mockResolvedValueOnce(refreshedPrevious);

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals).toEqual({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });
    jest.mocked(getPeriodTotals).mockClear();

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(getPeriodTotals).toHaveBeenCalledTimes(2);
    expect(result.current.state.totals).toEqual({
      current: refreshedCurrent,
      previous: refreshedPrevious,
    });
  });
});

describe('useTransactions query ownership', () => {
  beforeEach(() => {
    jest.mocked(getPeriodTotals).mockReturnValue(new Promise(() => {}));
  });

  it('does not render rows owned by a different query', () => {
    setupStores({
      transactions: [TRANSACTION],
      queryKey: getTransactionQueryKey({ ...JULY_QUERY, search: 'old' }),
      snapshotKey: getTransactionQueryKey({ ...JULY_QUERY, search: 'old' }),
      status: 'ready',
    });

    const { result } = renderHook(() => useTransactions());

    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.listStatus).toBe('initialLoading');
    expect(result.current.state.showInitialSkeleton).toBe(true);
  });

  it('renders rows only when the snapshot matches the active controls', () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });

    const { result } = renderHook(() => useTransactions());

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].data).toEqual([TRANSACTION]);
    expect(result.current.state.listStatus).toBe('ready');
  });

  it('hides the previous snapshot immediately when controls change', () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result } = renderHook(() => useTransactions());
    expect(result.current.state.sections).toHaveLength(1);

    act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('rent');
    });

    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.listStatus).toBe('initialLoading');
  });

  it('keeps ready rows available while the current snapshot refreshes', () => {
    setupStores({ transactions: [TRANSACTION], status: 'refreshing' });

    const { result } = renderHook(() => useTransactions());

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.refreshing).toBe(true);
    expect(result.current.state.showInitialSkeleton).toBe(false);
  });
});
