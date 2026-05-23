import { render } from '@testing-library/react-native';
import React from 'react';

import AddAccountScreen from '@/screens/accounts/add_account/index';

jest.mock('react-native-reanimated', () => {
  const { View, Text } = require('react-native');
  return {
    default: { View, Text },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withTiming: jest.fn((v: any) => v),
    withSpring: jest.fn((v: any) => v),
    withSequence: jest.fn((...args: any[]) => args[args.length - 1]),
    withDelay: jest.fn((_: any, v: any) => v),
    Easing: { out: jest.fn(), in: jest.fn(), bezier: jest.fn(), linear: 0, ease: 0 },
    FadeIn: { duration: jest.fn(() => ({ delay: jest.fn(() => ({})) })) },
    FadeOut: { duration: jest.fn(() => ({})) },
    ZoomIn: { duration: jest.fn(() => ({})) },
    SlideInDown: { springify: jest.fn(() => ({ damping: jest.fn(() => ({})) })) },
    View,
    Text,
    ScrollView: require('react-native').ScrollView,
    createAnimatedComponent: (c: any) => c,
  };
});
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
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
// Mock the hook to avoid real store dependencies
jest.mock('@/screens/accounts/add_account/add_account.hook', () => ({
  useAddAccountApp: () => ({
    form: {
      control: {},
      formState: { errors: {}, isSubmitting: false },
      setValue: jest.fn(),
      handleSubmit: (_fn: any) => jest.fn(),
      watch: jest.fn(),
      reset: jest.fn(),
    },
    handleSave: jest.fn(),
    onBack: jest.fn(),
  }),
}));
// Mock the animation hooks
jest.mock('@/screens/accounts/add_account/add_account.anim', () => ({
  useAddAccountAnim: () => ({
    btnAnim: {},
    triggerBtnPress: jest.fn(),
    ccEntering: undefined,
    ccExiting: undefined,
    aprEntering: undefined,
    aprExiting: undefined,
    errorEntering: undefined,
    errorExiting: undefined,
  }),
  useTypePillAnim: () => ({
    pillAnim: {},
    triggerPillTap: jest.fn(),
  }),
}));
// Mock useWatch to return stable values
jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useWatch: jest.fn((opts: any) => {
    const defaults: Record<string, any> = {
      selected_type: 'bank',
      selected_color: '#4ECDC4',
      currency: 'EGP',
      interest_tracking: false,
    };
    return defaults[opts?.name] ?? undefined;
  }),
  Controller: ({ render: renderProp }: any) =>
    renderProp({ field: { value: '', onChange: jest.fn(), onBlur: jest.fn() } }),
}));

describe('AddAccountScreen smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<AddAccountScreen />)).not.toThrow();
  });
});
