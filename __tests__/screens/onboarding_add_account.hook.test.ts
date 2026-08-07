import { renderHook, act } from '@testing-library/react-native';

import { AccountType, Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useAddAccount } from '@/modules/onboarding/screens/onboarding/add_account/add_account.hook';
import { useAddAccountTransitionState } from '@/modules/onboarding/screens/onboarding/add_account/add_account.state';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockAddAccount = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

let mockAccounts: { id: string }[] = [];

function setup(isAddingMore = false) {
  mockAccounts = [];
  const { useLocalSearchParams, useRouter } = require('expo-router');
  (useLocalSearchParams as jest.Mock).mockReturnValue(isAddingMore ? { isAddingMore: 'true' } : {});
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });

  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: mockAccounts,
    addAccount: mockAddAccount,
    loadAccounts: jest.fn().mockResolvedValue(undefined),
  }));
  const { useOnboardingStore } = require('@/modules/onboarding/store/onboarding.store');
  const storeState = {
    baseCurrency: Currency.EGP,
    setStep: mockSetStep,
  };
  (useOnboardingStore as jest.Mock).mockImplementation(
    (selector?: (state: typeof storeState) => unknown) =>
      selector ? selector(storeState) : storeState,
  );
  (useOnboardingStore as jest.Mock & { getState: jest.Mock }).getState = jest.fn(() => storeState);
}

async function fillAndSubmit(result: { current: ReturnType<typeof useAddAccount> }) {
  await act(() => {
    result.current.form.setValue('name', 'CIB Savings');
    result.current.form.setValue('balance', '100');
  });
  await act(async () => {
    await result.current.handleSave();
  });
}

describe('useAddAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddAccount.mockResolvedValue(undefined);
    useAddAccountTransitionState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddAccount())).resolves.toBeDefined();
  });

  it('default selected_color is AcctTokens.midnight.rich', async () => {
    const { result } = await renderHook(() => useAddAccount());
    expect(result.current.form.getValues('selected_color')).toBe(AcctTokens.midnight.rich);
  });

  it('default selected_type is Bank', async () => {
    const { result } = await renderHook(() => useAddAccount());
    expect(result.current.form.getValues('selected_type')).toBe(AccountType.Bank);
  });

  it('save persists the resolved step and replaces (not pushes) to more_accounts', async () => {
    mockAddAccount.mockImplementation(async () => {
      mockAccounts = [...mockAccounts, { id: 'new' }];
    });
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);
    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N3);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });

  it('a rejecting insert writes no step, does not navigate, and sets the status message', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);
    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n2SaveError);
    expect(result.current.state.busy).toBe(false);
  });

  it('a rejecting step write after a resolved insert does not navigate, and inserts exactly once', async () => {
    mockAddAccount.mockImplementation(async () => {
      mockAccounts = [...mockAccounts, { id: 'new' }];
    });
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);
    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n2SaveError);
  });

  it('onBack without isAddingMore writes N1 and replaces to /(onboarding)/welcome', async () => {
    const { result } = await renderHook(() => useAddAccount());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N1);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/welcome');
  });

  it('onBack with isAddingMore writes no step and replaces to /(onboarding)/more_accounts', async () => {
    setup(true);
    const { result } = await renderHook(() => useAddAccount());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });
});
