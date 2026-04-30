import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { setSetting } from '@/database/app_settings';
import { getDb } from '@/database/client';
import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';
import { SecureStoreKeys } from '@/constants/secure_store_keys';

interface OnboardingState {
  complete: boolean;
  currentStep: OnboardingStep;
  baseCurrency: Currency;
  securityChoice: SecurityChoice | undefined;
  setStep: (step: OnboardingStep) => Promise<void>;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  setSecurityChoice: (choice: SecurityChoice) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  complete: false,
  currentStep: OnboardingStep.O1,
  baseCurrency: Currency.EGP,
  securityChoice: undefined,

  setStep: async (step) => {
    try {
      await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, step);
      set({ currentStep: step });
    } catch (err) {
      console.error('[onboardingStore] setStep failed:', err);
      throw err;
    }
  },

  setBaseCurrency: async (currency) => {
    try {
      await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);
      const db = await getDb();
      await setSetting(db, 'base_currency', currency);
      set({ baseCurrency: currency });
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
      set({ securityChoice: choice });
    } catch (err) {
      console.error('[onboardingStore] setSecurityChoice failed:', err);
      throw err;
    }
  },

  completeOnboarding: async () => {
    try {
      await SecureStore.setItemAsync(SecureStoreKeys.OnboardingComplete, 'true');
      const db = await getDb();
      await setSetting(db, 'onboarding_complete', 'true');
      set({ complete: true });
    } catch (err) {
      console.error('[onboardingStore] completeOnboarding failed:', err);
      throw err;
    }
  },
}));

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
  const step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.O1;
  const baseCurrency: Currency = isCurrency(currencyRaw) ? currencyRaw : Currency.EGP;
  const securityChoice: SecurityChoice | undefined = isSecurityChoice(securityRaw)
    ? securityRaw
    : undefined;

  useOnboardingStore.setState({
    complete,
    currentStep: step,
    baseCurrency,
    securityChoice,
  });

  return { complete, step };
}

function isOnboardingStep(v: string | null): v is OnboardingStep {
  return Object.values(OnboardingStep).includes(v as OnboardingStep);
}

function isCurrency(v: string | null): v is Currency {
  return Object.values(Currency).includes(v as Currency);
}

function isSecurityChoice(v: string | null): v is SecurityChoice {
  return Object.values(SecurityChoice).includes(v as SecurityChoice);
}
