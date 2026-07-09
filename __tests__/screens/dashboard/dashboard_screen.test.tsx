import { render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { AccountType, Currency } from '@/constants/enums';
import DashboardScreen from '@/modules/dashboard/screens/dashboard';
import { useDashboard } from '@/modules/dashboard/screens/dashboard/dashboard.hook';

jest.mock('@/modules/dashboard/screens/dashboard/dashboard.hook', () => ({
  useDashboard: jest.fn(),
}));
jest.mock('@/modules/dashboard/screens/dashboard/dashboard.anim', () => ({
  useDashboardAnim: () => ({
    heroStyle: {},
    startEntrance: jest.fn(),
    statsEntering: undefined,
    sectionEntering: () => undefined,
  }),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('react-native-worklets', () => ({ scheduleOnRN: jest.fn() }));
jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  const gesture = {
    activeOffsetX: () => gesture,
    failOffsetY: () => gesture,
    onEnd: () => gesture,
  };
  return {
    Gesture: { Pan: () => gesture },
    GestureDetector: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return { __esModule: true, default: { View } };
});
jest.mock('heroui-native', () => {
  const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
  function Tabs({ children }: { children?: ReactNode }) {
    return <View>{children}</View>;
  }
  Tabs.List = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Tabs.Indicator = () => <View />;
  Tabs.Trigger = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Tabs.Label = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  const HeroText = {
    Heading: ({ children }: { children?: ReactNode }) => <Text>{children}</Text>,
  };
  return {
    Button: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Separator: () => <View />,
    Surface: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    Tabs,
    Text: HeroText,
  };
});
jest.mock('@/components/ui/screen', () => ({
  Screen: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
  ScreenScroll: ({ children }: { children?: ReactNode }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return <View>{children}</View>;
  },
}));
jest.mock('@/components/ui/empty_state', () => ({
  EmptyState: ({ variant }: { variant: string }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`empty:${variant}`}</Text>;
  },
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/hero_card', () => ({
  HeroCard: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`hero-loading:${String(isLoading)}`}</Text>;
  },
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/stat_cards', () => ({
  StatCards: ({
    netWorthLoading,
    monthSpendLoading,
  }: {
    netWorthLoading?: boolean;
    monthSpendLoading?: boolean;
  }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <>
        <Text>{`net-worth-loading:${String(netWorthLoading)}`}</Text>
        <Text>{`month-spend-loading:${String(monthSpendLoading)}`}</Text>
      </>
    );
  },
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/transactions_card', () => ({
  TransactionsCard: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`transactions-loading:${String(isLoading)}`}</Text>;
  },
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/commitments_card', () => ({
  CommitmentsCard: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`commitments-loading:${String(isLoading)}`}</Text>;
  },
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/budget_card', () => ({
  BudgetCard: ({ isLoading }: { isLoading?: boolean }) => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>{`budget-loading:${String(isLoading)}`}</Text>;
  },
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/account_carousel', () => ({
  AccountCarousel: () => null,
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/net_worth_breakdown_sheet', () => ({
  NetWorthBreakdownSheet: () => null,
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/section_header', () => ({
  SectionHeader: () => null,
}));
jest.mock('@/modules/dashboard/screens/dashboard/components/total_balance_strip', () => ({
  TotalBalanceStrip: () => null,
}));

type DashboardHook = ReturnType<typeof useDashboard>;
type DashboardState = DashboardHook['state'];

const baseState: DashboardState = {
  accounts: [],
  accountsLoaded: false,
  rate: 49.06,
  isManualOverride: false,
  netWorth: {
    assetsEgp: 0,
    assetsUsd: 0,
    liabilitiesEgp: 0,
    netWorthEgp: 0,
    netWorthUsd: 0,
  },
  liquidity: {
    liquidEgp: 0,
    liquidCount: 0,
    liquidAccounts: [],
    reserveEgp: 0,
    reserveCount: 0,
    reserveAccounts: [],
  },
  liabilities: [],
  groupedAccounts: {},
  statsMap: {},
  isBreakdownVisible: false,
  refreshing: false,
  selectedSegment: 'overview',
  monthSpend: {
    currentEgp: 0,
    currentUsdNative: 0,
    currentCount: 0,
    previousEgp: 0,
    deltaPct: null,
    yearMonth: '2026-07',
    loading: true,
  },
  accountCounts: { assets: 0, liabilities: 0 },
  commitments: {
    counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 },
    totalsByCurrency: new Map(),
    yearMonth: '2026-07',
    loading: true,
  },
  transactions: {
    current: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
    previous: null,
    previousLabel: 'June 2026',
    yearMonth: '2026-07',
    loading: true,
  },
  budget: {
    summary: { budgeted: 0, spent: 0, left: 0, pct: 0, categoryCount: 0 },
    yearMonth: '2026-07',
    loading: true,
  },
};

const mockedUseDashboard = jest.mocked(useDashboard);

function mockUseDashboard(state: Partial<DashboardState> = {}) {
  mockedUseDashboard.mockReturnValue({
    state: { ...baseState, ...state },
    setBreakdownVisible: jest.fn(),
    setSelectedSegment: jest.fn(),
    refresh: jest.fn(),
    goToAccount: jest.fn(),
    goToAddAccount: jest.fn(),
    goToSettings: jest.fn(),
    goToTransactions: jest.fn(),
    goToBudget: jest.fn(),
    goToCommitments: jest.fn(),
  });
}

describe('DashboardScreen loading state', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseDashboard();
  });

  it('shows dashboard skeleton cards instead of the accounts empty state while accounts load', () => {
    const { getByText, queryByText } = render(<DashboardScreen />);

    expect(queryByText('empty:accounts')).toBeNull();
    expect(getByText('hero-loading:true')).toBeTruthy();
    expect(getByText('net-worth-loading:true')).toBeTruthy();
  });

  it('shows dashboard skeleton cards while manually refreshing loaded account data', () => {
    mockUseDashboard({
      accountsLoaded: true,
      refreshing: true,
      accounts: [
        {
          id: 'acc-1',
          name: 'CIB',
          type: AccountType.Bank,
          currency: Currency.EGP,
          opening_balance: 1000,
          current_balance: 1000,
          color: null,
          credit_limit: null,
          revolving_balance: null,
          minimum_payment: null,
          statement_due_day: null,
          interest_tracking: 0,
          apr: null,
          is_archived: 0,
          sort_order: 0,
          created_at: '2026-07-01T00:00:00.000Z',
          updated_at: '2026-07-01T00:00:00.000Z',
        },
      ],
    });

    const { getByText, queryByText } = render(<DashboardScreen />);

    expect(queryByText('empty:accounts')).toBeNull();
    expect(getByText('hero-loading:true')).toBeTruthy();
    expect(getByText('net-worth-loading:true')).toBeTruthy();
    expect(getByText('month-spend-loading:true')).toBeTruthy();
    expect(getByText('transactions-loading:true')).toBeTruthy();
    expect(getByText('budget-loading:true')).toBeTruthy();
    expect(getByText('commitments-loading:true')).toBeTruthy();
  });
});
