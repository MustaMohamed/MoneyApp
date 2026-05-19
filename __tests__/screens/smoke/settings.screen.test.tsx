import { render, fireEvent } from '@testing-library/react-native';
import React from 'react';

import { Strings } from '@/constants/strings';
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
jest.mock('heroui-native', () => {
  const { View, Text, Pressable } = require('react-native');
  const ListGroupItem = ({ children, onPress, ...rest }: any) => (
    <Pressable onPress={onPress} {...rest}>
      {children}
    </Pressable>
  );
  const ListGroupItemPrefix = ({ children }: any) => <View>{children}</View>;
  const ListGroupItemContent = ({ children }: any) => <View>{children}</View>;
  const ListGroupItemTitle = ({ children }: any) => <Text>{children}</Text>;
  const ListGroupItemDescription = ({ children }: any) => <Text>{children}</Text>;
  const ListGroupItemSuffix = ({ children }: any) => <View>{children}</View>;
  const ListGroupRoot = ({ children }: any) => <View>{children}</View>;
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

jest.mock('@/screens/settings/settings.hook', () => ({
  useSettings: () => ({
    goToCurrency: mockGoToCurrency,
    goToCategories: mockGoToCategories,
    goToAbout: mockGoToAbout,
    goBack: jest.fn(),
  }),
}));

describe('SettingsScreen smoke test', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without throwing', () => {
    expect(() => render(<SettingsScreen />)).not.toThrow();
  });

  it('renders Currency row title and description', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.settingsCurrencyRow)).toBeTruthy();
    expect(getByText(Strings.settingsCurrencyDescription)).toBeTruthy();
  });

  it('renders Categories row title and description', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.settingsCategoriesRow)).toBeTruthy();
    expect(getByText(Strings.settingsCategoriesDescription)).toBeTruthy();
  });

  it('renders About row title and description', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText(Strings.aboutTitle)).toBeTruthy();
    expect(getByText(Strings.settingsAboutDescription)).toBeTruthy();
  });

  it('calls goToCurrency when Currency row is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText(Strings.settingsCurrencyRow));
    expect(mockGoToCurrency).toHaveBeenCalledTimes(1);
  });

  it('calls goToCategories when Categories row is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText(Strings.settingsCategoriesRow));
    expect(mockGoToCategories).toHaveBeenCalledTimes(1);
  });

  it('calls goToAbout when About row is pressed', () => {
    const { getByText } = render(<SettingsScreen />);
    fireEvent.press(getByText(Strings.aboutTitle));
    expect(mockGoToAbout).toHaveBeenCalledTimes(1);
  });
});
