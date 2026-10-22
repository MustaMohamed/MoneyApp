import {
  currentYearMonth,
  daysLeftInMonth,
  fullMonthName,
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

  it('names the full month', () => {
    expect(fullMonthName('2026-10')).toBe('October');
  });

  it('counts 0 days left on the last day of a 31-day and a 30-day month', () => {
    expect(daysLeftInMonth('2026-10', '2026-10-31')).toBe(0);
    expect(daysLeftInMonth('2026-09', '2026-09-30')).toBe(0);
  });

  it('finds the last day of February in a leap year and a common year', () => {
    expect(daysLeftInMonth('2028-02', '2028-02-28')).toBe(1);
    expect(daysLeftInMonth('2026-02', '2026-02-28')).toBe(0);
  });

  it('counts the days after today in the current month', () => {
    expect(daysLeftInMonth('2026-10', '2026-10-20')).toBe(11);
  });

  it('has no days left for a past or a future month', () => {
    expect(daysLeftInMonth('2026-09', '2026-10-20')).toBeUndefined();
    expect(daysLeftInMonth('2026-11', '2026-10-20')).toBeUndefined();
  });
});
