import { Currency, DatePreset } from '@/constants/enums';
import {
  EMPTY_FILTERS,
  type AdvancedFilters,
} from '@/app/(app)/(tabs)/transactions/_filter/filter.store';
import {
  countActiveFilters,
  formatSelectionSummary,
  parseAmountInput,
  resolveDateRange,
  toQueryFilters,
} from '@/app/(app)/(tabs)/transactions/_filter/filter.helpers';

describe('countActiveFilters', () => {
  it('returns 0 for EMPTY_FILTERS', () => {
    expect(countActiveFilters(EMPTY_FILTERS)).toBe(0);
  });

  it('counts non-empty accountIds as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, accountIds: ['a'] })).toBe(1);
  });

  it('counts non-empty categoryIds as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, categoryIds: ['c'] })).toBe(1);
  });

  it('counts non-AllTime datePreset as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, datePreset: DatePreset.Today })).toBe(1);
  });

  it('counts amountMin alone as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMin: 100 })).toBe(1);
  });

  it('counts amountMax alone as 1', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMax: 500 })).toBe(1);
  });

  it('counts both amountMin and amountMax as 1 (single axis)', () => {
    expect(countActiveFilters({ ...EMPTY_FILTERS, amountMin: 100, amountMax: 500 })).toBe(1);
  });

  it('sums all axes when fully populated', () => {
    const f: AdvancedFilters = {
      accountIds: ['a'],
      categoryIds: ['c'],
      datePreset: DatePreset.ThisMonth,
      amountCurrency: Currency.USD,
      amountMin: 50,
      amountMax: 200,
    };
    expect(countActiveFilters(f)).toBe(4);
  });
});

