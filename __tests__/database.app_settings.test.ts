import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting, setSettings } from '@/database/app_settings';
import { MIGRATIONS } from '@/database/migrations';

function makeDb(): SQLiteDatabase {
  const raw = new Database(':memory:');
  raw.exec(MIGRATIONS.map((m) => m.up).join('\n'));
  return {
    getFirstAsync: async <T>(sql: string, ...params: unknown[]) =>
      (raw.prepare(sql).get(...(params as never[])) as T) ?? null,
    runAsync: async (sql: string, ...params: unknown[]) => {
      raw.prepare(sql).run(...(params as never[]));
      return { changes: 1, lastInsertRowId: 0 };
    },
  } as unknown as SQLiteDatabase;
}

describe('getSetting', () => {
  it('returns null when key does not exist', async () => {
    const db = makeDb();
    expect(await getSetting(db, 'missing_key')).toBeNull();
  });

  it('returns the value when key exists', async () => {
    const db = makeDb();
    await setSetting(db, 'base_currency', 'EGP');
    expect(await getSetting(db, 'base_currency')).toBe('EGP');
  });
});

describe('setSetting', () => {
  it('inserts a new key-value pair', async () => {
    const db = makeDb();
    await setSetting(db, 'onboarding_complete', 'true');
    expect(await getSetting(db, 'onboarding_complete')).toBe('true');
  });

  it('replaces an existing value (upsert)', async () => {
    const db = makeDb();
    await setSetting(db, 'base_currency', 'USD');
    await setSetting(db, 'base_currency', 'EGP');
    expect(await getSetting(db, 'base_currency')).toBe('EGP');
  });
});

describe('setSettings', () => {
  it('does not issue a statement for an empty batch', async () => {
    const runAsync = jest.fn();
    const db = { runAsync } as unknown as SQLiteDatabase;

    await setSettings(db, []);

    expect(runAsync).not.toHaveBeenCalled();
  });

  it('writes all entries through one atomic statement', async () => {
    const db = makeDb();

    await setSettings(db, [
      ['usd_rate', '48.5'],
      ['usd_rate_manual_override', 'true'],
      ['usd_rate_updated_at', '2026-07-23T00:00:00.000Z'],
    ]);

    expect(await getSetting(db, 'usd_rate')).toBe('48.5');
    expect(await getSetting(db, 'usd_rate_manual_override')).toBe('true');
    expect(await getSetting(db, 'usd_rate_updated_at')).toBe('2026-07-23T00:00:00.000Z');
  });
});
