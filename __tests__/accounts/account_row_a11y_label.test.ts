import { AccountType, Currency } from '@/constants/enums';
import { resolveAccountRowA11yLabel } from '@/modules/accounts/constants/account_row_a11y_label';
import { makeTestAccount } from '@/test_helpers/transaction';

// `makeTestAccount` defaults to EGP, `color: null` and both balances 0.
const egpAccount = makeTestAccount({
  name: 'CIB Current',
  type: AccountType.Bank,
  current_balance: 48250.4,
});
const usdAccount = makeTestAccount({ currency: Currency.USD, current_balance: 1350.5 });

describe('resolveAccountRowA11yLabel — the one label the N3 row and the accounts list row announce', () => {
  it('renders USD cents', () => {
    expect(resolveAccountRowA11yLabel(usdAccount)).toContain('1,350.50 USD');
  });

  it('renders EGP at 0 decimals', () => {
    expect(resolveAccountRowA11yLabel(egpAccount)).toContain('48,250 EGP');
  });

  it('reads current_balance, not opening_balance', () => {
    // `current_balance` equals `opening_balance` at creation, so only unequal fixtures catch it.
    const account = makeTestAccount({ current_balance: 999, opening_balance: 111 });
    expect(resolveAccountRowA11yLabel(account)).toContain('999');
    expect(resolveAccountRowA11yLabel(account)).not.toContain('111');
  });

  it('announces name, type and amount as one label', () => {
    expect(resolveAccountRowA11yLabel(egpAccount)).toBe('CIB Current, Bank, 48,250 EGP');
  });
});
