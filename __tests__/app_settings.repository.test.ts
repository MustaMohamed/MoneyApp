import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { Currency } from '@/constants/enums';
import { MIGRATIONS } from '@/database/migrations';
import { OnboardingRepository } from '@/modules/onboarding/repositories/onboarding.repository';
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

// Scenario 27, and it lives in THIS suite rather than
// `onboarding.repository.test.ts` because that one injects a mock settings
// repository — a fallback tested against a mock would pass with the real read
// deleted. Here the row goes through `MIGRATIONS` into a real engine.
//
// `setBaseCurrency` has written `app_settings.base_currency` since #23 and
// nothing ever read it back. This gives the write-only row its first reader,
// covering the one failure mode the dashboard's store read accepts: SecureStore
// loses the key (a restore onto a new device, a keychain reset) and the user
// silently reverts to an EGP base they did not choose.
describe('OnboardingRepository.load — the base currency survives a lost keychain', () => {
  const onboardingRepo = new OnboardingRepository(repo);

  beforeEach(() => {
    // Empty the SecureStore fake rather than stubbing its resolved value: the
    // fallback must fire because the key is genuinely absent, which is the
    // real failure mode, not because a mock was told to answer null.
    secureStore.__reset();
  });

  it('falls back to app_settings.base_currency before defaulting to EGP', async () => {
    await repo.set('base_currency', Currency.USD);

    await expect(onboardingRepo.load()).resolves.toMatchObject({
      baseCurrency: Currency.USD,
    });
  });

  it('still defaults to EGP when neither source has a value', async () => {
    // The row above is only meaningful beside this one: a body returning USD
    // unconditionally would pass it.
    await expect(onboardingRepo.load()).resolves.toMatchObject({
      baseCurrency: Currency.EGP,
    });
  });

  it('ignores a settings value that is not a currency code', async () => {
    await repo.set('base_currency', 'GBP');

    await expect(onboardingRepo.load()).resolves.toMatchObject({
      baseCurrency: Currency.EGP,
    });
  });
});
