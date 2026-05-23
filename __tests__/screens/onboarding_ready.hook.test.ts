import { renderHook } from '@testing-library/react-native';

import { useReady } from '@/screens/onboarding/ready/ready.hook';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/screens/onboarding/ready/ready.state', () => ({
  useReadyState: jest.fn((sel: any) =>
    sel({ state: { completing: false }, setCompleting: jest.fn() }),
  ),
}));

function setup() {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency: 'EGP', securityChoice: 'none', step: 'O6' },
      completeOnboarding: jest.fn().mockResolvedValue(undefined),
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
}

describe('useReady', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useReady())).not.toThrow();
  });

  it('completing defaults to false', () => {
    const { result } = renderHook(() => useReady());
    expect(result.current.state.completing).toBe(false);
  });
});
