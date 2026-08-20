import { AccountType } from '@/constants/enums';
import {
  type AccountBalanceColorClass,
  resolveAccountBalanceColorClass,
} from '@/modules/accounts/constants/account_balance_color';

// A `Record<AccountType, …>` rather than a hand-written array of rows, for the
// same reason `account_aggregation.test.ts` gives: a member added to the enum
// must be a TYPE ERROR here, not a runtime surprise that leaves this table
// green while the implementation silently paints a sixth type gold.
const EXPECTED: Record<AccountType, AccountBalanceColorClass> = {
  [AccountType.Bank]: 'text-accent',
  [AccountType.SmartWallet]: 'text-accent',
  [AccountType.PhysicalWallet]: 'text-accent',
  [AccountType.PhysicalSavings]: 'text-accent',
  [AccountType.CreditCard]: 'text-foreground',
};

describe('resolveAccountBalanceColorClass — the one site that owns the balance colour', () => {
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

  it('maps the credit card to the neutral token, not the danger token', () => {
    expect(resolveAccountBalanceColorClass(AccountType.CreditCard)).toBe('text-foreground');
  });
});
