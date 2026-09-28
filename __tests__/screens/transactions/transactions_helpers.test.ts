import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { TransactionDayAggregate } from '@/modules/transactions/database/transactions';
import {
  buildDaySections,
  composeDayHeaderAccessibilityLabel,
  type DaySectionsInput,
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
  buildSearchTally,
  resolveSearchTallyFiguresMode,
  type SearchTallyInput,
  type TransactionsHeroInput,
  type TransactionsHeroMode,
} from '@/modules/transactions/screens/transactions/transactions.helpers';
import type { TransactionTotalsStatus } from '@/modules/transactions/screens/transactions/transactions.state';
import { makeTestTransaction } from '@/test_helpers/transaction';
import type { TransactionSection } from '@/utils/group_transactions_by_date';

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

  it('rounds a half up in integer cents, multiplied before dividing: 14.5 to 15, −14.5 to −14', () => {
    expect(computeDeltaPct(1_145, 1_000)).toBe(15);
    expect(computeDeltaPct(855, 1_000)).toBe(-14);
  });

  it('reads a float-noise previous as 0 cents and returns null', () => {
    expect(computeDeltaPct(100, 1e-13)).toBeNull();
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
      monthLabel: 'September',
      out: '9,400',
      in: '22,300',
      inPolarity: 'good',
      net: '+12,900',
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
    ).toMatchObject({ out: '9,400', in: '22,300', net: '+12,901' });
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
      shareCaption: undefined,
    });
  });

  it('reduces Out by a card credit, signs it with U+2212 and reads Credits exceed expenses', () => {
    const model = hero({ current: { incomeEgp: 1_000, expenseEgp: -50, netEgp: 1_050 } });
    expect(model).toMatchObject({
      out: '−50',
      net: '+1,050',
      leftOfIncome: '105%',
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsNetCredit,
      shareCaption: Strings.totalsNetCredit,
    });
    const strings = Object.values(model).filter((v): v is string => typeof v === 'string');
    for (const text of strings) expect(text).not.toContain('-');
  });

  it('reads Credits exceed expenses with no income when Out is below 0', () => {
    expect(hero({ current: { incomeEgp: 0, expenseEgp: -50, netEgp: 50 } })).toMatchObject({
      out: '−50',
      leftOfIncome: DASH,
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsNetCredit,
      shareCaption: Strings.totalsNetCredit,
    });
  });

  it('prints zeros and a dash for a month with no rows (A5)', () => {
    expect(hero({ current: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 } })).toMatchObject({
      out: '0',
      in: '0',
      net: '0',
      leftOfIncome: DASH,
      railPct: 0,
      shareCaption: undefined,
    });
  });

  it('drops the days segment outside the current month (A16)', () => {
    expect(hero({ yearMonth: '2026-08', today: '2026-09-24' })).toMatchObject({
      monthLabel: 'August',
      caption: 'Jul 16,900',
    });
  });

  it('reads 0 days left on the last day of a 30-day month', () => {
    expect(hero({ today: '2026-09-30' }).caption).toBe('0 days left · Aug 16,900');
  });

  it('reads 1 day left in the singular on the day before the last', () => {
    expect(hero({ today: '2026-09-29' }).caption).toBe('1 day left · Aug 16,900');
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
      inPolarity: 'neutral',
      net: DASH,
      leftOfIncome: DASH,
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel: Strings.transactionsTotalsLoadError,
      shareCaption: undefined,
      caption: '6 days left · Aug —',
    });
  });

  describe('Net and its flow colour (frame A1, money-colour ADR decision 5)', () => {
    it('signs a positive Net with + and reads good', () => {
      expect(
        hero({ current: { incomeEgp: 31_000, expenseEgp: 18_557, netEgp: 12_443 } }),
      ).toMatchObject({ net: '+12,443', netPolarity: 'good', currencyCode: 'EGP' });
    });

    it('signs a negative Net with U+2212 and reads bad', () => {
      expect(
        hero({ current: { incomeEgp: 1_000, expenseEgp: 1_200, netEgp: -200 } }),
      ).toMatchObject({ net: '−200', netPolarity: 'bad' });
    });

    it('prints a zero Net unsigned and neutral', () => {
      expect(hero({ current: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 } })).toMatchObject({
        net: '0',
        netPolarity: 'neutral',
      });
    });
  });

  describe("change against last month's full Out", () => {
    it('groups a change of 1,000% or more with a comma', () => {
      expect(
        hero({
          current: { incomeEgp: 22_300, expenseEgp: 7_400, netEgp: 14_900 },
          previous: { incomeEgp: 20_000, expenseEgp: 500, netEgp: 19_500 },
        }),
      ).toMatchObject({
        lastMonthChange: { label: '1,380%', accessibilityLabel: 'Spent 1,380% more than August' },
      });
    });

    it('keeps printing after a negative last month (ruled 2026-09-26)', () => {
      expect(hero({ previous: { incomeEgp: 0, expenseEgp: -50, netEgp: 50 } })).toMatchObject({
        lastMonthChange: {
          direction: 'up',
          polarity: 'bad',
          label: '18,900%',
          accessibilityLabel: 'Spent 18,900% more than August',
        },
      });
    });

    it('reads a month with nothing spent as down 100% (ruled 2026-09-26)', () => {
      expect(
        hero({
          current: { incomeEgp: 22_300, expenseEgp: 0, netEgp: 22_300 },
          previous: { incomeEgp: 20_000, expenseEgp: 7_400, netEgp: 12_600 },
        }),
      ).toMatchObject({
        lastMonthChange: {
          direction: 'down',
          polarity: 'good',
          label: '100%',
          accessibilityLabel: 'Spent 100% less than August',
        },
      });
    });

    it('reads a fall as down, good, and names last month in full (A1)', () => {
      expect(hero()).toMatchObject({
        lastMonthChange: {
          direction: 'down',
          polarity: 'good',
          label: '44%',
          accessibilityLabel: 'Spent 44% less than August',
        },
        caption: '6 days left · Aug 16,900',
      });
    });

    it('reads a rise as up, bad (option B)', () => {
      expect(
        hero({
          current: { incomeEgp: 22_300, expenseEgp: 17_538, netEgp: 4_762 },
          previous: { incomeEgp: 20_000, expenseEgp: 7_400, netEgp: 12_600 },
        }),
      ).toMatchObject({
        lastMonthChange: {
          direction: 'up',
          polarity: 'bad',
          label: '137%',
          accessibilityLabel: 'Spent 137% more than August',
        },
        caption: '6 days left · Aug 7,400',
      });
    });

    it('reads an equal Out as flat, neutral, the same as last month', () => {
      expect(
        hero({ current: { incomeEgp: 22_300, expenseEgp: 16_900, netEgp: 5_400 } }),
      ).toMatchObject({
        lastMonthChange: {
          direction: 'flat',
          polarity: 'neutral',
          label: '0%',
          accessibilityLabel: 'Spent the same as August',
        },
      });
    });

    it('rounds the change once in cents, a half up', () => {
      expect(
        hero({
          current: { incomeEgp: 22_300, expenseEgp: 1_145, netEgp: 21_155 },
          previous: { incomeEgp: 20_000, expenseEgp: 1_000, netEgp: 19_000 },
        }),
      ).toMatchObject({
        lastMonthChange: {
          direction: 'up',
          label: '15%',
          accessibilityLabel: 'Spent 15% more than August',
        },
      });
    });

    it('compares a past month with the month before it (A16)', () => {
      expect(hero({ yearMonth: '2026-08', today: '2026-09-24' })).toMatchObject({
        lastMonthChange: { accessibilityLabel: 'Spent 44% less than July' },
        caption: 'Jul 16,900',
      });
    });

    it('names December across the year boundary', () => {
      expect(hero({ yearMonth: '2027-01', today: '2027-01-10' })).toMatchObject({
        lastMonthChange: { accessibilityLabel: 'Spent 44% less than December' },
      });
    });

    it.each<[string, Partial<TransactionsHeroInput>, string]>([
      ['last month has no figures', { previous: null }, '6 days left · Aug —'],
      [
        "last month's In and Out are both 0",
        { previous: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 } },
        '6 days left · Aug —',
      ],
      [
        "last month's Out is 0",
        { previous: { incomeEgp: 500, expenseEgp: 0, netEgp: 500 } },
        '6 days left · Aug 0',
      ],
      [
        'no figures loaded for this month',
        { mode: 'dashes', current: null },
        '6 days left · Aug 16,900',
      ],
    ])('prints no change when %s', (_case, overrides, caption) => {
      expect(hero(overrides)).toMatchObject({ lastMonthChange: undefined, caption });
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
    expect(resolveTransactionsHeroMode(status, true, false)).toBe('figures');
    expect(resolveTransactionsHeroMode(status, true, true)).toBe('figures');
  });

  it.each<[TransactionTotalsStatus, string]>([
    ['idle', 'skeleton'],
    ['initialLoading', 'skeleton'],
    ['ready', 'skeleton'],
    ['refreshing', 'skeleton'],
    ['firstLoadError', 'dashes'],
    ['refreshErrorWithData', 'skeleton'],
  ])('resolves %s without totals to %s', (status, mode) => {
    expect(resolveTransactionsHeroMode(status, false, false)).toBe(mode);
  });

  it.each<[TransactionTotalsStatus, string]>([
    ['idle', 'skeleton'],
    ['initialLoading', 'dashes'],
    ['ready', 'skeleton'],
    ['refreshing', 'skeleton'],
    ['firstLoadError', 'dashes'],
    ['refreshErrorWithData', 'skeleton'],
  ])('resolves %s to %s while the failed month and scope reload', (status, mode) => {
    expect(resolveTransactionsHeroMode(status, false, true)).toBe(mode);
  });
});

