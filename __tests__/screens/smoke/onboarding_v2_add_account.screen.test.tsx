import React from 'react';
import fs from 'fs';
import path from 'path';
import { render } from '@testing-library/react-native';

import AddAccountScreenV2 from '@/screens/onboarding_v2/add_account';

const ADD_ACCOUNT_SOURCE = fs.readFileSync(
  path.resolve(__dirname, '../../../screens/onboarding_v2/add_account/index.tsx'),
  'utf8',
);

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
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(
    (sel: any) => sel({ state: { accounts: [] }, addAccount: jest.fn() }),
    { getState: jest.fn(() => ({ loadAccounts: jest.fn() })) },
  ),
}));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) => sel({ state: { baseCurrency: 'EGP' }, setStep: jest.fn() }),
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
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

// ---------------------------------------------------------------------------
// Bug 3 → standardized: back button is now the shared BackButton component.
// Inline chevron-left / Size.iconBack assertions moved to the shared component.
// ---------------------------------------------------------------------------
describe('AddAccountScreenV2 back button — shared BackButton component', () => {
  it('imports BackButton from @/components/ui/back_button', () => {
    expect(ADD_ACCOUNT_SOURCE).toContain("from '@/components/ui/back_button'");
  });

  it('uses <BackButton onPress={onBack} /> instead of inline Pressable', () => {
    expect(ADD_ACCOUNT_SOURCE).toContain('<BackButton onPress={onBack}');
    // Ensure the old inline chevron-left is gone from this file
    expect(ADD_ACCOUNT_SOURCE).not.toContain('name="chevron-left"');
  });

  it('does not hardcode the back button chrome (boxy style delegated to shared component)', () => {
    // The w-9 h-9 rounded-[8px] inline className should be gone from this file
    expect(ADD_ACCOUNT_SOURCE).not.toContain('rounded-[8px] bg-surface border border-border');
  });
});
