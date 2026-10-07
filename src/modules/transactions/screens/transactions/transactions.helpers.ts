import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type {
  PeriodTotals,
  TransactionDayAggregate,
} from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import {
  MINUS_SIGN,
  PLUS_SIGN,
  formatAmount,
  formatDisplayAmount,
  formatDisplayAmountParts,
  formatDisplayMagnitude,
  formatOwnedAmount,
  formatOwnedAmountParts,
  signAmountText,
} from '@/utils/format_amount';
import type { TransactionDateGroup } from '@/utils/group_transactions_by_date';
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

// Frame A1 and the money-colour ADR's decision 5: In in success, Net by sign and neutral at 0; both neutral on a dash.
export const FLOW_CLASS: Record<PolaritySignal, string> = {
  good: 'text-success',
  bad: 'text-danger',
  neutral: 'text-foreground',
};
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
  /** Out joined to its code, or the dash beside the code while the figures are unavailable. */
  outAccessibilityLabel: string;
  /** The currency code the three figures and Out print in. */
  currencyCode: string;
  in: string;
  inPolarity: PolaritySignal;
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
  return formatOwnedAmountParts(value, HERO_CURRENCY).value;
}

function formatSignedNet(netEgp: number): {
  text: string;
  withCode: string;
  polarity: PolaritySignal;
} {
  const { text, withCode, printsAsZero } = formatDisplayAmountParts(netEgp, HERO_CURRENCY);
  if (printsAsZero) return { text, withCode, polarity: 'neutral' };
  const sign = netEgp > 0 ? PLUS_SIGN : MINUS_SIGN;
  return {
    text: signAmountText(text, sign),
    withCode: signAmountText(withCode, sign),
    polarity: netEgp > 0 ? 'good' : 'bad',
  };
}

