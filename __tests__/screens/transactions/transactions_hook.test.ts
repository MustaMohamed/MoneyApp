import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { getPeriodTotals } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useFilterState } from '@/modules/transactions/screens/transactions/filter/filter.state';
import {
  EMPTY_FILTERS,
  useFilterStore,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactions } from '@/modules/transactions/screens/transactions/transactions.hook';
import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { getTransactionQueryKey } from '@/modules/transactions/store/transaction_query.helpers';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

let mockFocusEffectCallback: (() => void | (() => void)) | undefined;
const mockPush = jest.fn();
const mockOpenAdd = jest.fn();
const mockOpenEdit = jest.fn();
const mockInteractionTasks: Array<{
  callback: () => void | Promise<void>;
  cancel: jest.Mock;
}> = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: jest.fn((callback: () => void | (() => void)) => {
    mockFocusEffectCallback = callback;
  }),
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state',
  () => ({
    useTransactionFormState: {
      getState: () => ({ openAdd: mockOpenAdd, openEdit: mockOpenEdit }),
    },
  }),
);

jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: jest.fn((callback: () => void | Promise<void>) => {
    let cancelled = false;
    const cancel = jest.fn(() => {
      cancelled = true;
    });
    const task = {
      callback: () => (cancelled ? undefined : callback()),
      cancel,
    };
    mockInteractionTasks.push(task);
    return { cancel };
  }),
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

const EMPTY_TOTALS = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };

let setQuery: jest.Mock;
let refresh: jest.Mock;
let retry: jest.Mock;
let deleteTransaction: jest.Mock;
let transactionStoreState: Record<string, unknown>;

const JULY_QUERY = {
  search: undefined,
  type: undefined,
  dateFrom: '2026-07-01',
  dateTo: '2026-07-31',
};

const JUNE_QUERY = {
  ...JULY_QUERY,
  dateFrom: '2026-06-01',
  dateTo: '2026-06-30',
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

const JUNE_TRANSACTION: Transaction = {
  ...TRANSACTION,
  id: 'tx-june',
  transaction_date: '2026-06-12',
  created_at: '2026-06-12T12:00:00.000Z',
  updated_at: '2026-06-12T12:00:00.000Z',
};

function setupStores(transactionOverrides: Record<string, unknown> = {}) {
  setQuery = jest.fn().mockResolvedValue(undefined);
  refresh = jest.fn().mockResolvedValue(undefined);
  retry = jest.fn().mockResolvedValue(undefined);
  deleteTransaction = jest.fn().mockResolvedValue(undefined);
  const loadAccountLookup = jest.fn().mockResolvedValue(undefined);

  attachMockSelectorStore(useAccountStore, () => ({
    accounts: [],
    accountLookup: [],
    loadAccountLookup,
  }));
  attachMockSelectorStore(useCategoryStore, () => ({
    categories: [],
  }));
  transactionStoreState = {
    transactions: [],
    hasMore: false,
    loadingMore: false,
    paginationError: false,
    query: JULY_QUERY,
    queryKey: getTransactionQueryKey(JULY_QUERY),
    snapshotKey: getTransactionQueryKey(JULY_QUERY),
    status: 'empty',
    mutationVersion: 0,
    replacementRequestId: 1,
    setQuery,
    loadMore: jest.fn().mockResolvedValue(undefined),
    refresh,
    retry,
    deleteTransaction,
    reset: jest.fn(),
    ...transactionOverrides,
  };
  attachMockSelectorStore(useTransactionStore, () => transactionStoreState);
}

beforeEach(() => {
  mockFocusEffectCallback = undefined;
  mockInteractionTasks.length = 0;
  mockPush.mockClear();
  mockOpenAdd.mockClear();
  mockOpenEdit.mockClear();
  setupStores();
  useTransactionsScreenStore.getState().reset();
  useTransactionsScreenStore.getState().setSelectedMonth('2026-07');
  useTransactionsState.getState().reset();
  useFilterState.getState().reset();
  useFilterStore.getState().resetDraft();
  jest.mocked(getPeriodTotals).mockReset();
  jest.mocked(getPeriodTotals).mockResolvedValue(EMPTY_TOTALS);
});

describe('useTransactions screen orchestration', () => {
  beforeEach(() => {
    jest.mocked(getPeriodTotals).mockReturnValue(new Promise(() => {}));
  });

  it('owns opening the global add transaction form', async () => {
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.openAddTransaction());

    expect(mockOpenAdd).toHaveBeenCalledTimes(1);
  });

  it('owns the delete confirmation lifecycle', async () => {
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    expect(result.current.state.pendingDeleteId).toBe('tx-1');

    await act(async () => result.current.confirmDelete());

    expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    expect(result.current.state.pendingDeleteId).toBeNull();
  });
});

