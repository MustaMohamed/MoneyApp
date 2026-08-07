import { act, renderHook } from '@testing-library/react-native';

import { Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useWelcome } from '@/modules/onboarding/screens/onboarding/welcome/welcome.hook';
import { useWelcomeTransitionState } from '@/modules/onboarding/screens/onboarding/welcome/welcome.state';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const mockSetBaseCurrency = jest.fn().mockResolvedValue(undefined);
const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

function setup({ baseCurrency = Currency.EGP, accounts = [] as unknown[] } = {}) {
  const { useOnboardingStore } = require('@/modules/onboarding/store/onboarding.store');
  const storeState = {
    baseCurrency,
    setBaseCurrency: mockSetBaseCurrency,
    setStep: mockSetStep,
  };
  (useOnboardingStore as jest.Mock).mockImplementation(
    (selector?: (state: typeof storeState) => unknown) =>
      selector ? selector(storeState) : storeState,
  );
  (useOnboardingStore as jest.Mock & { getState: jest.Mock }).getState = jest.fn(() => storeState);
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({ accounts }));
  jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ replace: mockReplace });
}

describe('useWelcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useWelcomeTransitionState.getState().reset();
    setup();
  });

  it('defaults selected to onboarding store baseCurrency (EGP)', async () => {
    const { result } = await renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.EGP);
  });

  it('defaults selected to USD if store baseCurrency is USD', async () => {
    setup({ baseCurrency: Currency.USD });
    const { result } = await renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('setSelected updates the selected currency', async () => {
    const { result } = await renderHook(() => useWelcome());
    await act(() => {
      result.current.setSelected(Currency.USD);
    });
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('onContinue calls setBaseCurrency with selected currency', async () => {
    const { result } = await renderHook(() => useWelcome());
    await act(() => {
      result.current.setSelected(Currency.USD);
    });
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetBaseCurrency).toHaveBeenCalledWith(Currency.USD);
  });

  it('onContinue persists before navigating, and replaces rather than pushes', async () => {
    const { result } = await renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N2);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/add_account');
  });

  it('with 1 account already saved, onContinue resolves forward to N3', async () => {
    setup({ accounts: [{ id: '1' }] });
    const { result } = await renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N3);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });

  it('a rejecting currency write does not navigate and sets the status message', async () => {
    mockSetBaseCurrency.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockSetStep).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n1StepSaveError);
    expect(result.current.state.busy).toBe(false);
  });

  it('a rejecting step write does not navigate and sets the status message', async () => {
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n1StepSaveError);
    expect(result.current.state.busy).toBe(false);
  });
});
