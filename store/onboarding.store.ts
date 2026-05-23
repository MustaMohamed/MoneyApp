import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';
import { FeatureFlags } from '@/constants/feature_flags';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const INITIAL_STATE = {
  complete: false,
  currentStep: OnboardingStep.O1,
  baseCurrency: Currency.EGP,
  securityChoice: undefined as SecurityChoice | undefined,
};

interface OnboardingStore {
  state: typeof INITIAL_STATE;
  setStep: (step: OnboardingStep) => Promise<void>;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  setSecurityChoice: (choice: SecurityChoice) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export function createOnboardingStore(repo: IAppSettingsRepository) {
  return create<OnboardingStore>((set) => ({
    state: INITIAL_STATE,

    setStep: async (step) => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, step);
        set((s) => ({ state: { ...s.state, currentStep: step } }));
      } catch (err) {
        console.error('[onboardingStore] setStep failed:', err);
        throw err;
      }
    },

    setBaseCurrency: async (currency) => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);
        await repo.set('base_currency', currency);
        set((s) => ({ state: { ...s.state, baseCurrency: currency } }));
      } catch (err) {
        console.error('[onboardingStore] setBaseCurrency failed:', err);
        throw err;
      }
    },

    setSecurityChoice: async (choice) => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.SecurityChoice, choice);
        await SecureStore.setItemAsync(
          SecureStoreKeys.SecuritySetupSkipped,
          String(choice === SecurityChoice.Skip),
        );
        set((s) => ({ state: { ...s.state, securityChoice: choice } }));
      } catch (err) {
        console.error('[onboardingStore] setSecurityChoice failed:', err);
        throw err;
      }
    },

    completeOnboarding: async () => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.OnboardingComplete, 'true');
        await repo.set('onboarding_complete', 'true');
        set((s) => ({ state: { ...s.state, complete: true } }));
      } catch (err) {
        console.error('[onboardingStore] completeOnboarding failed:', err);
        throw err;
      }
    },
  }));
}

export const useOnboardingStore = createOnboardingStore(new AppSettingsRepository());

export async function loadOnboardingState(): Promise<{
  complete: boolean;
  step: OnboardingStep;
}> {
  const [completeRaw, stepRaw, currencyRaw, securityRaw] = await Promise.all([
    SecureStore.getItemAsync(SecureStoreKeys.OnboardingComplete),
    SecureStore.getItemAsync(SecureStoreKeys.OnboardingStep),
    SecureStore.getItemAsync(SecureStoreKeys.BaseCurrency),
    SecureStore.getItemAsync(SecureStoreKeys.SecurityChoice),
  ]);

  const complete = completeRaw === 'true';
  let step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.O1;

  // Force-restart: if the new-onboarding flag is enabled and the persisted step is from
  // the old O* flow, restart from N1. This handles the flag-flip moment for testers.
  // No production users will be affected during the §2 window (flag ships as false).
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional dead code guard; flag will flip when §2 ships
  if (FeatureFlags.newOnboarding && step.startsWith('O')) {
    step = OnboardingStep.N1;
    await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, OnboardingStep.N1);
  }
  const baseCurrency: Currency = isCurrency(currencyRaw) ? currencyRaw : Currency.EGP;
  const securityChoice: SecurityChoice | undefined = isSecurityChoice(securityRaw)
    ? securityRaw
    : undefined;

  useOnboardingStore.setState({
    state: { complete, currentStep: step, baseCurrency, securityChoice },
  });

  return { complete, step };
}

function isOnboardingStep(v: string | null): v is OnboardingStep {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- required by Array.includes() overload; type-guard validates at runtime
  return Object.values(OnboardingStep).includes(v as OnboardingStep);
}

function isCurrency(v: string | null): v is Currency {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- required by Array.includes() overload; type-guard validates at runtime
  return Object.values(Currency).includes(v as Currency);
}

function isSecurityChoice(v: string | null): v is SecurityChoice {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- required by Array.includes() overload; type-guard validates at runtime
  return Object.values(SecurityChoice).includes(v as SecurityChoice);
}
