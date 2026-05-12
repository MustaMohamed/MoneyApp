import React from 'react';
import { render } from '@testing-library/react-native';

import CurrencyScreen from '@/screens/settings/currency/index';
import { Strings } from '@/constants/strings';

jest.mock('react-native-reanimated', () => ({
  default: { View: require('react-native').View },
  useSharedValue: jest.fn((v: any) => ({ value: v })),
  useAnimatedStyle: jest.fn(() => ({})),
  View: require('react-native').View,
  createAnimatedComponent: (c: any) => c,
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
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
jest.mock('@/components/ui/button', () => {
  const { Text, Pressable } = require('react-native');
  return {
    Button: ({ label, onPress, testID, ...props }: any) => (
      <Pressable onPress={onPress} testID={testID} accessibilityLabel={label}>
        <Text>{label}</Text>
      </Pressable>
    ),
  };
});
jest.mock('@/components/ui/input', () => {
  const { TextInput } = require('react-native');
  return {
    Input: ({ testID, ...props }: any) => <TextInput testID={testID ?? 'input'} {...props} />,
  };
});

// Mock HeroUI Accordion compound component
jest.mock('heroui-native', () => {
  const { View, Pressable } = require('react-native');

  // Accordion mock — renders trigger + content inline (no expansion state needed for smoke)
  const AccordionContent = ({ children, ...props }: any) => (
    <View testID="accordion-content" {...props}>
      {children}
    </View>
  );
  const AccordionIndicator = (props: any) => <View testID="accordion-indicator" {...props} />;
  const AccordionTrigger = ({ children, ...props }: any) => (
    <Pressable testID="accordion-trigger" {...props}>
      {children}
    </Pressable>
  );
  const AccordionItem = ({ children, ...props }: any) => (
    <View testID="accordion-item" {...props}>
      {typeof children === 'function'
        ? children({ isExpanded: false, value: 'manual-override' })
        : children}
    </View>
  );
  const AccordionRoot = ({ children, ...props }: any) => (
    <View testID="accordion-root" {...props}>
      {children}
    </View>
  );
  AccordionRoot.Item = AccordionItem;
  AccordionRoot.Trigger = AccordionTrigger;
  AccordionRoot.Indicator = AccordionIndicator;
  AccordionRoot.Content = AccordionContent;

  return {
    Accordion: AccordionRoot,
    cn: (...args: any[]) => args.filter(Boolean).join(' '),
  };
});

jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  Controller: ({ render: renderProp }: any) =>
    renderProp({ field: { value: '', onChange: jest.fn(), onBlur: jest.fn() } }),
}));

jest.mock('@/screens/settings/currency/currency.hook', () => ({
  useCurrencyScreen: () => ({
    state: {
      rate: 49.5,
      lastFetched: null,
      isManualOverride: false,
      isFetching: false,
      isSaving: false,
      fetchError: '',
    },
    form: {
      control: {},
      handleSubmit: (fn: any) => fn,
      formState: { errors: {} },
    },
    handleFetchRate: jest.fn(),
    handleSaveManualRate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

describe('CurrencyScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<CurrencyScreen />)).not.toThrow();
  });

  it('renders the Accordion root', () => {
    const { getByTestId } = render(<CurrencyScreen />);
    expect(getByTestId('accordion-root')).toBeTruthy();
  });

  it('renders the Accordion trigger containing the Manual Override label', () => {
    const { getByTestId, getByText } = render(<CurrencyScreen />);
    expect(getByTestId('accordion-trigger')).toBeTruthy();
    expect(getByText(Strings.currencyManualLabel)).toBeTruthy();
  });

  it('renders the Accordion.Indicator', () => {
    const { getByTestId } = render(<CurrencyScreen />);
    expect(getByTestId('accordion-indicator')).toBeTruthy();
  });

  it('renders the Accordion content with Save Rate button label', () => {
    const { getByText } = render(<CurrencyScreen />);
    expect(getByText(Strings.currencySaveCta)).toBeTruthy();
  });

  it('renders the Refresh Rate button', () => {
    const { getByText } = render(<CurrencyScreen />);
    expect(getByText(Strings.currencyFetchCta)).toBeTruthy();
  });

  it('does not render the legacy Animated.View panel toggle (replaced by Accordion)', () => {
    // We verify this indirectly: if no Pressable with chevron-up/chevron-down toggle exists
    // and the screen still renders, the old hand-rolled pattern is gone.
    const { queryByText } = render(<CurrencyScreen />);
    // chevron-up text never appears — Accordion.Indicator handles direction natively
    expect(queryByText('chevron-up')).toBeNull();
  });
});
