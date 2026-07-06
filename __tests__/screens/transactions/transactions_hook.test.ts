import { act, renderHook, waitFor } from '@testing-library/react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { getPeriodTotals } from '@/modules/transactions/database/transactions';
import { useFilterState } from '@/modules/transactions/screens/transactions/filter/filter.state';
import {
  EMPTY_FILTERS_V2,
  useFilterStore,
} from '@/modules/transactions/screens/transactions/filter/filter.store';
import { useTransactions } from '@/modules/transactions/screens/transactions/transactions.hook';
import { useTransactionsState } from '@/modules/transactions/screens/transactions/transactions.state';
import { useTransactionsScreenStore } from '@/modules/transactions/screens/transactions/transactions.store';

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

function setupStores() {
  const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
  setQuery = jest.fn().mockResolvedValue(undefined);

  attachMockSelectorStore(useAccountStore as jest.Mock, () => ({
    accounts: [],
  }));
  attachMockSelectorStore(useCategoryStore as jest.Mock, () => ({
    categories: [],
  }));
  attachMockSelectorStore(useTransactionStore as jest.Mock, () => ({
    transactions: [],
    hasMore: false,
    loading: false,
    hasLoaded: true,
    mutationVersion: 0,
    setQuery,
    loadMore: jest.fn().mockResolvedValue(undefined),
    refresh: jest.fn().mockResolvedValue(undefined),
    reset: jest.fn(),
  }));
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

  it('settles totals with an empty monthly fallback when loading fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.mocked(getPeriodTotals).mockRejectedValue(new Error('db down'));

    const { result } = renderHook(() => useTransactions());

    await waitFor(() => {
      expect(result.current.state.totals).toEqual({
        current: EMPTY_TOTALS,
        previous: null,
      });
    });

    consoleSpy.mockRestore();
  });
});
