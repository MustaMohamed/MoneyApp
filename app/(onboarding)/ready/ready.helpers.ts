import { Strings } from '@/constants/strings';
import { SecurityChoice } from '@/constants/enums';
import type { Account } from '@/store/account.store';

// M1: balances are immutable after creation so opening_balance === current_balance.
// M1.5: switch to current_balance once transaction editing is available.
export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
}

export function resolveSecurityLabel(choice: SecurityChoice | undefined): string {
  return choice === undefined || choice === SecurityChoice.Skip
    ? Strings.o6SecuritySkipped
    : Strings.o6SecurityEnabled;
}
