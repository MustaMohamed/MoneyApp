/**
 * Round a monetary value to 2 decimal places using banker's rounding
 * (round-half-even). At exactly .5 of a cent, the result is the nearest
 * even cent: 0.005 → 0.00, 0.015 → 0.02, 0.025 → 0.02, 0.035 → 0.04.
 *
 * Apply this to every persisted monetary field (egp_amount, to_amount)
 * and to the live EGP preview to keep net-worth aggregations free of
 * floating-point drift.
 */
export function roundMoney(n: number): number {
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
