import { toCents } from '@/utils/money';

import { previousYearMonth } from './budget.helpers';

export interface SuggestedAmounts {
  spentLastMonth: number | undefined;
  threeMonthAverage: number | undefined;
}

// Half up to a whole unit in integer cents, per docs/adr/2026-11-21-suggested-amounts-half-up.md.
function halfUpWholeUnits(cents: number, months: number): number | undefined {
  const whole = Math.floor((cents + 50 * months) / (100 * months));
  return whole === 0 ? undefined : whole;
}

export function resolveSuggestedAmounts(
  budgetMonth: string,
  categorySpendByMonth: Readonly<Record<string, number>> | undefined,
): SuggestedAmounts {
  const lastMonth = previousYearMonth(budgetMonth);
  const twoMonthsBack = previousYearMonth(lastMonth);
  const threeMonthsBack = previousYearMonth(twoMonthsBack);
  const centsOf = (yearMonth: string) => toCents(categorySpendByMonth?.[yearMonth] ?? 0);
  const lastMonthCents = centsOf(lastMonth);
  const sumCents = lastMonthCents + centsOf(twoMonthsBack) + centsOf(threeMonthsBack);
  return {
    spentLastMonth: halfUpWholeUnits(lastMonthCents, 1),
    threeMonthAverage: halfUpWholeUnits(sumCents, 3),
  };
}
