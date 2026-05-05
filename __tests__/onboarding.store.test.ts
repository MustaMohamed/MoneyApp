// TC-03 / TC-05 / TC-06 / TC-13 — onboarding store writes to SecureStore
// (and repo for DB-backed settings). loadOnboardingState rehydrates from SecureStore.

import * as SecureStore from 'expo-secure-store';

import {
  createOnboardingStore,
  loadOnboardingState,
  useOnboardingStore,
} from '@/store/onboarding.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';
import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';

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
  useOnboardingStore.setState({
    state: {
      complete: false,
      currentStep: OnboardingStep.O1,
      baseCurrency: Currency.EGP,
      securityChoice: undefined,
    },
  });
});

describe('onboardingStore.setStep — TC-03', () => {
  it('writes onboarding_step to SecureStore then updates state', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setStep(OnboardingStep.O3);
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_step', 'O3');
    expect(store.getState().state.currentStep).toBe(OnboardingStep.O3);
  });
});

describe('onboardingStore.setBaseCurrency — TC-05', () => {
  it('writes SecureStore and repo.set before updating state', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setBaseCurrency(Currency.USD);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'USD');
    expect(repo.set).toHaveBeenCalledWith('base_currency', 'USD');
    expect(store.getState().state.baseCurrency).toBe(Currency.USD);
  });

  it('persists EGP on the same path', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setBaseCurrency(Currency.EGP);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'EGP');
    expect(repo.set).toHaveBeenCalledWith('base_currency', 'EGP');
  });
});

describe('onboardingStore.setSecurityChoice — TC-06', () => {
  it('PIN choice → security_setup_skipped is "false"', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setSecurityChoice(SecurityChoice.Pin);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_choice', 'pin');
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'false');
    expect(store.getState().state.securityChoice).toBe(SecurityChoice.Pin);
  });

  it('biometric choice → security_setup_skipped is "false"', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setSecurityChoice(SecurityChoice.Biometric);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'false');
  });

  it('skip choice → security_setup_skipped is "true"', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setSecurityChoice(SecurityChoice.Skip);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'true');
    expect(store.getState().state.securityChoice).toBe(SecurityChoice.Skip);
  });
});

describe('onboardingStore.completeOnboarding — TC-13', () => {
  it('writes SecureStore + repo.set then sets complete=true', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().completeOnboarding();
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(repo.set).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(store.getState().state.complete).toBe(true);
  });
});

describe('onboardingStore — error branches', () => {
  it('setStep propagates SecureStore errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('secure fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setStep(OnboardingStep.O3)).rejects.toThrow('secure fail');
    consoleSpy.mockRestore();
  });

  it('setBaseCurrency propagates errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('base fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setBaseCurrency(Currency.USD)).rejects.toThrow('base fail');
    consoleSpy.mockRestore();
  });

  it('setSecurityChoice propagates errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('security fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setSecurityChoice(SecurityChoice.Pin)).rejects.toThrow(
      'security fail',
    );
    consoleSpy.mockRestore();
  });

  it('completeOnboarding propagates errors', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    secure.setItemAsync.mockRejectedValueOnce(new Error('complete fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().completeOnboarding()).rejects.toThrow('complete fail');
    consoleSpy.mockRestore();
  });
});

describe('loadOnboardingState — TC-02 / TC-03 resume', () => {
  it('returns defaults when SecureStore is empty (fresh install)', async () => {
    const result = await loadOnboardingState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.O1 });
    expect(useOnboardingStore.getState().state).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.O1,
      baseCurrency: Currency.EGP,
      securityChoice: undefined,
    });
  });

  it('rehydrates state when SecureStore has values', async () => {
    await secure.setItemAsync('onboarding_step', 'O4');
    await secure.setItemAsync('base_currency', 'USD');
    await secure.setItemAsync('security_choice', 'biometric');

    const result = await loadOnboardingState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.O4 });
    expect(useOnboardingStore.getState().state).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.O4,
      baseCurrency: Currency.USD,
      securityChoice: SecurityChoice.Biometric,
    });
  });

  it('returns complete:true when onboarding_complete=true', async () => {
    await secure.setItemAsync('onboarding_complete', 'true');
    await secure.setItemAsync('onboarding_step', 'O6');
    const result = await loadOnboardingState();
    expect(result.complete).toBe(true);
  });

  it('rejects invalid SecureStore values and falls back to defaults', async () => {
    await secure.setItemAsync('onboarding_step', 'O99');
    await secure.setItemAsync('base_currency', 'GBP');
    await secure.setItemAsync('security_choice', 'face_id');

    const result = await loadOnboardingState();
    expect(result.step).toBe(OnboardingStep.O1);
    expect(useOnboardingStore.getState().state).toMatchObject({
      currentStep: OnboardingStep.O1,
      baseCurrency: Currency.EGP,
      securityChoice: undefined,
    });
  });
});
