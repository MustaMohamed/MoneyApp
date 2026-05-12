import React from 'react';
import { render } from '@testing-library/react-native';

import SettingsScreen from '@/screens/settings/index';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

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
    goToAbout: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('SettingsScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<SettingsScreen />)).not.toThrow();
  });

  it('renders all three section group headers', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.settingsGroupPreferences)).toBeTruthy();
    expect(getByText(Strings.settingsGroupData)).toBeTruthy();
    expect(getByText(Strings.settingsGroupAbout)).toBeTruthy();
  });

  it('Data and About section wrappers carry marginTop: Spacing.lg', () => {
    const { getByText } = render(<SettingsScreen />);

    // Walk ancestors until we find the node whose style includes marginTop: Spacing.lg
    function findAncestorWithMarginTop(
      node: ReturnType<typeof getByText> | null | undefined,
    ): { marginTop: number } | undefined {
      let current = node?.parent;
      for (let i = 0; i < 10 && current != null; i++) {
        const s = current.props?.style;
        if (s && typeof s === 'object' && 'marginTop' in s) return s as { marginTop: number };
        current = current.parent;
      }
      return undefined;
    }

    const dataStyle = findAncestorWithMarginTop(getByText(Strings.settingsGroupData));
    expect(dataStyle).toEqual({ marginTop: Spacing.lg });

    const aboutStyle = findAncestorWithMarginTop(getByText(Strings.settingsGroupAbout));
    expect(aboutStyle).toEqual({ marginTop: Spacing.lg });
  });
});
