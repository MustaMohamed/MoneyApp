import * as SecureStore from 'expo-secure-store';

import { Currency } from '@/constants/enums';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  appSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

export interface IBaseCurrencyRepository {
  set(currency: Currency): Promise<void>;
  load(): Promise<Currency>;
}

/** Moved from `OnboardingRepository` (#348): the base currency outlives the onboarding flow. */
export class BaseCurrencyRepository implements IBaseCurrencyRepository {
  constructor(
    private readonly settingsRepository: IAppSettingsRepository = appSettingsRepository,
  ) {}

  async set(currency: Currency): Promise<void> {
    await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);
    await this.settingsRepository.set('base_currency', currency);
  }

  // `app_settings.base_currency` is a keychain-loss fallback, read only when SecureStore has no
  // valid value; it never competes with the keychain as a source of truth. `app_settings` has no
  // CHECK, so an unvalidated code would reach `computeNetWorth` and throw.
  async load(): Promise<Currency> {
    const currencyRaw = await SecureStore.getItemAsync(SecureStoreKeys.BaseCurrency);
    if (isCurrency(currencyRaw)) return currencyRaw;

    const settingsRaw = await this.settingsRepository.get('base_currency');
    return isCurrency(settingsRaw) ? settingsRaw : Currency.EGP;
  }
}

function isCurrency(value: string | null): value is Currency {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- required by Array.includes() overload; type-guard validates at runtime
  return Object.values(Currency).includes(value as Currency);
}

export const baseCurrencyRepository = new BaseCurrencyRepository();
