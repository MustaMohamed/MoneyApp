import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';
import { MONTHS_SHORT, currentYearMonth, shiftYearMonth } from '@/utils/year_month';

import type { TransactionTotalsStatus } from './transactions.state';

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
  // Expense totals read as outflow, so a positive spend signs negative and a credit positive.
  const positive = metric === 'expense' ? value < 0 : value >= 0;
  return signAmountText(text, positive ? PLUS_SIGN : MINUS_SIGN, printsAsZero);
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

export type TransactionsHeroMode = 'skeleton' | 'dashes' | 'figures';

export interface TransactionsHeroInput {
  mode: TransactionsHeroMode;
  current: PeriodTotals | null;
  previous: PeriodTotals | null;
  /** The selected month, `YYYY-MM`. */
  yearMonth: string;
  /** `YYYY-MM-DD`; the caller reads the clock, never this layer. */
  today: string;
  /** Set only when the sheet's account filter holds exactly one account. */
  accountLabel?: string;
}

export interface TransactionsHeroModel {
  mode: TransactionsHeroMode;
  title: string;
  monthLabel: string;
  out: string;
  in: string;
  net: string;
  leftOfIncome: string;
  railPct: number;
  railDanger: boolean;
  railAccessibilityLabel: string;
  shareCaption: string | null;
  caption: string;
}

export function resolveTransactionsHeroMode(
  status: TransactionTotalsStatus,
  hasTotals: boolean,
): TransactionsHeroMode {
  if (hasTotals) return 'figures';
  return status === 'firstLoadError' ? 'dashes' : 'skeleton';
}

function formatHeroAmount(value: number): string {
  const { text, printsAsZero } = formatDisplayMagnitude(value, Currency.EGP);
  return signAmountText(text, value < 0 ? MINUS_SIGN : '', printsAsZero);
}

function lastMonthOutCaption(yearMonth: string, previous: PeriodTotals | null): string {
  const lastMonth = shiftYearMonth(yearMonth, -1);
  const amount =
    previous === null || (previous.incomeEgp === 0 && previous.expenseEgp === 0)
      ? Strings.transactionsHeroUnavailable
      : formatHeroAmount(previous.expenseEgp);
  return Strings.transactionsHeroLastMonthOut(
    MONTHS_SHORT[Number(lastMonth.slice(5, 7)) - 1],
    amount,
  );
}

function daysLeftInMonth(yearMonth: string, today: string): number | null {
  if (today.slice(0, 7) !== yearMonth) return null;
  const lastDay = Number(resolvePeriod({ type: 'month', yearMonth }).to.slice(8, 10));
  return Math.max(lastDay - Number(today.slice(8, 10)), 0);
}

export function buildTransactionsHeroModel(input: TransactionsHeroInput): TransactionsHeroModel {
  const title =
    input.accountLabel !== undefined
      ? Strings.transactionsHeroTitleScoped(input.accountLabel)
      : Strings.transactionsHeroTitle;
  const lastMonth = lastMonthOutCaption(input.yearMonth, input.previous);
  const daysLeft = daysLeftInMonth(input.yearMonth, input.today);
  const caption =
    daysLeft === null ? lastMonth : `${Strings.transactionsHeroDaysLeft(daysLeft)} · ${lastMonth}`;
  const base = {
    mode: input.mode,
    title,
    monthLabel: formatMonthYear(input.yearMonth),
    caption,
  };
  const current = input.mode === 'figures' ? input.current : null;

  if (current === null) {
    return {
      ...base,
      out: Strings.transactionsHeroUnavailable,
      in: Strings.transactionsHeroUnavailable,
      net: Strings.transactionsHeroUnavailable,
      leftOfIncome: Strings.transactionsHeroUnavailable,
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel: Strings.totalsNoIncome,
      shareCaption: null,
    };
  }

  const hasIncome = current.incomeEgp > 0;
  const share = hasIncome ? Math.round((current.expenseEgp / current.incomeEgp) * 100) : null;
  const left = hasIncome
    ? Math.round(((current.incomeEgp - current.expenseEgp) / current.incomeEgp) * 100)
    : null;

  return {
    ...base,
    out: formatHeroAmount(current.expenseEgp),
    in: formatHeroAmount(current.incomeEgp),
    net: formatHeroAmount(current.netEgp),
    leftOfIncome:
      left === null
        ? Strings.transactionsHeroUnavailable
        : signAmountText(`${Math.abs(left)}%`, left < 0 ? MINUS_SIGN : ''),
    railPct: share === null ? 0 : Math.max(0, Math.min(100, share)),
    railDanger: share !== null && share > 100,
    railAccessibilityLabel:
      share === null ? Strings.totalsNoIncome : Strings.totalsExpenseShareA11y(share),
    shareCaption: share === null ? null : Strings.transactionsHeroShareSpent(share),
  };
}
