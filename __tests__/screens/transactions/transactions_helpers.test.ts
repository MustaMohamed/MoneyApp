import { Strings } from '@/constants/strings';
import {
  buildTotalsPresentation,
  buildTransactionsHeroModel,
  currentYearMonth,
  resolvePeriod,
  resolveTransactionsHeroMode,
  previousPeriod,
  computeDeltaPct,
  polarityColor,
  formatSignedAmount,
  expenseSharePct,
  deltaDisplay,
  type TransactionsHeroInput,
} from '@/modules/transactions/screens/transactions/transactions.helpers';
import type { TransactionTotalsStatus } from '@/modules/transactions/screens/transactions/transactions.state';
import { formatMonthYear } from '@/utils/format_date';

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
  it('formats signed current-period amounts by metric, negatives as U+2212 (#332, ADR d3)', () => {
    expect(formatSignedAmount(1000.4, 'income')).toBe('+1,000');
    expect(formatSignedAmount(300.9, 'expense')).toBe('−301');
    expect(formatSignedAmount(699.5, 'net')).toBe('+700');
    expect(formatSignedAmount(-1200, 'net')).toBe('−1,200');
    expect(formatSignedAmount(-1200, 'net')).not.toContain('-');
  });

  it('escalates a net delta that rounds to zero at 0dp, so a deficit never reads as parity', () => {
    // income 100.20, expense 100.60 -> net -0.40
    expect(formatSignedAmount(-0.4, 'net')).toBe('−0.40');
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

describe('buildTransactionsHeroModel', () => {
  const DASH = '—';
  const AUGUST = { incomeEgp: 20_000, expenseEgp: 16_900, netEgp: 3_100 };

  function hero(overrides: Partial<TransactionsHeroInput> = {}) {
    return buildTransactionsHeroModel({
      mode: 'figures',
      current: { incomeEgp: 22_300, expenseEgp: 9_400, netEgp: 12_900 },
      previous: AUGUST,
      yearMonth: '2026-09',
      today: '2026-09-24',
      ...overrides,
    });
  }

  it('prints the month within income: figures, rail, share caption and days-left caption (A1)', () => {
    expect(hero()).toMatchObject({
      mode: 'figures',
      title: 'Out this month',
      monthLabel: formatMonthYear('2026-09'),
      out: '9,400',
      in: '22,300',
      net: '12,900',
      leftOfIncome: '58%',
      railPct: 42,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsExpenseShareA11y(42),
      shareCaption: '42% of income spent',
      caption: '6 days left · Aug 16,900',
    });
  });

  it('formats EGP at 0 dp', () => {
    expect(
      hero({ current: { incomeEgp: 22_300.4, expenseEgp: 9_399.6, netEgp: 12_900.8 } }),
    ).toMatchObject({ out: '9,400', in: '22,300', net: '12,901' });
  });

  it('titles the hero with the account when the filter holds exactly one', () => {
    expect(hero({ accountLabel: 'Wallet' }).title).toBe('Out this month · Wallet');
  });

  it('signs Left of income past 100% spent and fills the rail in danger', () => {
    expect(hero({ current: { incomeEgp: 1_000, expenseEgp: 1_200, netEgp: -200 } })).toMatchObject({
      net: '−200',
      leftOfIncome: '−20%',
      railPct: 100,
      railDanger: true,
      railAccessibilityLabel: Strings.totalsExpenseShareA11y(120),
      shareCaption: '120% of income spent',
    });
  });

  it('drives the rail, its label and the caption from one rounded share', () => {
    expect(hero({ current: { incomeEgp: 1_000, expenseEgp: 1_004, netEgp: -4 } })).toMatchObject({
      leftOfIncome: '0%',
      railPct: 100,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsExpenseShareA11y(100),
      shareCaption: '100% of income spent',
    });
  });

  it('prints a dash and an empty rail when the month has no income', () => {
    expect(hero({ current: { incomeEgp: 0, expenseEgp: 500, netEgp: -500 } })).toMatchObject({
      out: '500',
      in: '0',
      net: '−500',
      leftOfIncome: DASH,
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsNoIncome,
      shareCaption: null,
    });
  });

  it('reduces Out by a card credit and signs it with U+2212', () => {
    const model = hero({ current: { incomeEgp: 1_000, expenseEgp: -50, netEgp: 1_050 } });
    expect(model).toMatchObject({ out: '−50', net: '1,050', railPct: 0, railDanger: false });
    expect(model.out).not.toContain('-');
  });

  it('prints zeros and a dash for a month with no rows (A5)', () => {
    expect(hero({ current: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 } })).toMatchObject({
      out: '0',
      in: '0',
      net: '0',
      leftOfIncome: DASH,
      railPct: 0,
      shareCaption: null,
    });
  });

  it('drops the days segment outside the current month (A16)', () => {
    expect(hero({ yearMonth: '2026-08', today: '2026-09-24' }).caption).toBe('Jul 16,900');
  });

  it('reads 0 days left on the last day of a 30-day month', () => {
    expect(hero({ today: '2026-09-30' }).caption).toBe('0 days left · Aug 16,900');
  });

  it('counts days left against a 31-day month', () => {
    expect(hero({ yearMonth: '2026-10', today: '2026-10-01' }).caption).toBe(
      '30 days left · Sep 16,900',
    );
    expect(hero({ yearMonth: '2026-10', today: '2026-10-31' }).caption).toBe(
      '0 days left · Sep 16,900',
    );
  });

  it('counts days left against a leap February and a common one', () => {
    expect(hero({ yearMonth: '2028-02', today: '2028-02-10' }).caption).toBe(
      '19 days left · Jan 16,900',
    );
    expect(hero({ yearMonth: '2027-02', today: '2027-02-10' }).caption).toBe(
      '18 days left · Jan 16,900',
    );
  });

  it("prints a dash for last month's Out when last month has no figures", () => {
    expect(hero({ previous: null }).caption).toBe('6 days left · Aug —');
    expect(hero({ previous: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 } }).caption).toBe(
      '6 days left · Aug —',
    );
  });

  it('prints dashes and keeps the caption when no figures loaded for the month', () => {
    expect(hero({ mode: 'dashes', current: null, previous: null })).toMatchObject({
      mode: 'dashes',
      out: DASH,
      in: DASH,
      net: DASH,
      leftOfIncome: DASH,
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsNoIncome,
      shareCaption: null,
      caption: '6 days left · Aug —',
    });
  });
});

describe('resolveTransactionsHeroMode', () => {
  const STATUSES: TransactionTotalsStatus[] = [
    'idle',
    'initialLoading',
    'ready',
    'refreshing',
    'firstLoadError',
    'refreshErrorWithData',
  ];

  it.each(STATUSES)('keeps the figures on screen for %s once totals exist', (status) => {
    expect(resolveTransactionsHeroMode(status, true)).toBe('figures');
  });

  it.each<[TransactionTotalsStatus, string]>([
    ['idle', 'skeleton'],
    ['initialLoading', 'skeleton'],
    ['ready', 'skeleton'],
    ['refreshing', 'skeleton'],
    ['firstLoadError', 'dashes'],
    ['refreshErrorWithData', 'skeleton'],
  ])('resolves %s without totals to %s', (status, mode) => {
    expect(resolveTransactionsHeroMode(status, false)).toBe(mode);
  });
});
