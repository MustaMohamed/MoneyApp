import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { useDashboard } from '@/modules/dashboard/screens/dashboard/dashboard.hook';

// All stores are mocked so no real Zustand stores are instantiated.
// useDashboardState is mocked but backed by a simple object so tests
// can inspect and mutate selectedSegment directly.

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

let capturedFocusCallback: (() => void | (() => void)) | null = null;
const mockInteractionTasks: Array<{ callback: () => void; cancel: jest.Mock }> = [];

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void | (() => void)) => {
    capturedFocusCallback = cb;
  },
}));

jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: jest.fn((callback: () => void) => {
    let cancelled = false;
    const cancel = jest.fn(() => {
      cancelled = true;
    });
    const task = {
      callback: () => {
        if (!cancelled) callback();
      },
      cancel,
    };
    mockInteractionTasks.push(task);
    return { cancel: task.cancel };
  }),
}));

jest.mock('@/database/client', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/modules/accounts/database/account_stats', () => ({
  getAccountsStats: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/modules/transactions/database/transactions', () => ({
  getMonthExpenseStats: jest.fn().mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }),
  getPeriodTotals: jest.fn().mockResolvedValue({ incomeEgp: 0, expenseEgp: 0, netEgp: 0 }),
}));

jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) },
}));

jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/dashboard/screens/dashboard/dashboard.store', () => ({
  useDashboardStore: jest.fn(),
}));
jest.mock('@/modules/dashboard/screens/dashboard/dashboard.state', () => ({
  useDashboardState: jest.fn(),
}));

const { useAccountStore } = jest.requireMock('@/modules/accounts/store/account.store');
const { useCurrencyStore } = jest.requireMock('@/modules/currency/store/currency.store');
const { useCommitmentStore } = jest.requireMock('@/modules/commitments/store/commitment.store');
const { commitmentRepository } = jest.requireMock(
  '@/modules/commitments/repositories/commitment.repository',
);
const { getMonthExpenseStats, getPeriodTotals } = jest.requireMock(
  '@/modules/transactions/database/transactions',
);
const { useDashboardStore } = jest.requireMock(
  '@/modules/dashboard/screens/dashboard/dashboard.store',
);
const { useDashboardState } = jest.requireMock(
  '@/modules/dashboard/screens/dashboard/dashboard.state',
);
const { runAfterInteractions } = jest.requireMock('@/utils/run_after_interactions');

const BASE_ACCOUNTS = [
  {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 27000,
    opening_balance: 27000,
    is_archived: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'a2',
    name: 'Savings',
    type: AccountType.PhysicalSavings,
    currency: Currency.EGP,
    current_balance: 10000,
    opening_balance: 10000,
    is_archived: 0,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'a3',
    name: 'Visa',
    type: AccountType.CreditCard,
    currency: Currency.EGP,
    current_balance: 4080,
    opening_balance: 4080,
    is_archived: 0,
    created_at: '',
    updated_at: '',
  },
];

// Shared mutable state for the V2 UI state mock — lets tests observe and
// manipulate selectedSegment without a real Zustand store.
let uiState = {
  isBreakdownVisible: false,
  refreshing: false,
  selectedSegment: 'overview' as 'overview' | 'accounts',
};
const setBreakdownVisible = jest.fn((v: boolean) => {
  uiState.isBreakdownVisible = v;
});
const setRefreshing = jest.fn((v: boolean) => {
  uiState.refreshing = v;
});
const setSelectedSegment = jest.fn((s: 'overview' | 'accounts') => {
  uiState.selectedSegment = s;
});
let loadAccountsMock: jest.Mock;

function setupMocks(accounts = BASE_ACCOUNTS) {
  const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
  loadAccountsMock = jest.fn().mockResolvedValue(undefined);
  attachMockSelectorStore(useAccountStore as jest.Mock, () => ({
    accounts,
    loadAccounts: loadAccountsMock,
  }));
  attachMockSelectorStore(useCurrencyStore as jest.Mock, () => ({
    rate: 48.85,
    isManualOverride: false,
  }));
  attachMockSelectorStore(useCommitmentStore as jest.Mock, () => ({
    commitments: [],
    payments: [],
  }));
  attachMockSelectorStore(useDashboardStore as jest.Mock, () => ({
    statsMap: {},
    currentMonthCommitmentPayments: [],
    currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
    previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
    currentTransactionTotals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    previousTransactionTotals: null,
    commitmentPaymentsLoaded: false,
    monthSpendLoaded: false,
    transactionTotalsLoaded: false,
    setStatsMap: jest.fn(),
    setCurrentMonthCommitmentPayments: jest.fn(),
    setMonthSpendStats: jest.fn(),
    setTransactionTotals: jest.fn(),
  }));
  attachMockSelectorStore(useDashboardState as jest.Mock, () => ({
    ...uiState,
    setBreakdownVisible,
    setRefreshing,
    setSelectedSegment,
  }));
}

