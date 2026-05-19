import { renderHook } from '@testing-library/react-native';

import { useSecurity } from '@/screens/onboarding/security/security.hook';
import { useOnboardingStore } from '@/store/onboarding.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/screens/onboarding/security/security.store', () => ({
  useSecurityStore: jest.fn((sel: any) =>
    sel({ state: { selected: undefined }, setSelected: jest.fn() }),
  ),
}));

function setup() {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { securityChoice: 'none', step: 'O3' },
      setStep: jest.fn().mockResolvedValue(undefined),
      setSecurityChoice: jest.fn().mockResolvedValue(undefined),
    }),
  );
}

describe('useSecurity', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useSecurity())).not.toThrow();
  });

  it('selected falls back to global securityChoice when no local selection', () => {
    const { result } = renderHook(() => useSecurity());
    expect(result.current.selected).toBe('none');
  });
});
