import { batch, signal, type Signal } from '@preact/signals-react';

import { Currency, OnboardingStep } from '@/constants/enums';
import {
  onboardingRepository,
  type IOnboardingRepository,
  type LoadedOnboardingState,
} from '@/modules/onboarding/repositories/onboarding.repository';

const INITIAL_STATE = {
  complete: false,
  currentStep: OnboardingStep.N1,
  baseCurrency: Currency.EGP,
};

type OnboardingSignalState = {
  complete: Signal<boolean>;
  currentStep: Signal<OnboardingStep>;
  baseCurrency: Signal<Currency>;
};

export class OnboardingStore {
  readonly state: OnboardingSignalState = {
    complete: signal(INITIAL_STATE.complete),
    currentStep: signal(INITIAL_STATE.currentStep),
    baseCurrency: signal(INITIAL_STATE.baseCurrency),
  };

  constructor(private readonly repository: IOnboardingRepository = onboardingRepository) {}

  setStep = async (step: OnboardingStep): Promise<void> => {
    try {
      await this.repository.setStep(step);
      this.state.currentStep.value = step;
    } catch (err) {
      console.error('[onboardingStore] setStep failed:', err);
      throw err;
    }
  };

  setBaseCurrency = async (currency: Currency): Promise<void> => {
    try {
      await this.repository.setBaseCurrency(currency);
      this.state.baseCurrency.value = currency;
    } catch (err) {
      console.error('[onboardingStore] setBaseCurrency failed:', err);
      throw err;
    }
  };

  completeOnboarding = async (): Promise<void> => {
    try {
      await this.repository.complete();
      this.state.complete.value = true;
    } catch (err) {
      console.error('[onboardingStore] completeOnboarding failed:', err);
      throw err;
    }
  };

  load = async (): Promise<{
    complete: boolean;
    step: OnboardingStep;
  }> => {
    const nextState = await this.repository.load();
    this.setLoadedState(nextState);

    return { complete: nextState.complete, step: nextState.step };
  };

  reset = () => {
    batch(() => {
      this.state.complete.value = INITIAL_STATE.complete;
      this.state.currentStep.value = INITIAL_STATE.currentStep;
      this.state.baseCurrency.value = INITIAL_STATE.baseCurrency;
    });
  };

  private setLoadedState(nextState: LoadedOnboardingState) {
    batch(() => {
      this.state.complete.value = nextState.complete;
      this.state.currentStep.value = nextState.step;
      this.state.baseCurrency.value = nextState.baseCurrency;
    });
  }
}

const onboardingStore = new OnboardingStore(onboardingRepository);

export function useOnboardingStore(): OnboardingStore {
  return onboardingStore;
}
