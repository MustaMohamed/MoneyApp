import { AccountType } from '@/constants/enums';
import {
  parseAdjustInput,
  resolveAdjustInputChange,
  splitLeadingMinus,
} from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers';
import { MINUS_SIGN } from '@/utils/format_amount';

const BANK_POSITIVE = { isNegative: false, accountType: AccountType.Bank };
const BANK_NEGATIVE = { isNegative: true, accountType: AccountType.Bank };
const CARD_POSITIVE = { isNegative: false, accountType: AccountType.CreditCard };
const CARD_NEGATIVE = { isNegative: true, accountType: AccountType.CreditCard };

describe('parseAdjustInput', () => {
  it('A-01: parses a valid positive decimal string', () => {
    expect(parseAdjustInput('27500', BANK_POSITIVE)).toEqual({ ok: true, value: 27500 });
  });

  it('A-01: parses a decimal with a fractional part', () => {
    expect(parseAdjustInput('123.45', BANK_POSITIVE)).toEqual({ ok: true, value: 123.45 });
  });

  it('A-02: a leading minus reads negative on a non-card', () => {
    expect(parseAdjustInput('-5', BANK_POSITIVE)).toEqual({ ok: true, value: -5 });
  });

  it('A-02: a leading minus is still refused on a credit card', () => {
    expect(parseAdjustInput('-5', CARD_POSITIVE)).toEqual({ ok: false });
  });

  it('A-03: rejects an empty string', () => {
    expect(parseAdjustInput('', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('A-03: rejects a non-numeric string', () => {
    expect(parseAdjustInput('abc', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('A-04: accepts zero (0 >= 0)', () => {
    expect(parseAdjustInput('0', BANK_POSITIVE)).toEqual({ ok: true, value: 0 });
  });

  it('rejects Infinity-producing input', () => {
    expect(parseAdjustInput('1e999', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-03: parses a comma-grouped decimal instead of truncating it', () => {
    expect(parseAdjustInput('1,234.56', BANK_POSITIVE)).toEqual({ ok: true, value: 1234.56 });
  });

  it('B1-04: rejects a trailing decimal point', () => {
    expect(parseAdjustInput('12.', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-05: rejects a leading decimal point', () => {
    expect(parseAdjustInput('.5', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-07: rejects whitespace only', () => {
    expect(parseAdjustInput('   ', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-08: rejects exponential notation', () => {
    expect(parseAdjustInput('1e3', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-09: rejects a second decimal point', () => {
    expect(parseAdjustInput('1.2.3', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-10: rejects digits followed by letters', () => {
    expect(parseAdjustInput('12abc', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('B1-11: rejects a sub-cent amount against the shared floor', () => {
    expect(parseAdjustInput('0.005', BANK_POSITIVE)).toEqual({ ok: false });
  });

  // `AccountRepository.adjustBalance` applies `roundMoney`; the parser does not round.
  it('B1-15: passes a sub-cent-precision amount through unrounded', () => {
    expect(parseAdjustInput('100.005', BANK_POSITIVE)).toEqual({ ok: true, value: 100.005 });
  });

  it('reads a typed minus alongside a selected minus as one negative, never a toggle', () => {
    expect(parseAdjustInput('-5', BANK_NEGATIVE)).toEqual({ ok: true, value: -5 });
  });

  it('rejects a second leading minus', () => {
    expect(parseAdjustInput('--5', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it("reads the app's own minus glyph as a sign on a non-card", () => {
    expect(parseAdjustInput(`${MINUS_SIGN}5`, BANK_POSITIVE)).toEqual({ ok: true, value: -5 });
  });

  it("refuses the app's own minus glyph on a credit card", () => {
    expect(parseAdjustInput(`${MINUS_SIGN}5`, CARD_POSITIVE)).toEqual({ ok: false });
  });

  it('rejects a second minus whichever glyph it is', () => {
    expect(parseAdjustInput(`${MINUS_SIGN}${MINUS_SIGN}5`, BANK_POSITIVE)).toEqual({ ok: false });
    expect(parseAdjustInput(`${MINUS_SIGN}-5`, BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('rejects a lone minus', () => {
    expect(parseAdjustInput('-', BANK_POSITIVE)).toEqual({ ok: false });
  });

  it('applies the selected minus to a bare magnitude', () => {
    expect(parseAdjustInput('5', BANK_NEGATIVE)).toEqual({ ok: true, value: -5 });
  });

  it('applies the selected minus to a comma-grouped wallet amount', () => {
    expect(
      parseAdjustInput('1,900', { isNegative: true, accountType: AccountType.SmartWallet }),
    ).toEqual({ ok: true, value: -1900 });
  });

  it('refuses a selected minus on a credit card', () => {
    expect(parseAdjustInput('5', CARD_NEGATIVE)).toEqual({ ok: false });
  });

  it('accepts a positive amount on a credit card', () => {
    expect(parseAdjustInput('5', CARD_POSITIVE)).toEqual({ ok: true, value: 5 });
  });

  it('rejects a sub-cent amount whatever the sign', () => {
    expect(parseAdjustInput('0.005', BANK_NEGATIVE)).toEqual({ ok: false });
  });

  // `roundMoney` persists `-0`; a zero magnitude must never carry the sign.
  it('gives positive zero for a typed "-0"', () => {
    const result = parseAdjustInput('-0', BANK_POSITIVE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.value, 0)).toBe(true);
  });

  it('gives positive zero for a zero magnitude with the minus selected', () => {
    const result = parseAdjustInput('0', BANK_NEGATIVE);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.value, 0)).toBe(true);
  });
});

describe('splitLeadingMinus', () => {
  it('strips one leading minus and reports it', () => {
    expect(splitLeadingMinus('-1900')).toEqual({ magnitude: '1900', typedNegative: true });
  });

  it('leaves a bare magnitude alone', () => {
    expect(splitLeadingMinus('1900')).toEqual({ magnitude: '1900', typedNegative: false });
  });

  it('trims before reading the sign', () => {
    expect(splitLeadingMinus(' -5 ')).toEqual({ magnitude: '5', typedNegative: true });
  });

  it("strips the app's own minus glyph too", () => {
    expect(splitLeadingMinus(`${MINUS_SIGN}1900`)).toEqual({
      magnitude: '1900',
      typedNegative: true,
    });
  });

  it('strips exactly one minus, whichever glyph follows it', () => {
    expect(splitLeadingMinus(`${MINUS_SIGN}${MINUS_SIGN}5`)).toEqual({
      magnitude: `${MINUS_SIGN}5`,
      typedNegative: true,
    });
  });
});

describe('resolveAdjustInputChange', () => {
  it('moves a non-card typed minus into the sign and stores the magnitude', () => {
    expect(resolveAdjustInputChange('-1900', false)).toEqual({ input: '1900', negative: true });
  });

  it('leaves the sign alone on an ordinary non-card edit', () => {
    const change = resolveAdjustInputChange('1900', false);

    expect(change.input).toBe('1900');
    expect(change.negative).toBeUndefined();
  });

  it('stores a card typed minus as text and leaves the sign alone', () => {
    const change = resolveAdjustInputChange('-1900', true);

    expect(change.input).toBe('-1900');
    expect(change.negative).toBeUndefined();
  });
});