describe('share and Left of income in integer cents, multiplied before dividing', () => {
  function figures(incomeEgp: number, expenseEgp: number) {
    const current = { incomeEgp, expenseEgp, netEgp: incomeEgp - expenseEgp };
    return {
      totals: buildTotalsPresentation(current),
      hero: buildTransactionsHeroModel({
        mode: 'figures',
        current,
        previous: null,
        yearMonth: '2026-09',
        today: '2026-09-24',
      }),
    };
  }

  it('rounds In 1,000 Out 1,005 up to 101, over income', () => {
    const { totals, hero } = figures(1_000, 1_005);
    expect(totals.rawExpenseSharePct).toBe(101);
    expect(hero).toMatchObject({
      railDanger: true,
      railPct: 100,
      shareCaption: '101% of income spent',
      railAccessibilityLabel: Strings.totalsExpenseShareA11y(101),
    });
  });

  it('rounds In 1,000 Out 145 up to 15', () => {
    const { totals, hero } = figures(1_000, 145);
    expect(totals.rawExpenseSharePct).toBe(15);
    expect(hero).toMatchObject({ railPct: 15, shareCaption: '15% of income spent' });
  });

  it('reads In 1,000 Out 1,035 as −3% left and a 104 share', () => {
    const { totals, hero } = figures(1_000, 1_035);
    expect(totals.rawExpenseSharePct).toBe(104);
    expect(hero).toMatchObject({ leftOfIncome: '−3%', shareCaption: '104% of income spent' });
  });
});

