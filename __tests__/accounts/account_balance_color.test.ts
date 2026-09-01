import { AccountType } from '@/constants/enums';
import {
  type AccountBalanceColorClass,
  resolveAccountBalanceColorClass,
} from '@/modules/accounts/constants/account_balance_color';

// A `Record<AccountType, …>` so a new enum member is a type error here, not a silent pass.
const EXPECTED: Record<AccountType, AccountBalanceColorClass> = {
  [AccountType.Bank]: 'text-accent',
  [AccountType.SmartWallet]: 'text-accent',
  [AccountType.PhysicalWallet]: 'text-accent',
  [AccountType.PhysicalSavings]: 'text-accent',
  [AccountType.CreditCard]: 'text-foreground',
};

describe('resolveAccountBalanceColorClass — the site account_card.tsx and balance_hero.tsx use for balance colour', () => {
  it.each(Object.entries(EXPECTED))('%s → %p', (type, expected) => {
    expect(resolveAccountBalanceColorClass(type as AccountType)).toBe(expected);
  });

  it('is the only type not taking the asset accent', () => {
    expect(
      Object.values(AccountType).filter(
        (type) => resolveAccountBalanceColorClass(type) !== 'text-accent',
      ),
    ).toEqual([AccountType.CreditCard]);
  });
});
