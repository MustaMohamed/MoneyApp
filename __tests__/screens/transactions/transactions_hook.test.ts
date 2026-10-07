import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type {
  PeriodTotals,
  TransactionAggregateQuery,
  TransactionMonthAggregate,
  TransactionTotalsScope,
} from '@/modules/transactions/database/transactions';
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
import { makeTestAccount, makeTestCategory } from '@/test_helpers/transaction';

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

const mockGetMonthAggregate = jest.fn<
  Promise<TransactionMonthAggregate>,
  [TransactionAggregateQuery]
>();
const mockGetScopedTotals = jest.fn<Promise<PeriodTotals>, [TransactionTotalsScope]>();
const mockGetAll = jest.fn<Promise<Transaction[]>, [query?: { limit?: number }]>();
const mockToast = { show: jest.fn() };

jest.mock('@/modules/transactions/repositories/transaction.repository', () => ({
  ...jest.requireActual<object>('@/modules/transactions/repositories/transaction.repository'),
  transactionRepository: {
    getAll: (query?: { limit?: number }) => mockGetAll(query),
    getMonthAggregate: (query: TransactionAggregateQuery) => mockGetMonthAggregate(query),
    getScopedTotals: (scope: TransactionTotalsScope) => mockGetScopedTotals(scope),
  },
}));

// The wrapper, not HeroUI, so `show` sees exactly what the hook passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
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

function expectFullTotalsLoads(times: number): void {
  expect(mockGetMonthAggregate).toHaveBeenCalledTimes(times);
  expect(mockGetScopedTotals).toHaveBeenCalledTimes(times);
}

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
  mockGetMonthAggregate.mockReset();
  mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);
  mockGetScopedTotals.mockReset();
  mockGetScopedTotals.mockResolvedValue(EMPTY_TOTALS);
  mockGetAll.mockReset();
  mockGetAll.mockResolvedValue([]);
  mockToast.show.mockReset();
});

describe('useTransactions screen orchestration', () => {
  beforeEach(() => {
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
  });

  it('owns opening the global add transaction form', async () => {
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.openAddTransaction());

    expect(mockOpenAdd).toHaveBeenCalledTimes(1);
    // Bare: the transactions screen's own opener preselects no account.
    expect(mockOpenAdd).toHaveBeenCalledWith();
  });

  it('owns the delete confirmation lifecycle', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    expect(result.current.state.pendingDeleteId).toBe('tx-1');

    await act(async () => result.current.confirmDelete());

    expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    expect(result.current.state.pendingDeleteId).toBeNull();
  });

  it('MA-053: keeps the delete pending and names the archived account when the delete is refused', async () => {
    setupStores({
      transactions: [TRANSACTION],
      status: 'ready',
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
    setupStores({
      transactions: [TRANSACTION],
      status: 'ready',
      deleteTransaction: jest.fn().mockRejectedValue(new Error('write failed')),
    });
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    await act(async () => result.current.confirmDelete());

    expect(result.current.state.deleteErrorMessage).toBe(Strings.errDeleteFailed);
  });

  it('MA-062: names a blank-named account "Unnamed account" in the hero title', async () => {
    setupStores({}, { accounts: [makeTestAccount({ id: 'account-1', name: '' })] });
    const { result } = await renderHook(() => useTransactions());

    await act(() => {
      useTransactionsScreenStore
        .getState()
        .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['account-1'] });
    });

    expect(result.current.state.hero.title).toBe(
      Strings.transactionsHeroTitleScoped(Strings.unnamedAccount),
    );
    expect(result.current.state.accountsById.get('account-1')?.name).toBe('');
  });
});

describe('useTransactions monthly totals', () => {
  it("reloads the aggregate under the new key and keeps the scoped totals' identity", async () => {
    const current = { incomeEgp: 22300, expenseEgp: 9400, netEgp: 12900 };
    const previous = { incomeEgp: 0, expenseEgp: 9400, netEgp: -9400 };
    mockGetMonthAggregate.mockImplementation(async (query) => ({
      ...EMPTY_AGGREGATE,
      matchCount: query.search === 'coffee' ? 2 : 0,
      scoped: { ...(query.dateFrom === '2026-07-01' ? current : previous) },
    }));
    mockGetScopedTotals.mockImplementation(async () => ({ ...previous }));
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
      expect(mockGetMonthAggregate).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.Expense, accountIds: ['acc-1'] }),
      );
      expect(result.current.state.totalsStatus).toBe('ready');
      expect(result.current.state.totals).toMatchObject({ current, previous });
    });
    const heldCurrent = result.current.state.totals?.current;
    const heldPrevious = result.current.state.totals?.previous;
    mockGetMonthAggregate.mockClear();
    mockGetScopedTotals.mockClear();

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() => {
      expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(2);
    });

    expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
    expect(mockGetMonthAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        search: 'coffee',
        type: TransactionType.Expense,
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
        accountIds: ['acc-1'],
      }),
    );
    expect(mockGetScopedTotals).not.toHaveBeenCalled();
    expect(result.current.state.totals?.current).toBe(heldCurrent);
    expect(result.current.state.totals?.previous).toBe(heldPrevious);
  });

  it('does not publish an aggregate for a key the controls left', async () => {
    let resolveLeft: ((aggregate: TransactionMonthAggregate) => void) | undefined;
    mockGetMonthAggregate.mockImplementation((query) => {
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
    mockGetMonthAggregate
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialCurrent })
      .mockReturnValue(new Promise(() => {}));
    mockGetScopedTotals.mockResolvedValueOnce(initialPrevious);

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
    mockGetMonthAggregate.mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialCurrent });
    mockGetScopedTotals.mockResolvedValueOnce(initialPrevious);

    const first = await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(first.result.current.state.totals).toMatchObject({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });

    await first.unmount();
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

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
    mockGetMonthAggregate.mockRejectedValue(new Error('db down'));

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
    mockGetMonthAggregate
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: initialCurrent })
      .mockResolvedValueOnce({ ...EMPTY_AGGREGATE, scoped: refreshedCurrent });
    mockGetScopedTotals
      .mockResolvedValueOnce(initialPrevious)
      .mockResolvedValueOnce(refreshedPrevious);

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals).toMatchObject({
        current: initialCurrent,
        previous: initialPrevious,
      });
    });
    mockGetMonthAggregate.mockClear();
    mockGetScopedTotals.mockClear();

    await act(async () => {
      await result.current.onRefresh();
    });

    expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
    expect(mockGetScopedTotals).toHaveBeenCalledTimes(1);
    expect(result.current.state.totals).toMatchObject({
      current: refreshedCurrent,
      previous: refreshedPrevious,
    });
  });

  describe('hero model', () => {
    const JULY = { incomeEgp: 22300, expenseEgp: 9400, netEgp: 12900 };
    const JUNE = { incomeEgp: 20000, expenseEgp: 16900, netEgp: 3100 };

    function serveFigures(): void {
      mockGetMonthAggregate.mockImplementation(async (query) => ({
        ...EMPTY_AGGREGATE,
        matchCount: query.search === 'coffee' ? 2 : 0,
        scoped: { ...JULY },
      }));
      mockGetScopedTotals.mockImplementation(async () => ({ ...JUNE }));
    }

    it('M25: keeps its identity across a search keystroke', async () => {
      serveFigures();
      const { result } = await renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
      const held = result.current.state.hero;
      expect(held).toMatchObject({ mode: 'figures', out: '9,400' });
      mockGetMonthAggregate.mockClear();

      await act(() => {
        useTransactionsScreenStore.getState().setSearchQuery('coffee');
      });
      await waitFor(() => {
        expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(2);
        expect(result.current.state.totalsStatus).toBe('ready');
      });

      expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
      expect(result.current.state.hero).toBe(held);
    });

    it('keeps its identity across a type tab switch', async () => {
      serveFigures();
      const { result } = await renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
      const held = result.current.state.hero;
      expect(held).toMatchObject({ mode: 'figures', out: '9,400' });
      mockGetMonthAggregate.mockClear();

      await act(() => {
        useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
      });
      await waitFor(() => {
        expect(mockGetMonthAggregate).toHaveBeenCalledWith(
          expect.objectContaining({ type: TransactionType.Expense }),
        );
        expect(result.current.state.totalsStatus).toBe('ready');
      });

      expect(result.current.state.hero).toBe(held);
    });

    it('titles itself with the one filtered account, and plainly for two', async () => {
      setupStores(
        {},
        {
          accounts: [
            makeTestAccount({ id: 'acc-1', name: 'Wallet' }),
            makeTestAccount({ id: 'acc-2', name: 'Bank' }),
          ],
        },
      );
      const { result } = await renderHook(() => useTransactions());

      await act(() => {
        useTransactionsScreenStore
          .getState()
          .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1'] });
      });
      await waitFor(() =>
        expect(result.current.state.hero).toMatchObject({ title: 'Out this month · Wallet' }),
      );

      await act(() => {
        useTransactionsScreenStore
          .getState()
          .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1', 'acc-2'] });
      });
      await waitFor(() =>
        expect(result.current.state.hero).toMatchObject({ title: 'Out this month' }),
      );
    });

    it('is a skeleton and disables the search while the month loads', async () => {
      mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

      const { result } = await renderHook(() => useTransactions());

      expect(result.current.state.hero).toMatchObject({ mode: 'skeleton' });
      expect(result.current.state.searchDisabled).toBe(true);
    });

    it('prints dashes over the kept rows when the first load fails, the search live', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      setupStores({ transactions: [TRANSACTION], status: 'ready' });
      mockGetMonthAggregate.mockRejectedValue(new Error('db down'));

      const { result } = await renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));

      expect(result.current.state.hero).toMatchObject({ mode: 'dashes', out: '—' });
      expect(result.current.state.loadErrorVariant).toBe('totals');
      expect(result.current.state.searchDisabled).toBe(false);
      expect(result.current.state.sections).toHaveLength(1);
      consoleSpy.mockRestore();
    });

    it.each<[string, () => void]>([
      ['a search keystroke', () => useTransactionsScreenStore.getState().setSearchQuery('c')],
      [
        'a type tab',
        () => useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense),
      ],
    ])(
      'keeps the dashes and the search live while %s reloads a failed month',
      async (_, change) => {
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
        setupStores({ transactions: [TRANSACTION], status: 'ready' });
        mockGetMonthAggregate.mockRejectedValueOnce(new Error('db down'));

        const { result } = await renderHook(() => useTransactions());
        await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
        expect(result.current.state.hero.mode).toBe('dashes');
        mockGetMonthAggregate.mockClear();
        mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

        await act(() => {
          change();
        });
        await waitFor(() => {
          expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
          expect(result.current.state.totalsStatus).toBe('initialLoading');
        });

        expect(result.current.state.hero.mode).toBe('dashes');
        expect(result.current.state.searchDisabled).toBe(false);
        consoleSpy.mockRestore();
      },
    );

    it('shows the skeleton when the account scope changes after a failed first load', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      setupStores({ transactions: [TRANSACTION], status: 'ready' });
      mockGetMonthAggregate.mockRejectedValueOnce(new Error('db down'));

      const { result } = await renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
      mockGetMonthAggregate.mockClear();
      mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

      await act(() => {
        useTransactionsScreenStore
          .getState()
          .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1'] });
      });
      await waitFor(() => expect(result.current.state.totalsStatus).toBe('initialLoading'));

      expect(result.current.state.hero.mode).toBe('skeleton');
      expect(result.current.state.searchDisabled).toBe(true);
      consoleSpy.mockRestore();
    });

    it('keeps the figures on screen and floats the figures alert when a refresh fails', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      let failing = false;
      mockGetMonthAggregate.mockImplementation(async () => {
        if (failing) throw new Error('db down');
        return { ...EMPTY_AGGREGATE, scoped: { ...JULY } };
      });
      mockGetScopedTotals.mockImplementation(async () => ({ ...JUNE }));
      const { result } = await renderHook(() => useTransactions());
      await waitFor(() =>
        expect(result.current.state.hero).toMatchObject({ mode: 'figures', out: '9,400' }),
      );

      failing = true;
      await act(async () => {
        await result.current.onRefresh();
      });

      expect(result.current.state.totalsStatus).toBe('refreshErrorWithData');
      expect(result.current.state.hero).toMatchObject({ mode: 'figures', out: '9,400' });
      expect(result.current.state.loadErrorVariant).toBe('totals');
      consoleSpy.mockRestore();
    });
  });
});

