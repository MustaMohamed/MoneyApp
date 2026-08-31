/**
 * Is a stored or typed EGP-per-USD rate far enough outside the plausible band
 * to be worth telling the user about?
 *
 * **A warning, never a rejection.** This predicate answers a question and
 * changes nothing: it does not clamp, does not substitute a default, and does
 * not gate persistence. An implausible rate still parses, still saves, and
 * still drives every conversion unmodified — `computeNetWorth` divides by
 * 0.0001 exactly as stored. The refusal shape was ruled out at ADR
 * `2026-08-26-parse-floor-money-only.md:25`, and the three places that would
 * quietly reinstate it are `parseRateText`, `manualRateSchema.refine` and a
 * throw inside `setManualRate`. It belongs in none of them.
 *
 * The band is INCLUSIVE at both ends. One string covers both ends of it at the
 * screen: there is no directional branch here and the app has no live quote, so
 * "too high" or "too low" would claim knowledge it does not have.
 *
 * Lives under `domain/` deliberately, for the same mechanical reason as
 * `starting_net_position.ts:23-25` — `.claude/rules/money.md` globs the
 * `domain/` folders beneath `src/modules/`, so this is the path on which the
 * money rules auto-load. `currency/store/currency.helpers.ts` matches none of
 * them.
 */
export const RATE_PLAUSIBLE_MIN = 1 as const;
export const RATE_PLAUSIBLE_MAX = 1000 as const;

/** Shape mirrors `AccountAggregationError` — thrown type, never message text. */
export class RatePlausibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RatePlausibilityError';
  }
}

/**
 * Throws rather than answering `false` on a non-finite or non-positive rate: a
 * value this function cannot describe is not a value it should call plausible.
 * Unreachable from the screen — `parseRateText` returns `undefined` before a bad
 * number gets here, and the store's `rate` is finite and positive by
 * construction (`parsePersistedRate` guards it, `loadRate` falls back to the
 * placeholder, `setManualRate` and `parseRemoteRate` guard their own writes).
 */
export function isRateImplausible(rate: number): boolean {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RatePlausibilityError(`Rate must be finite and positive: ${rate}`);
  }
  return rate < RATE_PLAUSIBLE_MIN || rate > RATE_PLAUSIBLE_MAX;
}
