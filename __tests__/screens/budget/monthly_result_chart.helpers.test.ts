import { PixelRatio } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import {
  computeCategoryHistory,
  type MonthResultVM,
} from '@/modules/budget/screens/budget/budget.helpers';
import {
  buildMonthlyResult,
  MONTHLY_RESULT_BAR_COUNT,
} from '@/modules/budget/screens/budget/category_detail/components/monthly_result_chart.helpers';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import { formatAmount } from '@/utils/format_amount';
import { MONTHS_SHORT } from '@/utils/year_month';

function row(
  yearMonth: string,
  spent: number,
  limit = 3000,
  lifecycle: MonthResultVM['lifecycle'] = 'completed',
): MonthResultVM {
  return {
    yearMonth,
    limit,
    spent,
    delta: limit - spent,
    status: spent > limit ? 'over' : 'under',
    isProvisional: lifecycle === 'provisional',
    lifecycle,
  };
}

const history = (rows: MonthResultVM[]): MonthResultVM[] => computeCategoryHistory(rows).results;

const B1_ROWS = history([
  row('2026-06', 2100),
  row('2026-07', 3400),
  row('2026-08', 1800),
  row('2026-09', 2950),
  row('2026-10', 2600),
  row('2026-11', 1150, 3000, 'provisional'),
]);

describe('buildMonthlyResult — frame B1', () => {
  const result = buildMonthlyResult(B1_ROWS, '2026-11');
  const byMonth = (yearMonth: string) => result.bars.find((b) => b.yearMonth === yearMonth)!;

  it('draws six bars labelled by month, the month in progress carrying the mark', () => {
    expect(result.bars).toHaveLength(MONTHLY_RESULT_BAR_COUNT);
    expect(result.bars.map((b) => b.monthLabel)).toEqual([
      MONTHS_SHORT[5],
      MONTHS_SHORT[6],
      MONTHS_SHORT[7],
      MONTHS_SHORT[8],
      MONTHS_SHORT[9],
      MONTHS_SHORT[10] + Strings.budgetDetailInProgressMark,
    ]);
  });

  it('prints each month spending over its bar', () => {
    expect(result.bars.map((b) => b.amountLabel)).toEqual(
      [2100, 3400, 1800, 2950, 2600, 1150].map((spent) => formatAmount(spent)),
    );
  });

  it('draws the 3,400 month at full height, over, in the band colour and the negative amount colour', () => {
    const over = byMonth('2026-07');
    expect(over.heightDp).toBe(PixelRatio.roundToNearestPixel(Size.budgetMonthlyBarMaxHeight));
    expect(over.isOver).toBe(true);
    expect(over.color).toBe(budgetBandColor(3400, 3000));
    expect(over.amountColor).toBe(Colors.dark.negative);
  });

  it('marks the selected month in gold and leaves an ordinary past month in text2', () => {
    const selected = byMonth('2026-11');
    expect(selected.isSelected).toBe(true);
    expect(selected.amountColor).toBe(Colors.dark.gold);

    const past = byMonth('2026-06');
    expect(past.isSelected).toBe(false);
    expect(past.isOver).toBe(false);
    expect(past.amountColor).toBe(Colors.dark.text2);
  });

  it('places the limit line at the selected limit over the largest spend', () => {
    expect(result.limitOffsetDp).toBe(
      PixelRatio.roundToNearestPixel((3000 / 3400) * Size.budgetMonthlyBarMaxHeight),
    );
  });

  it('reads the legend as the limit and the in-progress note', () => {
    expect(result.legend).toBe(
      [Strings.budgetDetailLimitLegend(formatAmount(3000)), Strings.budgetDetailInProgress].join(
        Strings.listHeroCaptionSeparator,
      ),
    );
  });
});