describe('useTransactions previous-month and key-driven loads', () => {
  async function renderReady() {
    const rendered = await renderHook((_props: Record<string, never>) => useTransactions(), {
      initialProps: {},
    });
    await waitFor(() => expect(rendered.result.current.state.totalsStatus).toBe('ready'));
    mockGetMonthAggregate.mockClear();
    mockGetScopedTotals.mockClear();
    return rendered;
  }

  it('an accounts filter change re-fetches the previous month under that filter', async () => {
    const { result } = await renderReady();

    await act(() => {
      useTransactionsScreenStore
        .getState()
        .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1'] });
    });
    await waitFor(() => expect(mockGetScopedTotals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
    expect(mockGetScopedTotals).toHaveBeenCalledWith(
      expect.objectContaining({
        dateFrom: '2026-06-01',
        dateTo: '2026-06-30',
        accountIds: ['acc-1'],
      }),
    );
  });

  it('a write re-fetches the previous month', async () => {
    const { result, rerender } = await renderReady();

    transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
    await rerender({});
    await waitFor(() => expect(mockGetScopedTotals).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
  });

  it('a failed search load keeps the refresh banner and the previous key on the held data', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const { result } = await renderReady();
    mockGetMonthAggregate.mockRejectedValueOnce(new Error('db down'));

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('refreshErrorWithData'));

    expect(useTransactionsScreenStore.getState().totals?.queryKey).toBe(
      getTransactionQueryKey(JULY_QUERY),
    );
    consoleSpy.mockRestore();
  });

  it('a whitespace-only search change does not reload the aggregate', async () => {
    const { result } = await renderReady();
    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('food');
    });
    await waitFor(() => expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
    mockGetMonthAggregate.mockClear();

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('food ');
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(mockGetMonthAggregate).not.toHaveBeenCalled();
  });
});

describe('useTransactions query ownership', () => {
  beforeEach(() => {
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
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
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);
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
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);
    setupStores({ transactions: [TRANSACTION], status: 'refreshing' });
    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    await act(() => {
      useTransactionsState.getState().failTotalsLoad(true, '2026-09|[]');
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
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expectFullTotalsLoads(1));
    expect(mockFocusEffectCallback).toBeDefined();

    let firstCleanup: void | (() => void) = undefined;
    await act(() => {
      firstCleanup = mockFocusEffectCallback?.();
    });
    await act(() => firstCleanup?.());
    refresh.mockClear();
    mockGetMonthAggregate.mockClear();
    mockGetScopedTotals.mockClear();

    await act(() => {
      mockFocusEffectCallback?.();
    });

    expect(refresh).not.toHaveBeenCalled();
    expect(mockGetMonthAggregate).not.toHaveBeenCalled();

    await act(async () => {
      await mockInteractionTasks[1]?.callback();
    });

    await waitFor(() => {
      expect(refresh).toHaveBeenCalledTimes(1);
      expectFullTotalsLoads(1);
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
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expectFullTotalsLoads(1));
    let firstCleanup: void | (() => void) = undefined;
    await act(() => {
      firstCleanup = mockFocusEffectCallback?.();
      firstCleanup?.();
    });
    refresh.mockClear();
    mockGetMonthAggregate.mockClear();
    mockGetScopedTotals.mockClear();

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
      const requestId = totalsStore.beginTotalsRequest(julyKey, '2026-07', undefined, true);
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
    expect(mockGetMonthAggregate).not.toHaveBeenCalled();
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
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);
    transactionStoreState = {
      ...transactionStoreState,
      transactions: [TRANSACTION],
      status: 'ready',
    };
    await renderHook(() => useTransactions());

    await waitFor(() => expectFullTotalsLoads(1));
    refresh.mockClear();
    mockGetMonthAggregate.mockClear();
    mockGetScopedTotals.mockClear();

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
    expect(mockGetMonthAggregate).not.toHaveBeenCalled();
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
    mockGetMonthAggregate.mockRejectedValue(new Error('totals unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
    expect(result.current.state.showFirstLoadError).toBe(true);
    expect(result.current.state.loadErrorVariant).toBe('none');
    consoleSpy.mockRestore();
  });

  it('distinguishes a first totals load failure from a refresh failure', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    mockGetMonthAggregate.mockRejectedValue(new Error('totals unavailable'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));
    expect(result.current.state.loadErrorVariant).toBe('totals');
    consoleSpy.mockRestore();
  });

  it('floats the account lookup error over a row with an unresolved account and retries the lookup', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' }, { accountLookupError: true });
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);

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
    mockGetMonthAggregate.mockResolvedValue(EMPTY_AGGREGATE);

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
    expect(result.current.state.loadErrorVariant).toBe('none');
  });
});

