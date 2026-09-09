import type { Account } from '../entities/account.entity';

/** The app's own name comparison: SQLite's `LOWER` folds ASCII only, so it cannot run in SQL. */
export function isAccountNameTaken(accounts: Account[], name: string, excludeId?: string): boolean {
  const wanted = name.trim().toLowerCase();
  return accounts.some((a) => a.id !== excludeId && a.name.trim().toLowerCase() === wanted);
}
