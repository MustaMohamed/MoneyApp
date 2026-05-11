import { act, renderHook } from '@testing-library/react-native';

import { useOnboardingStore } from '@/store/onboarding.store';
import { useWelcome } from '@/screens/onboarding_v2/welcome/welcome.hook';
import { OnboardingStep, Currency } from '@/constants/enums';

import { useWelcomeState } from '@/screens/onboarding_v2/welcome/welcome.state';
import { useRouter } from 'expo-router';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/screens/onboarding_v2/welcome/welcome.state', () => ({
  useWelcomeState: jest.fn(),
}));

const mockSetBaseCurrency = jest.fn().mockResolvedValue(undefined);
const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();
const mockSetSelected = jest.fn();

function setupOnboardingStore(baseCurrency: Currency = Currency.EGP) {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency },
      setBaseCurrency: mockSetBaseCurrency,
      setStep: mockSetStep,
    }),
  );
}

function setupWelcomeState(selected: Currency | undefined = undefined) {
  (useWelcomeState as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { selected },
      setSelected: mockSetSelected,
      reset: jest.fn(),
    }),
  );
}

function setup(
  baseCurrency: Currency = Currency.EGP,
  localSelected: Currency | undefined = undefined,
) {
  setupOnboardingStore(baseCurrency);
  setupWelcomeState(localSelected);
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });
}

describe('useWelcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('defaults selected to onboarding store baseCurrency (EGP)', () => {
    setup(Currency.EGP, undefined);
    const { result } = renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.EGP);
  });

  it('defaults selected to USD if store baseCurrency is USD', () => {
    setup(Currency.USD, undefined);
    const { result } = renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('setSelected updates the selected currency via the local state store', () => {
    const { result } = renderHook(() => useWelcome());
    act(() => {
      result.current.setSelected(Currency.USD);
    });
    expect(mockSetSelected).toHaveBeenCalledWith(Currency.USD);
  });

  it('onContinue calls setBaseCurrency with selected currency', async () => {
    setup(Currency.EGP, undefined);
    const { result } = renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetBaseCurrency).toHaveBeenCalledWith(Currency.EGP);
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