describe('useTransactions account chips', () => {
  const WALLET = makeTestAccount({ id: 'acc-1', name: 'Wallet' });
  const BANK = makeTestAccount({ id: 'acc-2', name: 'Bank' });
  const OLD_CARD = makeTestAccount({ id: 'acc-9', name: 'Old card', is_archived: 1 });

  function setupAccounts(
    transactionOverrides: Record<string, unknown> = {},
    accountOverrides: Record<string, unknown> = {},
  ): void {
    setupStores(transactionOverrides, {
      accounts: [WALLET, BANK],
      archivedAccounts: [OLD_CARD],
      hasLoaded: true,
      ...accountOverrides,
    });
  }

  function emptySnapshotFor(query: Record<string, unknown>): Record<string, unknown> {
    const key = getTransactionQueryKey({ ...JULY_QUERY, ...query });
    return { transactions: [], status: 'empty', queryKey: key, snapshotKey: key };
  }

  function selectedLabels(chips: readonly { label: string; selected: boolean }[]): string[] {
    return chips.filter((chip) => chip.selected).map((chip) => chip.label);
  }

  function appliedAccountIds(): string[] {
    return useTransactionsScreenStore.getState().appliedFilters.accountIds;
  }

  function aggregateCallsCarrying(accountId: string): number {
    return mockGetMonthAggregate.mock.calls.filter(([query]) =>
      query.accountIds?.includes(accountId),
    ).length;
  }

  it('lists All accounts first and on, then one chip per active account', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());

    expect(result.current.state.accountChips.map((chip) => chip.label)).toEqual([
      Strings.filterAllAccounts,
      'Wallet',
      'Bank',
    ]);
    expect(selectedLabels(result.current.state.accountChips)).toEqual([Strings.filterAllAccounts]);
  });

  it('a chip tap applies that one account, scopes the hero and leaves the funnel at 0', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.toggleAccountChip('acc-1'));

    expect(appliedAccountIds()).toEqual(['acc-1']);
    expect(selectedLabels(result.current.state.accountChips)).toEqual(['Wallet']);
    expect(result.current.state.activeFilterCount).toBe(0);
    expect(result.current.state.hero).toMatchObject({ title: 'Out this month · Wallet' });
    await waitFor(() =>
      expect(mockGetMonthAggregate).toHaveBeenCalledWith(
        expect.objectContaining({ accountIds: ['acc-1'] }),
      ),
    );
  });

  it('tapping the on chip clears it and All accounts is on', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());
    await act(() => result.current.toggleAccountChip('acc-1'));

    await act(() => result.current.toggleAccountChip('acc-1'));

    expect(appliedAccountIds()).toEqual([]);
    expect(selectedLabels(result.current.state.accountChips)).toEqual([Strings.filterAllAccounts]);
    expect(result.current.state.hero).toMatchObject({ title: 'Out this month' });
  });

  it('tapping All accounts clears two accounts the sheet applied and keeps the rest', async () => {
    setupAccounts();
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1', 'acc-2'], categoryIds: ['c1'] });
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.toggleAccountChip(undefined));

    expect(useTransactionsScreenStore.getState().appliedFilters).toMatchObject({
      accountIds: [],
      categoryIds: ['c1'],
    });
    expect(selectedLabels(result.current.state.accountChips)).toEqual([Strings.filterAllAccounts]);
  });

  it('one account applied from the sheet lights that chip', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());

    await act(() => {
      useTransactionsScreenStore
        .getState()
        .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-2'] });
    });

    expect(selectedLabels(result.current.state.accountChips)).toEqual(['Bank']);
    expect(result.current.state.activeFilterCount).toBe(0);
  });

  it('two accounts applied from the sheet light no chip and count 1 on the funnel', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());

    await act(() => {
      useTransactionsScreenStore
        .getState()
        .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1', 'acc-2'] });
    });

    expect(selectedLabels(result.current.state.accountChips)).toEqual([]);
    expect(result.current.state.activeFilterCount).toBe(1);
  });

  it('See all from an account detail arrives with that chip on', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());

    await act(() => {
      useTransactionsScreenStore.getState().seedAccountFilter('acc-1', '2026-07');
    });

    expect(selectedLabels(result.current.state.accountChips)).toEqual(['Wallet']);
    expect(result.current.state.activeFilterCount).toBe(0);
  });

  it('drops the only applied account once archived: All accounts on, plain title, no count', async () => {
    setupAccounts();
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-9'] });

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(appliedAccountIds()).toEqual([]));
    expect(selectedLabels(result.current.state.accountChips)).toEqual([Strings.filterAllAccounts]);
    expect(result.current.state.hero).toMatchObject({ title: 'Out this month' });
    expect(result.current.state.activeFilterCount).toBe(0);
    expect(aggregateCallsCarrying('acc-9')).toBe(0);
  });

  it('drops the only applied account once deleted, in neither account list', async () => {
    setupAccounts();
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-gone'] });

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(appliedAccountIds()).toEqual([]));
    expect(selectedLabels(result.current.state.accountChips)).toEqual([Strings.filterAllAccounts]);
    expect(result.current.state.hero).toMatchObject({ title: 'Out this month' });
    expect(result.current.state.activeFilterCount).toBe(0);
    expect(aggregateCallsCarrying('acc-gone')).toBe(0);
  });

  it('keeps the other account on when one of two applied is archived', async () => {
    setupAccounts();
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1', 'acc-9'] });

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(appliedAccountIds()).toEqual(['acc-1']));
    expect(selectedLabels(result.current.state.accountChips)).toEqual(['Wallet']);
    expect(result.current.state.hero).toMatchObject({ title: 'Out this month · Wallet' });
    expect(result.current.state.activeFilterCount).toBe(0);
    expect(aggregateCallsCarrying('acc-9')).toBe(0);
  });

  it('leaves the applied ids alone until the account store has loaded', async () => {
    setupAccounts({}, { hasLoaded: false });
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-9'] });

    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(mockGetMonthAggregate).toHaveBeenCalled());

    expect(appliedAccountIds()).toEqual(['acc-9']);
    expect(result.current.state.accountChips).toHaveLength(3);
    expect(selectedLabels(result.current.state.accountChips)).toEqual([]);
  });

  it('one chip on with no rows for that account shows no results, not no transactions', async () => {
    setupAccounts(emptySnapshotFor({ accountIds: ['acc-1'] }));
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.toggleAccountChip('acc-1'));

    expect(result.current.state.emptyVariant).toBe('noResults');
    expect(result.current.state.activeFilterCount).toBe(0);
  });

  it('no transactions with nothing on shows the no-transactions state and no funnel count', async () => {
    setupAccounts(emptySnapshotFor({}));
    const { result } = await renderHook(() => useTransactions());
    await act(() => result.current.toggleAccountChip('acc-1'));

    await act(() => result.current.toggleAccountChip(undefined));

    await waitFor(() => expect(result.current.state.emptyVariant).toBe('noData'));
    expect(result.current.state.activeFilterCount).toBe(0);
  });

  it('a sheet filter matching nothing keeps its funnel count beside one chip on', async () => {
    setupAccounts(emptySnapshotFor({ accountIds: ['acc-1'], categoryIds: ['c1'] }));
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1'], categoryIds: ['c1'] });

    const { result } = await renderHook(() => useTransactions());

    expect(result.current.state.emptyVariant).toBe('noResults');
    expect(result.current.state.activeFilterCount).toBe(1);
    expect(selectedLabels(result.current.state.accountChips)).toEqual(['Wallet']);
  });

  it('keeps the chips identity across a search keystroke and a type tab switch', async () => {
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());
    const held = result.current.state.accountChips;
    expect(held).toHaveLength(3);

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    expect(result.current.state.accountChips).toBe(held);

    await act(() => {
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    });
    expect(result.current.state.accountChips).toBe(held);
  });

  it('a chip tap moves the selection while the month is still loading', async () => {
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
    setupAccounts();
    const { result } = await renderHook(() => useTransactions());
    expect(result.current.state.hero).toMatchObject({ mode: 'skeleton' });

    await act(() => result.current.toggleAccountChip('acc-2'));

    expect(selectedLabels(result.current.state.accountChips)).toEqual(['Bank']);
    expect(appliedAccountIds()).toEqual(['acc-2']);
  });
});

