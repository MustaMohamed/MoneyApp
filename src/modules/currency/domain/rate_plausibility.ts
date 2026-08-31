/** Warning band, inclusive at both ends: an implausible rate still parses, saves and converts. */
export const RATE_PLAUSIBLE_MIN = 1 as const;
export const RATE_PLAUSIBLE_MAX = 1000 as const;

/** Callers match on the thrown type, never on the message text. */
export class RatePlausibilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RatePlausibilityError';
  }
}

/** Throws on a non-finite or non-positive rate rather than calling it plausible. */
export function isRateImplausible(rate: number): boolean {
  if (!Number.isFinite(rate) || rate <= 0) {
    throw new RatePlausibilityError(`Rate must be finite and positive: ${rate}`);
  }
  return rate < RATE_PLAUSIBLE_MIN || rate > RATE_PLAUSIBLE_MAX;
}