beforeEach(() => {
  capturedFocusCallback = null;
  mockInteractionTasks.length = 0;
  uiState = { isBreakdownVisible: false, refreshing: false, selectedSegment: 'overview' };
  setBreakdownVisible.mockClear();
  setRefreshing.mockClear();
  setSelectedSegment.mockClear();
  commitmentRepository.getPaymentsForMonth.mockClear();
  getMonthExpenseStats.mockClear();
  getPeriodTotals.mockClear();
  runAfterInteractions.mockClear();
  setupMocks();
});

describe('useDashboard', () => {
  it('defaults selectedSegment to overview', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.state.selectedSegment).toBe('overview');
  });

  it('exposes dashboard summary loading flags before async sections load', () => {
    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.monthSpend.loading).toBe(true);
    expect(result.current.state.transactions.loading).toBe(true);
    expect(result.current.state.commitments.loading).toBe(true);
  });

  it('exposes loaded dashboard summary flags from the store', () => {
    const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
    attachMockSelectorStore(useDashboardStore as jest.Mock, () => ({
      statsMap: {},
      currentMonthCommitmentPayments: [],
      currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
      previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
      currentTransactionTotals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      previousTransactionTotals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      commitmentPaymentsLoaded: true,
      monthSpendLoaded: true,
      transactionTotalsLoaded: true,
      setStatsMap: jest.fn(),
      setCurrentMonthCommitmentPayments: jest.fn(),
      setMonthSpendStats: jest.fn(),
      setTransactionTotals: jest.fn(),
    }));

    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.monthSpend.loading).toBe(false);
    expect(result.current.state.transactions.loading).toBe(false);
    expect(result.current.state.commitments.loading).toBe(false);
  });

  it('settles dashboard summary sections with empty fallbacks when initial loaders fail', async () => {
    const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
    const setCurrentMonthCommitmentPayments = jest.fn();
    const setMonthSpendStats = jest.fn();
    const setTransactionTotals = jest.fn();
    const emptySpend = { totalEgp: 0, usdNative: 0, count: 0 };
    const emptyTotals = { incomeEgp: 0, expenseEgp: 0, netEgp: 0 };
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    getMonthExpenseStats.mockRejectedValueOnce(new Error('spend down'));
    getPeriodTotals.mockRejectedValueOnce(new Error('totals down'));
    commitmentRepository.getPaymentsForMonth.mockRejectedValueOnce(new Error('payments down'));
    attachMockSelectorStore(useDashboardStore as jest.Mock, () => ({
      statsMap: {},
      currentMonthCommitmentPayments: [],
      currentMonthSpend: emptySpend,
      previousMonthSpend: emptySpend,
      currentTransactionTotals: emptyTotals,
      previousTransactionTotals: null,
      commitmentPaymentsLoaded: false,
      monthSpendLoaded: false,
      transactionTotalsLoaded: false,
      setStatsMap: jest.fn(),
      setCurrentMonthCommitmentPayments,
      setMonthSpendStats,
      setTransactionTotals,
    }));

    renderHook(() => useDashboard());
    act(() => {
      capturedFocusCallback?.();
      mockInteractionTasks[0]?.callback();
    });

    await waitFor(() => {
      expect(setCurrentMonthCommitmentPayments).toHaveBeenCalledWith([]);
      expect(setMonthSpendStats).toHaveBeenCalledWith(emptySpend, emptySpend);
      expect(setTransactionTotals).toHaveBeenCalledWith(emptyTotals, emptyTotals);
    });
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    consoleSpy.mockRestore();
  });

  it('setSelectedSegment updates state', () => {
    const { result } = renderHook(() => useDashboard());
    act(() => result.current.setSelectedSegment('accounts'));
    expect(setSelectedSegment).toHaveBeenCalledWith('accounts');
  });

  it('exposes liquidity memo computed from accounts', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.state.liquidity.liquidEgp).toBe(27000);
    expect(result.current.state.liquidity.reserveEgp).toBe(10000);
  });

  it('exposes liabilities memo with credit cards only', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.state.liabilities).toEqual([
      { id: 'a3', name: 'Visa', balanceEgp: 4080, statementDueDay: null },
    ]);
  });

  it('useFocusEffect resets segment to overview', () => {
    uiState.selectedSegment = 'accounts';
    renderHook(() => useDashboard());
    act(() => {
      capturedFocusCallback?.();
    });
    expect(setSelectedSegment).toHaveBeenCalledWith('overview');
  });

  it('loads the current month commitments once on initial focus', async () => {
    renderHook(() => useDashboard());

    act(() => {
      capturedFocusCallback?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(useCommitmentStore).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(commitmentRepository.getPaymentsForMonth).toHaveBeenCalledTimes(1);
    });
  });

  it('cancels pending focus reload work on cleanup', () => {
    renderHook(() => useDashboard());
    commitmentRepository.getPaymentsForMonth.mockClear();
    getMonthExpenseStats.mockClear();
    getPeriodTotals.mockClear();

    let cleanup: void | (() => void);
    act(() => {
      cleanup = capturedFocusCallback?.();
    });

    expect(setSelectedSegment).toHaveBeenCalledWith('overview');
    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(commitmentRepository.getPaymentsForMonth).not.toHaveBeenCalled();
    expect(getMonthExpenseStats).not.toHaveBeenCalled();
    expect(getPeriodTotals).not.toHaveBeenCalled();

    act(() => {
      cleanup?.();
      mockInteractionTasks[0]?.callback();
    });

    expect(mockInteractionTasks[0]?.cancel).toHaveBeenCalledTimes(1);
    expect(commitmentRepository.getPaymentsForMonth).not.toHaveBeenCalled();
    expect(getMonthExpenseStats).not.toHaveBeenCalled();
    expect(getPeriodTotals).not.toHaveBeenCalled();
  });

  it('refresh reloads immediately without waiting for interactions', async () => {
    const { result } = renderHook(() => useDashboard());
    await act(async () => {
      await Promise.resolve();
    });
    commitmentRepository.getPaymentsForMonth.mockClear();
    getMonthExpenseStats.mockClear();
    getPeriodTotals.mockClear();
    runAfterInteractions.mockClear();

    await act(async () => {
      await result.current.refresh();
    });

    expect(runAfterInteractions).not.toHaveBeenCalled();
    expect(loadAccountsMock).toHaveBeenCalledTimes(1);
    expect(commitmentRepository.getPaymentsForMonth).toHaveBeenCalledTimes(1);
    expect(getMonthExpenseStats).toHaveBeenCalledTimes(2);
    expect(getPeriodTotals).toHaveBeenCalledTimes(2);
  });

  it('loads and exposes transaction totals for the dashboard summary card', async () => {
    const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
    const currentTotals = { incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 };
    const previousTotals = { incomeEgp: 22800, expenseEgp: 11300, netEgp: 11500 };
    const setTransactionTotals = jest.fn();

    getPeriodTotals.mockResolvedValueOnce(currentTotals).mockResolvedValueOnce(previousTotals);
    attachMockSelectorStore(useDashboardStore as jest.Mock, () => ({
      statsMap: {},
      currentMonthCommitmentPayments: [],
      currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
      previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
      currentTransactionTotals: currentTotals,
      previousTransactionTotals: previousTotals,
      commitmentPaymentsLoaded: true,
      monthSpendLoaded: true,
      transactionTotalsLoaded: true,
      setStatsMap: jest.fn(),
      setCurrentMonthCommitmentPayments: jest.fn(),
      setMonthSpendStats: jest.fn(),
      setTransactionTotals,
    }));

    const { result } = renderHook(() => useDashboard());

    await waitFor(() => {
      expect(getPeriodTotals).toHaveBeenCalledTimes(2);
    });

    expect(setTransactionTotals).toHaveBeenCalledWith(currentTotals, previousTotals);
    expect(result.current.state.transactions.current).toEqual(currentTotals);
    expect(result.current.state.transactions.previous).toEqual(previousTotals);
    expect(result.current.state.transactions.previousLabel).toMatch(/^\w+ \d{4}$/);
  });
});
