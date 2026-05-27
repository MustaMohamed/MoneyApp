import { act, renderHook } from '@testing-library/react-native';

import { OnboardingStep, Currency } from '@/constants/enums';
import { useWelcome } from '@/modules/onboarding/screens/onboarding/welcome/welcome.hook';
import { useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetBaseCurrency = jest.fn().mockResolvedValue(undefined);
const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

function setup(baseCurrency: Currency = Currency.EGP) {
  attachMockSelectorStore(useOnboardingStore as unknown as jest.Mock, () => ({
    state: { baseCurrency },
    setBaseCurrency: mockSetBaseCurrency,
    setStep: mockSetStep,
  }));
  jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push: mockPush });
}

describe('useWelcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('defaults selected to onboarding store baseCurrency (EGP)', () => {
    const { result } = renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.EGP);
  });

  it('defaults selected to USD if store baseCurrency is USD', () => {
    setup(Currency.USD);
    const { result } = renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('setSelected updates the selected currency', () => {
    const { result } = renderHook(() => useWelcome());
    act(() => {
      result.current.setSelected(Currency.USD);
    });
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('onContinue calls setBaseCurrency with selected currency', async () => {
    const { result } = renderHook(() => useWelcome());
    act(() => {
      result.current.setSelected(Currency.USD);
    });
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetBaseCurrency).toHaveBeenCalledWith(Currency.USD);
  });

  it('onContinue calls setStep with N2', async () => {
    const { result } = renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N2);
  });

  it('onContinue navigates to /(onboarding)/add_account', async () => {
    const { result } = renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/add_account');
  });
});