describe('buildSearchTally', () => {
  const DASH = '—';

  function tally(overrides: Partial<SearchTallyInput> = {}) {
    return buildSearchTally({
      isOn: true,
      figuresMode: 'figures',
      matchCount: 2,
      matchNetEgp: -2_100,
      yearMonth: '2026-09',
      filterSummary: undefined,
      ...overrides,
    });
  }

  it('reads 2 results in September with a U+2212 net and no summary (frame A3)', () => {
    expect(tally()).toEqual({
      mode: 'figures',
      count: '2',
      label: 'results in September',
      filterSummary: undefined,
      sum: { text: '−2,100', polarity: 'bad', currencyCode: 'EGP' },
      accessibilityLabel: '2 results in September −2,100 EGP',
    });
  });

  it('carries the applied-filter summary, read in line order as one label', () => {
    expect(tally({ filterSummary: 'Food' })).toMatchObject({
      mode: 'figures',
      count: '2',
      label: 'results in September',
      sum: { text: '−2,100' },
      filterSummary: 'Food',
      accessibilityLabel: '2 results in September Food −2,100 EGP',
    });
  });

  it('reads 1 result in September with its sum', () => {
    expect(tally({ matchCount: 1, matchNetEgp: -350 })).toMatchObject({
      mode: 'figures',
      count: '1',
      label: 'result in September',
      sum: { text: '−350', polarity: 'bad', currencyCode: 'EGP' },
    });
  });

  it('reads No results in September with no count and no sum, the summary kept', () => {
    expect(tally({ matchCount: 0, matchNetEgp: 0, filterSummary: 'Food' })).toMatchObject({
      mode: 'figures',
      count: undefined,
      label: 'No results in September',
      sum: undefined,
      filterSummary: 'Food',
      accessibilityLabel: 'No results in September Food',
    });
  });

  it('signs a positive net with + and reads good', () => {
    expect(tally({ matchNetEgp: 300 }).sum).toEqual({
      text: '+300',
      polarity: 'good',
      currencyCode: 'EGP',
    });
  });

  it('prints a zero net unsigned and neutral', () => {
    expect(tally({ matchNetEgp: 0 }).sum).toEqual({
      text: '0',
      polarity: 'neutral',
      currencyCode: 'EGP',
    });
  });

  it('prints the EGP net at 0 dp', () => {
    expect(tally({ matchNetEgp: -2_100.49 }).sum).toMatchObject({
      text: '−2,100',
      polarity: 'bad',
    });
  });

  it('groups a four-digit count', () => {
    expect(tally({ matchCount: 1_240 })).toMatchObject({
      count: '1,240',
      label: 'results in September',
    });
  });

  it('is a skeleton with no text and no label while the month loads', () => {
    expect(tally({ figuresMode: 'skeleton', filterSummary: 'Food' })).toEqual({
      mode: 'skeleton',
      count: undefined,
      label: '',
      filterSummary: undefined,
      sum: undefined,
      accessibilityLabel: undefined,
    });
  });

  it('reads — results in September with no sum when the figures failed, the summary kept', () => {
    expect(tally({ figuresMode: 'dashes', filterSummary: 'Food' })).toMatchObject({
      mode: 'failed',
      count: DASH,
      label: 'results in September',
      sum: undefined,
      filterSummary: 'Food',
      accessibilityLabel: '— results in September Food',
    });
  });

  it.each<SearchTallyInput['figuresMode']>(['skeleton', 'dashes', 'figures'])(
    'is an empty slot with nothing on while the figures are %s',
    (figuresMode) => {
      expect(tally({ isOn: false, figuresMode, filterSummary: 'Food' })).toEqual({
        mode: 'empty',
        count: undefined,
        label: '',
        filterSummary: undefined,
        sum: undefined,
        accessibilityLabel: undefined,
      });
    },
  );
});

