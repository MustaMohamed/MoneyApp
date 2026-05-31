export type CarouselSelection =
  | { type: 'all' }
  | { type: 'month'; yearMonth: string }
  | { type: 'custom'; from: string; to: string };

export type CarouselPill =
  | { kind: 'all' }
  | { kind: 'month'; yearMonth: string }
  | { kind: 'custom' };

export type TotalsMetric = 'income' | 'expense' | 'net';

export type PolaritySignal = 'good' | 'bad' | 'neutral';

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function currentYearMonth(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
}

function shiftMonth(yearMonth: string, delta: number): string {
  const [y, m] = yearMonth.split('-').map(Number);
  const total = y * 12 + (m - 1) + delta;
  const newY = Math.floor(total / 12);
  const newM = (total % 12) + 1;
  return `${newY}-${pad2(newM)}`;
}

export function computeCarouselPills(now: Date = new Date()): CarouselPill[] {
  const current = currentYearMonth(now);
  const pills: CarouselPill[] = [{ kind: 'all' }];
  for (let i = 5; i >= 0; i--) {
    pills.push({ kind: 'month', yearMonth: shiftMonth(current, -i) });
  }
  pills.push({ kind: 'custom' });
  return pills;
}

export function resolvePeriod(selection: CarouselSelection): {
  from: string | undefined;
  to: string | undefined;
} {
  switch (selection.type) {
    case 'all':
      return { from: undefined, to: undefined };
    case 'custom':
      return { from: selection.from, to: selection.to };
    case 'month': {
      const [y, m] = selection.yearMonth.split('-').map(Number);
      const lastDay = new Date(y, m, 0);
      return {
        from: `${selection.yearMonth}-01`,
        to: `${lastDay.getFullYear()}-${pad2(lastDay.getMonth() + 1)}-${pad2(lastDay.getDate())}`,
      };
    }
  }
}

export function previousPeriod(selection: CarouselSelection): CarouselSelection | null {
  if (selection.type !== 'month') return null;
  return { type: 'month', yearMonth: shiftMonth(selection.yearMonth, -1) };
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
