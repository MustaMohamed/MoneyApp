import { OnboardingStep } from '@/constants/enums';
import type { IOnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
import { createOnboardingStore, useOnboardingStore } from '@/store/onboarding.store';

function makeRepo(): jest.Mocked<IOnboardingRepository> {
  return {
    setStep: jest.fn().mockResolvedValue(undefined),
    complete: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue({
      complete: false,
      step: OnboardingStep.N1,
    }),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
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

// TC-05 (setBaseCurrency) moved to base_currency.store.test.ts with the value (#348).
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
  });

  it('rehydrates state when SecureStore has values', async () => {
    repo.load.mockResolvedValueOnce({
      complete: false,
      step: OnboardingStep.N2,
    });

    const result = await store.getState().init();
    const state = store.getState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.N2 });
    expect(state.complete).toBe(false);
    expect(state.currentStep).toBe(OnboardingStep.N2);
  });

  it('returns complete:true when onboarding_complete=true', async () => {
    repo.load.mockResolvedValueOnce({
      complete: true,
      step: OnboardingStep.N4,
    });
    const result = await store.getState().init();
    expect(result.complete).toBe(true);
  });

  it('applies the repository-loaded fallback values', async () => {
    const result = await store.getState().init();
    const state = store.getState();
    expect(result.step).toBe(OnboardingStep.N1);
    expect(state.currentStep).toBe(OnboardingStep.N1);
  });

  it('ignores an older initialization result after a retry succeeds', async () => {
    const staleLoad = deferred<{
      complete: boolean;
      step: OnboardingStep;
    }>();
    repo.load.mockReturnValueOnce(staleLoad.promise).mockResolvedValueOnce({
      complete: true,
      step: OnboardingStep.N4,
    });

    const staleInit = store.getState().init();
    await store.getState().init();
    staleLoad.resolve({
      complete: false,
      step: OnboardingStep.N2,
    });
    await staleInit;

    expect(store.getState()).toMatchObject({
      complete: true,
      currentStep: OnboardingStep.N4,
    });
  });
});

describe('onboardingStore.reset', () => {
  it('restores the initial onboarding state', async () => {
    await store.getState().setStep(OnboardingStep.N3);
    await store.getState().completeOnboarding();

    store.getState().reset();

    expect(store.getState()).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.N1,
    });
  });
});

describe('useOnboardingStore', () => {
  it('creates an unloaded store with the default repository', () => {
    expect(createOnboardingStore().getState()).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.N1,
    });
  });

  it('exposes the shared Zustand singleton API', () => {
    expect(typeof useOnboardingStore.getState).toBe('function');
    expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.N1);
  });
});
