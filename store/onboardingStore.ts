import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { getDb } from '@/db/init';

export type OnboardingStep = 'O1' | 'O2' | 'O3' | 'O4' | 'O5' | 'O6';
export type SecurityChoice = 'pin' | 'biometric' | 'skip';
export type Currency = 'EGP' | 'USD';

interface OnboardingState {
  complete: boolean;
  currentStep: OnboardingStep;
  baseCurrency: Currency;
  securityChoice: SecurityChoice | null;
  setStep: (step: OnboardingStep) => Promise<void>;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  setSecurityChoice: (choice: SecurityChoice) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export const useOnboardingStore = create<OnboardingState>((set) => ({
  complete: false,
  currentStep: 'O1',
  baseCurrency: 'EGP',
  securityChoice: null,

  setStep: async (step) => {
    await SecureStore.setItemAsync('onboarding_step', step);
    set({ currentStep: step });
  },

  setBaseCurrency: async (currency) => {
    await SecureStore.setItemAsync('base_currency', currency);
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'base_currency',
      currency,
    );
    set({ baseCurrency: currency });
  },

  setSecurityChoice: async (choice) => {
    await SecureStore.setItemAsync('security_choice', choice);
    await SecureStore.setItemAsync('security_setup_skipped', String(choice === 'skip'));
    set({ securityChoice: choice });
  },

  completeOnboarding: async () => {
    await SecureStore.setItemAsync('onboarding_complete', 'true');
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
      'onboarding_complete',
      'true',
    );
    set({ complete: true });
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
  const step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : 'O1';
  const baseCurrency: Currency = isCurrency(currencyRaw) ? currencyRaw : 'EGP';
  const securityChoice: SecurityChoice | null = isSecurityChoice(securityRaw) ? securityRaw : null;

  useOnboardingStore.setState({
    complete,
    currentStep: step,
    baseCurrency,
    securityChoice,
  });

  return { complete, step };
}

function isOnboardingStep(v: string | null): v is OnboardingStep {
  return v === 'O1' || v === 'O2' || v === 'O3' || v === 'O4' || v === 'O5' || v === 'O6';
}

function isCurrency(v: string | null): v is Currency {
  return v === 'EGP' || v === 'USD';
}

function isSecurityChoice(v: string | null): v is SecurityChoice {
  return v === 'pin' || v === 'biometric' || v === 'skip';
}
