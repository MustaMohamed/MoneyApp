import { PixelRatio } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import type {
  CategoryHistoryVM,
  CategoryMonthVM,
} from '@/modules/budget/screens/budget/budget.helpers';
import { budgetBandColor } from '@/modules/budget/utils/budget_summary';
import { formatAmount } from '@/utils/format_amount';
import { shortMonthName } from '@/utils/year_month';

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
  results: readonly CategoryMonthVM[],
  selectedMonth: string,
): MonthlyResultVM {
  const selectedLimit = results.find((r) => r.yearMonth === selectedMonth)?.limit;
  const scale = Math.max(selectedLimit ?? 0, ...results.map((r) => r.spent));

  const bars = results.map((r): MonthlyBarVM => {
    const isSelected = r.yearMonth === selectedMonth;
    const isOver = r.status === 'over';
    const month = shortMonthName(r.yearMonth);
    return {
      yearMonth: r.yearMonth,
      monthLabel:
        r.lifecycle === 'provisional' ? month + Strings.budgetDetailInProgressMark : month,
      amountLabel: formatAmount(r.spent),
      color: r.limit === undefined ? Colors.dark.budgetNoLimit : budgetBandColor(r.spent, r.limit),
      heightDp: PixelRatio.roundToNearestPixel(
        Math.max(Size.budgetMonthlyBarMinHeight, heightFor(r.spent, scale)),
      ),
      isSelected,
      isOver,
      amountColor: amountColorFor(isOver, isSelected),
    };
  });

  const legendParts: string[] = [];
  if (selectedLimit !== undefined) {
    legendParts.push(Strings.budgetDetailLimitLegend(formatAmount(selectedLimit)));
  }
  if (results.some((r) => r.lifecycle === 'provisional')) {
    legendParts.push(Strings.budgetDetailInProgress);
  }

  return {
    bars,
    limitOffsetDp:
      selectedLimit === undefined
        ? undefined
        : PixelRatio.roundToNearestPixel(heightFor(selectedLimit, scale)),
    legend: legendParts.length > 0 ? legendParts.join(Strings.listHeroCaptionSeparator) : undefined,
  };
}

interface MonthFiguresVM {
  avgLabel: string;
  underLabel: string;
  netLabel: string;
  netColor: string;
}

/** Figures count completed months only; see docs/adr/2026-11-24-category-history-completed-months.md. */
export function buildMonthFigures(history: CategoryHistoryVM): MonthFiguresVM {
  const avgLabel =
    history.monthsCompleted === 0
      ? Strings.budgetDetailNoFigure
      : formatAmount(Math.round(history.avgPerMonth));
  if (history.monthsTotal === 0) {
    return {
      avgLabel,
      underLabel: Strings.budgetDetailNoFigure,
      netLabel: Strings.budgetDetailNoFigure,
      netColor: Colors.dark.text1,
    };
  }
  const isOver = history.netBanked < 0;
  return {
    avgLabel,
    underLabel: Strings.budgetDetailPartOf(history.monthsUnder, history.monthsTotal),
    netLabel: isOver
      ? Strings.budgetDetailNetOver(formatAmount(Math.abs(history.netBanked)))
      : Strings.budgetDetailNetUnder(formatAmount(history.netBanked)),
    netColor: isOver ? Colors.dark.negative : Colors.dark.positive,
  };
}
