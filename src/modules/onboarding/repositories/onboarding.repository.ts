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
    const baseCurrency = await this.resolveBaseCurrency(currencyRaw);

    return { complete, step, baseCurrency };
  }

  /**
   * SecureStore first, `app_settings.base_currency` second, EGP last.
   *
   * `setBaseCurrency` has written both since #23 and nothing has ever read the
   * settings row back. This is its first reader, and it covers the one failure
   * mode the dashboard's store read accepts: SecureStore loses the key — a
   * restore onto a new device, a keychain reset — and a user who chose USD is
   * silently reverted to an EGP base they never picked, on a dashboard that now
   * reports in whatever this returns.
   *
   * A FALLBACK, not a second source of truth: SecureStore wins whenever it has a
   * value, and the settings row is only consulted when it does not. Both writes
   * happen in one method, so they cannot disagree unless the first survived and
   * the second did not — in which case this reads the survivor.
   *
   * The value is validated the same way as SecureStore's. `app_settings` is a
   * free-form key/value table with no CHECK constraint, so an unrecognised code
   * there falls through to EGP rather than reaching `computeNetWorth`, whose
   * `assertSupportedCurrency` would throw with no error boundary to catch it.
   */
  private async resolveBaseCurrency(currencyRaw: string | null): Promise<Currency> {
    if (isCurrency(currencyRaw)) return currencyRaw;

    const settingsRaw = await this.settingsRepository.get('base_currency');
    return isCurrency(settingsRaw) ? settingsRaw : Currency.EGP;
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
