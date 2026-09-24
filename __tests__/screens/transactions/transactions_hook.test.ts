import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { getTransactionMonthAggregate } from '@/modules/transactions/database/transactions';
import type { TransactionMonthAggregate } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { TransactionAccountArchivedError } from '@/modules/transactions/repositories/transaction.errors';
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
import { makeTestAccount } from '@/test_helpers/transaction';

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
  getTransactionMonthAggregate: jest.fn().mockResolvedValue({
    days: [],
    matchCount: 0,
    matchNetEgp: 0,
    scoped: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
  }),
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
const EMPTY_AGGREGATE: TransactionMonthAggregate = {
  days: [],
  matchCount: 0,
  matchNetEgp: 0,
  scoped: EMPTY_TOTALS,
};

let setQuery: jest.Mock;
let refresh: jest.Mock;
let retry: jest.Mock;
let deleteTransaction: jest.Mock;
let loadAccountLookup: jest.Mock;
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

function setupStores(
  transactionOverrides: Record<string, unknown> = {},
  accountOverrides: Record<string, unknown> = {},
) {
  setQuery = jest.fn().mockResolvedValue(undefined);
  refresh = jest.fn().mockResolvedValue(undefined);
  retry = jest.fn().mockResolvedValue(undefined);
  deleteTransaction = jest.fn().mockResolvedValue(undefined);
  loadAccountLookup = jest.fn().mockResolvedValue(undefined);

  attachMockSelectorStore(useAccountStore, () => ({
    accounts: [],
    archivedAccounts: [],
    accountLookupById: {},
    accountLookupError: false,
    loadAccountLookup,
    ...accountOverrides,
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
  jest.mocked(getTransactionMonthAggregate).mockReset();
  jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);
});

describe('useTransactions screen orchestration', () => {
  beforeEach(() => {
    jest.mocked(getTransactionMonthAggregate).mockReturnValue(new Promise(() => {}));
  });

  it('owns opening the global add transaction form', async () => {
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.openAddTransaction());

    expect(mockOpenAdd).toHaveBeenCalledTimes(1);
    // Bare: the transactions screen's own opener preselects no account.
    expect(mockOpenAdd).toHaveBeenCalledWith();
  });

  it('owns the delete confirmation lifecycle', async () => {
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    expect(result.current.state.pendingDeleteId).toBe('tx-1');

    await act(async () => result.current.confirmDelete());

    expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    expect(result.current.state.pendingDeleteId).toBeNull();
  });

  it('MA-053: keeps the delete pending and names the archived account when the delete is refused', async () => {
    setupStores({
      deleteTransaction: jest
        .fn()
        .mockRejectedValue(
          new TransactionAccountArchivedError('source', makeTestAccount({ name: 'Old Card' })),
        ),
    });
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    await act(async () => result.current.confirmDelete());

    expect(result.current.state.deleteErrorMessage).toBe(
      Strings.transactionAccountArchived('Old Card'),
    );
    expect(result.current.state.pendingDeleteId).toBe('tx-1');
  });

  it('keeps the generic delete copy for any other failure', async () => {
    setupStores({ deleteTransaction: jest.fn().mockRejectedValue(new Error('write failed')) });
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    await act(async () => result.current.confirmDelete());

    expect(result.current.state.deleteErrorMessage).toBe(Strings.errDeleteFailed);
  });

  it('MA-062: names a blank-named account "Unnamed account" in the applied filter summary', async () => {
    setupStores({}, { accounts: [makeTestAccount({ id: 'account-1', name: '' })] });
    const { result } = await renderHook(() => useTransactions());

    await act(() => {
      useTransactionsScreenStore
        .getState()
        .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['account-1'] });
    });

    expect(result.current.state.appliedFilterSummary).toBe(Strings.unnamedAccount);
    expect(result.current.state.accountsById.get('account-1')?.name).toBe('');
  });
});