describe('resolveSearchTallyFiguresMode', () => {
  const STATUSES: TransactionTotalsStatus[] = [
    'idle',
    'initialLoading',
    'ready',
    'refreshing',
    'refreshErrorWithData',
    'firstLoadError',
  ];

  it.each(STATUSES)('keeps the figures held for the query on screen while %s', (status) => {
    expect(resolveSearchTallyFiguresMode('figures', status, true)).toBe('figures');
  });

  it.each<[TransactionTotalsStatus, TransactionsHeroMode]>([
    ['idle', 'skeleton'],
    ['initialLoading', 'skeleton'],
    ['ready', 'skeleton'],
    ['refreshing', 'skeleton'],
    ['refreshErrorWithData', 'dashes'],
    ['firstLoadError', 'dashes'],
  ])('never prints figures held for another query: %s reads %s', (status, mode) => {
    expect(resolveSearchTallyFiguresMode('figures', status, false)).toBe(mode);
  });

  it.each<TransactionsHeroMode>(['skeleton', 'dashes'])(
    'follows the hero while it shows %s',
    (heroMode) => {
      expect(resolveSearchTallyFiguresMode(heroMode, 'ready', false)).toBe(heroMode);
      expect(resolveSearchTallyFiguresMode(heroMode, 'ready', true)).toBe(heroMode);
    },
  );
});

