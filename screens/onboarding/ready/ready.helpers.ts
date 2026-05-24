import type { Account } from '@/store/account.store';

export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.current_balance, 0);
}
