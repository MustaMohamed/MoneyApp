import React from 'react';
import { render } from '@testing-library/react-native';

import TransactionsScreen from '@/screens/transactions/index';

jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  useDerivedValue: jest.fn((fn: any) => ({ value: fn() })),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  withTiming: jest.fn((v: any) => v),
  withSpring: jest.fn((v: any) => v),
  withSequence: jest.fn((...args: any[]) => args[args.length - 1]),
  withDelay: jest.fn((_: any, v: any) => v),
  Easing: { out: jest.fn(), in: jest.fn(), bezier: jest.fn(), linear: 0, ease: 0 },
  FadeIn: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
  FadeOut: { duration: jest.fn() },
  View: require('react-native').View,
  ScrollView: require('react-native').ScrollView,
  FlatList: require('react-native').FlatList,
  createAnimatedComponent: (c: any) => c,
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useFocusEffect: jest.fn(),
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('react-native-actions-sheet', () => {
  const MockSheet = ({ children }: any) => children ?? null;
  return {
    __esModule: true,
    default: MockSheet,
    ActionSheet: MockSheet,
    FlatList: require('react-native').FlatList,
    ScrollView: require('react-native').ScrollView,
  };
});

// Mock the transactions hook
jest.mock('@/screens/transactions/transactions.hook', () => ({
  useTransactions: () => ({
    state: {
      sections: [],
      hasMore: false,
      loading: false,
      refreshing: false,
      emptyVariant: 'noData',
      searchQuery: '',
      activeFilter: 'all',
      accountsById: new Map(),
      categoriesById: new Map(),
      activeFilterCount: 0,
    },
    setSearchQuery: jest.fn(),
    setActiveFilter: jest.fn(),
    clearSearch: jest.fn(),
    onEndReached: jest.fn(),
    onRefresh: jest.fn(),
    openFilter: jest.fn(),
  }),
}));

// Mock all Zustand stores that the screen uses directly via getState
const mockAddTxState = {
  state: { visible: false },
  open: jest.fn(),
  close: jest.fn(),
};
const mockAddTxStore = { reset: jest.fn() };
const mockTxStore = { setQuery: jest.fn().mockResolvedValue(undefined) };
const mockFilterDrawerState = { state: { visible: false }, close: jest.fn() };
const mockTransactionsState = { reset: jest.fn() };
const mockTransactionsScreenStore = { reset: jest.fn() };

jest.mock('@/screens/transactions/transaction_form/add_transaction.state', () => ({
  useAddTransactionState: Object.assign(
    jest.fn((sel: any) => sel(mockAddTxState)),
    {
      getState: jest.fn(() => mockAddTxState),
    },
  ),
}));
jest.mock('@/screens/transactions/transaction_form/add_transaction.store', () => ({
  useAddTransactionStore: { getState: jest.fn(() => mockAddTxStore) },
}));
jest.mock('@/store/transaction.store', () => ({
  useTransactionStore: { getState: jest.fn(() => mockTxStore) },
}));
jest.mock('@/screens/transactions/filter/filter.state', () => ({
  useFilterDrawerState: Object.assign(
    jest.fn((sel: any) => sel(mockFilterDrawerState)),
    {
      getState: jest.fn(() => mockFilterDrawerState),
    },
  ),
}));
jest.mock('@/screens/transactions/transactions.state', () => ({
  useTransactionsState: Object.assign(
    jest.fn((sel: any) => sel(mockTransactionsState)),
    {
      getState: jest.fn(() => mockTransactionsState),
    },
  ),
}));
jest.mock('@/screens/transactions/transactions.store', () => ({
  useTransactionsScreenStore: Object.assign(
    jest.fn((sel: any) => sel(mockTransactionsScreenStore)),
    { getState: jest.fn(() => mockTransactionsScreenStore) },
  ),
}));

// Mock subcomponents that have complex dependencies
jest.mock('@/screens/transactions/transaction_form', () => ({ AddTransactionSheet: () => null }));
jest.mock('@/screens/transactions/filter', () => ({ FilterDrawer: () => null }));
jest.mock('@/screens/transactions/components/filter_chips', () => ({ FilterChips: () => null }));
jest.mock('@/screens/transactions/transactions.anim', () => ({ useTransactionsAnim: () => ({}) }));

describe('TransactionsScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<TransactionsScreen />)).not.toThrow();
  });
});
