import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { AppSettingsRepository } from '@/repositories/app_settings.repository';

const sqlite = SQLite as unknown as { __reset: () => void };
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
