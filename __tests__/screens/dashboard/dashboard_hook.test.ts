import { signal } from '@preact/signals-react';
import { act, renderHook, waitFor } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { useDashboard } from '@/modules/dashboard/screens/dashboard/dashboard.hook';

// All stores are mocked so no real Zustand stores are instantiated.
// useDashboardState is mocked but backed by a simple object so tests
// can inspect and mutate selectedSegment directly.

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

let capturedFocusCallback: (() => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => {
    capturedFocusCallback = cb;
  },
}));

jest.mock('@/database/client', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/modules/accounts/database/account_stats', () => ({
  getAccountsStats: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/modules/transactions/database/transactions', () => ({
  getMonthExpenseStats: jest.fn().mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }),
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
const { useDashboardStore } = jest.requireMock(
  '@/modules/dashboard/screens/dashboard/dashboard.store',
);
const { useDashboardState } = jest.requireMock(
  '@/modules/dashboard/screens/dashboard/dashboard.state',
);

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

function setupMocks(accounts = BASE_ACCOUNTS) {
  const { attachMockSelectorStore } = require('@/test_helpers/mock_zustand_selectors');
  (useAccountStore as jest.Mock).mockReturnValue({
    state: {
      accounts: { value: accounts },
    },
    init: jest.fn(),
  });
  (useCurrencyStore as jest.Mock).mockReturnValue({
    state: {
      rate: signal(48.85),
      isManualOverride: signal(false),
    },
  });
  attachMockSelectorStore(useCommitmentStore as jest.Mock, () => ({
    commitments: [],
    payments: [],
  }));
  attachMockSelectorStore(useDashboardStore as jest.Mock, () => ({
    statsMap: {},
    currentMonthCommitmentPayments: [],
    currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
    previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
    setStatsMap: jest.fn(),
    setCurrentMonthCommitmentPayments: jest.fn(),
    setMonthSpendStats: jest.fn(),
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
  uiState = { isBreakdownVisible: false, refreshing: false, selectedSegment: 'overview' };
  setBreakdownVisible.mockClear();
  setRefreshing.mockClear();
  setSelectedSegment.mockClear();
  commitmentRepository.getPaymentsForMonth.mockClear();
  setupMocks();
});

describe('useDashboard', () => {
  it('defaults selectedSegment to overview', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.state.selectedSegment).toBe('overview');
  });

  it('does not expose a store-loaded sentinel', () => {
    (useAccountStore as jest.Mock).mockReturnValue({
      state: {
        accounts: { value: [] },
      },
      init: jest.fn(),
    });

    const { result } = renderHook(() => useDashboard());

    expect(result.current.state.accounts).toEqual([]);
    expect('accountsLoaded' in result.current.state).toBe(false);
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
    });

    expect(useCommitmentStore).not.toHaveBeenCalled();
    await waitFor(() => {
      expect(commitmentRepository.getPaymentsForMonth).toHaveBeenCalledTimes(1);
    });
  });
});
