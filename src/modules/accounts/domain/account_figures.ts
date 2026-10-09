import type { Currency } from '@/constants/enums';
import { convertCurrency } from '@/modules/accounts/domain/account_aggregation';
import { roundMoney, snapToZero } from '@/utils/money';

/** Clamped at 0: a card over its limit has no credit left, never a negative amount. */
export function availableCredit(balance: number, limit: number): number {
  return Math.max(0, limit - balance);
}

/** The used share of a card's limit in [0, 1]; 0 with no limit, and positive 0 for a balance below zero. */
export function creditUtilization(balance: number, limit: number): number {
  if (limit <= 0 || balance <= 0) return 0;
  return Math.min(1, balance / limit);
}

export function dailyAverage(monthOut: number, daysElapsed: number): number {
  return monthOut / Math.max(1, daysElapsed);
}

export function hasFlow(amount: number): boolean {
  return snapToZero(amount) > 0;
}

export function netFlow(inflow: number, outflow: number): number {
  return snapToZero(inflow - outflow);
}

export function savingsMonthStart(balance: number, monthIn: number, monthOut: number): number {
  return Math.max(0, balance - netFlow(monthIn, monthOut));
}

/** Rounds once and validates no rate; a non-positive rate is the caller's to keep out. */
export function baseEquivalent(input: {
  amount: number;
  from: Currency;
  to: Currency;
  rate: number;
}): number {
  return roundMoney(convertCurrency(input));
}