describe('useTransactions monthly totals', () => {
  it('keeps totals independent from search and filters', async () => {
    await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(getPeriodTotals).toHaveBeenCalledTimes(2);
    });
    jest.mocked(getPeriodTotals).mockClear();
    setQuery.mockClear();

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
      useTransactionsScreenStore.getState().setAppliedFilters({
        ...EMPTY_FILTERS,
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

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals?.current).toEqual(initialCurrent);
    });

    await act(() => {
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

    const first = await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(first.result.current.state.totals).toEqual({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });

    await first.unmount();
    jest.mocked(getPeriodTotals).mockReturnValue(new Promise(() => {}));

    const second = await renderHook(() => useTransactions());

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

    const { result } = await renderHook(() => useTransactions());

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

    const { result } = await renderHook(() => useTransactions());

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

  it('does not render rows owned by a different query', async () => {
    setupStores({
      transactions: [TRANSACTION],
      queryKey: getTransactionQueryKey({ ...JULY_QUERY, search: 'old' }),
      snapshotKey: getTransactionQueryKey({ ...JULY_QUERY, search: 'old' }),
      status: 'ready',
    });

    const { result } = await renderHook(() => useTransactions());

    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.listStatus).toBe('initialLoading');
    expect(result.current.state.showInitialSkeleton).toBe(true);
    expect(result.current.state.paginationError).toBe(false);
  });

  it('renders rows only when the snapshot matches the active controls', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });

    const { result } = await renderHook(() => useTransactions());

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].data).toEqual([TRANSACTION]);
    expect(result.current.state.listStatus).toBe('ready');
  });

  it('hides the previous snapshot immediately when controls change', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result } = await renderHook(() => useTransactions());
    expect(result.current.state.sections).toHaveLength(1);

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('rent');
    });

    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.listStatus).toBe('initialLoading');
  });

  it('keeps ready rows available while the current snapshot refreshes', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'refreshing' });

    const { result } = await renderHook(() => useTransactions());

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.refreshing).toBe(true);
    expect(result.current.state.showInitialSkeleton).toBe(false);
  });

  it('never presents the previous month rows during a month transition', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result, rerender } = await renderHook(
      (_props: Record<string, never>) => useTransactions(),
      {
        initialProps: {},
      },
    );
    expect(result.current.state.sections[0].data).toEqual([TRANSACTION]);

    await act(() => {
      result.current.setSelectedMonth('2026-06');
    });

    expect(result.current.state.selectedMonth).toBe('2026-06');
    expect(result.current.state.sections).toEqual([]);
    expect(result.current.state.listStatus).toBe('initialLoading');

    transactionStoreState = {
      ...transactionStoreState,
      transactions: [JUNE_TRANSACTION],
      query: JUNE_QUERY,
      queryKey: getTransactionQueryKey(JUNE_QUERY),
      snapshotKey: getTransactionQueryKey(JUNE_QUERY),
      status: 'ready',
    };
    await rerender({});

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].data).toEqual([JUNE_TRANSACTION]);
  });

  it('preserves list controls and scroll context across detail navigation remounts', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const first = await renderHook(() => useTransactions());

    await act(() => {
      first.result.current.setSelectedMonth('2026-06');
      first.result.current.setSearchQuery('coffee');
      first.result.current.setActiveFilter(TransactionType.Expense);
    });
    await act(() => {
      first.result.current.onListScrollEnd({
        nativeEvent: { contentOffset: { y: 284 } },
      });
    });
    await first.unmount();

    const second = await renderHook(() => useTransactions());

    expect(second.result.current.state).toMatchObject({
      selectedMonth: '2026-06',
      searchQuery: 'coffee',
      activeFilter: TransactionType.Expense,
    });
    expect(useTransactionsState.getState().scrollOffset).toBe(284);
  });

  it('revalidates the visible snapshot and totals when the screen regains focus', async () => {
    jest.mocked(getPeriodTotals).mockResolvedValue(EMPTY_TOTALS);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expect(getPeriodTotals).toHaveBeenCalledTimes(2));
    expect(mockFocusEffectCallback).toBeDefined();

    let firstCleanup: void | (() => void) = undefined;
    await act(() => {
      firstCleanup = mockFocusEffectCallback?.();
    });
    await act(() => firstCleanup?.());
    refresh.mockClear();
    jest.mocked(getPeriodTotals).mockClear();

    await act(() => {
      mockFocusEffectCallback?.();
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(getPeriodTotals).not.toHaveBeenCalled();

    await act(async () => {
      await mockInteractionTasks[1]?.callback();
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(getPeriodTotals).toHaveBeenCalledTimes(2);
    });
  });

  it('does not refresh a snapshot that finishes loading while focus work is pending', async () => {
    setupStores({
      transactions: [],
      snapshotKey: undefined,
      status: 'initialLoading',
    });
    await renderHook(() => useTransactions());

    await act(() => {
      mockFocusEffectCallback?.();
    });
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      snapshotKey: getTransactionQueryKey(JULY_QUERY),
      status: 'ready',
    };

    await act(async () => {
      await mockInteractionTasks[0]?.callback();
    });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('skips revalidation when rows and totals change while focus work is pending', async () => {
    jest.mocked(getPeriodTotals).mockResolvedValue(EMPTY_TOTALS);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expect(getPeriodTotals).toHaveBeenCalledTimes(2));
    let firstCleanup: void | (() => void) = undefined;
    await act(() => {
      firstCleanup = mockFocusEffectCallback?.();
      firstCleanup?.();
    });
    refresh.mockClear();
    jest.mocked(getPeriodTotals).mockClear();

    await act(() => {
      mockFocusEffectCallback?.();
    });
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [{ ...TRANSACTION, note: 'new snapshot' }],
      replacementRequestId: 2,
    };
    await act(() => {
      const totalsStore = useTransactionsScreenStore.getState();
      const requestId = totalsStore.beginTotalsRequest('2026-07', true);
      useTransactionsState.getState().beginTotalsLoad(true);
      totalsStore.resolveTotals('2026-07', requestId, {
        current: EMPTY_TOTALS,
        previous: EMPTY_TOTALS,
      });
      useTransactionsState.getState().resolveTotalsLoad();
    });

    await act(async () => {
      await mockInteractionTasks[1]?.callback();
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(getPeriodTotals).not.toHaveBeenCalled();
  });

  it('still revalidates after pagination changes the rows without replacing the snapshot', async () => {
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
      replacementRequestId: 3,
    };
    await renderHook(() => useTransactions());

    await act(() => {
      mockFocusEffectCallback?.();
    });
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION, { ...TRANSACTION, id: 'tx-page-2' }],
    };

    await act(async () => {
      await mockInteractionTasks[0]?.callback();
    });

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not repeat a failed replacement while focus work is pending', async () => {
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
      replacementRequestId: 4,
    };
    await renderHook(() => useTransactions());

    await act(() => {
      mockFocusEffectCallback?.();
    });
    transactionStoreState = {
      ...transactionStoreState,
      status: 'refreshErrorWithData',
      replacementRequestId: 5,
    };

    await act(async () => {
      await mockInteractionTasks[0]?.callback();
    });

    expect(refresh).not.toHaveBeenCalled();
  });

  it('cancels pending focus revalidation when the screen blurs', async () => {
    jest.mocked(getPeriodTotals).mockResolvedValue(EMPTY_TOTALS);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expect(getPeriodTotals).toHaveBeenCalledTimes(2));
    refresh.mockClear();
    jest.mocked(getPeriodTotals).mockClear();

    let cleanup: void | (() => void) = undefined;
    await act(() => {
      cleanup = mockFocusEffectCallback?.();
      cleanup?.();
    });
    await act(async () => {
      await mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(refresh).not.toHaveBeenCalled();
    expect(getPeriodTotals).not.toHaveBeenCalled();
  });

  it('tracks scrolling without publishing offsets until the screen blurs', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result } = await renderHook(() => useTransactions());
    let cleanup: void | (() => void) = undefined;
    await act(() => {
      cleanup = mockFocusEffectCallback?.();
    });
    const listener = jest.fn();
    const unsubscribe = useTransactionsState.subscribe(listener);

    await act(() => {
      result.current.onListScroll({
        nativeEvent: { contentOffset: { y: 96 } },
      });
      result.current.onListScroll({
        nativeEvent: { contentOffset: { y: 192 } },
      });
      result.current.onListScroll({
        nativeEvent: { contentOffset: { y: 284 } },
      });
    });

    expect(useTransactionsState.getState().scrollOffset).toBe(0);
    expect(listener).not.toHaveBeenCalled();

    await act(() => cleanup?.());

    expect(useTransactionsState.getState().scrollOffset).toBe(284);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('does not persist a late scroll event under a newly selected query', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result } = await renderHook(() => useTransactions());
    let cleanup: void | (() => void) = undefined;
    await act(() => {
      cleanup = mockFocusEffectCallback?.();
    });
    const staleScrollHandler = result.current.onListScroll;

    await act(() => {
      staleScrollHandler({ nativeEvent: { contentOffset: { y: 284 } } });
      result.current.setSelectedMonth('2026-06');
    });
    await act(() => {
      staleScrollHandler({ nativeEvent: { contentOffset: { y: 420 } } });
      cleanup?.();
    });

    expect(useTransactionsState.getState()).toMatchObject({
      scrollQueryKey: getTransactionQueryKey(JUNE_QUERY),
      scrollOffset: 0,
    });
  });

  it('waits for the owning snapshot before restoring its scroll offset', async () => {
    setupStores({
      transactions: [],
      snapshotKey: undefined,
      status: 'initialLoading',
    });
    const queryKey = getTransactionQueryKey(JULY_QUERY);
    useTransactionsState.getState().activateScrollQuery(queryKey);
    useTransactionsState.getState().setScrollOffset(queryKey, 284);
    const scrollTo = jest.fn();
    const { result, rerender } = await renderHook(
      (_props: Record<string, never>) => useTransactions(),
      {
        initialProps: {},
      },
    );
    Object.defineProperty(result.current.state.listRef, 'current', {
      configurable: true,
      value: { getScrollResponder: () => ({ scrollTo }) },
    });

    await act(() => {
      mockFocusEffectCallback?.();
    });
    expect(scrollTo).not.toHaveBeenCalled();

    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      snapshotKey: queryKey,
      status: 'ready',
    };
    await rerender({});

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ y: 284, animated: false });
    });
  });

  it('does not float a second error when the list and totals both fail initially', async () => {
    setupStores({
      transactions: [],
      snapshotKey: undefined,
      status: 'firstLoadError',
    });
    jest.mocked(getPeriodTotals).mockRejectedValue(new Error('totals unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
    expect(result.current.state.showFirstLoadError).toBe(true);
    expect(result.current.state.loadErrorVariant).toBe('none');
    consoleSpy.mockRestore();
  });

  it('distinguishes a first totals load failure from a refresh failure', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    jest.mocked(getPeriodTotals).mockRejectedValue(new Error('totals unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
    expect(result.current.state.loadErrorVariant).toBe('totals');
    consoleSpy.mockRestore();
  });
});
