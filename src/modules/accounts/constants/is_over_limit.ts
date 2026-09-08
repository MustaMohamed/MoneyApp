export function isOverLimit(balance: number, limit: number | null): boolean {
  return limit !== null && limit > 0 && balance > limit;
}