function heroNet(netEgp: number): Pick<TransactionsHeroModel, 'net' | 'netPolarity'> {
  const { text, polarity } = formatSignedNet(netEgp);
  return { net: text, netPolarity: polarity };
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

export function fullMonthName(yearMonth: string): string {
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
      outAccessibilityLabel: Strings.transactionsHeroOutUnavailableA11y(base.currencyCode),
      in: Strings.transactionsHeroUnavailable,
      inPolarity: 'neutral',
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
    outAccessibilityLabel: formatOwnedAmount(current.expenseEgp, HERO_CURRENCY),
    in: formatHeroAmount(current.incomeEgp),
    inPolarity: 'good',
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

export type SearchTallyMode = 'empty' | 'skeleton' | 'failed' | 'figures';

export interface SearchTallyInput {
  isOn: boolean;
  figuresMode: TransactionsHeroMode;
  matchCount: number | undefined;
  matchNetEgp: number | undefined;
  yearMonth: string;
  filterSummary: string | undefined;
}

export interface SearchTallyModel {
  mode: SearchTallyMode;
  count: string | undefined;
  label: string;
  filterSummary: string | undefined;
  sum: { text: string; polarity: PolaritySignal; currencyCode: string } | undefined;
  accessibilityLabel: string | undefined;
}

/** `holdsActiveQuery`: the held figures were loaded for the query on screen; another query's never print. */
export function resolveSearchTallyFiguresMode(
  heroMode: TransactionsHeroMode,
  status: TransactionTotalsStatus,
  holdsActiveQuery: boolean,
): TransactionsHeroMode {
  if (heroMode !== 'figures' || holdsActiveQuery) return heroMode;
  switch (status) {
    case 'refreshErrorWithData':
    case 'firstLoadError':
      return 'dashes';
    case 'idle':
    case 'initialLoading':
    case 'ready':
    case 'refreshing':
      return 'skeleton';
    default: {
      const unhandled: never = status;
      return unhandled;
    }
  }
}

const NO_TALLY_TEXT = {
  count: undefined,
  label: '',
  filterSummary: undefined,
  sum: undefined,
  accessibilityLabel: undefined,
} as const;

function withAccessibilityLabel(
  model: Omit<SearchTallyModel, 'accessibilityLabel'>,
  spokenSum: string | undefined,
): SearchTallyModel {
  const parts = [model.count, model.label, model.filterSummary, spokenSum];
  return {
    ...model,
    accessibilityLabel: parts.filter((part): part is string => part !== undefined).join(' '),
  };
}

export function buildSearchTally(input: SearchTallyInput): SearchTallyModel {
  if (!input.isOn) return { mode: 'empty', ...NO_TALLY_TEXT };
  if (input.figuresMode === 'skeleton') return { mode: 'skeleton', ...NO_TALLY_TEXT };

  const month = fullMonthName(input.yearMonth);
  const { matchCount, matchNetEgp, filterSummary } = input;

  if (input.figuresMode === 'dashes' || matchCount === undefined || matchNetEgp === undefined) {
    return withAccessibilityLabel(
      {
        mode: 'failed',
        count: Strings.transactionsHeroUnavailable,
        label: Strings.transactionsTallyResults(month),
        filterSummary,
        sum: undefined,
      },
      undefined,
    );
  }
  if (matchCount === 0) {
    return withAccessibilityLabel(
      {
        mode: 'figures',
        count: undefined,
        label: Strings.transactionsTallyNoResults(month),
        filterSummary,
        sum: undefined,
      },
      undefined,
    );
  }

  const net = formatSignedNet(matchNetEgp);
  return withAccessibilityLabel(
    {
      mode: 'figures',
      count: formatAmount(matchCount),
      label:
        matchCount === 1
          ? Strings.transactionsTallyOneResult(month)
          : Strings.transactionsTallyResults(month),
      filterSummary,
      sum: {
        text: net.text,
        polarity: net.polarity,
        currencyCode: CURRENCY_CONFIG[HERO_CURRENCY].code,
      },
    },
    net.withCode,
  );
}

export type DayHeaderFigures =
  | { mode: 'skeleton' }
  | { mode: 'failed'; net: string }
  | { mode: 'figures'; net: string; count: string };

export interface TransactionDaySection {
  key: string;
  label: string;
  figures: DayHeaderFigures;
  accessibilityLabel: string;
  data: Transaction[];
}

export type DayHeaderSpoken =
  | { mode: 'skeleton' }
  | { mode: 'failed' }
  | { mode: 'figures'; netEgp: number; count: number };

const SPOKEN_SIGN: Record<PolaritySignal, string | undefined> = {
  good: Strings.spokenPlus,
  bad: Strings.spokenMinus,
  neutral: undefined,
};

function spokenDayNet(netEgp: number): string {
  const amount = formatDisplayAmount(netEgp, HERO_CURRENCY);
  const sign = SPOKEN_SIGN[formatSignedNet(netEgp).polarity];
  return sign === undefined ? amount : `${sign} ${amount}`;
}

export function composeDayHeaderAccessibilityLabel(label: string, spoken: DayHeaderSpoken): string {
  switch (spoken.mode) {
    case 'skeleton':
      return Strings.transactionsDayLoadingA11y(label);
    case 'failed':
      return Strings.transactionsDayFailedA11y(label);
    case 'figures': {
      const net = spokenDayNet(spoken.netEgp);
      return spoken.count === 1
        ? Strings.transactionsDayOneTransactionA11y(label, net)
        : Strings.transactionsDayFiguresA11y(label, net, formatAmount(spoken.count));
    }
    default: {
      const unhandled: never = spoken;
      return unhandled;
    }
  }
}

export interface DaySectionsInput {
  groups: readonly TransactionDateGroup[];
  days: readonly TransactionDayAggregate[] | undefined;
  figuresMode: TransactionsHeroMode;
  totalsStatus: TransactionTotalsStatus;
}

// A day the held aggregate lacks never reads 0 EGP (rulings 1 and 2, 2026-09-28).
function missingDaySpoken(status: TransactionTotalsStatus): DayHeaderSpoken {
  return resolveSearchTallyFiguresMode('figures', status, false) === 'dashes'
    ? { mode: 'failed' }
    : { mode: 'skeleton' };
}

function dayFigures(spoken: DayHeaderSpoken): DayHeaderFigures {
  switch (spoken.mode) {
    case 'skeleton':
      return { mode: 'skeleton' };
    case 'failed':
      return { mode: 'failed', net: Strings.transactionsHeroUnavailable };
    case 'figures':
      return {
        mode: 'figures',
        net: formatSignedNet(spoken.netEgp).withCode,
        count: formatAmount(spoken.count),
      };
    default: {
      const unhandled: never = spoken;
      return unhandled;
    }
  }
}

function resolveDaySpoken(
  day: TransactionDayAggregate | undefined,
  input: DaySectionsInput,
): DayHeaderSpoken {
  if (input.figuresMode === 'skeleton') return { mode: 'skeleton' };
  if (input.figuresMode === 'dashes') return { mode: 'failed' };
  if (day === undefined) return missingDaySpoken(input.totalsStatus);
  return { mode: 'figures', netEgp: day.netEgp, count: day.count };
}

/** The day net and count come from the month aggregate only, never from the loaded rows. */
export function buildDaySections(input: DaySectionsInput): TransactionDaySection[] {
  const daysByDate = new Map((input.days ?? []).map((day) => [day.date, day]));
  return input.groups.map((group) => {
    const spoken = resolveDaySpoken(daysByDate.get(group.key), input);
    return {
      key: group.key,
      label: group.label,
      figures: dayFigures(spoken),
      accessibilityLabel: composeDayHeaderAccessibilityLabel(group.label, spoken),
      data: group.data,
    };
  });
}
