import { renderHook } from '@testing-library/react-native';

import { useAddAccount } from '@/screens/onboarding/add_account/add_account.hook';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({}),
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({
      loadAccounts: jest.fn().mockResolvedValue(undefined),
    })),
  }),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, addAccount: jest.fn().mockResolvedValue(undefined) }),
  );
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency: 'EGP', step: 'O4' },
      setStep: jest.fn().mockResolvedValue(undefined),
    }),
  );
}

describe('useAddAccount (onboarding)', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccount())).not.toThrow();
  });

  it('returns form and handleSave', () => {
    const { result } = renderHook(() => useAddAccount());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
  });
});
