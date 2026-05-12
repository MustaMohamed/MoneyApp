import { renderHook, act } from '@testing-library/react-native';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useMoreAccountsV2 } from '@/screens/onboarding_v2/more_accounts/more_accounts.hook';
import { OnboardingStep } from '@/constants/enums';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn().mockResolvedValue(undefined) })),
  }),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

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

  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts } }),
  );
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ setStep: mockSetStep }),
  );
}

describe('useMoreAccountsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useMoreAccountsV2())).not.toThrow();
  });

  it('accounts reflects account store state', () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].name).toBe('CIB Savings');
  });

  it('handleContinue calls setStep with N4', async () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N4);
  });

  it('handleContinue navigates to /(onboarding)/ready', async () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/ready');
  });

  it('handleAddAnother navigates to /(onboarding)/add_account with isAddingMore=true', () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    act(() => {
      result.current.handleAddAnother();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  });
});
