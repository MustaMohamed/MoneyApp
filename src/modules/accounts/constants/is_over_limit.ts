/** The over-limit state the detail hero, the dashboard card and the accounts list row all render. */
export function isOverLimit(balance: number, limit: number | null): boolean {
  return limit !== null && limit > 0 && balance > limit;
}
