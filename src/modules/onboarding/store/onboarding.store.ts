import { create } from 'zustand';

import { Currency, OnboardingStep } from '@/constants/enums';
import {
  onboardingRepository,
  type IOnboardingRepository,
} from '@/modules/onboarding/repositories/onboarding.repository';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

const INITIAL_STATE = {
  complete: false,
  currentStep: OnboardingStep.N1,
  baseCurrency: Currency.EGP,
};

export type OnboardingInitResult = {
  complete: boolean;
  step: OnboardingStep;
};

export type OnboardingStoreState = typeof INITIAL_STATE & {
  setStep: (step: OnboardingStep) => Promise<void>;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  completeOnboarding: () => Promise<void>;
  init: () => Promise<OnboardingInitResult>;
  reset: () => void;
};

export function createOnboardingStore(repository: IOnboardingRepository = onboardingRepository) {
  return createMoneyAppSelectors(
    create<OnboardingStoreState>((set) => ({
      ...INITIAL_STATE,

      setStep: async (step) => {
        try {
          await repository.setStep(step);
          set((s) => ({ ...s, currentStep: step }));
        } catch (err) {
          console.error('[onboardingStore] setStep failed:', err);
          throw err;
        }
      },

      setBaseCurrency: async (currency) => {
        try {
          await repository.setBaseCurrency(currency);
          set((s) => ({ ...s, baseCurrency: currency }));
        } catch (err) {
          console.error('[onboardingStore] setBaseCurrency failed:', err);
          throw err;
        }
      },

      completeOnboarding: async () => {
        try {
          await repository.complete();
          set((s) => ({ ...s, complete: true }));
        } catch (err) {
          console.error('[onboardingStore] completeOnboarding failed:', err);
          throw err;
        }
      },

      init: async (): Promise<OnboardingInitResult> => {
        const nextState = await repository.load();
        set((s) => ({
          ...s,
          complete: nextState.complete,
          currentStep: nextState.step,
          baseCurrency: nextState.baseCurrency,
        }));

        return { complete: nextState.complete, step: nextState.step };
      },

      reset: () => set(INITIAL_STATE),
    })),
  );
}

export const useOnboardingStore = createOnboardingStore(onboardingRepository);
