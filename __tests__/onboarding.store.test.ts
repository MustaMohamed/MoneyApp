import { Currency, OnboardingStep } from '@/constants/enums';
import type { IOnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
import { createOnboardingStore, useOnboardingStore } from '@/store/onboarding.store';

function makeRepo(): jest.Mocked<IOnboardingRepository> {
  return {
    setStep: jest.fn().mockResolvedValue(undefined),
    setBaseCurrency: jest.fn().mockResolvedValue(undefined),
    complete: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue({
      complete: false,
      step: OnboardingStep.N1,
      baseCurrency: Currency.EGP,
    }),
  };
}

let repo: jest.Mocked<IOnboardingRepository>;
let store: ReturnType<typeof createOnboardingStore>;

beforeEach(() => {
  jest.clearAllMocks();
  repo = makeRepo();
  store = createOnboardingStore(repo);
});

describe('onboardingStore.setStep — TC-03', () => {
  it('persists through the onboarding repository then updates state', async () => {
    await store.getState().setStep(OnboardingStep.N2);
    expect(repo.setStep.mock.calls).toEqual([[OnboardingStep.N2]]);
    expect(store.getState().currentStep).toBe(OnboardingStep.N2);
  });
});

describe('onboardingStore.setBaseCurrency — TC-05', () => {
  it('persists through the onboarding repository then updates state', async () => {
    await store.getState().setBaseCurrency(Currency.USD);
    expect(repo.setBaseCurrency.mock.calls).toEqual([[Currency.USD]]);
    expect(store.getState().baseCurrency).toBe(Currency.USD);
  });

  it('persists EGP on the same path', async () => {
    await store.getState().setBaseCurrency(Currency.EGP);
    expect(repo.setBaseCurrency.mock.calls).toEqual([[Currency.EGP]]);
  });
});

describe('onboardingStore.completeOnboarding — TC-13', () => {
  it('persists through the onboarding repository then sets complete=true', async () => {
    await store.getState().completeOnboarding();
    expect(repo.complete.mock.calls).toHaveLength(1);
    expect(store.getState().complete).toBe(true);
  });
});

describe('onboardingStore — error branches', () => {
  it('setStep propagates repository errors', async () => {
    repo.setStep.mockRejectedValueOnce(new Error('secure fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setStep(OnboardingStep.N2)).rejects.toThrow('secure fail');
    consoleSpy.mockRestore();
  });

  it('setBaseCurrency propagates errors', async () => {
    repo.setBaseCurrency.mockRejectedValueOnce(new Error('base fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setBaseCurrency(Currency.USD)).rejects.toThrow('base fail');
    consoleSpy.mockRestore();
  });

  it('completeOnboarding propagates errors', async () => {
    repo.complete.mockRejectedValueOnce(new Error('complete fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().completeOnboarding()).rejects.toThrow('complete fail');
    consoleSpy.mockRestore();
  });
});

describe('onboardingStore.init — TC-02 / TC-03 resume', () => {
  it('returns defaults when SecureStore is empty (fresh install)', async () => {
    const result = await store.getState().init();
    const state = store.getState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.N1 });
    expect(state.complete).toBe(false);
    expect(state.currentStep).toBe(OnboardingStep.N1);
    expect(state.baseCurrency).toBe(Currency.EGP);
  });

  it('rehydrates state when SecureStore has values', async () => {
    repo.load.mockResolvedValueOnce({
      complete: false,
      step: OnboardingStep.N2,
      baseCurrency: Currency.USD,
    });

    const result = await store.getState().init();
    const state = store.getState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.N2 });
    expect(state.complete).toBe(false);
    expect(state.currentStep).toBe(OnboardingStep.N2);
    expect(state.baseCurrency).toBe(Currency.USD);
  });

  it('returns complete:true when onboarding_complete=true', async () => {
    repo.load.mockResolvedValueOnce({
      complete: true,
      step: OnboardingStep.N4,
      baseCurrency: Currency.EGP,
    });
    const result = await store.getState().init();
    expect(result.complete).toBe(true);
  });

  it('applies the repository-loaded fallback values', async () => {
    const result = await store.getState().init();
    const state = store.getState();
    expect(result.step).toBe(OnboardingStep.N1);
    expect(state.currentStep).toBe(OnboardingStep.N1);
    expect(state.baseCurrency).toBe(Currency.EGP);
  });
});

describe('useOnboardingStore', () => {
  it('exposes the shared Zustand singleton API', () => {
    expect(typeof useOnboardingStore.getState).toBe('function');
    expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.N1);
  });
});
