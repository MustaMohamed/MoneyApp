// TC-03 / TC-05 / TC-13 — onboarding store writes to SecureStore
// (and repo for DB-backed settings). loadOnboardingState rehydrates from SecureStore.

import * as SecureStore from 'expo-secure-store';

import { Currency, OnboardingStep } from '@/constants/enums';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';
import {
  __getOnboardingStateForTests,
  __resetOnboardingForTests,
  createOnboardingStore,
  loadOnboardingState,
} from '@/store/onboarding.store';

const secure = SecureStore as unknown as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  __reset: () => void;
};

function makeRepo(): IAppSettingsRepository {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  secure.__reset();
  jest.clearAllMocks();
  __resetOnboardingForTests();
});

describe('onboardingStore.setStep — TC-03', () => {
  it('writes onboarding_step to SecureStore then updates state', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.setStep(OnboardingStep.N2);
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_step', 'N2');
    expect(store.state.currentStep.value).toBe(OnboardingStep.N2);
  });
});

describe('onboardingStore.setBaseCurrency — TC-05', () => {
  it('writes SecureStore and repo.set before updating state', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.setBaseCurrency(Currency.USD);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'USD');
    expect(repo.set).toHaveBeenCalledWith('base_currency', 'USD');
    expect(store.state.baseCurrency.value).toBe(Currency.USD);
  });

  it('persists EGP on the same path', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.setBaseCurrency(Currency.EGP);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'EGP');
    expect(repo.set).toHaveBeenCalledWith('base_currency', 'EGP');
  });
});

describe('onboardingStore.completeOnboarding — TC-13', () => {
  it('writes SecureStore + repo.set then sets complete=true', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.completeOnboarding();
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(repo.set).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(store.state.complete.value).toBe(true);
  });
});

describe('onboardingStore — error branches', () => {
  it('setStep propagates SecureStore errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('secure fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.setStep(OnboardingStep.N2)).rejects.toThrow('secure fail');
    consoleSpy.mockRestore();
  });

  it('setBaseCurrency propagates errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('base fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.setBaseCurrency(Currency.USD)).rejects.toThrow('base fail');
    consoleSpy.mockRestore();
  });

  it('completeOnboarding propagates errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('complete fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.completeOnboarding()).rejects.toThrow('complete fail');
    consoleSpy.mockRestore();
  });
});

describe('loadOnboardingState — TC-02 / TC-03 resume', () => {
  it('returns defaults when SecureStore is empty (fresh install)', async () => {
    const result = await loadOnboardingState();
    const state = __getOnboardingStateForTests();
    expect(result).toEqual({ complete: false, step: OnboardingStep.N1 });
    expect(state.complete.value).toBe(false);
    expect(state.currentStep.value).toBe(OnboardingStep.N1);
    expect(state.baseCurrency.value).toBe(Currency.EGP);
  });

  it('rehydrates state when SecureStore has values', async () => {
    await secure.setItemAsync('onboarding_step', 'N2');
    await secure.setItemAsync('base_currency', 'USD');

    const result = await loadOnboardingState();
    const state = __getOnboardingStateForTests();
    expect(result).toEqual({ complete: false, step: OnboardingStep.N2 });
    expect(state.complete.value).toBe(false);
    expect(state.currentStep.value).toBe(OnboardingStep.N2);
    expect(state.baseCurrency.value).toBe(Currency.USD);
  });

  it('returns complete:true when onboarding_complete=true', async () => {
    await secure.setItemAsync('onboarding_complete', 'true');
    await secure.setItemAsync('onboarding_step', 'N4');
    const result = await loadOnboardingState();
    expect(result.complete).toBe(true);
  });

  it('rejects invalid SecureStore values and falls back to defaults', async () => {
    await secure.setItemAsync('onboarding_step', 'X99');
    await secure.setItemAsync('base_currency', 'GBP');

    const result = await loadOnboardingState();
    const state = __getOnboardingStateForTests();
    expect(result.step).toBe(OnboardingStep.N1);
    expect(state.currentStep.value).toBe(OnboardingStep.N1);
    expect(state.baseCurrency.value).toBe(Currency.EGP);
  });
});
