import React from 'react';
import { render } from '@testing-library/react-native';

import AddAccountScreenV2 from '@/screens/onboarding_v2/add_account';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View },
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeOutUp: { duration: jest.fn(() => ({})) },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSequence: jest.fn((...args: any[]) => args[args.length - 1]),
    withSpring: jest.fn((v: any) => v),
    withTiming: jest.fn((v: any) => v),
    View: RN.View,
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));
jest.mock('@/screens/onboarding_v2/add_account/add_account.hook', () => ({
  useAddAccountV2: () => ({
    form: {
      control: {},
      formState: { errors: {}, isSubmitting: false },
      setValue: jest.fn(),
      handleSubmit: (fn: any) => jest.fn(),
    },
    handleSave: jest.fn(),
    onBack: jest.fn(),
  }),
  ACCOUNT_COLORS: [
    '#1B2B4B',
    '#C9973A',
    '#2D7D6E',
    '#C45C2A',
    '#5A2D55',
    '#185FA5',
    '#8B3A5A',
    '#C9A876',
    '#6B3FA0',
    '#2A7A4F',
    '#C49B1A',
    '#4A6080',
  ],
}));
jest.mock('@/screens/onboarding_v2/add_account/add_account.anim', () => ({
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
jest.mock('react-hook-form', () => ({
  ...jest.requireActual('react-hook-form'),
  useWatch: jest.fn((opts: any) => {
    const defaults: Record<string, any> = {
      selected_type: 'bank',
      selected_color: '#1B2B4B',
      currency: 'EGP',
      interest_tracking: false,
    };
    return defaults[opts?.name] ?? undefined;
  }),
  Controller: ({ render: renderProp }: any) =>
    renderProp({ field: { value: '', onChange: jest.fn(), onBlur: jest.fn() } }),
}));

describe('AddAccountScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<AddAccountScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<AddAccountScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders the Account Name input', () => {
    const { getByPlaceholderText } = render(<AddAccountScreenV2 />);
    expect(getByPlaceholderText('e.g. CIB Savings')).toBeTruthy();
  });
});