describe('useTransactions search tally', () => {
  const WALLET = makeTestAccount({ id: 'acc-1', name: 'Wallet' });
  const BANK = makeTestAccount({ id: 'acc-2', name: 'Bank' });
  const FOOD = makeTestCategory({ id: 'cat-1', name: 'Food' });
  const JULY = { incomeEgp: 22300, expenseEgp: 9400, netEgp: 12900 };

  function setupNamed(): void {
    setupStores({}, { accounts: [WALLET, BANK], hasLoaded: true });
    attachMockSelectorStore(useCategoryStore, () => ({ categories: [FOOD] }));
  }

  function serveMatches(byQuery: (query: TransactionAggregateQuery) => [number, number]): void {
    mockGetMonthAggregate.mockImplementation(async (query) => {
      const [matchCount, matchNetEgp] = byQuery(query);
      return { ...EMPTY_AGGREGATE, matchCount, matchNetEgp, scoped: { ...JULY } };
    });
  }

  function applyBeforeMount(filters: Partial<typeof EMPTY_FILTERS>): void {
    useTransactionsScreenStore.getState().setAppliedFilters({ ...EMPTY_FILTERS, ...filters });
  }

  async function renderReady() {
    const rendered = await renderHook(() => useTransactions());
    await waitFor(() => expect(rendered.result.current.state.totalsStatus).toBe('ready'));
    return rendered;
  }

  it('a search reads its count and its signed EGP net, with no summary', async () => {
    setupNamed();
    serveMatches((query) => (query.search === 'coffee' ? [2, -2_100] : [45, -9_400]));
    const { result } = await renderReady();

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() => {
      expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(2);
      expect(result.current.state.totalsStatus).toBe('ready');
    });

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      count: '2',
      label: 'results in July',
      sum: { text: '−2,100', currencyCode: 'EGP' },
      filterSummary: undefined,
    });
  });

  it('one applied account with no search reads the figures and leaves its name to the hero title', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    applyBeforeMount({ accountIds: ['acc-1'] });

    const { result } = await renderReady();

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      count: '3',
      label: 'results in July',
      sum: { text: '−450' },
      filterSummary: undefined,
    });
  });

  it('two applied accounts are named in the tally', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    applyBeforeMount({ accountIds: ['acc-1', 'acc-2'] });

    const { result } = await renderReady();

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      filterSummary: 'Wallet, Bank',
    });
    expect(result.current.state).not.toHaveProperty('appliedFilterSummary');
  });

  it('one account plus a category reads the category alone', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    applyBeforeMount({ accountIds: ['acc-1'], categoryIds: ['cat-1'] });

    const { result } = await renderReady();

    expect(result.current.state.tally).toMatchObject({ mode: 'figures', filterSummary: 'Food' });
  });

  it('the applied account removed, with no search and no sheet filter, empties the slot', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    applyBeforeMount({ accountIds: ['acc-1'] });
    const { result } = await renderReady();
    expect(result.current.state.tally).toMatchObject({ mode: 'figures', count: '3' });

    await act(() => {
      useTransactionsScreenStore.getState().setAppliedFilters(EMPTY_FILTERS);
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    expect(result.current.state.tally).toMatchObject({
      mode: 'empty',
      count: undefined,
      sum: undefined,
      filterSummary: undefined,
    });
  });

  it('a type tab alone leaves the slot empty', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    const { result } = await renderReady();

    await act(() => {
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    });
    await waitFor(() => {
      expect(mockGetMonthAggregate).toHaveBeenCalledWith(
        expect.objectContaining({ type: TransactionType.Expense }),
      );
      expect(result.current.state.totalsStatus).toBe('ready');
    });

    expect(result.current.state.tally).toMatchObject({ mode: 'empty', count: undefined });
  });

  it('a whitespace-only search leaves the slot empty', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    const { result } = await renderReady();

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('   ');
    });

    expect(result.current.state.tally).toMatchObject({ mode: 'empty', count: undefined });
  });

  it('is a skeleton while the first load with one account applied is in flight', async () => {
    setupNamed();
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
    applyBeforeMount({ accountIds: ['acc-1'] });

    const { result } = await renderHook(() => useTransactions());

    expect(result.current.state.tally).toMatchObject({
      mode: 'skeleton',
      count: undefined,
      sum: undefined,
      filterSummary: undefined,
    });
  });

  it('reads the dash form with no sum when the first load with one account applied fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupNamed();
    mockGetMonthAggregate.mockRejectedValue(new Error('db down'));
    applyBeforeMount({ accountIds: ['acc-1'] });

    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));

    expect(result.current.state.tally).toMatchObject({
      mode: 'failed',
      count: '—',
      label: 'results in July',
      sum: undefined,
    });
    consoleSpy.mockRestore();
  });

  it("reads the dash form, not the month's held count, when a search load fails", async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupNamed();
    serveMatches(() => [45, -9_400]);
    const { result } = await renderReady();
    mockGetMonthAggregate.mockRejectedValueOnce(new Error('db down'));

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('refreshErrorWithData'));

    expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(45);
    expect(result.current.state.tally).toMatchObject({
      mode: 'failed',
      count: '—',
      sum: undefined,
    });
    expect(result.current.state.hero.mode).toBe('figures');
    consoleSpy.mockRestore();
  });

  it('keeps the held count and sum when a refresh of the same query fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupNamed();
    let failing = false;
    mockGetMonthAggregate.mockImplementation(async () => {
      if (failing) throw new Error('db down');
      return { ...EMPTY_AGGREGATE, matchCount: 2, matchNetEgp: -2_100, scoped: { ...JULY } };
    });
    useTransactionsScreenStore.getState().setSearchQuery('coffee');
    const { result } = await renderReady();
    expect(result.current.state.tally).toMatchObject({ mode: 'figures', count: '2' });

    failing = true;
    await act(async () => {
      await result.current.onRefresh();
    });

    expect(result.current.state.totalsStatus).toBe('refreshErrorWithData');
    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      count: '2',
      sum: { text: '−2,100' },
    });
    consoleSpy.mockRestore();
  });

  it('one account plus an amount floor reads the amount alone', async () => {
    setupNamed();
    serveMatches(() => [3, -450]);
    applyBeforeMount({ accountIds: ['acc-1'], amountMin: 500 });

    const { result } = await renderReady();

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      filterSummary: 'From 500 EGP',
    });
  });

  it("reads the skeleton, never the month's count, while a search load is in flight", async () => {
    setupNamed();
    serveMatches(() => [45, -9_400]);
    const { result } = await renderReady();
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() =>
      expect(mockGetMonthAggregate).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'coffee' }),
      ),
    );

    expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(45);
    expect(result.current.state.tally).toMatchObject({
      mode: 'skeleton',
      count: undefined,
      sum: undefined,
    });
    expect(result.current.state.hero.mode).toBe('figures');
    expect(result.current.state.searchDisabled).toBe(false);
  });

  it('reads the skeleton, never the held count, while a retry of a failed search load is in flight', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupNamed();
    serveMatches(() => [45, -9_400]);
    const { result } = await renderReady();
    mockGetMonthAggregate.mockRejectedValueOnce(new Error('db down'));

    await act(() => {
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('refreshErrorWithData'));
    expect(result.current.state.tally).toMatchObject({ mode: 'failed', count: '—' });

    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
    await act(() => {
      void result.current.retryTotals();
    });
    await waitFor(() => expect(result.current.state.totalsStatus).not.toBe('refreshErrorWithData'));

    expect(useTransactionsScreenStore.getState().totals?.matchCount).toBe(45);
    expect(result.current.state.tally).toMatchObject({
      mode: 'skeleton',
      count: undefined,
      sum: undefined,
    });
    consoleSpy.mockRestore();
  });

  it('keeps the held count while a refresh of the same query is in flight', async () => {
    setupNamed();
    serveMatches(() => [2, -2_100]);
    useTransactionsScreenStore.getState().setSearchQuery('coffee');
    const { result } = await renderReady();
    expect(result.current.state.tally).toMatchObject({ mode: 'figures', count: '2' });
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

    await act(() => {
      void result.current.onRefresh();
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('refreshing'));

    expect(result.current.state.tally).toMatchObject({
      mode: 'figures',
      count: '2',
      sum: { text: '−2,100' },
    });
  });
});

