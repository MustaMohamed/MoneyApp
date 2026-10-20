import { toCents, wholePercentOf } from '@/utils/money';

export function expenseSharePercent(expenseEgp: number, incomeEgp: number): number | null {
  const incomeCents = toCents(incomeEgp);
  if (incomeCents <= 0) return null;
  return wholePercentOf(toCents(expenseEgp), incomeCents);
}
