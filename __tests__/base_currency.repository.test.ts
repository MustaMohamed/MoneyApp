import * as SecureStore from 'expo-secure-store';

import { Currency } from '@/constants/enums';
import { BaseCurrencyRepository } from '@/modules/currency/repositories/base_currency.repository';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Jest setup adds test-only __reset to the mocked SecureStore module
const secure = SecureStore as unknown as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  __reset: () => void;
};

function makeSettingsRepo(): jest.Mocked<IAppSettingsRepository> {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    setMany: jest.fn().mockResolvedValue(undefined),
  };
}

let settingsRepo: jest.Mocked<IAppSettingsRepository>;
let repository: BaseCurrencyRepository;

beforeEach(() => {
  secure.__reset();
  jest.clearAllMocks();
  settingsRepo = makeSettingsRepo();
  repository = new BaseCurrencyRepository(settingsRepo);
});

describe('BaseCurrencyRepository', () => {
  it('persists to SecureStore and app settings — same double-write as before the move', async () => {
    await repository.set(Currency.USD);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'USD');
    expect(settingsRepo.set.mock.calls).toEqual([['base_currency', 'USD']]);
  });

  it('loads the SecureStore value without touching app settings', async () => {
    await secure.setItemAsync('base_currency', 'USD');
    jest.clearAllMocks();

    await expect(repository.load()).resolves.toBe(Currency.USD);
    expect(settingsRepo.get).not.toHaveBeenCalled();
  });

  it('falls back to app_settings.base_currency on keychain loss', async () => {
    settingsRepo.get.mockResolvedValueOnce('USD');

    await expect(repository.load()).resolves.toBe(Currency.USD);
    expect(settingsRepo.get.mock.calls).toEqual([['base_currency']]);
  });

  it('falls back past an invalid SecureStore value, not only an absent one', async () => {
    await secure.setItemAsync('base_currency', 'XAU');
    settingsRepo.get.mockResolvedValueOnce('USD');

    await expect(repository.load()).resolves.toBe(Currency.USD);
  });

  it('defaults to EGP when both stores are empty', async () => {
    await expect(repository.load()).resolves.toBe(Currency.EGP);
  });

  it('defaults to EGP when the fallback value is invalid too', async () => {
    settingsRepo.get.mockResolvedValueOnce('not-a-currency');
    await expect(repository.load()).resolves.toBe(Currency.EGP);
  });
});
