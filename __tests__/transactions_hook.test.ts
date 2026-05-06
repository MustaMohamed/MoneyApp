import { renderHook, act } from '@testing-library/react-native';
import { useTransactions } from '@/screens/transactions/transactions.hook';
import { useTransactionStore } from '@/store/transaction.store';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '@/screens/transactions/transactions.store';
import { useFilterDrawerStore, EMPTY_FILTERS } from '@/screens/transactions/filter/filter.store';
import { useFilterDrawerState } from '@/screens/transactions/filter/filter.state';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/transaction.store', () => ({ useTransactionStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/transactions/transactions.store', () => ({
  useTransactionsScreenStore: jest.fn(),
}));
jest.mock('@/screens/transactions/filter/filter.store', () => ({
  useFilterDrawerStore: jest.fn(),
  EMPTY_FILTERS: {
    accountIds: [],
    categoryIds: [],
    datePreset: 'allTime',
    amountCurrency: 'EGP',
  },
}));
jest.mock('@/screens/transactions/filter/filter.state', () => ({
  useFilterDrawerState: jest.fn(),
}));
jest.mock('@/utils/use_debounced_value.hook', () => ({
  useDebouncedValue: (val: any) => val,
}));
jest.mock('@/screens/transactions/filter/filter.helpers', () => ({
  countActiveFilters: jest.fn(() => 0),
  toQueryFilters: jest.fn(() => ({})),
}));

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setupMocks(overrides: { refresh?: jest.Mock } = {}) {
  const mockRefresh = overrides.refresh ?? jest.fn().mockResolvedValue(undefined);
  const mockSetQuery = jest.fn().mockResolvedValue(undefined);
  const mockLoadMore = jest.fn().mockResolvedValue(undefined);

  (useTransactionStore as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { transactions: [], hasMore: false, loading: false, query: {} },
      setQuery: mockSetQuery,
      loadMore: mockLoadMore,
      refresh: mockRefresh,
    }),
  );
  (useAccountStore as jest.Mock).mockImplementation((sel: any) => sel({ state: { accounts: [] } }));
  (useCategoryStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
  (useTransactionsScreenStore as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { searchQuery: '', activeFilter: 'all', appliedFilters: EMPTY_FILTERS },
      setSearchQuery: jest.fn(),
      setActiveFilter: jest.fn(),
      clearSearch: jest.fn(),
    }),
  );
  (useFilterDrawerStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ setDraft: jest.fn() }),
  );
  (useFilterDrawerState as jest.Mock).mockImplementation((sel: any) => sel({ open: jest.fn() }));

  return { mockRefresh, mockSetQuery, mockLoadMore };
}

describe('useTransactions — onRefresh', () => {
  it('refreshing starts as false', () => {
    setupMocks();
    const { result } = renderHook(() => useTransactions());
    expect(result.current.state.refreshing).toBe(false);
  });

  it('sets refreshing=true during the async call and false after it resolves', async () => {
    const def = deferred<void>();
    const mockRefresh = jest.fn(() => def.promise);
    setupMocks({ refresh: mockRefresh });

    const { result } = renderHook(() => useTransactions());

    act(() => {
      result.current.onRefresh();
    });
    expect(result.current.state.refreshing).toBe(true);

    await act(async () => {
      def.resolve();
    });
    expect(result.current.state.refreshing).toBe(false);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it('sets refreshing=false even when refresh() rejects', async () => {
    const def = deferred<void>();
    const mockRefresh = jest.fn(() => def.promise);
    setupMocks({ refresh: mockRefresh });

    const { result } = renderHook(() => useTransactions());

    act(() => {
      result.current.onRefresh();
    });
    expect(result.current.state.refreshing).toBe(true);

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await act(async () => {
      def.reject(new Error('db down'));
    });
    consoleSpy.mockRestore();

    expect(result.current.state.refreshing).toBe(false);
  });
});