describe('resolveDateRange', () => {
  // Fixed reference date: Friday, 2026-05-15
  const REF = new Date(2026, 4, 15); // month is 0-indexed → May

  it('AllTime returns no bounds', () => {
    expect(resolveDateRange(DatePreset.AllTime, undefined, undefined, REF)).toEqual({});
  });

  it('Today returns same-day bounds', () => {
    expect(resolveDateRange(DatePreset.Today, undefined, undefined, REF)).toEqual({
      from: '2026-05-15',
      to: '2026-05-15',
    });
  });

  it('ThisWeek returns Sunday→Saturday containing the ref date', () => {
    // 2026-05-15 is a Friday. Sunday of that week = 2026-05-10. Saturday = 2026-05-16.
    expect(resolveDateRange(DatePreset.ThisWeek, undefined, undefined, REF)).toEqual({
      from: '2026-05-10',
      to: '2026-05-16',
    });
  });

  it('ThisMonth returns first→last day of the ref month', () => {
    expect(resolveDateRange(DatePreset.ThisMonth, undefined, undefined, REF)).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('LastMonth returns first→last day of previous month', () => {
    expect(resolveDateRange(DatePreset.LastMonth, undefined, undefined, REF)).toEqual({
      from: '2026-04-01',
      to: '2026-04-30',
    });
  });

  it('LastMonth correctly crosses year boundary', () => {
    const jan1 = new Date(2026, 0, 1);
    expect(resolveDateRange(DatePreset.LastMonth, undefined, undefined, jan1)).toEqual({
      from: '2025-12-01',
      to: '2025-12-31',
    });
  });

  it('Last30Days returns 30-day window ending today (inclusive)', () => {
    // 30 days ending 2026-05-15 → from 2026-04-16 to 2026-05-15
    expect(resolveDateRange(DatePreset.Last30Days, undefined, undefined, REF)).toEqual({
      from: '2026-04-16',
      to: '2026-05-15',
    });
  });

  it('ThisYear returns Jan 1 → Dec 31 of ref year', () => {
    expect(resolveDateRange(DatePreset.ThisYear, undefined, undefined, REF)).toEqual({
      from: '2026-01-01',
      to: '2026-12-31',
    });
  });

  it('Custom returns the provided range', () => {
    expect(resolveDateRange(DatePreset.Custom, '2026-03-01', '2026-03-31', REF)).toEqual({
      from: '2026-03-01',
      to: '2026-03-31',
    });
  });

  it('Custom returns undefined bounds when dates not provided', () => {
    expect(resolveDateRange(DatePreset.Custom, undefined, undefined, REF)).toEqual({
      from: undefined,
      to: undefined,
    });
  });
});

describe('parseAmountInput', () => {
  it('returns undefined for empty', () => {
    expect(parseAmountInput('')).toBeUndefined();
  });

  it('returns undefined for whitespace only', () => {
    expect(parseAmountInput('   ')).toBeUndefined();
  });

  it('parses a plain integer', () => {
    expect(parseAmountInput('100')).toBe(100);
  });

  it('parses a decimal', () => {
    expect(parseAmountInput('12.50')).toBe(12.5);
  });

  it('strips commas', () => {
    expect(parseAmountInput('1,234.56')).toBe(1234.56);
  });

  it('returns undefined for non-numeric', () => {
    expect(parseAmountInput('abc')).toBeUndefined();
  });

  it('returns undefined for negative', () => {
    expect(parseAmountInput('-10')).toBeUndefined();
  });
});

describe('formatSelectionSummary', () => {
  it('returns the all-label when empty', () => {
    expect(formatSelectionSummary([], 'All accounts')).toBe('All accounts');
  });

  it('returns the single name when one item', () => {
    expect(formatSelectionSummary(['Bank A'], 'All')).toBe('Bank A');
  });

  it('joins two names with comma', () => {
    expect(formatSelectionSummary(['Bank A', 'Cash'], 'All')).toBe('Bank A, Cash');
  });

  it('shows first two names + remainder count for 3+', () => {
    expect(formatSelectionSummary(['A', 'B', 'C'], 'All')).toBe('A, B +1');
    expect(formatSelectionSummary(['A', 'B', 'C', 'D'], 'All')).toBe('A, B +2');
  });
});

describe('toQueryFilters', () => {
  // Fix the date so resolveDateRange is deterministic — but toQueryFilters
  // calls resolveDateRange with no `today` override, so we only assert on
  // axes that are NOT date when EMPTY/AllTime.
  it('returns empty object for EMPTY_FILTERS', () => {
    expect(toQueryFilters(EMPTY_FILTERS)).toEqual({});
  });

  it('omits empty arrays', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, amountMin: 50 });
    expect(out.accountIds).toBeUndefined();
    expect(out.categoryIds).toBeUndefined();
  });

  it('passes through non-empty accountIds', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, accountIds: ['a', 'b'] });
    expect(out.accountIds).toEqual(['a', 'b']);
  });

  it('passes through non-empty categoryIds', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, categoryIds: ['c'] });
    expect(out.categoryIds).toEqual(['c']);
  });

  it('emits amountCurrency only when amountMin or amountMax is set', () => {
    expect(toQueryFilters({ ...EMPTY_FILTERS }).amountCurrency).toBeUndefined();
    expect(toQueryFilters({ ...EMPTY_FILTERS, amountMin: 100 }).amountCurrency).toBe(Currency.EGP);
    expect(
      toQueryFilters({ ...EMPTY_FILTERS, amountMax: 500, amountCurrency: Currency.USD })
        .amountCurrency,
    ).toBe(Currency.USD);
  });

  it('emits amountMin / amountMax independently', () => {
    expect(toQueryFilters({ ...EMPTY_FILTERS, amountMin: 10 })).toMatchObject({
      amountMin: 10,
      amountCurrency: Currency.EGP,
    });
    expect(toQueryFilters({ ...EMPTY_FILTERS, amountMax: 20 })).toMatchObject({
      amountMax: 20,
      amountCurrency: Currency.EGP,
    });
  });

  it('emits dateFrom and dateTo for non-AllTime presets', () => {
    const out = toQueryFilters({ ...EMPTY_FILTERS, datePreset: DatePreset.Today });
    expect(out.dateFrom).toBeDefined();
    expect(out.dateTo).toBeDefined();
  });

  it('emits dateFrom/dateTo from custom range', () => {
    const out = toQueryFilters({
      ...EMPTY_FILTERS,
      datePreset: DatePreset.Custom,
      customDateFrom: '2026-01-01',
      customDateTo: '2026-01-31',
    });
    expect(out.dateFrom).toBe('2026-01-01');
    expect(out.dateTo).toBe('2026-01-31');
  });
});
