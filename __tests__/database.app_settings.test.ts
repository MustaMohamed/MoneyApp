import Database from 'better-sqlite3';
import type { SQLiteDatabase } from 'expo-sqlite';

import { getSetting, setSetting, setSettings } from '@/database/app_settings';
import { MIGRATIONS } from '@/database/migrations';

const openDbs: ReturnType<typeof Database>[] = [];

function makeDb(): SQLiteDatabase {
  const raw = new Database(':memory:');
  openDbs.push(raw);
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

// afterEach, not the sibling afterAll(close) spelling: a test that throws mid-body still
// reaches this afterEach with its handle already pushed, so afterAll would leave it
// stranded until the file's last test — afterEach drains after every test instead.
afterEach(() => {
  const drained = openDbs.splice(0);
  const closeFailures: unknown[] = [];
  for (const db of drained) {
    try {
      db.close();
    } catch (err) {
      closeFailures.push(err);
    }
  }
  // One assertion, not a bare-boolean loop: it names which drained index(es) are still
  // open AND surfaces every close() error's text in the same failure, so a stranded
  // handle never reports as an anonymous `expect(db.open).toBe(false)` with the real
  // cause silently dropped. Passes only when both are empty, so the throws below are
  // unreachable on green — they exist to preserve stack fidelity on the failure path.
  const stranded = drained.flatMap((db, i) => (db.open ? [i] : []));
  expect({ stranded, closeErrors: closeFailures.map(String) }).toEqual({
    stranded: [],
    closeErrors: [],
  });
  if (closeFailures.length === 1) throw closeFailures[0];
  if (closeFailures.length > 1) throw new AggregateError(closeFailures);
});

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
