import { stripFormatChars } from '@/utils/strip_format_chars';

import type { Account } from '../entities/account.entity';

const comparable = (name: string) => stripFormatChars(name).trim().toLowerCase();

/** The app's own name comparison: SQLite's `LOWER` folds ASCII only, so it cannot run in SQL. */
export function isAccountNameTaken(accounts: Account[], name: string, excludeId?: string): boolean {
  const wanted = comparable(name);
  return accounts.some((a) => a.id !== excludeId && comparable(a.name) === wanted);
}
