import { AccountType } from '@/constants/enums';
import { parseAdjustInput } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers';
import { MINUS_SIGN } from '@/utils/format_amount';

describe('parseAdjustInput', () => {
  it('A-01: parses a valid positive decimal string', () => {
    expect(parseAdjustInput('27500', AccountType.Bank)).toEqual({ ok: true, value: 27500 });
  });

  it('A-01: parses a decimal with a fractional part', () => {
    expect(parseAdjustInput('123.45', AccountType.Bank)).toEqual({ ok: true, value: 123.45 });
  });

  it('A-02: a leading minus reads negative on a non-card', () => {
    expect(parseAdjustInput('-5', AccountType.Bank)).toEqual({ ok: true, value: -5 });
  });

  it('A-02: a leading minus is still refused on a credit card', () => {
    expect(parseAdjustInput('-5', AccountType.CreditCard)).toEqual({ ok: false });
  });

  it('A-03: rejects an empty string', () => {
    expect(parseAdjustInput('', AccountType.Bank)).toEqual({ ok: false });
  });

  it('A-03: rejects a non-numeric string', () => {
    expect(parseAdjustInput('abc', AccountType.Bank)).toEqual({ ok: false });
  });

  it('A-04: accepts zero (0 >= 0)', () => {
    expect(parseAdjustInput('0', AccountType.Bank)).toEqual({ ok: true, value: 0 });
  });

  it('rejects Infinity-producing input', () => {
    expect(parseAdjustInput('1e999', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-03: parses a comma-grouped decimal instead of truncating it', () => {
    expect(parseAdjustInput('1,234.56', AccountType.Bank)).toEqual({ ok: true, value: 1234.56 });
  });

  it('B1-04: rejects a trailing decimal point', () => {
    expect(parseAdjustInput('12.', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-05: rejects a leading decimal point', () => {
    expect(parseAdjustInput('.5', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-07: rejects whitespace only', () => {
    expect(parseAdjustInput('   ', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-08: rejects exponential notation', () => {
    expect(parseAdjustInput('1e3', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-09: rejects a second decimal point', () => {
    expect(parseAdjustInput('1.2.3', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-10: rejects digits followed by letters', () => {
    expect(parseAdjustInput('12abc', AccountType.Bank)).toEqual({ ok: false });
  });

  it('B1-11: rejects a sub-cent amount against the shared floor', () => {
    expect(parseAdjustInput('0.005', AccountType.Bank)).toEqual({ ok: false });
  });

  // `AccountRepository.adjustBalance` applies `roundMoney`; the parser does not round.
  it('B1-15: passes a sub-cent-precision amount through unrounded', () => {
    expect(parseAdjustInput('100.005', AccountType.Bank)).toEqual({ ok: true, value: 100.005 });
  });

  it('rejects a second leading minus', () => {
    expect(parseAdjustInput('--5', AccountType.Bank)).toEqual({ ok: false });
  });

  it("reads the app's own minus glyph as a sign on a non-card", () => {
    expect(parseAdjustInput(`${MINUS_SIGN}5`, AccountType.Bank)).toEqual({ ok: true, value: -5 });
  });

  it("refuses the app's own minus glyph on a credit card", () => {
    expect(parseAdjustInput(`${MINUS_SIGN}5`, AccountType.CreditCard)).toEqual({ ok: false });
  });

  it('rejects a second minus whichever glyph it is', () => {
    expect(parseAdjustInput(`${MINUS_SIGN}${MINUS_SIGN}5`, AccountType.Bank)).toEqual({
      ok: false,
    });
    expect(parseAdjustInput(`${MINUS_SIGN}-5`, AccountType.Bank)).toEqual({ ok: false });
  });

  it('rejects a lone minus', () => {
    expect(parseAdjustInput('-', AccountType.Bank)).toEqual({ ok: false });
  });

  it('trims surrounding whitespace before reading the sign', () => {
    expect(parseAdjustInput(' -5 ', AccountType.Bank)).toEqual({ ok: true, value: -5 });
  });

  it('applies a typed minus to a comma-grouped wallet amount', () => {
    expect(parseAdjustInput('-1,900', AccountType.SmartWallet)).toEqual({ ok: true, value: -1900 });
  });

  it('accepts a positive amount on a credit card', () => {
    expect(parseAdjustInput('5', AccountType.CreditCard)).toEqual({ ok: true, value: 5 });
  });

  it('rejects a sub-cent amount whatever the sign', () => {
    expect(parseAdjustInput('-0.005', AccountType.Bank)).toEqual({ ok: false });
  });

  // `roundMoney` persists `-0`; a zero magnitude must never carry the sign.
  it('gives positive zero for a typed "-0"', () => {
    const result = parseAdjustInput('-0', AccountType.Bank);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.value, 0)).toBe(true);
  });

  it('accepts a typed "-0" on a credit card as positive zero', () => {
    const result = parseAdjustInput('-0', AccountType.CreditCard);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.value, 0)).toBe(true);
  });

  it("accepts a zero signed with the app's own minus glyph on a credit card", () => {
    const result = parseAdjustInput(`${MINUS_SIGN}0`, AccountType.CreditCard);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(Object.is(result.value, 0)).toBe(true);
  });
});