describe('useTransactions day sections', () => {
  const DAY = TRANSACTION.transaction_date;
  const COFFEE_KEY = getTransactionQueryKey({ ...JULY_QUERY, search: 'coffee' });
  const DASH = Strings.transactionsHeroUnavailable;

  function serveDay(netEgp: number, count: number): void {
    mockGetMonthAggregate.mockResolvedValue({
      ...EMPTY_AGGREGATE,
      days: [{ date: DAY, netEgp, count }],
      matchCount: count,
      matchNetEgp: netEgp,
    });
  }

  async function renderReadyRows() {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const rendered = await renderHook(() => useTransactions());
    await waitFor(() => expect(rendered.result.current.state.totalsStatus).toBe('ready'));
    return rendered;
  }

  async function searchCoffee(): Promise<void> {
    await act(() => {
      transactionStoreState.queryKey = COFFEE_KEY;
      transactionStoreState.snapshotKey = COFFEE_KEY;
      useTransactionsScreenStore.getState().setSearchQuery('coffee');
    });
    await waitFor(() =>
      expect(mockGetMonthAggregate).toHaveBeenCalledWith(
        expect.objectContaining({ search: 'coffee' }),
      ),
    );
  }

  it("reads the day's net and count from the month aggregate, not from its one loaded row", async () => {
    serveDay(-450, 3);
    const { result } = await renderReadyRows();

    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].data).toEqual([TRANSACTION]);
    expect(result.current.state.sections[0].figures).toEqual({
      mode: 'figures',
      net: '−450',
      currencyCode: 'EGP',
      count: '3',
    });
  });

  it("reads the skeleton, never the previous query's day net, while a search's aggregate is pending", async () => {
    serveDay(-450, 3);
    const { result } = await renderReadyRows();
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));

    await searchCoffee();

    expect(useTransactionsScreenStore.getState().totals?.days).toEqual([
      { date: DAY, netEgp: -450, count: 3 },
    ]);
    expect(result.current.state.sections).toHaveLength(1);
    expect(result.current.state.sections[0].figures).toEqual({ mode: 'skeleton' });
  });

  it('reads the dash alone once that search load rejects', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    serveDay(-450, 3);
    const { result } = await renderReadyRows();
    let rejectLoad!: (error: Error) => void;
    mockGetMonthAggregate.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLoad = reject;
      }),
    );

    await searchCoffee();
    expect(result.current.state.sections[0].figures).toEqual({ mode: 'skeleton' });

    await act(async () => {
      rejectLoad(new Error('db down'));
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('refreshErrorWithData'));

    expect(result.current.state.sections[0].figures).toEqual({ mode: 'failed', net: DASH });
    consoleSpy.mockRestore();
  });

  it('reads the dash alone on every day when the first load fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    setupStores({ transactions: [TRANSACTION, JUNE_TRANSACTION], status: 'ready' });
    mockGetMonthAggregate.mockRejectedValue(new Error('db down'));

    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('firstLoadError'));

    expect(result.current.state.sections.map((section) => section.figures)).toEqual([
      { mode: 'failed', net: DASH },
      { mode: 'failed', net: DASH },
    ]);
    consoleSpy.mockRestore();
  });
});

