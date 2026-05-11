import React from 'react';
import { render } from '@testing-library/react-native';

import WelcomeScreenV2 from '@/screens/onboarding_v2/welcome';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View, Text: RN.Text },
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeInUp: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })) },
    useFirstMountEntering: jest.fn(() => false),
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
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/screens/onboarding_v2/welcome/welcome.hook', () => ({
  useWelcome: () => ({
    state: { selected: 'EGP' },
    setSelected: jest.fn(),
    onContinue: jest.fn(),
  }),
}));
jest.mock('@/screens/onboarding_v2/welcome/welcome.anim', () => ({
  useWelcomeAnim: () => ({
    illustrationEntering: undefined,
    headlineEntering: undefined,
    pillsEntering: undefined,
    ctaEntering: undefined,
  }),
}));
jest.mock('@/components/geo_illustration', () => ({
  GeoIllustration: () => null,
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

describe('WelcomeScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<WelcomeScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<WelcomeScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders both currency pills (EGP and USD)', () => {
    const { getByText } = render(<WelcomeScreenV2 />);
    expect(getByText('EGP')).toBeTruthy();
    expect(getByText('USD')).toBeTruthy();
  });
});
