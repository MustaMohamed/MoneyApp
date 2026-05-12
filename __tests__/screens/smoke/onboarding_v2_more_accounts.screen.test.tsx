import React from 'react';
import { render } from '@testing-library/react-native';

import MoreAccountsScreenV2 from '@/screens/onboarding_v2/more_accounts';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View, Text: RN.Text },
    ZoomIn: {
      springify: jest.fn(() => ({
        damping: jest.fn(() => ({ stiffness: jest.fn(() => ({})) })),
      })),
    },
    FadeInDown: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })) },
    FadeInRight: {
      delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })),
      duration: jest.fn(() => ({})),
    },
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
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign((sel: any) => sel({ state: { accounts: [] } }), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn() })),
  }),
}));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) => sel({ setStep: jest.fn() }),
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

describe('MoreAccountsScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<MoreAccountsScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<MoreAccountsScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders the success headline', () => {
    const { getByText } = render(<MoreAccountsScreenV2 />);
    expect(getByText('Account saved')).toBeTruthy();
  });
});