describe('useTransactions account scope change (MA-107)', () => {
  const WALLET = makeTestAccount({ id: 'acc-1', name: 'Wallet' });
  const BANK = makeTestAccount({ id: 'acc-2', name: 'Bank' });
  const DAY = TRANSACTION.transaction_date;
  const DASH = Strings.transactionsHeroUnavailable;
  const WALLET_KEY = getTransactionQueryKey({ ...JULY_QUERY, accountIds: ['acc-1'] });
  const JULY = { incomeEgp: 22300, expenseEgp: 9400, netEgp: 12900 };
  const JUNE = { incomeEgp: 20000, expenseEgp: 16900, netEgp: 3100 };
  const WALLET_JULY = { incomeEgp: 10000, expenseEgp: 2100, netEgp: 7900 };
  type HeroModel = ReturnType<typeof useTransactions>['state']['hero'];
  type Landed = Awaited<ReturnType<typeof renderLanded>>;
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  function setAccountLists(accounts: unknown[], archivedAccounts: unknown[]): void {
    attachMockSelectorStore(useAccountStore, () => ({
      accounts,
      archivedAccounts,
      accountLookupById: {},
      accountLookupError: false,
      loadAccountLookup,
      hasLoaded: true,
    }));
  }

  async function renderLanded(appliedIds: string[] = [], rowsOnScreen = false) {
    setupStores(rowsOnScreen ? { transactions: [TRANSACTION], status: 'ready' } : {}, {
      accounts: [WALLET, BANK],
      hasLoaded: true,
    });
    useTransactionsScreenStore
      .getState()
      .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: appliedIds });
    mockGetMonthAggregate.mockImplementation(async () => ({
      days: [{ date: DAY, netEgp: -450, count: 3 }],
      matchCount: 3,
      matchNetEgp: -450,
      scoped: { ...JULY },
    }));
    mockGetScopedTotals.mockImplementation(async () => ({ ...JUNE }));
    const heroes: HeroModel[] = [];
    const rendered = await renderHook(
      (_props: Record<string, never>) => {
        const value = useTransactions();
        heroes.push(value.state.hero);
        return value;
      },
      { initialProps: {} },
    );
    await waitFor(() =>
      expect(rendered.result.current.state).toMatchObject({
        totalsStatus: 'ready',
        hero: { mode: 'figures', out: '9,400' },
      }),
    );
    return { ...rendered, heroes };
  }

  function holdNextAggregate(): void {
    mockGetMonthAggregate.mockClear();
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
  }

  async function waitForAggregateUnder(accountIds: string[] | undefined): Promise<void> {
    await waitFor(() => {
      expect(mockGetMonthAggregate).toHaveBeenCalled();
      const { calls } = mockGetMonthAggregate.mock;
      expect(calls[calls.length - 1]?.[0].accountIds).toEqual(accountIds);
    });
  }

  async function applyAccounts(accountIds: string[]): Promise<void> {
    await act(() => {
      useTransactionsScreenStore.getState().setAppliedFilters({ ...EMPTY_FILTERS, accountIds });
    });
  }

  async function failChipTap(whilePending: (landed: Landed) => void = () => {}): Promise<Landed> {
    const landed = await renderLanded([], true);
    let rejectLoad!: (error: Error) => void;
    mockGetMonthAggregate.mockClear();
    mockGetMonthAggregate.mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectLoad = reject;
      }),
    );
    await act(() => {
      transactionStoreState.queryKey = WALLET_KEY;
      transactionStoreState.snapshotKey = WALLET_KEY;
      landed.result.current.toggleAccountChip('acc-1');
    });
    await waitForAggregateUnder(['acc-1']);
    whilePending(landed);

    await act(async () => {
      rejectLoad(new Error('db down'));
    });
    await waitFor(() => expect(landed.result.current.state.totalsStatus).toBe('firstLoadError'));
    return landed;
  }

  it.each<[string, string[], (landed: Landed) => Promise<void>, string[] | undefined]>([
    ['one account applied from the sheet', [], () => applyAccounts(['acc-1']), ['acc-1']],
    [
      'two accounts applied from the sheet',
      [],
      () => applyAccounts(['acc-1', 'acc-2']),
      ['acc-1', 'acc-2'],
    ],
    ['the sheet applied back to all accounts', ['acc-1'], () => applyAccounts([]), undefined],
    [
      'a chip tap',
      [],
      async ({ result }) => {
        await act(() => result.current.toggleAccountChip('acc-1'));
      },
      ['acc-1'],
    ],
    [
      'See all from an account detail',
      [],
      async () => {
        await act(() => {
          useTransactionsScreenStore.getState().seedAccountFilter('acc-1', '2026-07');
        });
      },
      ['acc-1'],
    ],
    [
      'Clear Filters',
      ['acc-1'],
      async ({ result }) => {
        await act(() => result.current.resetFilters());
      },
      undefined,
    ],
    [
      'the applied account archived',
      ['acc-1'],
      async ({ rerender }) => {
        setAccountLists([BANK], [makeTestAccount({ id: 'acc-1', name: 'Wallet', is_archived: 1 })]);
        await rerender({});
      },
      undefined,
    ],
    [
      'the applied account deleted',
      ['acc-1'],
      async ({ rerender }) => {
        setAccountLists([BANK], []);
        await rerender({});
      },
      undefined,
    ],
  ])(
    '%s: the hero is a skeleton with the search live while the new scope loads',
    async (_, startIds, change, loadedIds) => {
      const landed = await renderLanded(startIds);
      holdNextAggregate();

      await change(landed);
      await waitForAggregateUnder(loadedIds);

      expect(landed.result.current.state).toMatchObject({
        hero: { mode: 'skeleton' },
        totals: null,
        searchDisabled: false,
      });
    },
  );

  it('prints figures in no render after a chip tap while the new scope loads', async () => {
    const { result, heroes } = await renderLanded();
    holdNextAggregate();
    let rendersBeforeTap = 0;

    await act(() => {
      rendersBeforeTap = heroes.length;
      result.current.toggleAccountChip('acc-1');
    });
    await waitForAggregateUnder(['acc-1']);

    const afterTap = heroes.slice(rendersBeforeTap);
    expect(afterTap.length).toBeGreaterThan(0);
    expect(afterTap.filter((hero) => hero.mode === 'figures')).toEqual([]);
  });

  it('reads the loading tally and day headers while a chip tap loads, then dashes with the figures alert once it rejects', async () => {
    const { result } = await failChipTap((pending) => {
      expect(pending.result.current.state.tally).toMatchObject({
        mode: 'skeleton',
        count: undefined,
        sum: undefined,
      });
      expect(pending.result.current.state.sections.map((section) => section.figures)).toEqual([
        { mode: 'skeleton' },
      ]);
    });

    expect(result.current.state).toMatchObject({
      totals: null,
      hero: { mode: 'dashes', out: DASH },
      loadErrorVariant: 'totals',
      tally: { mode: 'failed', count: DASH, sum: undefined },
      searchDisabled: false,
    });
    expect(result.current.state.sections.map((section) => section.figures)).toEqual([
      { mode: 'failed', net: DASH },
    ]);
  });

  it('keeps the dashes and the search live while a retry of the failed scope is in flight', async () => {
    const { result } = await failChipTap();
    holdNextAggregate();

    await act(() => {
      void result.current.retryTotals();
    });
    await waitFor(() => {
      expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
      expect(result.current.state.totalsStatus).toBe('initialLoading');
    });

    expect(result.current.state).toMatchObject({
      hero: { mode: 'dashes', out: DASH },
      searchDisabled: false,
    });
  });

  it('shows the skeleton with the search live when the scope changes again after that failure', async () => {
    const { result } = await failChipTap();
    holdNextAggregate();

    await act(() => result.current.toggleAccountChip('acc-2'));
    await waitForAggregateUnder(['acc-2']);

    expect(result.current.state).toMatchObject({
      hero: { mode: 'skeleton' },
      totals: null,
      searchDisabled: false,
    });
  });

  it("shows the skeleton, then the new scope's own figures once they land", async () => {
    const { result } = await renderLanded();
    let resolveLoad!: (aggregate: TransactionMonthAggregate) => void;
    mockGetMonthAggregate.mockClear();
    mockGetMonthAggregate.mockReturnValue(
      new Promise((resolve) => {
        resolveLoad = resolve;
      }),
    );

    await act(() => result.current.toggleAccountChip('acc-1'));
    await waitForAggregateUnder(['acc-1']);
    expect(result.current.state.hero.mode).toBe('skeleton');

    await act(async () => {
      resolveLoad({ ...EMPTY_AGGREGATE, scoped: { ...WALLET_JULY } });
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));

    expect(result.current.state.hero).toMatchObject({ mode: 'figures', out: '2,100' });
    expect(result.current.state.totals?.current).toEqual(WALLET_JULY);
    expect(result.current.state.searchDisabled).toBe(false);
  });

  it.each<[string, () => void, Record<string, unknown>]>([
    [
      'a type tab',
      () => useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense),
      { type: TransactionType.Expense },
    ],
    [
      'a search keystroke',
      () => useTransactionsScreenStore.getState().setSearchQuery('c'),
      { search: 'c' },
    ],
    [
      'a category filter',
      () =>
        useTransactionsScreenStore
          .getState()
          .setAppliedFilters({ ...EMPTY_FILTERS, categoryIds: ['cat-1'] }),
      { categoryIds: ['cat-1'] },
    ],
    [
      'an amount floor',
      () =>
        useTransactionsScreenStore
          .getState()
          .setAppliedFilters({ ...EMPTY_FILTERS, amountCurrency: Currency.EGP, amountMin: 100 }),
      { amountMin: 100 },
    ],
  ])(
    '%s keeps the held hero and the store its scope while that load is in flight',
    async (_, change, loadedQuery) => {
      const { result } = await renderLanded();
      const held = result.current.state.hero;
      holdNextAggregate();

      await act(() => {
        change();
      });
      await waitFor(() =>
        expect(mockGetMonthAggregate).toHaveBeenCalledWith(expect.objectContaining(loadedQuery)),
      );

      expect(result.current.state.hero).toBe(held);
      expect(result.current.state.searchDisabled).toBe(false);
      expect(useTransactionsScreenStore.getState().hasTotalsForScope('2026-07', undefined)).toBe(
        true,
      );
    },
  );

  it.each<[string, (landed: Landed) => Promise<void>]>([
    [
      'a write',
      async ({ rerender }) => {
        transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
        await rerender({});
      },
    ],
    [
      'pull-to-refresh',
      async ({ result }) => {
        await act(() => {
          void result.current.onRefresh();
        });
      },
    ],
    [
      'regaining focus',
      async () => {
        let firstCleanup: void | (() => void) = undefined;
        await act(() => {
          firstCleanup = mockFocusEffectCallback?.();
        });
        await act(() => firstCleanup?.());
        await act(() => {
          mockFocusEffectCallback?.();
        });
        await act(async () => {
          await mockInteractionTasks[mockInteractionTasks.length - 1]?.callback();
        });
      },
    ],
  ])(
    '%s keeps the figures on screen and the store its scope while they refresh',
    async (_, trigger) => {
      const landed = await renderLanded();
      holdNextAggregate();

      await trigger(landed);
      await waitFor(() => {
        expect(mockGetMonthAggregate).toHaveBeenCalledTimes(1);
        expect(landed.result.current.state.totalsStatus).toBe('refreshing');
      });

      expect(landed.result.current.state.hero).toMatchObject({ mode: 'figures', out: '9,400' });
      expect(useTransactionsScreenStore.getState().hasTotalsForScope('2026-07', undefined)).toBe(
        true,
      );
    },
  );

  it('disables the search under the skeleton of a month with no totals, and on the way back while that month loads', async () => {
    const { result } = await renderLanded();
    expect(useTransactionsScreenStore.getState().totalsLoadedYearMonth).toBe('2026-07');
    holdNextAggregate();

    await act(() => {
      result.current.setSelectedMonth('2026-06');
    });
    await waitFor(() =>
      expect(mockGetMonthAggregate).toHaveBeenCalledWith(
        expect.objectContaining({ dateFrom: '2026-06-01' }),
      ),
    );
    expect(result.current.state).toMatchObject({
      hero: { mode: 'skeleton' },
      searchDisabled: true,
    });

    await act(() => {
      result.current.setSelectedMonth('2026-07');
    });
    await waitFor(() => expect(mockGetMonthAggregate).toHaveBeenCalledTimes(2));
    expect(result.current.state).toMatchObject({
      hero: { mode: 'skeleton' },
      searchDisabled: true,
    });
  });
});

function emptySnapshot(query: Record<string, unknown> = {}): Record<string, unknown> {
  const key = getTransactionQueryKey({ ...JULY_QUERY, ...query });
  return { transactions: [], status: 'empty', queryKey: key, snapshotKey: key };
}

function heldAnswer() {
  const { hasAnyTransaction, existenceVersion } = useTransactionsScreenStore.getState();
  return { hasAnyTransaction, existenceVersion };
}

function readFailed(): boolean {
  return useTransactionsState.getState().existenceFailed;
}

function renderRerenderable() {
  return renderHook((_props: Record<string, never>) => useTransactions(), { initialProps: {} });
}

async function settle(): Promise<void> {
  await act(async () => {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 0);
    });
  });
}

