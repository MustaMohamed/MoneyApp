import { exceedsToCent } from '@/utils/money';

export function isOverLimit(balance: number, limit: number | null): boolean {
  return limit !== null && limit > 0 && exceedsToCent(balance, limit);
}
