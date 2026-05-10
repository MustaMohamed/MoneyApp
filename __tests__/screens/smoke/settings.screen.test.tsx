import React from 'react';
import { render } from '@testing-library/react-native';

import SettingsScreen from '@/screens/settings/index';

jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  View: require('react-native').View,
  createAnimatedComponent: (c: any) => c,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
jest.mock('@/screens/settings/settings.hook', () => ({
  useSettings: () => ({
    goToCurrency: jest.fn(),
    goToCategories: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('SettingsScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<SettingsScreen />)).not.toThrow();
  });
});
