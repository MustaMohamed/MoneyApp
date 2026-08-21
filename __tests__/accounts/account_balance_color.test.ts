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

// Class-string assertions here are not audit M35: M35 is text scraped off a
// rendered node, breaking on no-op refactors. These bind to
// resolveAccountBalanceColorClass's declared return union — its API, not its
// rendering — so a `tv()`/className refactor elsewhere cannot break them.
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
