import {
  isRateImplausible,
  RATE_PLAUSIBLE_MAX,
  RATE_PLAUSIBLE_MIN,
  RatePlausibilityError,
} from '@/modules/currency/domain/rate_plausibility';

interface BandRow {
  case: string;
  rate: number;
  implausible: boolean;
}

// Scenario 18. The band is INCLUSIVE at both ends, so each endpoint is paired
// with the value just outside it: those two rows are what flip if `<` ever
// becomes `<=`, which is the only silent way this predicate can change meaning.
const BAND_ROWS: readonly BandRow[] = [
  { case: 'four orders of magnitude below the band', rate: 0.0001, implausible: true },
  { case: 'the sub-cent rate #327 still parses and saves', rate: 0.005, implausible: true },
  { case: 'immediately below the lower endpoint', rate: 0.999999, implausible: true },
  { case: 'the lower endpoint itself', rate: 1, implausible: false },
  { case: 'a plausible off-peg rate', rate: 15.7, implausible: false },
  { case: "the currency store's placeholder", rate: 50, implausible: false },
  { case: 'the upper endpoint itself', rate: 1000, implausible: false },
  { case: 'immediately above the upper endpoint', rate: 1000.01, implausible: true },
];

describe('isRateImplausible', () => {
  it('pins the band at [1, 1000]', () => {
    expect(RATE_PLAUSIBLE_MIN).toBe(1);
    expect(RATE_PLAUSIBLE_MAX).toBe(1000);
  });

  it.each(BAND_ROWS)('$case ($rate) → $implausible', ({ rate, implausible }) => {
    expect(isRateImplausible(rate)).toBe(implausible);
  });

  // Scenario 19. Asserted on the thrown TYPE, never on a `false` return: a
  // predicate that answers "plausible" for `NaN` reports nothing wrong about a
  // value that is wrong in a way this function cannot describe.
  it.each([
    { case: 'NaN', rate: NaN },
    { case: 'zero', rate: 0 },
    { case: 'a negative rate', rate: -5 },
    { case: 'Infinity', rate: Infinity },
  ])('throws on $case', ({ rate }) => {
    expect(() => isRateImplausible(rate)).toThrow(RatePlausibilityError);
  });
});
