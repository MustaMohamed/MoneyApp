import { AccountType, Currency } from '@/constants/enums';
import { resolveArchiveCcLine } from '@/modules/accounts/screens/accounts/detail/components/archive_confirmation.helpers';
import { MINUS_SIGN } from '@/utils/format_amount';

const EVERY_TYPE = Object.values(AccountType);

describe('resolveArchiveCcLine', () => {
  it.each(EVERY_TYPE)('%s at 8,450 EGP gets the line only when it is a credit card', (type) => {
    const line = resolveArchiveCcLine({
      type,
      current_balance: 8450,
      currency: Currency.EGP,
    });

    expect(line).toBe(
      type === AccountType.CreditCard
        ? 'Its 8,450 EGP balance leaves your net worth until you unarchive it.'
        : undefined,
    );
  });

  it('a settled card gets no line', () => {
    expect(
      resolveArchiveCcLine({
        type: AccountType.CreditCard,
        current_balance: 0,
        currency: Currency.EGP,
      }),
    ).toBeUndefined();
  });

  // EGP prints at 0dp, so 0.01 would read "Its 0 EGP balance…" — no line instead.
  it('a card whose balance prints as zero at its own decimals gets no line', () => {
    expect(
      resolveArchiveCcLine({
        type: AccountType.CreditCard,
        current_balance: 0.01,
        currency: Currency.EGP,
      }),
    ).toBeUndefined();
  });

  it('the same 0.01 on USD prints at 2dp and does get the line', () => {
    expect(
      resolveArchiveCcLine({
        type: AccountType.CreditCard,
        current_balance: 0.01,
        currency: Currency.USD,
      }),
    ).toBe('Its 0.01 USD balance leaves your net worth until you unarchive it.');
  });

  it('quotes USD at two decimals', () => {
    expect(
      resolveArchiveCcLine({
        type: AccountType.CreditCard,
        current_balance: 12.5,
        currency: Currency.USD,
      }),
    ).toBe('Its 12.50 USD balance leaves your net worth until you unarchive it.');
  });

  it('quotes an overpaid card with the canonical minus, as the hero prints it', () => {
    expect(
      resolveArchiveCcLine({
        type: AccountType.CreditCard,
        current_balance: -200,
        currency: Currency.EGP,
      }),
    ).toBe(`Its ${MINUS_SIGN}200 EGP balance leaves your net worth until you unarchive it.`);
  });
});
