import {
  formatShortDate,
  formatLongDate,
  formatMonthYear,
  nextDueDate,
  toLocalDateString,
} from '@/utils/format_date';

describe('formatShortDate', () => {
  it('formats a typical date', () => {
    expect(formatShortDate('2025-11-09')).toBe('Nov 9');
  });
  it('formats January (boundary low)', () => {
    expect(formatShortDate('2025-01-01')).toBe('Jan 1');
  });
  it('formats December (boundary high)', () => {
    expect(formatShortDate('2025-12-31')).toBe('Dec 31');
  });
});

describe('formatLongDate', () => {
  it('formats a typical date', () => {
    expect(formatLongDate('2025-11-09')).toBe('November 9, 2025');
  });
  it('formats January', () => {
    expect(formatLongDate('2025-01-01')).toBe('January 1, 2025');
  });
  it('formats December', () => {
    expect(formatLongDate('2025-12-31')).toBe('December 31, 2025');
  });
});

describe('formatMonthYear', () => {
  it('formats a typical date', () => {
    expect(formatMonthYear('2025-11-09')).toBe('November 2025');
  });
  it('formats January', () => {
    expect(formatMonthYear('2025-01-01')).toBe('January 2025');
  });
  it('formats December', () => {
    expect(formatMonthYear('2025-12-31')).toBe('December 2025');
  });
});

describe('toLocalDateString', () => {
  it('zero-pads month and day', () => {
    expect(toLocalDateString(new Date(2025, 0, 1))).toBe('2025-01-01');
  });
  it('handles December 31', () => {
    expect(toLocalDateString(new Date(2025, 11, 31))).toBe('2025-12-31');
  });
  it('handles a typical mid-month date', () => {
    expect(toLocalDateString(new Date(2025, 10, 9))).toBe('2025-11-09');
  });
});

describe('nextDueDate', () => {
  it('rolls to next month when the due day has already passed', () => {
    expect(nextDueDate(5, new Date(2026, 4, 20))).toBe('Jun 5');
  });

  it('stays in the current month when the due day is still ahead', () => {
    expect(nextDueDate(20, new Date(2026, 4, 5))).toBe('May 20');
  });

  it('treats today as still due this month (boundary)', () => {
    expect(nextDueDate(15, new Date(2026, 4, 15))).toBe('May 15');
  });

  it('defaults "now" to the current date when omitted', () => {
    expect(nextDueDate(15)).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/);
  });
});
