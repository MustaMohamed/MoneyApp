import type { PolaritySignal } from '@/components/ui/flow_polarity';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { expenseSharePercent } from '@/modules/transactions/domain/expense_share';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { snapToZero } from '@/utils/money';

export type TotalsMetric = 'income' | 'expense' | 'net';

export type DeltaDirection = 'up' | 'down' | 'flat';
type TotalsSummaryState = 'noIncome' | 'withinIncome' | 'overIncome' | 'netCredit';

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

export function polarityColor(metric: TotalsMetric, deltaPct: number): PolaritySignal {
  if (deltaPct === 0) return 'neutral';
  const direction = deltaPct > 0 ? 'up' : 'down';
  if (metric === 'expense') return direction === 'up' ? 'bad' : 'good';
  return direction === 'up' ? 'good' : 'bad';
}

export function formatSignedAmount(value: number, metric: TotalsMetric): string {
  const { text, printsAsZero } = formatDisplayMagnitude(value, Currency.EGP);
  // Expense totals read as outflow, so a positive spend signs negative and a credit positive.
  const positive = metric === 'expense' ? value < 0 : value >= 0;
  return signAmountText(text, positive ? PLUS_SIGN : MINUS_SIGN, printsAsZero);
}

export function buildTotalsPresentation(current: PeriodTotals): TotalsPresentation {
  const expenseEgp = snapToZero(current.expenseEgp);
  const rawExpenseSharePct = expenseSharePercent(expenseEgp, current.incomeEgp);
  const railPct = Math.max(0, Math.min(100, rawExpenseSharePct ?? 0));

  if (expenseEgp < 0) {
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

  if (rawExpenseSharePct === null) {
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

  if (rawExpenseSharePct > 100) {
    return {
      state: 'overIncome',
      rawExpenseSharePct,
      railPct,
      hasOverflow: true,
      caption: Strings.totalsOverIncome(rawExpenseSharePct),
      captionClassName: 'text-danger',
      railClassName: 'bg-danger',
      accessibilityLabel: Strings.totalsExpenseShareA11y(rawExpenseSharePct),
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
    accessibilityLabel: Strings.totalsExpenseShareA11y(rawExpenseSharePct),
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
