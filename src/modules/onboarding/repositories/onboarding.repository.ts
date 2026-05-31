import * as SecureStore from 'expo-secure-store';

import { Currency, OnboardingStep } from '@/constants/enums';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  appSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

export type LoadedOnboardingState = {
  complete: boolean;
  step: OnboardingStep;
  baseCurrency: Currency;
};

export interface IOnboardingRepository {
  setStep(step: OnboardingStep): Promise<void>;
  setBaseCurrency(currency: Currency): Promise<void>;
  complete(): Promise<void>;
  load(): Promise<LoadedOnboardingState>;
}

export class OnboardingRepository implements IOnboardingRepository {
  constructor(
    private readonly settingsRepository: IAppSettingsRepository = appSettingsRepository,
  ) {}

  async setStep(step: OnboardingStep): Promise<void> {
    await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, step);
  }

  async setBaseCurrency(currency: Currency): Promise<void> {
    await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);
    await this.settingsRepository.set('base_currency', currency);
  }

  async complete(): Promise<void> {
    await SecureStore.setItemAsync(SecureStoreKeys.OnboardingComplete, 'true');
    await this.settingsRepository.set('onboarding_complete', 'true');
  }

  async load(): Promise<LoadedOnboardingState> {
    const [completeRaw, stepRaw, currencyRaw] = await Promise.all([
      SecureStore.getItemAsync(SecureStoreKeys.OnboardingComplete),
      SecureStore.getItemAsync(SecureStoreKeys.OnboardingStep),
      SecureStore.getItemAsync(SecureStoreKeys.BaseCurrency),
    ]);

    const complete = completeRaw === 'true';
    const step = await this.normalizeStep(stepRaw);
    const baseCurrency: Currency = isCurrency(currencyRaw) ? currencyRaw : Currency.EGP;

    return { complete, step, baseCurrency };
  }

  private async normalizeStep(stepRaw: string | null): Promise<OnboardingStep> {
    if (stepRaw?.startsWith('O')) {
      await this.setStep(OnboardingStep.N1);
      return OnboardingStep.N1;
    }

    return isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.N1;
  }
}

function isOnboardingStep(value: string | null): value is OnboardingStep {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- required by Array.includes() overload; type-guard validates at runtime
  return Object.values(OnboardingStep).includes(value as OnboardingStep);
}

function isCurrency(value: string | null): value is Currency {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- required by Array.includes() overload; type-guard validates at runtime
  return Object.values(Currency).includes(value as Currency);
}

export const onboardingRepository = new OnboardingRepository();
