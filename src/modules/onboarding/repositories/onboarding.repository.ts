import * as SecureStore from 'expo-secure-store';

import { OnboardingStep } from '@/constants/enums';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  appSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

export type LoadedOnboardingState = {
  complete: boolean;
  step: OnboardingStep;
};

// Base-currency persistence moved to `BaseCurrencyRepository` (#348).
export interface IOnboardingRepository {
  setStep(step: OnboardingStep): Promise<void>;
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

  async complete(): Promise<void> {
    await SecureStore.setItemAsync(SecureStoreKeys.OnboardingComplete, 'true');
    await this.settingsRepository.set('onboarding_complete', 'true');
  }

  async load(): Promise<LoadedOnboardingState> {
    const [completeRaw, stepRaw] = await Promise.all([
      SecureStore.getItemAsync(SecureStoreKeys.OnboardingComplete),
      SecureStore.getItemAsync(SecureStoreKeys.OnboardingStep),
    ]);

    const complete = completeRaw === 'true';
    const step = await this.normalizeStep(stepRaw);

    return { complete, step };
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

export const onboardingRepository = new OnboardingRepository();
