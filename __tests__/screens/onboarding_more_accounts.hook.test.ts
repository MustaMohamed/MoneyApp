import { renderHook, act } from '@testing-library/react-native';

import { OnboardingStep } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useMoreAccounts } from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

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

  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
    loadAccounts: jest.fn().mockResolvedValue(undefined),
  }));
  const { useOnboardingStore } = require('@/modules/onboarding/store/onboarding.store');
  const storeState = {
    setStep: mockSetStep,
  };
  (useOnboardingStore as jest.Mock).mockImplementation(
    (selector?: (state: typeof storeState) => unknown) =>
      selector ? selector(storeState) : storeState,
  );
  (useOnboardingStore as jest.Mock & { getState: jest.Mock }).getState = jest.fn(() => storeState);
}

describe('useMoreAccounts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useMoreAccounts())).resolves.toBeDefined();
  });

  it('accounts reflects account store state', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].name).toBe('CIB Savings');
  });

  it('handleContinue calls setStep with N4', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N4);
  });

  it('handleContinue navigates to /(onboarding)/ready', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/ready');
  });

  it('handleAddAnother navigates to /(onboarding)/add_account with isAddingMore=true', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    await act(() => {
      result.current.handleAddAnother();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  });
});
