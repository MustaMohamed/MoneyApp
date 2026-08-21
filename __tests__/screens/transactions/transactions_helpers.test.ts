import {
  buildTotalsPresentation,
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

describe('buildTotalsPresentation', () => {
  it('explains spending when the month has no income', () => {
    expect(buildTotalsPresentation({ incomeEgp: 0, expenseEgp: 500, netEgp: -500 })).toMatchObject({
      state: 'noIncome',
      railPct: 0,
      rawExpenseSharePct: null,
      hasOverflow: false,
    });
  });

  it('distinguishes spending within income from overspending', () => {
    expect(
      buildTotalsPresentation({ incomeEgp: 1_000, expenseEgp: 650, netEgp: 350 }),
    ).toMatchObject({
      state: 'withinIncome',
      railPct: 65,
      rawExpenseSharePct: 65,
      hasOverflow: false,
    });
    expect(
      buildTotalsPresentation({ incomeEgp: 100, expenseEgp: 350, netEgp: -250 }),
    ).toMatchObject({
      state: 'overIncome',
      railPct: 100,
      rawExpenseSharePct: 350,
      hasOverflow: true,
    });
  });

  it('presents negative net spending as a card-credit month', () => {
    expect(buildTotalsPresentation({ incomeEgp: 100, expenseEgp: -50, netEgp: 150 })).toMatchObject(
      {
        state: 'netCredit',
        railPct: 0,
        rawExpenseSharePct: -50,
        hasOverflow: false,
      },
    );
    expect(formatSignedAmount(-50, 'expense')).toBe('+50');
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
    expect(formatSignedAmount(1000.4, 'income')).toBe('+1,000');
    expect(formatSignedAmount(300.9, 'expense')).toBe('-301');
    expect(formatSignedAmount(699.5, 'net')).toBe('+700');
    expect(formatSignedAmount(-1200, 'net')).toBe('-1,200');
  });

  // MA-016 P8 F-1: formatSignedAmount composes its own sign around Math.abs(value), so
  // formatAmount's -0 guard never sees it — a net delta rounded to "0" at EGP's 0dp
  // precision still carried whichever sign the metric branch computed, printing e.g. a
  // "-0" net tile for a genuine 0.40 deficit, and — pre-existing — beside a true tie.
  // See docs/adr/2026-08-21-currency-aware-display-decimals.md §2.
  it('escalates a net delta that rounds to zero at 0dp, so a deficit never reads as parity', () => {
    // income 100.20, expense 100.60 -> net -0.40
    expect(formatSignedAmount(-0.4, 'net')).toBe('-0.40');
  });

  it('escalates the opposite-signed net delta the same way', () => {
    // income 100.60, expense 100.20 -> net +0.40
    expect(formatSignedAmount(0.4, 'net')).toBe('+0.40');
  });

  it('renders a true net tie as an unsigned zero — deficit and parity are different facts', () => {
    expect(formatSignedAmount(0, 'net')).toBe('0');
  });

  it('normalises float noise around zero to the same unsigned zero', () => {
    expect(formatSignedAmount(-1e-13, 'net')).toBe('0');
  });

  it('leaves the pre-existing exact-zero case unsigned for every metric, not just net', () => {
    expect(formatSignedAmount(0, 'income')).toBe('0');
    expect(formatSignedAmount(0, 'expense')).toBe('0');
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
