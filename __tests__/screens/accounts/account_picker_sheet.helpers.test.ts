import { AccountType, Currency } from '@/constants/enums';
import { resolvePickerRowBalance } from '@/modules/accounts/components/account_picker_sheet.helpers';
import { makeTestAccount } from '@/test_helpers/transaction';

// #277 spec row 10: asserted independently of account_card.tsx's identical one-liner —
// "two files, two guards" — deliberately not a shared helper with buildBalanceText.
describe('resolvePickerRowBalance — #277 account_picker_sheet.tsx:74 (spec row 10)', () => {
  it('shows USD cents — base: 1,251 USD, head: 1,250.75 USD', () => {
    const account = makeTestAccount({
      type: AccountType.Bank,
      currency: Currency.USD,
      current_balance: 1250.75,
    });
    expect(resolvePickerRowBalance(account)).toBe('1,250.75 USD');
  });

  it('leaves EGP unchanged (spec row 11)', () => {
    const account = makeTestAccount({
      type: AccountType.Bank,
      currency: Currency.EGP,
      current_balance: 1250.75,
    });
    expect(resolvePickerRowBalance(account)).toBe('1,251 EGP');
  });
});
