import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionsScreen from '@/screens/transactions';

jest.mock('react-native-reanimated', () => {
  const { View } = jest.requireActual('react-native');
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    useSharedValue: () => ({ value: 1 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
  };
});

jest.mock('react-native-gesture-handler', () => {
  const { View } = jest.requireActual('react-native');
  return { GestureHandlerRootView: View };
});

jest.mock('heroui-native', () => {
  const { View, Text } = jest.requireActual('react-native');
  return { cn: (...a: unknown[]) => a.filter(Boolean).join(' '), View, Text };
});

jest.mock('@/components/ui/sheet', () => {
  const mockReact = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: { visible: boolean; children: unknown }) =>
    props.visible ? mockReact.createElement(View, null, props.children) : null;
  Sheet.Body = ({ children }: { children: unknown }) =>
    mockReact.createElement(View, null, children);
  return { Sheet, SHEET_FOOTER_CLEARANCE: 0 };
});

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
  useFocusEffect: jest.fn(),
}));

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));

jest.mock('react-native-safe-area-context', () => {
  const { View } = jest.requireActual('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));

jest.mock('react-native-actions-sheet', () => {
  const MockSheet = ({ children }: any) => children ?? null;
  return { __esModule: true, default: MockSheet, ActionSheet: MockSheet };
});

jest.mock('@/components/ui/input', () => {
  const { TextInput } = jest.requireActual('react-native');
  return { Input: TextInput };
});

// Mock stores used via getState in the screen
const mockAddTxState = {
  state: { visible: false },
  open: jest.fn(),
  close: jest.fn(),
  reset: jest.fn(),
};
const mockAddTxStore = { reset: jest.fn() };
const mockFilterState = {
  state: { visible: false, dateRangeSheetVisible: false, openSection: null },
  open: jest.fn(),
  close: jest.fn(),
  setDateRangeSheetVisible: jest.fn(),
};

jest.mock('@/screens/transactions/transaction_form/add_transaction.state', () => ({
  useAddTransactionState: Object.assign(
    jest.fn((sel: any) => sel(mockAddTxState)),
    { getState: jest.fn(() => mockAddTxState) },
  ),
}));

jest.mock('@/screens/transactions/transaction_form/add_transaction.store', () => ({
  useAddTransactionStore: { getState: jest.fn(() => mockAddTxStore) },
}));

// §7: V2 paths mocked alongside V1 so the flag-branch (newAddTransaction) doesn't
// reach the real V2 hook implementation, which would loop against the simplified
// useShallow mock at line 43. Mocks collapse to a single set at Task 27 cleanup
// when V2 takes over the V1 path.
jest.mock('@/screens/transactions/transaction_form_v2/add_transaction.state', () => ({
  useAddTransactionState: Object.assign(
    jest.fn((sel: any) => sel(mockAddTxState)),
    { getState: jest.fn(() => mockAddTxState) },
  ),
}));
jest.mock('@/screens/transactions/transaction_form_v2/add_transaction.store', () => ({
  useAddTransactionStore: { getState: jest.fn(() => mockAddTxStore) },
}));

jest.mock('@/screens/transactions/filter/filter.state', () => ({
  useFilterState: Object.assign(
    jest.fn((sel: any) => sel(mockFilterState)),
    { getState: jest.fn(() => mockFilterState) },
  ),
}));

// Mock subcomponents with complex deps
jest.mock('@/screens/transactions/transaction_form', () => ({
  AddTransactionSheet: () => null,
}));
jest.mock('@/screens/transactions/transaction_form_v2', () => ({
  AddTransactionSheet: () => null,
}));
jest.mock('@/screens/transactions/filter', () => ({ FilterSheet: () => null }));
jest.mock('@/screens/transactions/components/date_range_sheet', () => ({
  DateRangeSheet: () => null,
}));

const setSearchQuery = jest.fn();
const setActiveFilter = jest.fn();
const setPeriod = jest.fn();
const onRefresh = jest.fn();
const openFilter = jest.fn();

let mockReturn: any;

jest.mock('@/screens/transactions/transactions.hook', () => ({
  useTransactions: () => mockReturn,
}));

function makeReturn(overrides: any = {}) {
  const { state: stateOverrides, ...restOverrides } = overrides;
  return {
    state: {
      sections: [],
      hasMore: false,
      loading: false,
      refreshing: false,
      emptyVariant: 'noData',
      searchQuery: '',
      activeFilter: 'all',
      period: { type: 'month', yearMonth: '2026-05' },
      customRange: null,
      accountsById: new Map(),
      categoriesById: new Map(),
      activeFilterCount: 0,
      totals: null,
      previousLabel: null,
      ...stateOverrides,
    },
    setSearchQuery,
    setActiveFilter,
    setPeriod,
    setCustomRange: jest.fn(),
    clearSearch: jest.fn(),
    onEndReached: jest.fn(),
    onRefresh,
    openFilter,
    goToDetail: jest.fn(),
    ...restOverrides,
  };
}

beforeEach(() => {
  setSearchQuery.mockReset();
  setActiveFilter.mockReset();
  setPeriod.mockReset();
  onRefresh.mockReset();
  openFilter.mockReset();
});

describe('TransactionsScreen', () => {
  it('renders empty state when no transactions', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText('Add Transaction')).toBeTruthy();
  });

  it('renders header title', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText('Transactions')).toBeTruthy();
  });

  it('renders carousel pills', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText('Custom')).toBeTruthy();
  });

  it('renders type chips', () => {
    mockReturn = makeReturn();
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText('Income')).toBeTruthy();
    expect(getByText('Expense')).toBeTruthy();
    expect(getByText('Transfer')).toBeTruthy();
  });

  it('does NOT render the TotalsStrip vs-caption when period is "all"', () => {
    mockReturn = makeReturn({ state: { period: { type: 'all' } } });
    const { queryByText } = render(<TransactionsScreen />);
    expect(queryByText(/^vs /)).toBeNull();
  });

  it('renders TotalsStrip with caption when period is a month and totals loaded', () => {
    mockReturn = makeReturn({
      state: {
        period: { type: 'month', yearMonth: '2026-05' },
        previousLabel: 'Apr 2026',
        totals: {
          current: { incomeEgp: 1000, expenseEgp: 500, netEgp: 500 },
          previous: { incomeEgp: 900, expenseEgp: 600, netEgp: 300 },
        },
      },
    });
    const { getByText } = render(<TransactionsScreen />);
    expect(getByText('vs Apr 2026')).toBeTruthy();
  });
});
