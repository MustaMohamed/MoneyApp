import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { BaseCurrencyRepository } from '@/modules/currency/repositories/base_currency.repository';
import { AppSettingsRepository } from '@/repositories/app_settings.repository';

const sqlite = SQLite as unknown as { __reset: () => void };
const secureStore = jest.requireMock<{ __reset: () => void }>('expo-secure-store');
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getFirstAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 0 };
  });

  mocked.getFirstAsync.mockImplementation(async (sql: string, ...params: unknown[]) => {
    return realDb.prepare(sql).get(...(params as never[])) ?? null;
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM app_settings');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const repo = new AppSettingsRepository();

describe('AppSettingsRepository.get', () => {
  it('returns null when key does not exist', async () => {
    expect(await repo.get('missing_key')).toBeNull();
  });

  it('returns value when key exists', async () => {
    await repo.set('base_currency', 'EGP');
    expect(await repo.get('base_currency')).toBe('EGP');
  });
});

describe('AppSettingsRepository.set', () => {
  it('inserts a new key-value pair', async () => {
    await repo.set('onboarding_complete', 'true');
    expect(await repo.get('onboarding_complete')).toBe('true');
  });

  it('replaces an existing value (upsert)', async () => {
    await repo.set('base_currency', 'USD');
    await repo.set('base_currency', 'EGP');
    expect(await repo.get('base_currency')).toBe('EGP');
  });
});

describe('AppSettingsRepository.setMany', () => {
  it('persists a related settings batch together', async () => {
    await repo.setMany([
      ['usd_rate', '49'],
      ['usd_rate_manual_override', 'true'],
    ]);

    expect(await repo.get('usd_rate')).toBe('49');
    expect(await repo.get('usd_rate_manual_override')).toBe('true');
  });
});

// Lives here, not in `base_currency.repository.test.ts`, which injects a mock settings repository.
describe('BaseCurrencyRepository.load — the base currency survives a lost keychain', () => {
  const baseCurrencyRepo = new BaseCurrencyRepository(repo);

  beforeEach(() => {
    // Reset the fake rather than stubbing null, so the key is genuinely absent.
    secureStore.__reset();
  });

  it('falls back to app_settings.base_currency before defaulting to EGP', async () => {
    await repo.set('base_currency', Currency.USD);

    await expect(baseCurrencyRepo.load()).resolves.toBe(Currency.USD);
  });

  it('still defaults to EGP when neither source has a value', async () => {
    // Without this case, a body returning USD unconditionally would pass the one above.
    await expect(baseCurrencyRepo.load()).resolves.toBe(Currency.EGP);
  });

  it('ignores a settings value that is not a currency code', async () => {
    await repo.set('base_currency', 'GBP');

    await expect(baseCurrencyRepo.load()).resolves.toBe(Currency.EGP);
  });
});
