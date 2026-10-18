import { toCents, wholePercentOf } from '@/utils/money';

export function computeDeltaPct(current: number, previous: number): number | null {
  const previousCents = toCents(previous);
  if (previousCents === 0) return null;
  return wholePercentOf(toCents(current) - previousCents, Math.abs(previousCents));
}