describe('buildDaySections', () => {
  const ROW = makeTestTransaction({ id: 'tx-1', egp_amount: 100, transaction_date: '2026-09-27' });
  const YESTERDAY: TransactionSection = { key: '2026-09-27', label: 'Yesterday', data: [ROW] };
  const OLDER: TransactionSection = {
    key: '2026-09-25',
    label: 'Thu 25 Sep',
    data: [makeTestTransaction({ id: 'tx-2', transaction_date: '2026-09-25' })],
  };

  function build(overrides: Partial<DaySectionsInput> = {}) {
    return buildDaySections({
      groups: [YESTERDAY],
      days: [{ date: '2026-09-27', netEgp: -984, count: 3 }],
      figuresMode: 'figures',
      totalsStatus: 'ready',
      ...overrides,
    });
  }

  function figuresFor(day: Omit<TransactionDayAggregate, 'date'>) {
    return build({ days: [{ date: '2026-09-27', ...day }] })[0].figures;
  }

  it("reads the day's net and count from the aggregate, never from the rows on screen", () => {
    const [section] = build();

    expect(section.key).toBe('2026-09-27');
    expect(section.label).toBe('Yesterday');
    expect(section.data).toBe(YESTERDAY.data);
    expect(section.figures).toEqual({
      mode: 'figures',
      net: '−984',
      currencyCode: 'EGP',
      count: '3',
    });
  });

  it('reads the full day from the first page when its rows straddle a page boundary', () => {
    expect(figuresFor({ netEgp: -2_700, count: 6 })).toEqual({
      mode: 'figures',
      net: '−2,700',
      currencyCode: 'EGP',
      count: '6',
    });
  });

  it('reads 0 with no sign on a day whose only row is a transfer', () => {
    const transferDay: TransactionSection = {
      key: '2026-09-27',
      label: 'Yesterday',
      data: [
        makeTestTransaction({
          id: 'tx-transfer',
          type: TransactionType.Transfer,
          egp_amount: 5_000,
          to_account_id: 'account-2',
          transaction_date: '2026-09-27',
        }),
      ],
    };

    const [section] = build({
      groups: [transferDay],
      days: [{ date: '2026-09-27', netEgp: 0, count: 1 }],
    });

    expect(section.figures).toEqual({
      mode: 'figures',
      net: '0',
      currencyCode: 'EGP',
      count: '1',
    });
  });

  it('signs a positive day net with + and groups its thousands', () => {
    expect(figuresFor({ netEgp: 14_300, count: 2 })).toMatchObject({ net: '+14,300' });
  });

  it('prints the EGP day net at 0 dp with U+2212', () => {
    expect(figuresFor({ netEgp: -1_234.56, count: 2 })).toMatchObject({ net: '−1,235' });
  });

  it('reads the skeleton on every day while the figures load', () => {
    const sections = build({ groups: [YESTERDAY, OLDER], figuresMode: 'skeleton' });

    expect(sections.map((section) => section.figures)).toEqual([
      { mode: 'skeleton' },
      { mode: 'skeleton' },
    ]);
  });

  it('reads the dash alone on every day when the figures failed, with no count', () => {
    const sections = build({ groups: [YESTERDAY, OLDER], figuresMode: 'dashes' });

    expect(sections.map((section) => section.figures)).toEqual([
      { mode: 'failed', net: '—' },
      { mode: 'failed', net: '—' },
    ]);
    for (const section of sections) expect(section.figures).not.toHaveProperty('count');
  });

  it.each<[TransactionTotalsStatus, 'skeleton' | 'failed']>([
    ['idle', 'skeleton'],
    ['initialLoading', 'skeleton'],
    ['ready', 'skeleton'],
    ['refreshing', 'skeleton'],
    ['refreshErrorWithData', 'failed'],
    ['firstLoadError', 'failed'],
  ])('a day the held aggregate lacks never reads 0 EGP: at %s it reads %s', (status, mode) => {
    const [yesterday, older] = build({ groups: [YESTERDAY, OLDER], totalsStatus: status });

    expect(yesterday.figures).toMatchObject({ mode: 'figures', net: '−984', count: '3' });
    expect(older.figures).toEqual(
      mode === 'skeleton' ? { mode: 'skeleton' } : { mode: 'failed', net: '—' },
    );
  });

  it('reads the skeleton on every day when the figures hold no days at all', () => {
    expect(build({ days: undefined })[0].figures).toEqual({ mode: 'skeleton' });
  });

  it("keeps the groups' order, keys, labels and row arrays", () => {
    const TODAY: TransactionSection = {
      key: '2026-09-28',
      label: 'Today',
      data: [makeTestTransaction({ id: 'tx-0', transaction_date: '2026-09-28' })],
    };
    const groups = [TODAY, YESTERDAY, OLDER];

    const sections = build({ groups });

    expect(sections.map(({ key, label }) => ({ key, label }))).toEqual([
      { key: '2026-09-28', label: 'Today' },
      { key: '2026-09-27', label: 'Yesterday' },
      { key: '2026-09-25', label: 'Thu 25 Sep' },
    ]);
    sections.forEach((section, index) => expect(section.data).toBe(groups[index].data));
  });

  it('gives each section the composed accessibility label for the mode its figures resolved to', () => {
    const [figures, missing] = build({ groups: [YESTERDAY, OLDER] });
    const [skeleton] = build({ figuresMode: 'skeleton' });
    const [failed] = build({ figuresMode: 'dashes' });

    expect(figures.accessibilityLabel).toBe(
      composeDayHeaderAccessibilityLabel('Yesterday', {
        mode: 'figures',
        netEgp: -984,
        count: 3,
      }),
    );
    expect(figures.accessibilityLabel).toBe('Yesterday, minus 984 EGP, 3 transactions');
    expect(missing.accessibilityLabel).toBe(
      composeDayHeaderAccessibilityLabel('Thu 25 Sep', { mode: 'skeleton' }),
    );
    expect(skeleton.accessibilityLabel).toBe(
      composeDayHeaderAccessibilityLabel('Yesterday', { mode: 'skeleton' }),
    );
    expect(failed.accessibilityLabel).toBe(
      composeDayHeaderAccessibilityLabel('Yesterday', { mode: 'failed' }),
    );
  });
});

