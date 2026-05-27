import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { Currency, OnboardingStep } from '@/constants/enums';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const INITIAL_STATE = {
  complete: false,
  currentStep: OnboardingStep.N1,
  baseCurrency: Currency.EGP,
};

type OnboardingStore = typeof INITIAL_STATE & {
  setStep: (step: OnboardingStep) => Promise<void>;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  completeOnboarding: () => Promise<void>;
};

export function createOnboardingStore(repo: IAppSettingsRepository) {
  return createMoneyAppSelectors(
    create<OnboardingStore>((set) => ({
      ...INITIAL_STATE,

      setStep: async (step) => {
        try {
          await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, step);
          set((s) => ({ ...s, currentStep: step }));
        } catch (err) {
          console.error('[onboardingStore] setStep failed:', err);
          throw err;
        }
      },

      setBaseCurrency: async (currency) => {
        try {
          await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);
          await repo.set('base_currency', currency);
          set((s) => ({ ...s, baseCurrency: currency }));
        } catch (err) {
          console.error('[onboardingStore] setBaseCurrency failed:', err);
          throw err;
        }
      },

      completeOnboarding: async () => {
        try {
          await SecureStore.setItemAsync(SecureStoreKeys.OnboardingComplete, 'true');
          await repo.set('onboarding_complete', 'true');
          set((s) => ({ ...s, complete: true }));
        } catch (err) {
          console.error('[onboardingStore] completeOnboarding failed:', err);
          throw err;
        }
      },
    })),
  );
}

export const useOnboardingStore = createOnboardingStore(new AppSettingsRepository());

export async function loadOnboardingState(): Promise<{
  complete: boolean;
  step: OnboardingStep;
}> {
  const [completeRaw, stepRaw, currencyRaw] = await Promise.all([
    SecureStore.getItemAsync(SecureStoreKeys.OnboardingComplete),
    SecureStore.getItemAsync(SecureStoreKeys.OnboardingStep),
    SecureStore.getItemAsync(SecureStoreKeys.BaseCurrency),
  ]);

  const complete = completeRaw === 'true';
  let step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.N1;

  // Migrate any persisted step from the retired O* flow (V1) to the start of the
  // current N* flow. V1 was the live onboarding before §2 promotion, so real
  // incomplete users may still have an O* step persisted; this restarts them cleanly,
  // scrubs the stale value, and avoids redirecting to the now-deleted routes.
  if (stepRaw?.startsWith('O')) {
    step = OnboardingStep.N1;
    await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, OnboardingStep.N1);
  }
  const baseCurrency: Currency = isCurrency(currencyRaw) ? currencyRaw : Currency.EGP;

  useOnboardingStore.setState({ complete, currentStep: step, baseCurrency });

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
