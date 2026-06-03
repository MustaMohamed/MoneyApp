import { makeAutoObservable, runInAction } from 'mobx';

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

export class OnboardingStore {
  complete = INITIAL_STATE.complete;
  currentStep = INITIAL_STATE.currentStep;
  baseCurrency = INITIAL_STATE.baseCurrency;

  constructor(private readonly repository: IOnboardingRepository = onboardingRepository) {
    makeAutoObservable<OnboardingStore, 'repository' | 'setLoadedState'>(
      this,
      {
        repository: false,
        setLoadedState: false,
      },
      { autoBind: true },
    );
  }

  async setStep(step: OnboardingStep): Promise<void> {
    try {
      await this.repository.setStep(step);
      runInAction(() => {
        this.currentStep = step;
      });
    } catch (err) {
      console.error('[onboardingStore] setStep failed:', err);
      throw err;
    }
  }

  async setBaseCurrency(currency: Currency): Promise<void> {
    try {
      await this.repository.setBaseCurrency(currency);
      runInAction(() => {
        this.baseCurrency = currency;
      });
    } catch (err) {
      console.error('[onboardingStore] setBaseCurrency failed:', err);
      throw err;
    }
  }

  async completeOnboarding(): Promise<void> {
    try {
      await this.repository.complete();
      runInAction(() => {
        this.complete = true;
      });
    } catch (err) {
      console.error('[onboardingStore] completeOnboarding failed:', err);
      throw err;
    }
  }

  async init(): Promise<{
    complete: boolean;
    step: OnboardingStep;
  }> {
    const nextState = await this.repository.load();
    runInAction(() => {
      this.setLoadedState(nextState);
    });

    return { complete: nextState.complete, step: nextState.step };
  }

  reset() {
    this.complete = INITIAL_STATE.complete;
    this.currentStep = INITIAL_STATE.currentStep;
    this.baseCurrency = INITIAL_STATE.baseCurrency;
  }

  private setLoadedState(nextState: LoadedOnboardingState) {
    this.complete = nextState.complete;
    this.currentStep = nextState.step;
    this.baseCurrency = nextState.baseCurrency;
  }
}

const onboardingStore = new OnboardingStore(onboardingRepository);

export function useOnboardingStore(): OnboardingStore {
  return onboardingStore;
}
