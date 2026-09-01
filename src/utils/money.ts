/** Amounts strictly between 0 and this are rejected on the raw value, never rounded up. */
/** Same floor for EGP and USD; storage is 2dp for both, whatever `CURRENCY_CONFIG` displays. */
export const MIN_MONEY_AMOUNT = 0.01;

/** Banker's rounding (half-even) to 2dp; `null` passes through as the unallocated value. */
export function roundMoney(n: number): number;
export function roundMoney(n: null): null;
export function roundMoney(n: number | null): number | null;
export function roundMoney(n: number | null): number | null {
  if (n === null) return null;

  const sign = Math.sign(n);
  const abs = Math.abs(n);
  const scaled = abs * 100;
  const truncated = Math.trunc(scaled);
  const remainder = scaled - truncated;

  // Detect exact-half with a small epsilon tolerance for floating-point noise.
  const isExactHalf = Math.abs(remainder - 0.5) < 1e-9;

  if (isExactHalf) {
    const rounded = truncated % 2 === 0 ? truncated : truncated + 1;
    return (sign * rounded) / 100;
  }

  return (sign * Math.round(scaled)) / 100;
}

export interface AllocationTotals {
  /** Whole currency units, 2dp-exact, never cents. */
  allocated: number;
  /** `total - allocated`; `undefined` when no total has been entered. */
  buffer: number | undefined;
  isOver: boolean;
}

/** Rounds with `roundMoney` first; a bare `Math.round(n * 100)` differs at exact half-cents. */
export function toCents(n: number): number {
  return Math.round(roundMoney(n) * 100);
}

/** Sums integer cents so the result is order-independent; `undefined` total means none entered. */
export function sumAllocations(
  amounts: readonly (number | null | undefined)[],
  total: number | undefined,
): AllocationTotals {
  let allocatedCents = 0;
  for (const amount of amounts) allocatedCents += toCents(amount ?? 0);
  const allocated = allocatedCents / 100;

  if (total === undefined) return { allocated, buffer: undefined, isOver: false };

  const totalCents = toCents(total);
  return {
    allocated,
    buffer: (totalCents - allocatedCents) / 100,
    isOver: allocatedCents > totalCents,
  };
}
