import { act, renderHook } from '@testing-library/react-native';

import { AccountType, CommitmentPaymentStatus, Currency } from '@/constants/enums';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import type {
  DashboardLoadInput,
  DashboardSnapshot,
} from '@/modules/dashboard/repositories/dashboard.repository';
import { useDashboard } from '@/modules/dashboard/screens/dashboard/dashboard.hook';
import { useDashboardState } from '@/modules/dashboard/screens/dashboard/dashboard.state';
import { useDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { runAfterInteractions } from '@/utils/run_after_interactions';

jest.mock('zustand/react/shallow', () => ({
  useShallow: <T>(selector: T): T => selector,
}));

const mockPush = jest.fn();
let mockCapturedFocusCallback: (() => void | (() => void)) | undefined;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
  useFocusEffect: (callback: () => void | (() => void)) => {
    mockCapturedFocusCallback = callback;
  },
}));

type ScheduledTask = {
  callback: () => void | Promise<void>;
  cancel: jest.MockedFunction<() => void>;
};

const mockScheduledTasks: ScheduledTask[] = [];

jest.mock('@/utils/run_after_interactions', () => ({
  runAfterInteractions: jest.fn((callback: () => void | Promise<void>) => {
    const task: ScheduledTask = {
      callback,
      cancel: jest.fn(),
    };
    mockScheduledTasks.push(task);
    return { cancel: task.cancel };
  }),
}));

jest.mock('@/modules/dashboard/screens/dashboard/dashboard.store', () => ({
  useDashboardStore: jest.fn(),
}));
jest.mock('@/modules/dashboard/screens/dashboard/dashboard.state', () => ({
  useDashboardState: jest.fn(),
}));
jest.mock('@/modules/currency/store/currency.store', () => ({
  useCurrencyStore: jest.fn(),
}));
jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: jest.fn(),
}));

const ensureSnapshot = jest.fn<Promise<void>, [DashboardLoadInput]>();
const refreshSnapshot = jest.fn<Promise<void>, [DashboardLoadInput]>();
const retrySnapshot = jest.fn<Promise<void>, [DashboardLoadInput]>();
const revalidateAfterMutation = jest.fn<Promise<void>, [DashboardLoadInput]>();
const invalidate = jest.fn();
const setBreakdownVisible = jest.fn();
const setSelectedSegment = jest.fn();

function populatedSnapshot(): DashboardSnapshot {
  return {
    key: '2026-07',
    yearMonth: '2026-07',
    previousYearMonth: '2026-06',
    accounts: [
      {
        id: 'usd-bank',
        name: 'USD Bank',
        type: AccountType.Bank,
        currency: Currency.USD,
        opening_balance: 100,
        current_balance: 100,
        color: null,
        credit_limit: null,
        revolving_balance: null,
        minimum_payment: null,
        statement_due_day: null,
        interest_tracking: 0,
        apr: null,
        is_archived: 0,
        balance_review_required: 0,
        sort_order: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'card',
        name: 'Card',
        type: AccountType.CreditCard,
        currency: Currency.EGP,
        opening_balance: 1000,
        current_balance: 1000,
        color: null,
        credit_limit: 5000,
        revolving_balance: 1000,
        minimum_payment: 100,
        statement_due_day: 28,
        interest_tracking: 0,
        apr: null,
        is_archived: 0,
        balance_review_required: 0,
        sort_order: 1,
        created_at: '2026-01-02T00:00:00.000Z',
        updated_at: '2026-01-02T00:00:00.000Z',
      },
    ],
    statsMap: {
      'usd-bank': { month_in: 100, month_out: 20, week_in: 30, week_out: 10 },
    },
    currentMonth: {
      totals: { incomeEgp: 2000, expenseEgp: 500, netEgp: 1500 },
      spend: { totalEgp: 500, usdNative: 10, count: 3 },
    },
    previousMonth: {
      totals: { incomeEgp: 1800, expenseEgp: 400, netEgp: 1400 },
      spend: { totalEgp: 400, usdNative: 8, count: 2 },
    },
    budgetSummary: {
      budgeted: 1000,
      spent: 500,
      left: 500,
      pct: 0.5,
      categoryCount: 2,
    },
    commitmentPayments: [
      {
        id: 'paid',
        commitment_id: 'commitment',
        due_date: '2026-07-10',
        paid_date: '2026-07-09',
        skipped_date: null,
        amount_due: 100,
        amount_paid: 90,
        currency: Currency.EGP,
        exchange_rate_snapshot: null,
        account_id: 'usd-bank',
        transaction_id: null,
        status: CommitmentPaymentStatus.Paid,
        notes: null,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-07-09T00:00:00.000Z',
      },
    ],
    loadedAt: new Date('2026-07-23T10:00:00.000Z').getTime(),
  };
}

let dashboardStoreState: {
  snapshot: DashboardSnapshot | undefined;
  status:
    | 'idle'
    | 'initialLoading'
    | 'ready'
    | 'refreshing'
    | 'refreshErrorWithData'
    | 'initialError';
  requestedKey: string | undefined;
  requestGeneration: number;
  ensureSnapshot: typeof ensureSnapshot;
  refresh: typeof refreshSnapshot;
  retry: typeof retrySnapshot;
  revalidateAfterMutation: typeof revalidateAfterMutation;
  invalidate: typeof invalidate;
  reset: jest.MockedFunction<() => void>;
};

