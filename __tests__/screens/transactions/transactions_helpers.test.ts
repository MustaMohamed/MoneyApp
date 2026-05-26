import {
  currentYearMonth,
  computeCarouselPills,
  resolvePeriod,
  previousPeriod,
  computeDeltaPct,
  polarityColor,
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

describe('computeCarouselPills', () => {
  it('defaults to today when called with no arguments', () => {
    const pills = computeCarouselPills();
    expect(pills).toHaveLength(8);
    expect(pills[0]).toEqual({ kind: 'all' });
    expect(pills[7]).toEqual({ kind: 'custom' });
  });

  it('produces [All] + last 6 months + [Custom] in chronological order', () => {
    const pills = computeCarouselPills(new Date('2026-05-17T10:00:00Z'));
    expect(pills).toEqual([
      { kind: 'all' },
      { kind: 'month', yearMonth: '2025-12' },
      { kind: 'month', yearMonth: '2026-01' },
      { kind: 'month', yearMonth: '2026-02' },
      { kind: 'month', yearMonth: '2026-03' },
      { kind: 'month', yearMonth: '2026-04' },
      { kind: 'month', yearMonth: '2026-05' },
      { kind: 'custom' },
    ]);
  });

  it('handles year boundary correctly', () => {
    const pills = computeCarouselPills(new Date('2026-02-15T10:00:00Z'));
    expect(pills[1]).toEqual({ kind: 'month', yearMonth: '2025-09' });
    expect(pills[6]).toEqual({ kind: 'month', yearMonth: '2026-02' });
  });
});

describe('resolvePeriod', () => {
  it('all → undefined bounds', () => {
    expect(resolvePeriod({ type: 'all' })).toEqual({ from: undefined, to: undefined });
  });

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

  it('custom → passthrough', () => {
    expect(resolvePeriod({ type: 'custom', from: '2026-05-01', to: '2026-05-15' })).toEqual({
      from: '2026-05-01',
      to: '2026-05-15',
    });
  });
});

describe('previousPeriod', () => {
  it('all → null', () => {
    expect(previousPeriod({ type: 'all' })).toBeNull();
  });

  it('custom → null', () => {
    expect(previousPeriod({ type: 'custom', from: 'a', to: 'b' })).toBeNull();
  });

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
