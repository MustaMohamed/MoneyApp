import type { SQLiteDatabase } from 'expo-sqlite';

export async function getSetting(db: SQLiteDatabase, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM app_settings WHERE key = ?',
    [key],
  );
  return row?.value ?? null;
}

export async function setSetting(db: SQLiteDatabase, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)', [key, value]);
}

export async function setSettings(
  db: SQLiteDatabase,
  entries: ReadonlyArray<readonly [string, string]>,
): Promise<void> {
  if (entries.length === 0) return;

  const placeholders = entries.map(() => '(?, ?)').join(', ');
  const values = entries.flatMap(([key, value]) => [key, value]);
  await db.runAsync(
    `INSERT OR REPLACE INTO app_settings (key, value) VALUES ${placeholders}`,
    values,
  );
}
