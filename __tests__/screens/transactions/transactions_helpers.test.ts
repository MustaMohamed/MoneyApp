import {
  currentYearMonth,
  resolvePeriod,
  previousPeriod,
  computeDeltaPct,
  polarityColor,
  formatSignedAmount,
  expenseSharePct,
  deltaDisplay,
} from '@/modules/transactions/screens/transactions/transactions.helpers';

describe('currentYearMonth', () => {
  it('returns YYYY-MM for a Date', () => {
    expect(currentYearMonth(new Date('2026-05-17T10:00:00Z'))).toBe('2026-05');
  });

  it('zero-pads single-digit months', () => {
    expect(currentYearMonth(new Date('2026-01-05T10:00:00Z'))).toBe('2026-01');
  });

  it('defaults to today when called with no arguments', () => {
    const result = currentYearMonth();
    expect(result).toMatch(/^\d{4}-\d{2}$/);
  });
});

describe('resolvePeriod', () => {
  it('month → first and last day of that month', () => {
    expect(resolvePeriod({ type: 'month', yearMonth: '2026-05' })).toEqual({
      from: '2026-05-01',
      to: '2026-05-31',
    });
  });

  it('month — February non-leap', () => {
    expect(resolvePeriod({ type: 'month', yearMonth: '2025-02' })).toEqual({
      from: '2025-02-01',
      to: '2025-02-28',
    });
  });

  it('month — February leap year', () => {
    expect(resolvePeriod({ type: 'month', yearMonth: '2024-02' })).toEqual({
      from: '2024-02-01',
      to: '2024-02-29',
    });
  });
});

describe('previousPeriod', () => {
  it('month → prior month', () => {
    expect(previousPeriod({ type: 'month', yearMonth: '2026-05' })).toEqual({
      type: 'month',
      yearMonth: '2026-04',
    });
  });

  it('month — January → previous December', () => {
    expect(previousPeriod({ type: 'month', yearMonth: '2026-01' })).toEqual({
      type: 'month',
      yearMonth: '2025-12',
    });
  });
});

describe('computeDeltaPct', () => {
  it('both zero → null', () => {
    expect(computeDeltaPct(0, 0)).toBeNull();
  });

  it('previous zero, current non-zero → null (cannot divide)', () => {
    expect(computeDeltaPct(100, 0)).toBeNull();
  });

  it('normal positive delta', () => {
    expect(computeDeltaPct(108, 100)).toBe(8);
  });

  it('normal negative delta', () => {
    expect(computeDeltaPct(82, 100)).toBe(-18);
  });

  it('uses abs(previous) for denominator (handles negative prev)', () => {
    expect(computeDeltaPct(1500, -500)).toBe(400);
  });

  it('rounds to nearest integer', () => {
    expect(computeDeltaPct(103, 100)).toBe(3);
    expect(computeDeltaPct(102.5, 100)).toBe(3);
    expect(computeDeltaPct(102.4, 100)).toBe(2);
  });
});

describe('polarityColor', () => {
  it('income up = good', () => {
    expect(polarityColor('income', 5)).toBe('good');
  });

  it('income down = bad', () => {
    expect(polarityColor('income', -5)).toBe('bad');
  });

  it('expense up = bad', () => {
    expect(polarityColor('expense', 5)).toBe('bad');
  });

  it('expense down = good', () => {
    expect(polarityColor('expense', -5)).toBe('good');
  });

  it('net up = good', () => {
    expect(polarityColor('net', 5)).toBe('good');
  });

  it('net down = bad', () => {
    expect(polarityColor('net', -5)).toBe('bad');
  });

  it('zero delta = neutral', () => {
    expect(polarityColor('income', 0)).toBe('neutral');
    expect(polarityColor('expense', 0)).toBe('neutral');
    expect(polarityColor('net', 0)).toBe('neutral');
  });
});

describe('transactions summary presentation helpers', () => {
  it('formats signed current-period amounts by metric', () => {
    expect(formatSignedAmount(25000, 'income')).toBe('+25,000');
    expect(formatSignedAmount(13000, 'expense')).toBe('-13,000');
    expect(formatSignedAmount(12000, 'net')).toBe('+12,000');
    expect(formatSignedAmount(-1200, 'net')).toBe('-1,200');
  });

  it('calculates expense share as a clamped percent of income', () => {
    expect(expenseSharePct({ incomeEgp: 25000, expenseEgp: 13000, netEgp: 12000 })).toBe(52);
    expect(expenseSharePct({ incomeEgp: 0, expenseEgp: 13000, netEgp: -13000 })).toBe(0);
    expect(expenseSharePct({ incomeEgp: 1000, expenseEgp: 1250, netEgp: -250 })).toBe(100);
  });

  it('returns unsigned percentage labels with polarity-aware directions', () => {
    expect(deltaDisplay('income', 10)).toEqual({
      direction: 'up',
      label: '10%',
      polarity: 'good',
    });
    expect(deltaDisplay('expense', 15)).toEqual({
      direction: 'up',
      label: '15%',
      polarity: 'bad',
    });
    expect(deltaDisplay('net', -17)).toEqual({
      direction: 'down',
      label: '17%',
      polarity: 'bad',
    });
    expect(deltaDisplay('net', null)).toBeNull();
  });
});
