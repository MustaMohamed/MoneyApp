import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

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
jest.mock('heroui-native', () => {
  const { View, Text, Pressable } = require('react-native');
  const ListGroupRoot = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const ListGroupItem = ({ children, onPress, ...props }: any) => (
    <Pressable onPress={onPress} {...props}>{children}</Pressable>
  );
  const ListGroupItemPrefix = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const ListGroupItemContent = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  const ListGroupItemTitle = ({ children, ...props }: any) => <Text {...props}>{children}</Text>;
  const ListGroupItemDescription = ({ children, ...props }: any) => <Text {...props}>{children}</Text>;
  const ListGroupItemSuffix = ({ children, ...props }: any) => <View {...props}>{children}</View>;
  ListGroupRoot.Item = ListGroupItem;
  ListGroupRoot.ItemPrefix = ListGroupItemPrefix;
  ListGroupRoot.ItemContent = ListGroupItemContent;
  ListGroupRoot.ItemTitle = ListGroupItemTitle;
  ListGroupRoot.ItemDescription = ListGroupItemDescription;
  ListGroupRoot.ItemSuffix = ListGroupItemSuffix;
  return {
    ListGroup: ListGroupRoot,
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
  };
});

const mockGoToCurrency = jest.fn();
const mockGoToCategories = jest.fn();
const mockGoToAbout = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@/screens/settings/settings.hook', () => ({
  useSettings: jest.fn(),
}));

describe('SettingsScreen smoke test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const { useSettings } = require('@/screens/settings/settings.hook');
    (useSettings as jest.Mock).mockReturnValue({
      goToCurrency: mockGoToCurrency,
      goToCategories: mockGoToCategories,
      goToAbout: mockGoToAbout,
      goBack: mockGoBack,
    });
  });

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
    const { getByTestId } = render(<SettingsScreen />);

    function findAncestorWithMarginTop(
      node: ReturnType<typeof getByTestId> | null | undefined,
    ): { marginTop: number } | undefined {
      let current = node?.parent;
      for (let i = 0; i < 10 && current != null; i++) {
        const s = current.props?.style;
        if (s && typeof s === 'object' && 'marginTop' in s) return s as { marginTop: number };
        current = current.parent;
      }
      return undefined;
    }

    const dataStyle = findAncestorWithMarginTop(getByTestId('settings-group-data'));
    expect(dataStyle).toEqual({ marginTop: Spacing.lg });

    const aboutStyle = findAncestorWithMarginTop(getByTestId('settings-group-about'));
    expect(aboutStyle).toEqual({ marginTop: Spacing.lg });
  });

  it('renders the Currency row title', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.settingsCurrencyRow)).toBeTruthy();
  });

  it('renders the Categories row title', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.settingsCategoriesRow)).toBeTruthy();
  });

  it('renders the About row title', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.aboutTitle)).toBeTruthy();
  });

  it('renders the currency value "EGP" alongside the Currency row', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('EGP')).toBeTruthy();
  });

  it('pressing the Currency row calls goToCurrency', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText(Strings.settingsCurrencyRow));
    expect(mockGoToCurrency).toHaveBeenCalledTimes(1);
  });

  it('pressing the Categories row calls goToCategories', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText(Strings.settingsCategoriesRow));
    expect(mockGoToCategories).toHaveBeenCalledTimes(1);
  });

  it('pressing the About row calls goToAbout', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText(Strings.aboutTitle));
    expect(mockGoToAbout).toHaveBeenCalledTimes(1);
  });
});
