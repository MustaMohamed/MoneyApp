import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { formatDisplayMagnitude } from '@/utils/format_amount';
import { currentYearMonth, shiftYearMonth } from '@/utils/year_month';

export { currentYearMonth };

export type TransactionPeriod = { type: 'month'; yearMonth: string };

export type TotalsMetric = 'income' | 'expense' | 'net';

export type PolaritySignal = 'good' | 'bad' | 'neutral';
export type DeltaDirection = 'up' | 'down' | 'flat';
export type TotalsSummaryState = 'noIncome' | 'withinIncome' | 'overIncome' | 'netCredit';

export interface TotalsPresentation {
  state: TotalsSummaryState;
  rawExpenseSharePct: number | null;
  railPct: number;
  hasOverflow: boolean;
  caption: string;
  captionClassName: string;
  railClassName: string;
  accessibilityLabel: string;
}

export function resolvePeriod(selection: TransactionPeriod): {
  from: string;
  to: string;
} {
  const [year, month] = selection.yearMonth.split('-').map(Number);
  const lastDay = new Date(year, month, 0);
  return {
    from: `${selection.yearMonth}-01`,
    to: `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(
      lastDay.getDate(),
    ).padStart(2, '0')}`,
  };
}

export function previousPeriod(selection: TransactionPeriod): TransactionPeriod {
  return { type: 'month', yearMonth: shiftYearMonth(selection.yearMonth, -1) };
}

export function computeDeltaPct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100);
}

export function polarityColor(metric: TotalsMetric, deltaPct: number): PolaritySignal {
  if (deltaPct === 0) return 'neutral';
  const direction = deltaPct > 0 ? 'up' : 'down';
  if (metric === 'expense') return direction === 'up' ? 'bad' : 'good';
  return direction === 'up' ? 'good' : 'bad';
}

export function formatSignedAmount(value: number, metric: TotalsMetric): string {
  const { text, printsAsZero } = formatDisplayMagnitude(value, Currency.EGP);
  if (printsAsZero) return text;
  if (metric === 'expense') return `${value < 0 ? '+' : '-'}${text}`;
  return `${value >= 0 ? '+' : '-'}${text}`;
}

export function buildTotalsPresentation(current: PeriodTotals): TotalsPresentation {
  const rawExpenseSharePct =
    current.incomeEgp > 0 ? Math.round((current.expenseEgp / current.incomeEgp) * 100) : null;
  const railPct = Math.max(0, Math.min(100, rawExpenseSharePct ?? 0));

  if (current.expenseEgp < 0) {
    return {
      state: 'netCredit',
      rawExpenseSharePct,
      railPct,
      hasOverflow: false,
      caption: Strings.totalsNetCredit,
      captionClassName: 'text-success',
      railClassName: 'bg-success',
      accessibilityLabel: Strings.totalsNetCredit,
    };
  }

  if (current.incomeEgp <= 0) {
    return {
      state: 'noIncome',
      rawExpenseSharePct: null,
      railPct: 0,
      hasOverflow: false,
      caption: Strings.totalsNoIncome,
      captionClassName: 'text-muted',
      railClassName: 'bg-danger',
      accessibilityLabel: Strings.totalsNoIncome,
    };
  }

  if ((rawExpenseSharePct ?? 0) > 100) {
    return {
      state: 'overIncome',
      rawExpenseSharePct,
      railPct,
      hasOverflow: true,
      caption: Strings.totalsOverIncome(rawExpenseSharePct ?? 0),
      captionClassName: 'text-danger',
      railClassName: 'bg-danger',
      accessibilityLabel: Strings.totalsExpenseShareA11y(rawExpenseSharePct ?? 0),
    };
  }

  return {
    state: 'withinIncome',
    rawExpenseSharePct,
    railPct,
    hasOverflow: false,
    caption: Strings.totalsWithinIncome,
    captionClassName: 'text-success',
    railClassName: 'bg-danger',
    accessibilityLabel: Strings.totalsExpenseShareA11y(rawExpenseSharePct ?? 0),
  };
}

export function expenseSharePct(current: PeriodTotals): number {
  return buildTotalsPresentation(current).railPct;
}

export function deltaDisplay(
  metric: TotalsMetric,
  deltaPct: number | null,
): { direction: DeltaDirection; label: string; polarity: PolaritySignal } | null {
  if (deltaPct === null) return null;
  return {
    direction: deltaPct > 0 ? 'up' : deltaPct < 0 ? 'down' : 'flat',
    label: `${Math.abs(deltaPct)}%`,
    polarity: polarityColor(metric, deltaPct),
  };
}
