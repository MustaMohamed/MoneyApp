import { getSetting, setSetting } from '@/database/app_settings';
import { getDb } from '@/database/client';

export interface IAppSettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class AppSettingsRepository implements IAppSettingsRepository {
  async get(key: string): Promise<string | null> {
    const db = await getDb();
    return getSetting(db, key);
  }

  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await setSetting(db, key, value);
  }
}
