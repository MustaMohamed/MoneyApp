import { renderHook } from '@testing-library/react-native';
import { useDashboard } from '@/screens/dashboard/dashboard.hook';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useDashboardState } from '@/screens/dashboard/dashboard.state';
import { useDashboardStore } from '@/screens/dashboard/dashboard.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
jest.mock('@/database/account_stats', () => ({
  getAccountsStats: jest.fn().mockResolvedValue({}),
}));
jest.mock('@/database/transactions', () => ({
  getMonthExpenseStats: jest.fn().mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }),
}));
jest.mock('@/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) },
}));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
jest.mock('@/screens/dashboard/dashboard.state', () => ({ useDashboardState: jest.fn() }));
jest.mock('@/screens/dashboard/dashboard.store', () => ({ useDashboardStore: jest.fn() }));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, loadAccounts: jest.fn() }),
  );
  (useCurrencyStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { rate: 50, isManualOverride: false } }),
  );
  (useCommitmentStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { commitments: [], payments: [] } }),
  );
  (useDashboardState as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { isBreakdownVisible: false, refreshing: false },
      setBreakdownVisible: jest.fn(),
      setRefreshing: jest.fn(),
    }),
  );
  (useDashboardStore as unknown as jest.Mock).mockImplementation((sel: any) =>
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
}

describe('useDashboard', () => {
  beforeEach(setup);

  it('renders without throwing and returns state', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.state.accounts).toEqual([]);
    expect(result.current.state.rate).toBe(50);
  });

  it('netWorth defaults to zero when no accounts', () => {
    const { result } = renderHook(() => useDashboard());
    expect(result.current.state.netWorth.netWorthEgp).toBe(0);
  });
});
