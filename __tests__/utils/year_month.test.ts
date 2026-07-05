import {
  currentYearMonth,
  monthNumberFromYearMonth,
  shiftYearMonth,
  toYearMonth,
  yearFromYearMonth,
} from '@/utils/year_month';

describe('year_month utilities', () => {
  it('formats the current month as YYYY-MM', () => {
    expect(currentYearMonth(new Date('2026-07-15T10:00:00Z'))).toBe('2026-07');
  });

  it('builds zero-padded year-month values', () => {
    expect(toYearMonth(2026, 1)).toBe('2026-01');
    expect(toYearMonth(2026, 12)).toBe('2026-12');
  });

  it('extracts year and month number', () => {
    expect(yearFromYearMonth('2026-07')).toBe(2026);
    expect(monthNumberFromYearMonth('2026-07')).toBe(7);
  });

  it('shifts months across year boundaries', () => {
    expect(shiftYearMonth('2026-01', -1)).toBe('2025-12');
    expect(shiftYearMonth('2026-12', 1)).toBe('2027-01');
    expect(shiftYearMonth('2026-07', 5)).toBe('2026-12');
  });
});
