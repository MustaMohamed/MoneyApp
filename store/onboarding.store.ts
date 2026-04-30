import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { getDb } from '@/db/init';
import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';

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
      await SecureStore.setItemAsync('onboarding_step', step);
      set({ currentStep: step });
    } catch (err) {
      console.error('[onboardingStore] setStep failed:', err);
      throw err;
    }
  },

  setBaseCurrency: async (currency) => {
    try {
      await SecureStore.setItemAsync('base_currency', currency);
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        'base_currency',
        currency,
      );
      set({ baseCurrency: currency });
    } catch (err) {
      console.error('[onboardingStore] setBaseCurrency failed:', err);
      throw err;
    }
  },

  setSecurityChoice: async (choice) => {
    try {
      await SecureStore.setItemAsync('security_choice', choice);
      await SecureStore.setItemAsync(
        'security_setup_skipped',
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
      await SecureStore.setItemAsync('onboarding_complete', 'true');
      const db = await getDb();
      await db.runAsync(
        'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        'onboarding_complete',
        'true',
      );
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
    SecureStore.getItemAsync('onboarding_complete'),
    SecureStore.getItemAsync('onboarding_step'),
    SecureStore.getItemAsync('base_currency'),
    SecureStore.getItemAsync('security_choice'),
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