describe('useTransactions monthly totals', () => {
  it("reloads the aggregate under the new key and keeps the scoped totals' identity", async () => {
    const current = { incomeEgp: 22300, expenseEgp: 9400, netEgp: 12900 };
    const previous = { incomeEgp: 0, expenseEgp: 9400, netEgp: -9400 };
    jest.mocked(getTransactionMonthAggregate).mockImplementation(async (_db, query) => ({
      ...EMPTY_AGGREGATE,
      matchCount: query.search === 'coffee' ? 2 : 0,
      scoped: { ...(query.dateFrom === '2026-07-01' ? current : previous) },
    }));
    const { result } = await renderHook(() => useTransactions());

    await act(() => {
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
      useTransactionsScreenStore.getState().setAppliedFilters({
        ...EMPTY_FILTERS,
        accountIds: ['acc-1'],
        amountCurrency: Currency.EGP,
        amountMin: 100,
      });
    });
    await waitFor(() => {
      expect(getTransactionMonthAggregate).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ type: TransactionType.Expense, accountIds: ['acc-1'] }),
      );
      expect(result.current.state.totalsStatus).toBe('ready');
      expect(result.current.state.totals).toMatchObject({ current, previous });
    });
    const heldCurrent = result.current.state.totals?.current;
    const heldPrevious = result.current.state.totals?.previous;
    jest.mocked(getTransactionMonthAggregate).mockClear();

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() => {
      expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(2);
    });

    expect(getTransactionMonthAggregate).toHaveBeenCalledTimes(2);
    expect(getTransactionMonthAggregate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        search: 'coffee',
        type: TransactionType.Expense,
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        accountIds: ['acc-1'],
      }),
    );
    expect(getTransactionMonthAggregate).toHaveBeenCalledWith(expect.anything(), {
      dateFrom: '2026-06-01',
      dateTo: '2026-06-30',
      accountIds: ['acc-1'],
    });
    expect(result.current.state.totals?.current).toBe(heldCurrent);
    expect(result.current.state.totals?.previous).toBe(heldPrevious);
  });

  it('does not publish an aggregate for a key the controls left', async () => {
    let resolveLeft: ((aggregate: TransactionMonthAggregate) => void) | undefined;
    jest.mocked(getTransactionMonthAggregate).mockImplementation((_db, query) => {
      if (query.search === 'rent' && query.dateFrom === '2026-07-01') {
        return new Promise<TransactionMonthAggregate>((resolve) => {
          resolveLeft = resolve;
        });
      }
      return Promise.resolve({ ...EMPTY_AGGREGATE, matchCount: query.search === 'rental' ? 5 : 0 });
    });
    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('rent');
    });
    await waitFor(() => expect(resolveLeft).toBeDefined());
    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('rental');
    });
    await waitFor(() => {
      expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(5);
    });

    await act(async () => {
      resolveLeft?.({
        ...EMPTY_AGGREGATE,
        matchCount: 9,
        scoped: { incomeEgp: 700, expenseEgp: 100, netEgp: 600 },
      });
      await Promise.resolve();
    });

    expect(useTransactionsScreenStore.getState().totals).toMatchObject({
      current: EMPTY_TOTALS,
      matchCount: 5,
    });
    expect(useTransactionsScreenStore.getState().totalsQueryKey).toBe(
      getTransactionQueryKey({ ...JULY_QUERY, search: 'rental' }),
    );
    expect(result.current.state.totalsStatus).toBe('ready');
  });

  it('clears loaded totals while a new month is loading', async () => {
    const initialCurrent = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    const initialPrevious = { incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 };
    jest
      .mocked(getTransactionMonthAggregate)
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialCurrent })
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialPrevious })
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
      .mocked(getTransactionMonthAggregate)
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialCurrent })
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialPrevious });

    const first = await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(first.result.current.state.totals).toMatchObject({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });

    await first.unmount();
    jest.mocked(getTransactionMonthAggregate).mockReturnValue(new Promise(() => {}));

    const second = await renderHook(() => useTransactions());

    expect(second.result.current.state.totals).toMatchObject({
      current: initialCurrent,
      previous: initialPrevious,
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(second.result.current.state.totals).toMatchObject({
      current: initialCurrent,
      previous: initialPrevious,
    });
  });

  it('exposes a first-load totals error without writing financial zeroes', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(getTransactionMonthAggregate).mockRejectedValue(new Error('db down'));

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
      .mocked(getTransactionMonthAggregate)
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialCurrent })
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialPrevious })
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: refreshedCurrent })
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: refreshedPrevious });

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals).toMatchObject({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });
    jest.mocked(getTransactionMonthAggregate).mockClear();

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(getTransactionMonthAggregate).toHaveBeenCalledTimes(2);
    expect(result.current.state.totals).toMatchObject({
      current: refreshedCurrent,
      previous: refreshedPrevious,
    });
  });
});

