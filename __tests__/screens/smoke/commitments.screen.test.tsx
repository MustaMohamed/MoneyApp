import React from 'react';
import { render } from '@testing-library/react-native';

import CommitmentsScreen from '@/screens/commitments/index';

jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  withTiming: jest.fn((v: any) => v),
  withSpring: jest.fn((v: any) => v),
  View: require('react-native').View,
  createAnimatedComponent: (c: any) => c,
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useFocusEffect: jest.fn() }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return {
    SafeAreaView: View,
    useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('@/screens/commitments/commitments.hook', () => ({
  useCommitments: () => ({
    state: {
      sections: [],
      selectedMonth: '2026-05',
      counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 },
      totalsByCurrency: new Map(),
      refreshing: false,
      isEmpty: true,
      statusFilter: 'all',
      categoriesById: new Map(),
      commitmentsById: new Map(),
    },
    navigateMonth: jest.fn(),
    onRefresh: jest.fn(),
    goToDetail: jest.fn(),
    goToAdd: jest.fn(),
    setStatusFilter: jest.fn(),
  }),
}));

describe('CommitmentsScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<CommitmentsScreen />)).not.toThrow();
  });
});