describe('useTransactions any-transaction read (MA-093)', () => {
  let consoleSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  it('reads once for an empty unfiltered month and holds the answer at the current mutationVersion', async () => {
    setupStores({ mutationVersion: 4 });
    mockGetAll.mockResolvedValue([JUNE_TRANSACTION]);

    await renderHook(() => useTransactions());

    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: true, existenceVersion: 4 }),
    );
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(mockGetAll).toHaveBeenCalledWith({ limit: 1 });
    expect(readFailed()).toBe(false);
  });

  it('reads nothing for a month with rows until the month is empty', async () => {
    setupStores({ transactions: [TRANSACTION], status: 'ready' });
    const { result, rerender } = await renderRerenderable();
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
    await settle();
    expect(mockGetAll).not.toHaveBeenCalled();

    transactionStoreState = { ...transactionStoreState, ...emptySnapshot() };
    await rerender({});

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
  });

  it.each<[string, Record<string, unknown>, () => void]>([
    [
      'a chip',
      { accountIds: ['acc-1'] },
      () =>
        useTransactionsScreenStore
          .getState()
          .setAppliedFilters({ ...EMPTY_FILTERS, accountIds: ['acc-1'] }),
    ],
    [
      'a type tab',
      { type: TransactionType.Expense },
      () => useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense),
    ],
    [
      'a search',
      { search: 'coffee' },
      () => useTransactionsScreenStore.getState().setSearchQuery('coffee'),
    ],
  ])(
    'reads nothing for an empty month under %s until the filter clears',
    async (_name, query, applyFilter) => {
      setupStores(emptySnapshot(query));
      applyFilter();
      const { result } = await renderHook(() => useTransactions());
      await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
      await settle();
      expect(result.current.state.listStatus).toBe('empty');
      expect(mockGetAll).not.toHaveBeenCalled();

      await act(() => {
        transactionStoreState = { ...transactionStoreState, ...emptySnapshot() };
        result.current.resetFilters();
      });

      await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
    },
  );

  it('reads nothing more for a second empty month at the same mutationVersion', async () => {
    const { result } = await renderHook(() => useTransactions());
    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 0 }),
    );
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    const juneKey = getTransactionQueryKey(JUNE_QUERY);

    await act(() => {
      transactionStoreState = {
        ...transactionStoreState,
        query: JUNE_QUERY,
        queryKey: juneKey,
        snapshotKey: juneKey,
      };
      useTransactionsScreenStore.getState().setSelectedMonth('2026-06');
    });
    await waitFor(() => expect(result.current.state.totalsStatus).toBe('ready'));
    await settle();

    expect(result.current.state.selectedMonth).toBe('2026-06');
    expect(result.current.state.listStatus).toBe('empty');
    expect(mockGetAll).toHaveBeenCalledTimes(1);
  });

  it('reads again once a write moves mutationVersion', async () => {
    const { rerender } = await renderRerenderable();
    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 0 }),
    );
    mockGetAll.mockResolvedValue([JUNE_TRANSACTION]);

    transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
    await rerender({});

    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: true, existenceVersion: 1 }),
    );
    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it('logs a rejected read, sets the failure flag, and does not read again on a re-render', async () => {
    mockGetAll.mockRejectedValue(new Error('db down'));
    const { rerender } = await renderRerenderable();

    await waitFor(() => expect(readFailed()).toBe(true));
    expect(consoleSpy).toHaveBeenCalled();
    await rerender({});
    await settle();

    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(readFailed()).toBe(true);
    expect(heldAnswer()).toEqual({ hasAnyTransaction: undefined, existenceVersion: undefined });
  });

  it.each<[string, (hook: ReturnType<typeof useTransactions>) => Promise<void>]>([
    ['Try again', (hook) => hook.retryFailedLoads()],
    ['a pull to refresh', (hook) => hook.onRefresh()],
  ])('%s reads again after a failed read and clears the flag', async (_name, run) => {
    mockGetAll.mockRejectedValueOnce(new Error('db down'));
    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(readFailed()).toBe(true));
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    mockGetAll.mockResolvedValue([JUNE_TRANSACTION]);

    await act(async () => {
      await run(result.current);
    });

    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: true, existenceVersion: 0 }),
    );
    expect(mockGetAll).toHaveBeenCalledTimes(2);
    expect(readFailed()).toBe(false);
  });

  it('after a failed read, a type tab switched on and back to all reads again', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('db down'));
    const { result } = await renderHook(() => useTransactions());
    await waitFor(() => expect(readFailed()).toBe(true));

    await act(() => {
      transactionStoreState = {
        ...transactionStoreState,
        ...emptySnapshot({ type: TransactionType.Expense }),
      };
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    });
    await settle();
    expect(result.current.state.listStatus).toBe('empty');
    expect(mockGetAll).toHaveBeenCalledTimes(1);

    await act(() => {
      transactionStoreState = { ...transactionStoreState, ...emptySnapshot() };
      useTransactionsScreenStore.getState().setActiveFilter('all');
    });

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(readFailed()).toBe(false));
    expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 0 });
  });

  it('after a failed read, no render on the way back to all reads the first-load error before the retry answers', async () => {
    mockGetAll.mockRejectedValueOnce(new Error('db down'));
    const firstLoadErrorFrames: boolean[] = [];
    const { result } = await renderHook(() => {
      const hook = useTransactions();
      firstLoadErrorFrames.push(hook.state.showFirstLoadError);
      return hook;
    });
    await waitFor(() => expect(result.current.state.showFirstLoadError).toBe(true));
    await act(() => {
      transactionStoreState = {
        ...transactionStoreState,
        ...emptySnapshot({ type: TransactionType.Expense }),
      };
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    });
    await settle();

    firstLoadErrorFrames.length = 0;
    await act(() => {
      transactionStoreState = { ...transactionStoreState, ...emptySnapshot() };
      useTransactionsScreenStore.getState().setActiveFilter('all');
    });
    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 0 }),
    );
    await settle();

    expect(mockGetAll).toHaveBeenCalledTimes(2);
    expect(firstLoadErrorFrames.length).toBeGreaterThan(0);
    expect(firstLoadErrorFrames).not.toContain(true);
  });

  it('a rejection that lands after a filter went on sets no failure flag', async () => {
    let rejectRead!: (error: Error) => void;
    mockGetAll.mockReturnValueOnce(
      new Promise<Transaction[]>((_resolve, reject) => {
        rejectRead = reject;
      }),
    );
    await renderHook(() => useTransactions());
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
    await act(() => {
      transactionStoreState = {
        ...transactionStoreState,
        ...emptySnapshot({ type: TransactionType.Expense }),
      };
      useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Expense);
    });
    await settle();

    await act(async () => {
      rejectRead(new Error('db down'));
    });
    await settle();

    expect(consoleSpy).toHaveBeenCalled();
    expect(readFailed()).toBe(false);
  });

  it.each<[string, boolean]>([
    ['an answered month', false],
    ['a failed read', true],
  ])('focus and its queued task add no read on %s', async (_name, fails) => {
    if (fails) mockGetAll.mockRejectedValue(new Error('db down'));
    await renderHook(() => useTransactions());
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
    await settle();
    expect(readFailed()).toBe(fails);

    let cleanup: void | (() => void) = undefined;
    await act(() => {
      cleanup = mockFocusEffectCallback?.();
    });
    await act(async () => {
      await mockInteractionTasks[mockInteractionTasks.length - 1]?.callback();
    });
    await act(() => cleanup?.());
    await act(() => {
      mockFocusEffectCallback?.();
    });
    await act(async () => {
      await mockInteractionTasks[mockInteractionTasks.length - 1]?.callback();
    });
    await settle();

    expect(mockInteractionTasks).toHaveLength(2);
    expect(mockGetAll).toHaveBeenCalledTimes(1);
    expect(readFailed()).toBe(fails);
  });

  it('drops an answer that lands after a newer request began', async () => {
    let resolveFirst!: (rows: Transaction[]) => void;
    mockGetAll.mockReturnValueOnce(
      new Promise<Transaction[]>((resolve) => {
        resolveFirst = resolve;
      }),
    );
    const { rerender } = await renderRerenderable();
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));

    transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
    await rerender({});
    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 1 }),
    );
    expect(mockGetAll).toHaveBeenCalledTimes(2);

    await act(async () => {
      resolveFirst([JUNE_TRANSACTION]);
    });
    await settle();

    expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 1 });
    expect(mockGetAll).toHaveBeenCalledTimes(2);
  });

  it('drops a rejection that lands after a newer request began', async () => {
    let rejectFirst!: (error: Error) => void;
    mockGetAll.mockReturnValueOnce(
      new Promise<Transaction[]>((_resolve, reject) => {
        rejectFirst = reject;
      }),
    );
    const { rerender } = await renderRerenderable();
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));

    transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
    await rerender({});
    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 1 }),
    );

    await act(async () => {
      rejectFirst(new Error('db down'));
    });
    await settle();

    expect(readFailed()).toBe(false);
    expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 1 });
  });
});