describe('buildMonthlyResult — the bar window', () => {
  it('keeps the last six of eight rows in order when the selected month has a row', () => {
    const rows = history([
      row('2026-04', 100),
      row('2026-05', 200),
      row('2026-06', 300),
      row('2026-07', 400),
      row('2026-08', 500),
      row('2026-09', 600),
      row('2026-10', 700),
      row('2026-11', 800, 3000, 'provisional'),
    ]);
    const { bars } = buildMonthlyResult(rows, '2026-11');
    expect(bars.map((b) => b.yearMonth)).toEqual([
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
      '2026-10',
      '2026-11',
    ]);
  });

  it('keeps the last five of seven rows and draws no limit line when no row is the selected month', () => {
    const rows = history([
      row('2026-01', 100),
      row('2026-02', 200),
      row('2026-03', 300),
      row('2026-04', 400),
      row('2026-05', 500),
      row('2026-06', 600),
      row('2026-07', 700),
    ]);
    const result = buildMonthlyResult(rows, '2026-08');
    expect(result.bars.map((b) => b.yearMonth)).toEqual([
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
    ]);
    expect(result.limitOffsetDp).toBeUndefined();
    expect(result.bars.some((b) => b.isSelected)).toBe(false);
  });

  it('draws one selected bar for the first budgeted month (S24)', () => {
    const result = buildMonthlyResult(
      history([row('2026-11', 400, 3000, 'provisional')]),
      '2026-11',
    );
    expect(result.bars).toHaveLength(1);
    expect(result.bars[0].yearMonth).toBe('2026-11');
    expect(result.bars[0].isSelected).toBe(true);
  });
});

describe('buildMonthlyResult — legend', () => {
  it('reads the limit alone for a selected past month with no month in progress', () => {
    const rows = history([row('2026-08', 1000), row('2026-09', 2000), row('2026-10', 2500)]);
    expect(buildMonthlyResult(rows, '2026-10').legend).toBe(
      Strings.budgetDetailLimitLegend(formatAmount(3000)),
    );
  });

  it('reads the in-progress note alone when no row is the selected month and one is provisional', () => {
    const rows = history([row('2026-09', 2000), row('2026-10', 2500, 3000, 'provisional')]);
    expect(buildMonthlyResult(rows, '2026-12').legend).toBe(Strings.budgetDetailInProgress);
  });

  it('has no legend when no row is the selected month and none is provisional', () => {
    const rows = history([row('2026-09', 2000), row('2026-10', 2500)]);
    expect(buildMonthlyResult(rows, '2026-12').legend).toBeUndefined();
  });
});

describe('buildMonthlyResult — zero spend and the minimum height', () => {
  it('draws a month with nothing spent at the minimum height with 0 over it', () => {
    const rows = history([row('2026-09', 2000), row('2026-10', 0), row('2026-11', 1500)]);
    const zero = buildMonthlyResult(rows, '2026-11').bars.find((b) => b.yearMonth === '2026-10')!;
    expect(zero.amountLabel).toBe(formatAmount(0));
    expect(zero.heightDp).toBe(PixelRatio.roundToNearestPixel(Size.budgetMonthlyBarMinHeight));
  });

  it('gives finite minimum heights when every spend is 0 and no row is selected', () => {
    const rows = history([row('2026-08', 0), row('2026-09', 0), row('2026-10', 0)]);
    const { bars } = buildMonthlyResult(rows, '2026-12');
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(Number.isFinite(bar.heightDp)).toBe(true);
      expect(bar.heightDp).toBe(PixelRatio.roundToNearestPixel(Size.budgetMonthlyBarMinHeight));
    }
  });
});

describe('buildMonthlyResult — band colour per month', () => {
  it('colours each bar by its own month limit', () => {
    const rows = history([row('2026-09', 950, 1000), row('2026-10', 950, 3000)]);
    const { bars } = buildMonthlyResult(rows, '2026-10');
    expect(bars[0].color).toBe(budgetBandColor(950, 1000));
    expect(bars[1].color).toBe(budgetBandColor(950, 3000));
    expect(bars[0].color).not.toBe(bars[1].color);
  });

  it('reads 3,000 against 3,000 as not over and 3,000.01 as over', () => {
    const rows = history([row('2026-09', 3000), row('2026-10', 3000.01)]);
    const { bars } = buildMonthlyResult(rows, '2026-10');
    expect(bars[0].isOver).toBe(false);
    expect(bars[1].isOver).toBe(true);
    expect(bars[1].color).toBe(budgetBandColor(3000.01, 3000));
    expect(bars[1].amountColor).toBe(Colors.dark.negative);
  });
});
