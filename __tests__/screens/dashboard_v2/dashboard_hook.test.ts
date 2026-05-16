import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { useDashboardV2 } from '@/screens/dashboard_v2/dashboard.hook';

// All stores are mocked so no real Zustand stores are instantiated.
// useDashboardV2State is mocked but backed by a simple object so tests
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

jest.mock('@/database/account_stats', () => ({
  getAccountsStats: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/database/transactions', () => ({
  getMonthExpenseStats: jest
    .fn()
    .mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }),
}));

jest.mock('@/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) },
}));

jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
jest.mock('@/screens/dashboard_v2/dashboard.store', () => ({ useDashboardV2Store: jest.fn() }));
jest.mock('@/screens/dashboard_v2/dashboard.state', () => ({ useDashboardV2State: jest.fn() }));

const { useAccountStore } = jest.requireMock('@/store/account.store');
const { useCurrencyStore } = jest.requireMock('@/store/currency.store');
const { useCommitmentStore } = jest.requireMock('@/store/commitment.store');
const { useDashboardV2Store } = jest.requireMock('@/screens/dashboard_v2/dashboard.store');
const { useDashboardV2State } = jest.requireMock('@/screens/dashboard_v2/dashboard.state');

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
const setBreakdownVisible = jest.fn((v: boolean) => { uiState.isBreakdownVisible = v; });
const setRefreshing = jest.fn((v: boolean) => { uiState.refreshing = v; });
const setSelectedSegment = jest.fn((s: 'overview' | 'accounts') => { uiState.selectedSegment = s; });

function setupMocks(accounts = BASE_ACCOUNTS) {
  (useAccountStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts }, loadAccounts: jest.fn() }),
  );
  (useCurrencyStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { rate: 48.85, isManualOverride: false } }),
  );
  (useCommitmentStore as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { commitments: [], payments: [] } }),
  );
  (useDashboardV2Store as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: {
        statsMap: {},
        currentMonthCommitmentPayments: [],
        currentMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
        previousMonthSpend: { totalEgp: 0, usdNative: 0, count: 0 },
      },
      setStatsMap: jest.fn(),
      setCurrentMonthCommitmentPayments: jest.fn(),
      setMonthSpendStats: jest.fn(),
    }),
  );
  (useDashboardV2State as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: uiState,
      setBreakdownVisible,
      setRefreshing,
      setSelectedSegment,
    }),
  );
}

beforeEach(() => {
  capturedFocusCallback = null;
  uiState = { isBreakdownVisible: false, refreshing: false, selectedSegment: 'overview' };
  setBreakdownVisible.mockClear();
  setRefreshing.mockClear();
  setSelectedSegment.mockClear();
  setupMocks();
});

describe('useDashboardV2', () => {
  it('defaults selectedSegment to overview', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.state.selectedSegment).toBe('overview');
  });

  it('setSelectedSegment updates state', () => {
    const { result } = renderHook(() => useDashboardV2());
    act(() => result.current.setSelectedSegment('accounts'));
    expect(setSelectedSegment).toHaveBeenCalledWith('accounts');
  });

  it('exposes liquidity memo computed from accounts', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.state.liquidity.liquidEgp).toBe(27000);
    expect(result.current.state.liquidity.reserveEgp).toBe(10000);
  });

  it('exposes liabilities memo with credit cards only', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.state.liabilities).toEqual([
      { id: 'a3', name: 'Visa', balanceEgp: 4080 },
    ]);
  });

  it('useFocusEffect resets segment to overview', () => {
    uiState.selectedSegment = 'accounts';
    renderHook(() => useDashboardV2());
    act(() => {
      capturedFocusCallback?.();
    });
    expect(setSelectedSegment).toHaveBeenCalledWith('overview');
  });
});
