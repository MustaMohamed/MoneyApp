import { AccountType, Currency } from '@/constants/enums';
import { makeTestAccount } from '@/test_helpers/transaction';
import { formatCurrencyAmount } from '@/utils/format_amount';

// #298: account_picker_sheet.tsx's row balance is now an inline formatCurrencyAmount call —
// resolvePickerRowBalance was a same-signature wrapper (spec row 10's "two files, two
// guards" now reads as two fixtures against the shared formatter, not two wrapper
// functions) — asserted here against the picker sheet's own account shape.
describe('account_picker_sheet row balance — account_picker_sheet.tsx:74', () => {
  it('shows USD cents — base: 1,251 USD, head: 1,250.75 USD', () => {
    const account = makeTestAccount({
      type: AccountType.Bank,
      currency: Currency.USD,
      current_balance: 1250.75,
    });
    expect(formatCurrencyAmount(account.current_balance, account.currency)).toBe('1,250.75 USD');
  });

  it('leaves EGP unchanged (spec row 11)', () => {
    const account = makeTestAccount({
      type: AccountType.Bank,
      currency: Currency.EGP,
      current_balance: 1250.75,
    });
    expect(formatCurrencyAmount(account.current_balance, account.currency)).toBe('1,251 EGP');
  });
});
