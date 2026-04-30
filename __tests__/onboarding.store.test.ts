// TC-05 / TC-06 / TC-13 — onboardingStore writes to SecureStore (and DB
// app_settings where applicable) before flipping the in-memory state, and
// loadOnboardingState rehydrates the four persisted keys on launch.

import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';

import { loadOnboardingState, useOnboardingStore } from '@/store/onboarding.store';
import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';

const sqlite = SQLite as unknown as {
  __fakeDb: { runAsync: jest.Mock; execAsync: jest.Mock };
  __reset: () => void;
};
const secure = SecureStore as unknown as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  __reset: () => void;
};

beforeEach(() => {
  sqlite.__reset();
  secure.__reset();
  useOnboardingStore.setState({
    complete: false,
    currentStep: OnboardingStep.O1,
    baseCurrency: Currency.EGP,
    securityChoice: undefined,
  });
});

describe('onboardingStore.setStep — TC-03', () => {
  it('writes onboarding_step to SecureStore then updates state', async () => {
    await useOnboardingStore.getState().setStep(OnboardingStep.O3);

    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_step', 'O3');
    expect(useOnboardingStore.getState().currentStep).toBe(OnboardingStep.O3);
  });
});

describe('onboardingStore.setBaseCurrency — TC-05', () => {
  it('writes both SecureStore and app_settings DB before updating state', async () => {
    await useOnboardingStore.getState().setBaseCurrency(Currency.USD);

    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'USD');
    expect(sqlite.__fakeDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO app_settings'),
      'base_currency',
      'USD',
    );
    expect(useOnboardingStore.getState().baseCurrency).toBe(Currency.USD);
  });

  it('persists EGP on the same path', async () => {
    await useOnboardingStore.getState().setBaseCurrency(Currency.EGP);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'EGP');
  });
});

describe('onboardingStore.setSecurityChoice — TC-06', () => {
  it('PIN choice → security_setup_skipped is "false"', async () => {
    await useOnboardingStore.getState().setSecurityChoice(SecurityChoice.Pin);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_choice', 'pin');
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'false');
    expect(useOnboardingStore.getState().securityChoice).toBe(SecurityChoice.Pin);
  });

  it('biometric choice → security_setup_skipped is "false"', async () => {
    await useOnboardingStore.getState().setSecurityChoice(SecurityChoice.Biometric);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'false');
  });

  it('skip choice → security_setup_skipped is "true"', async () => {
    await useOnboardingStore.getState().setSecurityChoice(SecurityChoice.Skip);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'true');
    expect(useOnboardingStore.getState().securityChoice).toBe(SecurityChoice.Skip);
  });
});

describe('onboardingStore.completeOnboarding — TC-13', () => {
  it('writes SecureStore + app_settings DB then sets complete=true', async () => {
    await useOnboardingStore.getState().completeOnboarding();

    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(sqlite.__fakeDb.runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT OR REPLACE INTO app_settings'),
      'onboarding_complete',
      'true',
    );
    expect(useOnboardingStore.getState().complete).toBe(true);
  });
});

describe('loadOnboardingState — TC-02 / TC-03 resume', () => {
  it('returns defaults when SecureStore is empty (fresh install)', async () => {
    const result = await loadOnboardingState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.O1 });
    expect(useOnboardingStore.getState()).toMatchObject({
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
    expect(useOnboardingStore.getState()).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.O4,
      baseCurrency: Currency.USD,
      securityChoice: SecurityChoice.Biometric,
    });
  });

  it('returns complete:true and skips dashboard when onboarding_complete=true', async () => {
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
    expect(useOnboardingStore.getState()).toMatchObject({
      currentStep: OnboardingStep.O1,
      baseCurrency: Currency.EGP,
      securityChoice: undefined,
    });
  });
});