describe('useTransactions empty blocks (MA-093)', () => {
  let consoleSpy: jest.SpyInstance;

  // Pins `new Date()` alone: the timers stay real so `waitFor` and the awaited reads still run.
  function pinNow(localIso: string): void {
    jest.useFakeTimers({
      now: new Date(localIso),
      doNotFake: [
        'hrtime',
        'nextTick',
        'performance',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'setImmediate',
        'clearImmediate',
        'setInterval',
        'clearInterval',
        'setTimeout',
        'clearTimeout',
      ],
    });
  }

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleSpy.mockRestore();
  });

  it('an empty July with a transaction in another month reads the empty-month block, named July, with the link', async () => {
    pinNow('2026-09-15T12:00:00');
    mockGetAll.mockResolvedValue([JUNE_TRANSACTION]);

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.emptyVariant).toBe('emptyMonth'));
    expect(result.current.state.emptyMonthName).toBe('July');
    expect(result.current.state.showsBackToThisMonth).toBe(true);
    expect(result.current.state.showInitialSkeleton).toBe(false);
  });

  it('drops the link when the empty month is the current one, on its last evening', async () => {
    pinNow('2026-07-31T23:30:00');
    mockGetAll.mockResolvedValue([JUNE_TRANSACTION]);

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.emptyVariant).toBe('emptyMonth'));
    expect(result.current.state.emptyMonthName).toBe('July');
    expect(result.current.state.showsBackToThisMonth).toBe(false);
  });

  it('reads the no-transactions block, without the link, when no transaction exists', async () => {
    pinNow('2026-09-15T12:00:00');
    const { result } = await renderHook(() => useTransactions());

    await waitFor(() =>
      expect(heldAnswer()).toEqual({ hasAnyTransaction: false, existenceVersion: 0 }),
    );
    expect(result.current.state.emptyVariant).toBe('noData');
    expect(result.current.state.showsBackToThisMonth).toBe(false);
  });

  it('holds the skeleton and no block while the read is pending', async () => {
    mockGetAll.mockReturnValue(new Promise(() => {}));

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
    expect(result.current.state.showInitialSkeleton).toBe(true);
    expect(result.current.state.emptyVariant).toBe('none');
    expect(result.current.state.showFirstLoadError).toBe(false);
  });

  it('reads the first-load error, never an empty block, when the read fails', async () => {
    mockGetAll.mockRejectedValue(new Error('db down'));

    const { result } = await renderHook(() => useTransactions());

    await waitFor(() => expect(result.current.state.showFirstLoadError).toBe(true));
    expect(result.current.state.emptyVariant).toBe('none');
    expect(result.current.state.showInitialSkeleton).toBe(false);
    expect(result.current.state.loadErrorVariant).toBe('none');
  });

  it.each<[string, string, Transaction[], Transaction[]]>([
    ['emptyMonth', 'noData', [JUNE_TRANSACTION], []],
    ['noData', 'emptyMonth', [], [JUNE_TRANSACTION]],
  ])(
    'the %s block becomes %s once the read after a write answers',
    async (before, after, firstRows, nextRows) => {
      mockGetAll.mockResolvedValue(firstRows);
      const { result, rerender } = await renderRerenderable();
      await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(1));
      await waitFor(() => expect(result.current.state.emptyVariant).toBe(before));
      mockGetAll.mockResolvedValue(nextRows);

      transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
      await rerender({});

      await waitFor(() => expect(result.current.state.emptyVariant).toBe(after));
      expect(mockGetAll).toHaveBeenCalledTimes(2);
    },
  );

  it('holds the skeleton, never the last block, while the read after a write is pending', async () => {
    mockGetAll.mockReturnValue(new Promise(() => {}));
    mockGetAll.mockResolvedValueOnce([JUNE_TRANSACTION]);
    const { result, rerender } = await renderRerenderable();
    await waitFor(() => expect(result.current.state.emptyVariant).toBe('emptyMonth'));

    transactionStoreState = { ...transactionStoreState, mutationVersion: 1 };
    await rerender({});

    expect(result.current.state.emptyVariant).toBe('none');
    expect(result.current.state.showInitialSkeleton).toBe(true);
    await waitFor(() => expect(mockGetAll).toHaveBeenCalledTimes(2));
  });

  it('with the clock pinned, backToThisMonth returns the month row to the pinned month', async () => {
    pinNow('2026-09-01T00:30:00');
    const { result } = await renderHook(() => useTransactions());
    expect(result.current.state.selectedMonth).toBe('2026-07');

    await act(() => result.current.backToThisMonth());

    expect(useTransactionsScreenStore.getState().period).toEqual({
      type: 'month',
      yearMonth: '2026-09',
    });
    expect(result.current.state.selectedMonth).toBe('2026-09');
  });
});

describe('useTransactions delete dialog (MA-093)', () => {
  const CIB = makeTestAccount({ id: 'account-1', name: 'CIB Current' });
  const EXPENSE_BODY = '100 EGP returns to CIB Current. This cannot be undone.';
  const DELETED_TOAST = { label: 'Transaction deleted.', variant: 'success' };

  function setupSeeded(transactionOverrides: Record<string, unknown> = {}): void {
    setupStores(
      { transactions: [TRANSACTION], status: 'ready', ...transactionOverrides },
      { accounts: [CIB] },
    );
  }

  beforeEach(() => {
    mockGetMonthAggregate.mockReturnValue(new Promise(() => {}));
  });

  it('prints the balance effect while a delete is pending and holds it once the row has left the rows', async () => {
    setupSeeded();
    const { result, rerender } = await renderRerenderable();
    expect(result.current.state.deleteBody).toBe('');

    await act(() => result.current.requestDelete('tx-1'));
    expect(result.current.state.pendingDeleteId).toBe('tx-1');
    expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);

    transactionStoreState = { ...transactionStoreState, transactions: [], status: 'empty' };
    await rerender({});

    expect(result.current.state.pendingDeleteId).toBe('tx-1');
    expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);
  });

  it('stays busy with no toast while the delete is in flight, then closes and shows the toast once', async () => {
    let resolveDelete!: () => void;
    const pendingDelete = jest.fn<Promise<void>, [string]>(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );
    setupSeeded({ deleteTransaction: pendingDelete });
    const { result } = await renderHook(() => useTransactions());
    await act(() => result.current.requestDelete('tx-1'));

    let confirmed: Promise<void> | undefined;
    await act(() => {
      confirmed = result.current.confirmDelete();
    });

    expect(pendingDelete).toHaveBeenCalledWith('tx-1');
    expect(result.current.state.deleteBusy).toBe(true);
    expect(result.current.state.pendingDeleteId).toBe('tx-1');
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(async () => {
      resolveDelete();
      await confirmed;
    });

    expect(result.current.state.deleteBusy).toBe(false);
    expect(result.current.state.pendingDeleteId).toBeNull();
    expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(DELETED_TOAST);
  });

  it('keeps the body through the close when the delete is cancelled', async () => {
    setupSeeded();
    const { result } = await renderHook(() => useTransactions());
    await act(() => result.current.requestDelete('tx-1'));

    await act(() => result.current.cancelDelete());

    expect(result.current.state.pendingDeleteId).toBeNull();
    expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);
  });

  it.each<[string, Error, () => string]>([
    [
      'the archived refusal',
      new TransactionAccountArchivedError('source', makeTestAccount({ name: 'Old Card' })),
      () => Strings.transactionAccountArchived('Old Card'),
    ],
    ['any other rejection', new Error('write failed'), () => Strings.errDeleteFailed],
  ])(
    '%s shows no toast and keeps the dialog open with its body, and a retry that lands shows the toast once',
    async (_name, error, message) => {
      const rejectedOnce = jest
        .fn<Promise<void>, [string]>()
        .mockRejectedValueOnce(error)
        .mockResolvedValue(undefined);
      setupSeeded({ deleteTransaction: rejectedOnce });
      const { result } = await renderHook(() => useTransactions());

      await act(() => result.current.requestDelete('tx-1'));
      await act(async () => result.current.confirmDelete());

      expect(result.current.state.pendingDeleteId).toBe('tx-1');
      expect(result.current.state.deleteBusy).toBe(false);
      expect(result.current.state.deleteErrorMessage).toBe(message());
      expect(result.current.state.deleteBody).toBe(EXPENSE_BODY);
      expect(mockToast.show).not.toHaveBeenCalled();

      await act(async () => result.current.confirmDelete());

      expect(rejectedOnce).toHaveBeenCalledTimes(2);
      expect(rejectedOnce).toHaveBeenLastCalledWith('tx-1');
      expect(result.current.state.pendingDeleteId).toBeNull();
      expect(mockToast.show).toHaveBeenCalledTimes(1);
      expect(mockToast.show).toHaveBeenCalledWith(DELETED_TOAST);
    },
  );

  it('closes with the toast and leaves the refresh alert when the refresh after the delete failed', async () => {
    setupSeeded({ status: 'refreshErrorWithData' });
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-1'));
    await act(async () => result.current.confirmDelete());

    expect(deleteTransaction).toHaveBeenCalledWith('tx-1');
    expect(result.current.state.pendingDeleteId).toBeNull();
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(DELETED_TOAST);
    expect(result.current.state.loadErrorVariant).toBe('refresh');
  });

  it('opens nothing for an id outside the loaded rows', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    setupSeeded();
    const { result } = await renderHook(() => useTransactions());

    await act(() => result.current.requestDelete('tx-missing'));

    expect(result.current.state.pendingDeleteId).toBeNull();
    expect(result.current.state.deleteBody).toBe('');
    warnSpy.mockRestore();
  });
});