describe('composeDayHeaderAccessibilityLabel', () => {
  it.each<[string, Parameters<typeof composeDayHeaderAccessibilityLabel>, string]>([
    [
      'a negative net and a plural count',
      ['Yesterday', { mode: 'figures', netEgp: -984, count: 3 }],
      'Yesterday, minus 984 EGP, 3 transactions',
    ],
    [
      'the singular count',
      ['Today', { mode: 'figures', netEgp: -85, count: 1 }],
      'Today, minus 85 EGP, 1 transaction',
    ],
    [
      'a positive net',
      ['Today', { mode: 'figures', netEgp: 14_300, count: 2 }],
      'Today, plus 14,300 EGP, 2 transactions',
    ],
    [
      'a zero net with no sign word',
      ['Today', { mode: 'figures', netEgp: 0, count: 1 }],
      'Today, 0 EGP, 1 transaction',
    ],
    [
      'a sub-pound net escalated to 2 dp as it is drawn',
      ['Today', { mode: 'figures', netEgp: -0.4, count: 1 }],
      'Today, minus 0.40 EGP, 1 transaction',
    ],
    [
      'a net that prints as zero with no sign word',
      ['Today', { mode: 'figures', netEgp: -0.004, count: 1 }],
      'Today, 0.00 EGP, 1 transaction',
    ],
    ['the loading figures', ['Yesterday', { mode: 'skeleton' }], 'Yesterday, loading'],
    ['the failed figures', ['Yesterday', { mode: 'failed' }], 'Yesterday, total unavailable'],
    [
      'a day outside the current year',
      ['Sun 14 Dec 2025', { mode: 'figures', netEgp: -984, count: 1 }],
      'Sun 14 Dec 2025, minus 984 EGP, 1 transaction',
    ],
  ])('reads %s', (_case, args, expected) => {
    const label = composeDayHeaderAccessibilityLabel(...args);

    expect(label).toBe(expected);
    expect(label).not.toMatch(/[−+—]/);
  });
});
