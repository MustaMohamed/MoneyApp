import { SecurityChoice } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.current_balance, 0);
}

export function resolveSecurityLabel(choice: SecurityChoice | undefined): string {
  return choice === undefined || choice === SecurityChoice.Skip
    ? Strings.o6SecuritySkipped
    : Strings.o6SecurityEnabled;
}
