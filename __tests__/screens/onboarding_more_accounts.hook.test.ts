import { renderHook, act } from '@testing-library/react-native';

import { OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useMoreAccounts } from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.hook';
import { useMoreAccountsTransitionState } from '@/modules/onboarding/screens/onboarding/more_accounts/more_accounts.state';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

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
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });

  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
    loadAccounts: mockLoadAccounts,
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
    useMoreAccountsTransitionState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useMoreAccounts())).resolves.toBeDefined();
  });

  it('does not load the account list on mount', async () => {
    await renderHook(() => useMoreAccounts());
    expect(mockLoadAccounts).not.toHaveBeenCalled();
  });

  it('accounts reflects account store state', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].name).toBe('CIB Savings');
  });

  it('handleContinue persists N4 and replaces (not pushes) to ready', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N4);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/ready');
  });

  it('a rejecting step write does not navigate, sets the status message, and leaves accounts untouched', async () => {
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n3StepSaveError);
    expect(result.current.accounts).toHaveLength(2);
  });

  it('handleAddAnother replaces (not pushes) to add_account with isAddingMore=true and writes no step', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    await act(() => {
      result.current.handleAddAnother();
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
    expect(mockSetStep).not.toHaveBeenCalled();
  });

  it('handleAddAnother is inert while handleContinue is in flight — no navigate, no double-navigate on completion', async () => {
    let resolveSetStep!: (value: OnboardingStep) => void;
    mockSetStep.mockImplementationOnce(
      () =>
        new Promise<OnboardingStep>((resolve) => {
          resolveSetStep = resolve;
        }),
    );
    const { result } = await renderHook(() => useMoreAccounts());

    let continuePromise!: Promise<void>;
    await act(async () => {
      continuePromise = result.current.handleContinue();
    });

    // Tap "+ Add another account" while the N3 -> N4 step write is still in flight.
    await act(async () => {
      result.current.handleAddAnother();
    });

    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      resolveSetStep(OnboardingStep.N4);
      await continuePromise;
    });

    // Only the in-flight transition's own navigate lands, exactly once.
    expect(mockReplace.mock.calls).toEqual([['/(onboarding)/ready']]);
  });

  it('onBack writes N1 and replaces to welcome', async () => {
    const { result } = await renderHook(() => useMoreAccounts());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N1);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/welcome');
  });
});
