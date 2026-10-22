import * as SQLite from 'expo-sqlite';

import { getDb } from '@/database/client';

it('opens the main connection again after a rejected open', async () => {
  const failure = new Error('open failed');
  jest.mocked(SQLite.openDatabaseAsync).mockRejectedValueOnce(failure);

  await expect(getDb()).rejects.toBe(failure);
  await expect(getDb()).resolves.toBeDefined();
  expect(SQLite.openDatabaseAsync).toHaveBeenCalledTimes(2);
});
