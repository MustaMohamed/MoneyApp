import { Strings } from '@/constants/strings';
import type { SecurityChoice } from '@/store/onboarding.store';
import type { Account } from '@/store/account.store';

// M1: balances are immutable after creation so opening_balance === current_balance.
// M1.5: switch to current_balance once transaction editing is available.
export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
}

export function resolveSecurityLabel(choice: SecurityChoice | null): string {
  return choice === null || choice === 'skip'
    ? Strings.o6SecuritySkipped
    : Strings.o6SecurityEnabled;
}
