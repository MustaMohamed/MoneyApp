/**
 * The single input floor for money text and number fields: any parsed or
 * typed amount strictly between 0 and this value is rejected at the field,
 * on its raw (unrounded) value — never silently rounded up or clamped.
 * Same for EGP and USD; storage is 2dp for both regardless of what
 * `CURRENCY_CONFIG` says about display precision.
 */
export const MIN_MONEY_AMOUNT = 0.01;

/**
 * Round a monetary value to 2 decimal places using banker's rounding
 * (round-half-even). At exactly .5 of a cent, the result is the nearest
 * even cent: 0.005 → 0.00, 0.015 → 0.02, 0.025 → 0.02, 0.035 → 0.04.
 *
 * Apply this to every persisted monetary field (egp_amount, to_amount)
 * and to the live EGP preview to keep net-worth aggregations free of
 * floating-point drift.
 *
 * `null` passes through unchanged — the "unallocated" guard for nullable
 * money columns (e.g. `spending_plan_categories.allocated_amount`), so a
 * caller never has to special-case `null` before rounding. `undefined` is
 * deliberately not part of this contract; `?? null` at the write boundary
 * is what callers use instead.
 */
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
    // Round to even: keep truncated if even, else go up one.
    const rounded = truncated % 2 === 0 ? truncated : truncated + 1;
    return (sign * rounded) / 100;
  }

  return (sign * Math.round(scaled)) / 100;
}

/**
 * The result of comparing a set of allocations against a plan total. Both the
 * live helper line and the save gate derive from this one shape, so they
 * cannot disagree.
 */
export interface AllocationTotals {
  /** Whole currency units, 2dp-exact — never cents. */
  allocated: number;
  /** `total - allocated`; `undefined` when no total has been entered. */
  buffer: number | undefined;
  isOver: boolean;
}

/**
 * A monetary value as an integer number of cents, rounded the way the write
 * path rounds. `Math.round(x * 100)` on its own disagrees with the persisted
 * value at every exact half-cent (0.005 → 0 vs 1, 0.025 → 2 vs 3), so the
 * banker's rounding runs first and this is idempotent on an already-rounded
 * value — which is what lets a raw input and a pre-rounded one reach the
 * same verdict.
 */
export function toCents(n: number): number {
  return Math.round(roundMoney(n) * 100);
}

/**
 * Compare allocations against a plan total on an integer-cents basis.
 * `null` and `undefined` allocations contribute 0. Summing the rounded
 * cents — never rounding a float sum — is what makes the result independent
 * of allocation order.
 *
 * `total === undefined` means "no total entered yet", a real state rather
 * than zero: the buffer is `undefined` and nothing can be over.
 */
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