describe('useTransactions query ownership', () => {
  beforeEach(() => {
    jest.mocked(getTransactionMonthAggregate).mockReturnValue(new Promise(() => {}));
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
    expect(result.current.state.refreshing).toBe(false);
    expect(result.current.state.showInitialSkeleton).toBe(false);
  });

  it('MA-089: shows the refresh indicator only while a user pull is in flight', async () => {
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);
    setupStores({ transactions: [TRANSACTION], status: 'refreshing' });
    let resolveRefresh!: () => void;
    refresh.mockReturnValue(
      new Promise<void>((resolve) => {
        resolveRefresh = resolve;
      }),
    );
    const { result } = await renderHook(() => useTransactions());

    let pull: Promise<void> | undefined;
    await act(() => {
      pull = result.current.onRefresh();
    });

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.refreshing).toBe(true);

    await act(async () => {
      resolveRefresh();
      await pull;
    });

    expect(result.current.state.refreshing).toBe(false);
  });

  it('MA-089: shows the refresh indicator while a tapped Retry refetches the loaded rows', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'refreshErrorWithData' });
    let resolveRetry!: () => void;
    retry.mockImplementation(() => {
      transactionStoreState = { ...transactionStoreState, status: 'refreshing' };
      return new Promise<void>((resolve) => {
        resolveRetry = resolve;
      });
    });
    const { result } = await renderHook(() => useTransactions());
    expect(result.current.state.refreshing).toBe(false);

    let tapped: Promise<void> | undefined;
    await act(() => {
      tapped = result.current.retryFailedLoads();
    });

    expect(retry).toHaveBeenCalledTimes(1);
    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.refreshing).toBe(true);

    await act(async () => {
      resolveRetry();
      await tapped;
    });

    expect(result.current.state.refreshing).toBe(false);
  });

  it('MA-089: a totals-only Retry leaves the flag of a pull in flight alone', async () => {
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);
    setupStores({ transactions: [TRANSACTION], status: 'refreshing' });
    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    await act(() => {
      useTransactionsState.getState().failTotalsLoad(true);
      useTransactionsState.getState().setUserRefreshing(true);
    });
    expect(result.current.state.totalsStatus).toBe('refreshErrorWithData');
    expect(result.current.state.refreshing).toBe(true);

    await act(() => result.current.retryFailedLoads());

    expect(retry).not.toHaveBeenCalled();
    expect(useTransactionsState.getState().userRefreshing).toBe(true);
    expect(result.current.state.refreshing).toBe(true);
  });

  it('MA-089: holds three loaded pages and their offset across a detail round-trip', async () => {
    const julyKey = getTransactionQueryKey(JULY_QUERY);
    const loaded: Transaction[] = Array.from({ length: 90 }, (_, i) => ({
      ...TRANSACTION,
      id: `tx-${i}`,
      transaction_date: `2026-07-${String(30 - Math.floor(i / 3)).padStart(2, '0')}`,
    }));
    const loadedIds = loaded.map((tx) => tx.id);
    setupStores({ transactions: loaded, status: 'ready', hasMore: true });
    const scrollTo = jest.fn();
    const { result, rerender } = await renderHook(
      (_props: Record<string, never>) => useTransactions(),
      { initialProps: {} },
    );
    Object.defineProperty(result.current.state.listRef, 'current', {
      configurable: true,
      value: { getScrollResponder: () => ({ scrollTo }) },
    });

    let cleanup: void | (() => void) = undefined;
    await act(() => {
      cleanup = mockFocusEffectCallback?.();
    });
    await act(() => {
      result.current.onListScrollEnd({ nativeEvent: { contentOffset: { y: 2400 } } });
    });
    await act(() => cleanup?.());

    expect(setQuery).toHaveBeenCalledWith(JULY_QUERY);
    expect(setQuery).not.toHaveBeenCalledWith(expect.not.objectContaining(JULY_QUERY));
    expect(transactionStoreState.reset).not.toHaveBeenCalled();
    expect(useTransactionsState.getState()).toMatchObject({
      scrollQueryKey: julyKey,
      scrollOffset: 2400,
    });
    refresh.mockClear();

    await act(() => {
      mockFocusEffectCallback?.();
    });

    await waitFor(() => {
      expect(scrollTo).toHaveBeenCalledWith({ y: 2400, animated: false });
    });
    expect(scrollTo).not.toHaveBeenCalledWith({ y: 0, animated: false });

    await act(async () => {
      await mockInteractionTasks[mockInteractionTasks.length - 1]?.callback();
    });

    expect(refresh).toHaveBeenCalledTimes(1);

    transactionStoreState = {
      ...transactionStoreState,
      transactions: loaded.map((tx) => ({ ...tx })),
      replacementRequestId: 2,
    };
    await rerender({});

    const shownIds = result.current.state.sections.flatMap((section) =>
      section.data.map((tx) => tx.id),
    );
    expect(shownIds).toEqual(loadedIds);
    expect(result.current.state.hasMore).toBe(true);
    expect(scrollTo).not.toHaveBeenCalledWith({ y: 0, animated: false });

    await act(() => {
      result.current.setSelectedMonth('2026-06');
    });

    expect(scrollTo).toHaveBeenCalledWith({ y: 0, animated: false });
    expect(setQuery).toHaveBeenCalledWith(JUNE_QUERY);
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
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expect(getTransactionMonthAggregate).toHaveBeenCalledTimes(2));
    expect(mockFocusEffectCallback).toBeDefined();

    let firstCleanup: void | (() => void) = undefined;
    await act(() => {
      firstCleanup = mockFocusEffectCallback?.();
    });
    await act(() => firstCleanup?.());
    refresh.mockClear();
    jest.mocked(getTransactionMonthAggregate).mockClear();

    await act(() => {
      mockFocusEffectCallback?.();
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(getTransactionMonthAggregate).not.toHaveBeenCalled();

    await act(async () => {
      await mockInteractionTasks[1]?.callback();
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
      expect(getTransactionMonthAggregate).toHaveBeenCalledTimes(2);
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
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expect(getTransactionMonthAggregate).toHaveBeenCalledTimes(2));
    let firstCleanup: void | (() => void) = undefined;
    await act(() => {
      firstCleanup = mockFocusEffectCallback?.();
      firstCleanup?.();
    });
    refresh.mockClear();
    jest.mocked(getTransactionMonthAggregate).mockClear();

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
      const julyKey = getTransactionQueryKey(JULY_QUERY);
      const requestId = totalsStore.beginTotalsRequest(julyKey, '2026-07', true);
      useTransactionsState.getState().beginTotalsLoad(true);
      totalsStore.resolveTotals(julyKey, requestId, {
        current: EMPTY_TOTALS,
        previous: EMPTY_TOTALS,
        days: [],
        matchCount: 0,
        matchNetEgp: 0,
      });
      useTransactionsState.getState().resolveTotalsLoad();
    });

    await act(async () => {
      await mockInteractionTasks[1]?.callback();
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(getTransactionMonthAggregate).not.toHaveBeenCalled();
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
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expect(getTransactionMonthAggregate).toHaveBeenCalledTimes(2));
    refresh.mockClear();
    jest.mocked(getTransactionMonthAggregate).mockClear();

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
    expect(getTransactionMonthAggregate).not.toHaveBeenCalled();
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
    jest.mocked(getTransactionMonthAggregate).mockRejectedValue(new Error('totals unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
    expect(result.current.state.showFirstLoadError).toBe(true);
    expect(result.current.state.loadErrorVariant).toBe('none');
    consoleSpy.mockRestore();
  });

  it('distinguishes a first totals load failure from a refresh failure', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    jest.mocked(getTransactionMonthAggregate).mockRejectedValue(new Error('totals unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
    expect(result.current.state.loadErrorVariant).toBe('totals');
    consoleSpy.mockRestore();
  });

  it('floats the account lookup error over a row with an unresolved account and retries the lookup', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' }, { accountLookupError: true });
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
    expect(result.current.state.loadErrorVariant).toBe('accounts');
    loadAccountLookup.mockClear();
    await act(() => result.current.retryFailedLoads());

    expect(loadAccountLookup).toHaveBeenCalledTimes(1);
    expect(loadAccountLookup).toHaveBeenCalledWith(['account-1']);
  });

  it('does not float the account lookup error when every visible row resolved its accounts', async () => {
    setupStores(
      { transactions: [TRANSACTION], status: 'ready' },
      { accountLookupError: true, accountLookupById: { 'account-1': makeTestAccount() } },
    );
    jest.mocked(getTransactionMonthAggregate).mockResolvedValue(EMPTY_AGGREGATE);

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
    expect(result.current.state.loadErrorVariant).toBe('none');
  });
});
