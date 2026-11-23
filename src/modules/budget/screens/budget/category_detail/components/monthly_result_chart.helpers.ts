import { PixelRatio } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import type { MonthResultVM } from '@/modules/budget/screens/budget/budget.helpers';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import { formatAmount } from '@/utils/format_amount';
import { shortMonthName } from '@/utils/year_month';

export const MONTHLY_RESULT_BAR_COUNT = 6;

interface MonthlyBarVM {
  yearMonth: string;
  monthLabel: string;
  amountLabel: string;
  color: string;
  heightDp: number;
  isSelected: boolean;
  isOver: boolean;
  amountColor: string;
}

interface MonthlyResultVM {
  bars: MonthlyBarVM[];
  limitOffsetDp: number | undefined;
  legend: string | undefined;
}

function heightFor(value: number, scale: number): number {
  return scale > 0 ? (value / scale) * Size.budgetMonthlyBarMaxHeight : 0;
}

function amountColorFor(isOver: boolean, isSelected: boolean): string {
  if (isOver) return Colors.dark.negative;
  return isSelected ? Colors.dark.gold : Colors.dark.text2;
}

/** `results` is `CategoryHistoryVM.results`, oldest first; see docs/adr/2026-11-23-category-monthly-result-bars.md. */
export function buildMonthlyResult(
  results: readonly MonthResultVM[],
  selectedMonth: string,
): MonthlyResultVM {
  const selected = results.find((r) => r.yearMonth === selectedMonth);
  const count = selected ? MONTHLY_RESULT_BAR_COUNT : MONTHLY_RESULT_BAR_COUNT - 1;
  const rows = results.slice(-count);
  const scale = Math.max(selected?.limit ?? 0, ...rows.map((r) => r.spent));

  const bars = rows.map((r): MonthlyBarVM => {
    const isSelected = r.yearMonth === selectedMonth;
    const isOver = r.status === 'over';
    const month = shortMonthName(r.yearMonth);
    return {
      yearMonth: r.yearMonth,
      monthLabel:
        r.lifecycle === 'provisional' ? month + Strings.budgetDetailInProgressMark : month,
      amountLabel: formatAmount(r.spent),
      color: budgetBandColor(r.spent, r.limit),
      heightDp: PixelRatio.roundToNearestPixel(
        Math.max(Size.budgetMonthlyBarMinHeight, heightFor(r.spent, scale)),
      ),
      isSelected,
      isOver,
      amountColor: amountColorFor(isOver, isSelected),
    };
  });

  const legendParts: string[] = [];
  if (selected) legendParts.push(Strings.budgetDetailLimitLegend(formatAmount(selected.limit)));
  if (rows.some((r) => r.lifecycle === 'provisional')) {
    legendParts.push(Strings.budgetDetailInProgress);
  }

  return {
    bars,
    limitOffsetDp: selected
      ? PixelRatio.roundToNearestPixel(heightFor(selected.limit, scale))
      : undefined,
    legend: legendParts.length > 0 ? legendParts.join(Strings.listHeroCaptionSeparator) : undefined,
  };
}
