import { AccountType } from '@/constants/enums';
import { getAccountTypeIcon } from '@/screens/transactions/detail/detail.helpers';

describe('getAccountTypeIcon', () => {
  // Locks the account-type → glyph mapping for the Detail screen's Account
  // row. Mirrors the dashboard's account_card.tsx mapping; a divergence here
  // means the same account would render with two different icons in two
  // different surfaces — exactly the bug this fix exists to prevent.
  const cases: Array<[AccountType, string]> = [
    [AccountType.Bank, 'bank'],
    [AccountType.SmartWallet, 'cellphone-nfc'],
    [AccountType.PhysicalWallet, 'wallet'],
    [AccountType.PhysicalSavings, 'piggy-bank'],
    [AccountType.CreditCard, 'credit-card'],
  ];

  for (const [type, icon] of cases) {
    it(`returns "${icon}" for ${type}`, () => {
      expect(getAccountTypeIcon(type)).toBe(icon);
    });
  }

  it('falls back to "card-bulleted-outline" when type is undefined', () => {
    // The account is looked up via accountsById.get(tx.account_id); if a
    // historical transaction references an account that no longer exists,
    // the lookup yields undefined and we must not crash. Old hardcoded
    // glyph is the safe default.
    expect(getAccountTypeIcon(undefined)).toBe('card-bulleted-outline');
  });

  it('falls back to "card-bulleted-outline" for unknown values', () => {
    // Defensive — the DB has CHECK constraints but legacy rows from an
    // older enum could still appear.
    expect(getAccountTypeIcon('legacy_type_xyz')).toBe('card-bulleted-outline');
  });
});
