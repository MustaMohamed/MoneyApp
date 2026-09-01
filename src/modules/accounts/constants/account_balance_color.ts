import { AccountType } from '@/constants/enums';

export type AccountBalanceColorClass = 'text-foreground' | 'text-accent';

const ACCOUNT_BALANCE_COLOR_CLASS: Record<AccountType, AccountBalanceColorClass> = {
  [AccountType.Bank]: 'text-accent',
  [AccountType.SmartWallet]: 'text-accent',
  [AccountType.PhysicalWallet]: 'text-accent',
  [AccountType.PhysicalSavings]: 'text-accent',
  [AccountType.CreditCard]: 'text-foreground',
};

/** Balance colour is by account type, never by sign; red stays reserved for actionable states. */
export function resolveAccountBalanceColorClass(type: AccountType): AccountBalanceColorClass {
  return ACCOUNT_BALANCE_COLOR_CLASS[type];
}
