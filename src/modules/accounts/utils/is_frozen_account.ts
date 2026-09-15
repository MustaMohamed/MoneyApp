import type { Account } from '../entities/account.entity';

/** Archived and not deleted: a deleted account is archived too, and its transactions stay editable. */
export function isFrozenAccount(account: Pick<Account, 'is_archived' | 'is_deleted'>): boolean {
  return account.is_archived === 1 && account.is_deleted === 0;
}
