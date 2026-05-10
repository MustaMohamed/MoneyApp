import React from 'react';
import { render } from '@testing-library/react-native';

import DashboardScreen from '@/screens/dashboard/index';

jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: any) => v),
  withSpring: jest.fn((v: any) => v),
  withSequence: jest.fn((...args: any[]) => args[args.length - 1]),
  withDelay: jest.fn((_, v: any) => v),
  Easing: { out: jest.fn(), in: jest.fn(), bezier: jest.fn(), linear: 0, ease: 0 },
  FadeIn: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
  FadeOut: { duration: jest.fn() },
  ZoomIn: { duration: jest.fn() },
  SlideInDown: { springify: jest.fn(() => ({ damping: jest.fn(() => ({})) })) },
  View: require('react-native').View,
  ScrollView: require('react-native').ScrollView,
  FlatList: require('react-native').FlatList,
  createAnimatedComponent: (c: any) => c,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
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
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('react-native-actions-sheet', () => {
  const { View } = require('react-native');
  const MockSheet = ({ children }: any) => children ?? null;
  MockSheet.displayName = 'MockActionSheet';
  return {
    __esModule: true,
    default: MockSheet,
    ActionSheet: MockSheet,
  };
});
// Mock the dashboard hook to avoid complex store dependency tree
jest.mock('@/screens/dashboard/dashboard.hook', () => ({
  useDashboard: () => ({
    state: {
      accounts: [],
      rate: 50,
      isManualOverride: false,
      netWorth: { netWorthEgp: 0, netWorthUsd: 0, assetsEgp: 0, assetsUsd: 0, liabilitiesEgp: 0 },
      groupedAccounts: {},
      statsMap: {},
      isBreakdownVisible: false,
      refreshing: false,
      monthSpend: {
        currentEgp: 0,
        currentUsdNative: 0,
        currentCount: 0,
        previousEgp: 0,
        deltaPct: null,
        yearMonth: '2026-05',
      },
      accountCounts: { assets: 0, liabilities: 0 },
      commitments: {
        counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 },
        totalsByCurrency: new Map(),
        yearMonth: '2026-05',
      },
    },
    setBreakdownVisible: jest.fn(),
    refresh: jest.fn(),
    goToAccount: jest.fn(),
    goToAddAccount: jest.fn(),
    goToSettings: jest.fn(),
    goToCommitments: jest.fn(),
  }),
}));
jest.mock('@/screens/dashboard/dashboard.anim', () => ({
  useDashboardAnim: () => ({
    heroStyle: {},
    startEntrance: jest.fn(),
    statsEntering: undefined,
    sectionEntering: () => undefined,
  }),
}));

describe('DashboardScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<DashboardScreen />)).not.toThrow();
  });
});
