import type { Currency } from '@/constants/enums';
import { convertCurrency } from '@/modules/accounts/domain/account_aggregation';
import { roundMoney } from '@/utils/money';

/** Clamped at 0: a card over its limit has no credit left, never a negative amount. */
export function availableCredit(balance: number, limit: number): number {
  return Math.max(0, limit - balance);
}

/** The divisor floors at one day, so it is never 0. */
export function dailyAverage(monthOut: number, daysElapsed: number): number {
  return monthOut / Math.max(1, daysElapsed);
}

export function netFlow(inflow: number, outflow: number): number {
  return inflow - outflow;
}

/** Clamped at 0 when the month's net flow exceeds the balance. */
export function savingsMonthStart(balance: number, monthIn: number, monthOut: number): number {
  return Math.max(0, balance - netFlow(monthIn, monthOut));
}

/** The one `roundMoney` on this path; the caller gates the rate with `isRateUsable`. */
export function baseEquivalent(input: {
  amount: number;
  from: Currency;
  to: Currency;
  rate: number;
}): number {
  return roundMoney(convertCurrency(input));
}
