import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatAmount,
  formatDisplayMagnitude,
  signAmountText,
} from '@/utils/format_amount';
import { toCents } from '@/utils/money';
import {
  MONTHS_SHORT,
  currentYearMonth,
  monthNumberFromYearMonth,
  shiftYearMonth,
} from '@/utils/year_month';

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

// Integer cents, multiplied before dividing, so a percentage on a half rounds up (ruling 2026-09-26).
function centsPct(numeratorCents: number, denominatorCents: number): number {
  return Math.round((numeratorCents * 100) / denominatorCents);
}

export function computeDeltaPct(current: number, previous: number): number | null {
  const previousCents = toCents(previous);
  if (previousCents === 0) return null;
  return centsPct(toCents(current) - previousCents, Math.abs(previousCents));
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
    current.incomeEgp > 0
      ? centsPct(toCents(current.expenseEgp), toCents(current.incomeEgp))
      : null;
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
  /** The currency code the three figures and Out print in. */
  currencyCode: string;
  in: string;
  net: string;
  netPolarity: PolaritySignal;
  leftOfIncome: string;
  railPct: number;
  railDanger: boolean;
  railAccessibilityLabel: string;
  shareCaption: string | undefined;
  caption: string;
  lastMonthChange: TransactionsHeroChange | undefined;
}

export interface TransactionsHeroChange {
  direction: DeltaDirection;
  polarity: PolaritySignal;
  label: string;
  accessibilityLabel: string;
}

export function totalsScopeKey(yearMonth: string, accountIds: readonly string[] = []): string {
  return `${yearMonth}|${JSON.stringify([...accountIds].sort())}`;
}

/** `reloadingFailedScope`: the month and account scope on screen are the ones whose first load failed. */
export function resolveTransactionsHeroMode(
  status: TransactionTotalsStatus,
  hasTotals: boolean,
  reloadingFailedScope: boolean,
): TransactionsHeroMode {
  if (hasTotals) return 'figures';
  switch (status) {
    case 'firstLoadError':
      return 'dashes';
    case 'initialLoading':
      return reloadingFailedScope ? 'dashes' : 'skeleton';
    case 'idle':
    case 'ready':
    case 'refreshing':
    case 'refreshErrorWithData':
      return 'skeleton';
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

// The aggregate sums `egp_amount`, so every hero figure is EGP.
const HERO_CURRENCY = Currency.EGP;

function formatHeroAmount(value: number): string {
  const { text, printsAsZero } = formatDisplayMagnitude(value, HERO_CURRENCY);
  return signAmountText(text, value < 0 ? MINUS_SIGN : '', printsAsZero);
}

function heroNet(netEgp: number): Pick<TransactionsHeroModel, 'net' | 'netPolarity'> {
  const { text, printsAsZero } = formatDisplayMagnitude(netEgp, HERO_CURRENCY);
  if (printsAsZero) return { net: text, netPolarity: 'neutral' };
  return netEgp > 0
    ? { net: signAmountText(text, PLUS_SIGN), netPolarity: 'good' }
    : { net: signAmountText(text, MINUS_SIGN), netPolarity: 'bad' };
}

function lastMonthOutCaption(yearMonth: string, previous: PeriodTotals | null): string {
  const lastMonth = shiftYearMonth(yearMonth, -1);
  const amount =
    previous === null || (previous.incomeEgp === 0 && previous.expenseEgp === 0)
      ? Strings.transactionsHeroUnavailable
      : formatHeroAmount(previous.expenseEgp);
  return Strings.transactionsHeroLastMonthOut(
    MONTHS_SHORT[monthNumberFromYearMonth(lastMonth) - 1],
    amount,
  );
}

function heroShareCaption({ state, rawExpenseSharePct }: TotalsPresentation): string | undefined {
  switch (state) {
    case 'netCredit':
      return Strings.totalsNetCredit;
    case 'noIncome':
      return undefined;
    case 'withinIncome':
    case 'overIncome':
      return rawExpenseSharePct === null
        ? undefined
        : Strings.transactionsHeroShareSpent(rawExpenseSharePct);
    default: {
      const unhandled: never = state;
      return unhandled;
    }
  }
}

const CHANGE_SENTENCE: Record<DeltaDirection, (pct: string, month: string) => string> = {
  up: Strings.transactionsHeroSpentMore,
  down: Strings.transactionsHeroSpentLess,
  flat: (_pct, month) => Strings.transactionsHeroSpentSame(month),
};

function fullMonthName(yearMonth: string): string {
  return new Date(`${yearMonth}-01T12:00:00`).toLocaleDateString('en-US', { month: 'long' });
}

function resolveLastMonthChange(
  expenseEgp: number,
  previous: PeriodTotals | null,
  yearMonth: string,
): TransactionsHeroChange | undefined {
  const deltaPct = previous === null ? null : computeDeltaPct(expenseEgp, previous.expenseEgp);
  const delta = deltaDisplay('expense', deltaPct);
  if (deltaPct === null || delta === null) return undefined;
  const month = fullMonthName(shiftYearMonth(yearMonth, -1));
  const pct = formatAmount(Math.abs(deltaPct));
  return {
    direction: delta.direction,
    polarity: delta.polarity,
    label: `${pct}%`,
    accessibilityLabel: CHANGE_SENTENCE[delta.direction](pct, month),
  };
}

function daysLeftInMonth(yearMonth: string, today: string): number | undefined {
  if (today.slice(0, 7) !== yearMonth) return undefined;
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
    daysLeft === undefined
      ? lastMonth
      : `${Strings.transactionsHeroDaysLeft(daysLeft)} · ${lastMonth}`;
  const base = {
    mode: input.mode,
    title,
    monthLabel: fullMonthName(input.yearMonth),
    currencyCode: CURRENCY_CONFIG[HERO_CURRENCY].code,
    caption,
  };
  const current = input.mode === 'figures' ? input.current : null;

  if (current === null) {
    return {
      ...base,
      out: Strings.transactionsHeroUnavailable,
      in: Strings.transactionsHeroUnavailable,
      net: Strings.transactionsHeroUnavailable,
      netPolarity: 'neutral',
      leftOfIncome: Strings.transactionsHeroUnavailable,
      railPct: 0,
      railDanger: false,
      railAccessibilityLabel:
        input.mode === 'dashes' ? Strings.transactionsTotalsLoadError : Strings.totalsNoIncome,
      shareCaption: undefined,
      lastMonthChange: undefined,
    };
  }

  const share = buildTotalsPresentation(current);
  const incomeCents = toCents(current.incomeEgp);
  const left =
    current.incomeEgp > 0
      ? centsPct(incomeCents - toCents(current.expenseEgp), incomeCents)
      : undefined;

  return {
    ...base,
    out: formatHeroAmount(current.expenseEgp),
    in: formatHeroAmount(current.incomeEgp),
    ...heroNet(current.netEgp),
    leftOfIncome:
      left === undefined
        ? Strings.transactionsHeroUnavailable
        : signAmountText(`${Math.abs(left)}%`, left < 0 ? MINUS_SIGN : ''),
    railPct: share.railPct,
    railDanger: share.hasOverflow,
    railAccessibilityLabel: share.accessibilityLabel,
    shareCaption: heroShareCaption(share),
    lastMonthChange: resolveLastMonthChange(current.expenseEgp, input.previous, input.yearMonth),
  };
}
