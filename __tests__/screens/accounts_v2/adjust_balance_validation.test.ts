import { parseAdjustInput } from '@/screens/accounts_v2/detail/components/adjust_balance_sheet.helpers';

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
});
