import { parseAdjustInput } from '@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers';

describe('parseAdjustInput', () => {
  it('A-01: parses a valid positive decimal string', () => {
    expect(parseAdjustInput('27500')).toEqual({ ok: true, value: 27500 });
  });

  it('A-01: parses a decimal with a fractional part', () => {
    expect(parseAdjustInput('123.45')).toEqual({ ok: true, value: 123.45 });
  });

  it('A-02: rejects a negative number', () => {
    expect(parseAdjustInput('-5')).toEqual({ ok: false });
  });

  it('A-03: rejects an empty string', () => {
    expect(parseAdjustInput('')).toEqual({ ok: false });
  });

  it('A-03: rejects a non-numeric string', () => {
    expect(parseAdjustInput('abc')).toEqual({ ok: false });
  });

  it('A-04: accepts zero (0 >= 0)', () => {
    expect(parseAdjustInput('0')).toEqual({ ok: true, value: 0 });
  });

  it('rejects Infinity-producing input', () => {
    expect(parseAdjustInput('1e999')).toEqual({ ok: false });
  });

  it('B1-03: parses a comma-grouped decimal instead of truncating it', () => {
    expect(parseAdjustInput('1,234.56')).toEqual({ ok: true, value: 1234.56 });
  });

  it('B1-04: rejects a trailing decimal point', () => {
    expect(parseAdjustInput('12.')).toEqual({ ok: false });
  });

  it('B1-05: rejects a leading decimal point', () => {
    expect(parseAdjustInput('.5')).toEqual({ ok: false });
  });

  it('B1-07: rejects whitespace only', () => {
    expect(parseAdjustInput('   ')).toEqual({ ok: false });
  });

  it('B1-08: rejects exponential notation', () => {
    expect(parseAdjustInput('1e3')).toEqual({ ok: false });
  });

  it('B1-09: rejects a second decimal point', () => {
    expect(parseAdjustInput('1.2.3')).toEqual({ ok: false });
  });

  it('B1-10: rejects digits followed by letters', () => {
    expect(parseAdjustInput('12abc')).toEqual({ ok: false });
  });

  it('B1-11: rejects a sub-cent amount against the shared floor', () => {
    expect(parseAdjustInput('0.005')).toEqual({ ok: false });
  });

  // `AccountRepository.adjustBalance` applies `roundMoney`; the parser does not round.
  it('B1-15: passes a sub-cent-precision amount through unrounded', () => {
    expect(parseAdjustInput('100.005')).toEqual({ ok: true, value: 100.005 });
  });
});
