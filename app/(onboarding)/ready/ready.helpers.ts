import { Strings } from '@/constants/strings';
import type { SecurityChoice } from '@/store/onboarding.store';
import type { Account } from '@/store/account.store';

export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
}

export function resolveSecurityLabel(choice: SecurityChoice | null): string {
  return choice === null || choice === 'skip'
    ? Strings.o6SecuritySkipped
    : Strings.o6SecurityEnabled;
}
