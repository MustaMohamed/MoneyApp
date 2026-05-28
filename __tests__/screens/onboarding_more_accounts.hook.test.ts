import { renderHook, act } from '@testing-library/react-native';

import { OnboardingStep } from '@/constants/enums';
import { useAccounts } from '@/modules/accounts/store/account.store';
import { useMoreAccounts } from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  useAccounts: jest.fn(),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboarding: jest.fn() }));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

const fakeAccounts = [
  {
    id: '1',
    name: 'CIB Savings',
    type: 'bank',
    currency: 'EGP',
    color: '#1B2B4B',
    current_balance: 5000,
    opening_balance: 5000,
  },
  {
    id: '2',
    name: 'Cash',
    type: 'physical_wallet',
    currency: 'EGP',
    color: '#2D7D6E',
    current_balance: 200,
    opening_balance: 200,
  },
];

function setup(accounts = fakeAccounts) {
  const { useRouter } = require('expo-router');
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

  (useAccounts as jest.Mock).mockReturnValue({
    state: {
      accounts: { value: accounts },
    },
    loadAccounts: jest.fn().mockResolvedValue(undefined),
  });
  const { useOnboarding } = require('@/modules/onboarding/store/onboarding.store');
  (useOnboarding as jest.Mock).mockReturnValue({
    setStep: mockSetStep,
  });
}

describe('useMoreAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useMoreAccounts())).not.toThrow();
  });

  it('accounts reflects account store state', () => {
    const { result } = renderHook(() => useMoreAccounts());
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].name).toBe('CIB Savings');
  });

  it('handleContinue calls setStep with N4', async () => {
    const { result } = renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N4);
  });

  it('handleContinue navigates to /(onboarding)/ready', async () => {
    const { result } = renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/ready');
  });

  it('handleAddAnother navigates to /(onboarding)/add_account with isAddingMore=true', () => {
    const { result } = renderHook(() => useMoreAccounts());
    act(() => {
      result.current.handleAddAnother();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  });
});
