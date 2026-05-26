import { renderHook, act } from '@testing-library/react-native';

import { AccountType } from '@/constants/enums';
import { AcctTokens } from '@/constants/theme_tokens';
import { useAddAccount } from '@/modules/onboarding/screens/onboarding/add_account/add_account.hook';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() })),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn().mockResolvedValue(undefined) })),
  }),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/modules/onboarding/store/onboarding.store', () => require('@/store/onboarding.store'));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockAddAccount = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();
const mockBackOrReplace = jest.fn();

function setup(isAddingMore = false) {
  const { useLocalSearchParams, useRouter } = require('expo-router');
  (useLocalSearchParams as jest.Mock).mockReturnValue(isAddingMore ? { isAddingMore: 'true' } : {});
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: jest.fn(), replace: jest.fn() });
  (require('@/utils/onboarding_nav').backOrReplace as jest.Mock) = mockBackOrReplace;

  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, addAccount: mockAddAccount }),
  );
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { baseCurrency: 'EGP' }, setStep: mockSetStep }),
  );
}

describe('useAddAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccount())).not.toThrow();
  });

  it('default selected_color is AcctTokens.midnight.rich', () => {
    const { result } = renderHook(() => useAddAccount());
    expect(result.current.form.getValues('selected_color')).toBe(AcctTokens.midnight.rich);
  });

  it('default selected_type is Bank', () => {
    const { result } = renderHook(() => useAddAccount());
    expect(result.current.form.getValues('selected_type')).toBe(AccountType.Bank);
  });

  it('onBack without isAddingMore targets /(onboarding)/welcome', () => {
    const { result } = renderHook(() => useAddAccount());
    act(() => {
      result.current.onBack();
    });
    expect(mockBackOrReplace).toHaveBeenCalledWith(expect.anything(), '/(onboarding)/welcome');
  });

  it('onBack with isAddingMore targets /(onboarding)/more_accounts', () => {
    setup(true);
    const { result } = renderHook(() => useAddAccount());
    act(() => {
      result.current.onBack();
    });
    expect(mockBackOrReplace).toHaveBeenCalledWith(
      expect.anything(),
      '/(onboarding)/more_accounts',
    );
  });
});
