import { renderHook } from '@testing-library/react-native';

import { useCurrency } from '@/screens/onboarding/currency/currency.hook';
import { useOnboardingStore } from '@/store/onboarding.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/screens/onboarding/currency/currency.store', () => ({
  useCurrencyStore: jest.fn((sel: any) =>
    sel({ state: { selected: undefined }, setSelected: jest.fn() }),
  ),
}));

function setup() {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency: 'EGP', step: 'O2' },
      setStep: jest.fn().mockResolvedValue(undefined),
      setBaseCurrency: jest.fn().mockResolvedValue(undefined),
    }),
  );
}

describe('useCurrency', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useCurrency())).not.toThrow();
  });

  it('selected defaults to baseCurrency when no local selection', () => {
    const { result } = renderHook(() => useCurrency());
    expect(result.current.selected).toBe('EGP');
  });
});