let dashboardUiState: {
  isBreakdownVisible: boolean;
  selectedSegment: 'overview' | 'accounts';
  setBreakdownVisible: typeof setBreakdownVisible;
  setSelectedSegment: typeof setSelectedSegment;
  reset: jest.MockedFunction<() => void>;
};

let currencyState: {
  rate: number;
  isManualOverride: boolean;
};

let transactionStoreState: {
  mutationVersion: number;
};

beforeEach(() => {
  jest.useFakeTimers({ now: new Date('2026-07-23T10:00:00.000Z') });
  mockCapturedFocusCallback = undefined;
  mockScheduledTasks.length = 0;
  jest.clearAllMocks();

  ensureSnapshot.mockResolvedValue(undefined);
  refreshSnapshot.mockResolvedValue(undefined);
  retrySnapshot.mockResolvedValue(undefined);
  revalidateAfterMutation.mockResolvedValue(undefined);
  dashboardStoreState = {
    snapshot: populatedSnapshot(),
    status: 'ready',
    requestedKey: '2026-07',
    requestGeneration: 1,
    ensureSnapshot,
    refresh: refreshSnapshot,
    retry: retrySnapshot,
    revalidateAfterMutation,
    invalidate,
    reset: jest.fn(),
  };
  dashboardUiState = {
    isBreakdownVisible: false,
    selectedSegment: 'overview',
    setBreakdownVisible,
    setSelectedSegment,
    reset: jest.fn(),
  };
  currencyState = {
    rate: 50,
    isManualOverride: false,
  };
  transactionStoreState = {
    mutationVersion: 0,
  };

  attachMockSelectorStore(useDashboardStore, () => dashboardStoreState);
  attachMockSelectorStore(useDashboardState, () => dashboardUiState);
  attachMockSelectorStore(useCurrencyStore, () => currencyState);
  attachMockSelectorStore(useTransactionStore, () => transactionStoreState);
});

afterEach(() => {
  jest.useRealTimers();
});

