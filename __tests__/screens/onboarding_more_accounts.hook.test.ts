import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useMoreAccounts } from '@/screens/onboarding/more_accounts/more_accounts.hook';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
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
    sel({ state: { accounts: [] } }),
  );
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ setStep: jest.fn().mockResolvedValue(undefined) }),
  );
}

describe('useMoreAccounts', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useMoreAccounts())).not.toThrow();
  });

  it('accounts defaults to empty array', () => {
    const { result } = renderHook(() => useMoreAccounts());
    expect(result.current.accounts).toEqual([]);
  });
});
