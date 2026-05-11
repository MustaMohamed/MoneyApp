import React from 'react';
import { render } from '@testing-library/react-native';

import ReadyScreenV2 from '@/screens/onboarding_v2/ready';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View, Text: RN.Text },
    ZoomIn: {
      springify: jest.fn(() => ({ damping: jest.fn(() => ({ stiffness: jest.fn(() => ({})) })) })),
    },
    FadeInUp: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })) },
    View: RN.View,
    Text: RN.Text,
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('@/utils/use_first_mount_entering.hook', () => ({
  useFirstMountEntering: jest.fn(() => false),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) =>
    sel({ state: { baseCurrency: 'EGP' }, completeOnboarding: jest.fn() }),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: (sel: any) => sel({ state: { accounts: [] } }),
}));
jest.mock('@/screens/onboarding_v2/ready/ready.state', () => ({
  useReadyState: (sel: any) => sel({ state: { completing: false }, setCompleting: jest.fn() }),
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

// Task 14 precedent: mock hook + anim directly to prevent getSnapshot infinite loop
jest.mock('@/screens/onboarding_v2/ready/ready.hook', () => ({
  useReadyV2: () => ({
    state: {
      rows: [
        { label: 'Base Currency', value: 'EGP', gold: true },
        { label: 'Accounts', value: '0 accounts', gold: false },
        { label: 'Total Balance', value: '0 EGP', gold: true },
      ],
      completing: false,
    },
    handleComplete: jest.fn(),
  }),
}));
jest.mock('@/screens/onboarding_v2/ready/ready.anim', () => ({
  useReadyAnim: () => ({
    checkEntering: undefined,
    headlineEntering: undefined,
    subtitleEntering: undefined,
    rowEntering: jest.fn(() => undefined),
    ctaEntering: undefined,
  }),
}));

describe('ReadyScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<ReadyScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<ReadyScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders exactly 3 summary rows', () => {
    const { getAllByTestId } = render(<ReadyScreenV2 />);
    expect(getAllByTestId('summary-row')).toHaveLength(3);
  });
});