describe('useDashboard', () => {
  it('schedules one captured snapshot request on focus and invalidates on cleanup', () => {
    renderHook(() => useDashboard());

    let cleanup: void | (() => void);
    act(() => {
      cleanup = mockCapturedFocusCallback?.();
    });

    expect(setSelectedSegment).toHaveBeenCalledWith('overview');
    expect(runAfterInteractions).toHaveBeenCalledTimes(1);
    expect(ensureSnapshot).not.toHaveBeenCalled();

    act(() => {
      void mockScheduledTasks[0].callback();
    });
    expect(ensureSnapshot).toHaveBeenCalledWith({
      yearMonth: '2026-07',
      now: new Date('2026-07-23T10:00:00.000Z'),
    });

    act(() => {
      cleanup?.();
    });
    expect(mockScheduledTasks[0].cancel).toHaveBeenCalledTimes(1);
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('refreshes and retries immediately with a newly captured month key', async () => {
    const { result } = renderHook(() => useDashboard());

    await act(async () => result.current.refresh());
    expect(runAfterInteractions).not.toHaveBeenCalled();
    expect(refreshSnapshot).toHaveBeenCalledWith({
      yearMonth: '2026-07',
      now: expect.any(Date),
    });

    jest.setSystemTime(new Date('2026-08-01T00:00:00.000Z'));
    await act(async () => result.current.retry());
    expect(retrySnapshot).toHaveBeenCalledWith({
      yearMonth: '2026-08',
      now: expect.any(Date),
    });
  });

  it('supersedes and revalidates after a transaction mutation while Dashboard stays focused', () => {
    const { rerender } = renderHook(() => useDashboard());

    act(() => {
      mockCapturedFocusCallback?.();
    });
    expect(revalidateAfterMutation).not.toHaveBeenCalled();

    transactionStoreState.mutationVersion += 1;
    rerender({});

    expect(revalidateAfterMutation).toHaveBeenCalledTimes(1);
    expect(revalidateAfterMutation).toHaveBeenCalledWith({
      yearMonth: '2026-07',
      now: new Date('2026-07-23T10:00:00.000Z'),
    });
  });

  it('leaves an unfocused mutation for the next focus snapshot request', () => {
    const { rerender } = renderHook(() => useDashboard());

    transactionStoreState.mutationVersion += 1;
    rerender({});

    expect(revalidateAfterMutation).not.toHaveBeenCalled();

    act(() => {
      mockCapturedFocusCallback?.();
      void mockScheduledTasks[0].callback();
    });

    expect(ensureSnapshot).toHaveBeenCalledTimes(1);
    expect(revalidateAfterMutation).not.toHaveBeenCalled();
  });

  it('derives every Dashboard section from one matching snapshot', () => {
    const currentSnapshot = dashboardStoreState.snapshot;
    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.accounts).toBe(currentSnapshot?.accounts);
    expect(result.current.state.statsMap).toBe(currentSnapshot?.statsMap);
    expect(result.current.state.netWorth).toMatchObject({
      assetsEgp: 5000,
      liabilitiesEgp: 1000,
      netWorthEgp: 4000,
    });
    expect(result.current.state.liquidity.liquidEgp).toBe(5000);
    expect(result.current.state.liabilities).toHaveLength(1);
    expect(result.current.state.groupedAccounts[AccountType.Bank]).toHaveLength(1);
    expect(result.current.state.monthSpend).toEqual({
      currentEgp: 500,
      currentUsdNative: 10,
      currentCount: 3,
      previousEgp: 400,
      deltaPct: 25,
      yearMonth: '2026-07',
      loading: false,
    });
    expect(result.current.state.accountCounts).toEqual({ assets: 1, liabilities: 1 });
    expect(result.current.state.commitments).toMatchObject({
      counts: { paid: 1, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 1 },
      yearMonth: '2026-07',
      loading: false,
    });
    expect(result.current.state.commitments.totalsByCurrency).toEqual(
      new Map([[Currency.EGP, 90]]),
    );
    expect(result.current.state.transactions).toEqual({
      current: { incomeEgp: 2000, expenseEgp: 500, netEgp: 1500 },
      previous: { incomeEgp: 1800, expenseEgp: 400, netEgp: 1400 },
      previousLabel: 'June 2026',
      yearMonth: '2026-07',
      loading: false,
    });
    expect(result.current.state.budget).toEqual({
      summary: { budgeted: 1000, spent: 500, left: 500, pct: 0.5, categoryCount: 2 },
      yearMonth: '2026-07',
      loading: false,
    });
    expect(result.current.state.presentation).toMatchObject({
      hasSnapshot: true,
      cardLoading: false,
      isRefreshing: false,
    });
  });

  it('uses the refresh indicator without reloading warm cards', () => {
    dashboardStoreState.status = 'refreshing';

    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.presentation).toMatchObject({
      showDashboardBody: true,
      cardLoading: false,
      isRefreshing: true,
    });
    expect(result.current.state.monthSpend.loading).toBe(false);
    expect(result.current.state.transactions.loading).toBe(false);
    expect(result.current.state.commitments.loading).toBe(false);
    expect(result.current.state.budget.loading).toBe(false);
  });

  it('maps initial errors without selecting the accounts empty state', () => {
    dashboardStoreState.snapshot = undefined;
    dashboardStoreState.status = 'initialError';

    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.presentation).toMatchObject({
      showInitialError: true,
      showAccountsEmptyState: false,
      cardLoading: false,
    });
    expect(result.current.state.accounts).toEqual([]);
    expect(result.current.state.transactions.previous).toBeNull();
  });

  it('projects non-interactive overview state while a matching snapshot is unavailable', () => {
    dashboardStoreState.snapshot = undefined;
    dashboardStoreState.status = 'initialLoading';
    dashboardStoreState.requestedKey = '2026-08';
    dashboardUiState.selectedSegment = 'accounts';
    dashboardUiState.isBreakdownVisible = true;

    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.selectedSegment).toBe('overview');
    expect(result.current.state.isBreakdownVisible).toBe(false);
    expect(setBreakdownVisible).toHaveBeenCalledWith(false);
  });

  it('ignores financial interaction requests while a matching snapshot is unavailable', () => {
    dashboardStoreState.snapshot = undefined;
    dashboardStoreState.status = 'initialLoading';
    dashboardStoreState.requestedKey = '2026-08';

    const { result } = renderHook(() => useDashboard());

    act(() => {
      result.current.setSelectedSegment('accounts');
      result.current.setBreakdownVisible(true);
    });

    expect(setSelectedSegment).not.toHaveBeenCalled();
    expect(setBreakdownVisible).not.toHaveBeenCalled();
  });

  it('re-derives currency values without starting a snapshot request', () => {
    const { result, rerender } = renderHook(() => useDashboard());

    expect(result.current.state.netWorth.assetsEgp).toBe(5000);
    currencyState.rate = 55;
    rerender({});

    expect(result.current.state.netWorth.assetsEgp).toBe(5500);
    expect(ensureSnapshot).not.toHaveBeenCalled();
    expect(refreshSnapshot).not.toHaveBeenCalled();
  });

  it('retains Dashboard navigation and UI actions', () => {
    const { result } = renderHook(() => useDashboard());

    act(() => {
      result.current.setBreakdownVisible(true);
      result.current.setSelectedSegment('accounts');
      result.current.goToAccount('account-id');
      result.current.goToAddAccount();
      result.current.goToSettings();
      result.current.goToTransactions();
      result.current.goToBudget();
      result.current.goToCommitments();
    });

    expect(setBreakdownVisible).toHaveBeenCalledWith(true);
    expect(setSelectedSegment).toHaveBeenCalledWith('accounts');
    expect(mockPush.mock.calls).toEqual([
      ['/accounts/account-id'],
      ['/accounts/add_account'],
      ['/settings'],
      ['/(app)/(tabs)/transactions'],
      ['/(app)/(tabs)/budget'],
      ['/(app)/(tabs)/commitments'],
    ]);
  });
});
