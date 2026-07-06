import type { PeriodTotals } from '@/modules/transactions/database/transactions';
import { currentYearMonth, shiftYearMonth } from '@/utils/year_month';

export { currentYearMonth };

export type TransactionPeriod = { type: 'month'; yearMonth: string };

export type TotalsMetric = 'income' | 'expense' | 'net';

export type PolaritySignal = 'good' | 'bad' | 'neutral';
export type DeltaDirection = 'up' | 'down' | 'flat';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

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
  const formatted = numberFmt.format(Math.abs(value));
  if (metric === 'expense') return `-${formatted}`;
  return `${value >= 0 ? '+' : '-'}${formatted}`;
}

export function expenseSharePct(current: PeriodTotals): number {
  if (current.incomeEgp <= 0) return 0;
  const rawPct = Math.round((current.expenseEgp / current.incomeEgp) * 100);
  return Math.max(0, Math.min(100, rawPct));
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
