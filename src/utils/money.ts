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

/** Half a cent is where a figure stops printing as zero; `roundMoney(n) === 0` would also zero 0.005. */
export function snapToZero(n: number): number {
  return Math.abs(n) < 0.005 ? 0 : n;
}

/** Over is decided in integer cents, as `sumAllocations` decides it on the write path. */
export function exceedsToCent(amount: number, limit: number): boolean {
  return toCents(amount) > toCents(limit);
}

/** The raw quotient, except a part that ties its whole to the cent reads exactly 1, never above. */
export function ratioHeldAtTie(part: number, whole: number): number {
  if (whole === 0) return 0;
  const ratio = part / whole;
  return ratio > 1 && !exceedsToCent(part, whole) ? 1 : ratio;
}

/** Two exact integers (cents, counts, days): the size rounds half up, the sign is kept, and a zero denominator or size reads positive 0. */
export function wholePercentOf(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  const divisor = Math.abs(denominator);
  const size = Math.floor((2 * Math.abs(numerator) * 100 + divisor) / (2 * divisor));
  return size === 0 ? 0 : Math.sign(numerator) * Math.sign(denominator) * size;
}

/** The whole percent of two money amounts, each rounded to cents before the one division. */
export function wholePercent(part: number, whole: number): number {
  return wholePercentOf(toCents(part), toCents(whole));
}

/** Whole points between a money share and a share of whole counts, rounded once from one integer fraction. */
export function wholePercentGap(
  part: number,
  whole: number,
  elapsed: number,
  span: number,
): number {
  const partCents = toCents(part);
  const wholeCents = toCents(whole);
  if (wholeCents === 0) return wholePercentOf(-elapsed, span);
  return wholePercentOf(partCents * span - elapsed * wholeCents, wholeCents * span);
}

/** The sign of a money share against a whole percent, in integer cents; a whole of 0 cents or less reads below. */
export function compareToPercent(part: number, whole: number, percent: number): number {
  const wholeCents = toCents(whole);
  if (wholeCents <= 0) return -1;
  return Math.sign(toCents(part) * 100 - wholeCents * percent);
}

/** The sign of the gap `wholePercentGap` rounds against whole points, in integers; nothing to divide by reads below. */
export function compareGapToPoints(
  part: number,
  whole: number,
  elapsed: number,
  span: number,
  points: number,
): number {
  const wholeCents = toCents(whole);
  if (wholeCents <= 0 || span <= 0) return -1;
  return Math.sign(
    (toCents(part) * span - elapsed * wholeCents) * 100 - wholeCents * span * points,
  );
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
