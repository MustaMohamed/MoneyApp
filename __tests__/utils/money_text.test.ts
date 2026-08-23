import { formatStoredAllocationText, isTypeableMoneyText } from '@/utils/money_text';

describe('isTypeableMoneyText', () => {
  it.each([[''], ['0'], ['1.'], ['.5'], ['.'], ['0.005'], ['1234.56'], ['0.0000001']])(
    'accepts %p',
    (text) => {
      expect(isTypeableMoneyText(text)).toBe(true);
    },
  );

  // '1,500' is the 1000x case the mask exists for: parseDecimalText accepts
  // grouped thousands, so without the mask a typed comma turns 1.500 into
  // 1500. The mask is the only thing that refuses it at the field.
  it.each([
    [','],
    ['1,'],
    ['1,50'],
    ['1,500'],
    ['1,234.56'],
    ['1.2.3'],
    ['abc'],
    ['1e-7'],
    [' 12 '],
    ['-5'],
  ])('refuses %p', (text) => {
    expect(isTypeableMoneyText(text)).toBe(false);
  });
});

// @layla Q7: the prefill renders what is stored, digit for digit. Two rows are
// red against the two implementations someone would otherwise reach for --
// `0.005` against `formatAmount(x, 2)` (which yields '0.01' and manufactures a
// value nobody entered) and `1e-7` against a bare `String(x)` (which yields
// '1e-7', a string DECIMAL_PATTERN rejects outright).
describe('formatStoredAllocationText', () => {
  it.each([
    [1.5, '1.5'],
    [0.01, '0.01'],
    [0, '0'],
    [0.005, '0.005'],
    [1e-7, '0.0000001'],
    [1234.56, '1234.56'],
    // The positive-exponent half. `String(1e21)` is '1e+21', which the mask
    // refuses, and 1e21 is reachable by typing 22 digits -- so an expander
    // written for negative exponents only passes every row of @layla's table
    // and still ships a field that cannot re-render its own stored value.
    [1e21, '1000000000000000000000'],
    [0.30000000000000004, '0.30000000000000004'],
  ])('renders %p as %p', (value, expected) => {
    expect(formatStoredAllocationText(value)).toBe(expected);
  });

  it.each([[null], [undefined]])('renders %p as the empty string, never "0"', (value) => {
    expect(formatStoredAllocationText(value)).toBe('');
  });
});

// The prefill domain, stated once (spec §5.5): `null`, plus every finite double
// >= 0. `±Infinity`, `NaN` and negatives are out of domain and must not appear
// here -- `String(Infinity)` is 'Infinity', which the mask is *right* to refuse,
// so generating it would red invariant 2 on a value no prefill can carry.
// migrations/014_create_spending_plans.ts:18's
// CHECK(allocated_amount IS NULL OR allocated_amount >= 0) excludes negatives;
// parse_decimal.ts:17's Number.isFinite guard and budget.schema.ts's z.number()
// exclude non-finite values on the write path.
const PREFILL_DOMAIN_CORE = [0, 0.005, 0.01, 1.5, 10, 1234.56, 1e-7, 0.30000000000000004];
const PREFILL_DOMAIN_EDGES = [0, Number.MIN_VALUE, 1e21, 1e300, Number.MAX_VALUE];

/** Deterministic sample, fixed seed, so a failure reproduces exactly. */
function sampleFiniteNonNegativeDoubles(count: number): number[] {
  let seed = 0x9e3779b9;
  const next = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const values: number[] = [];
  while (values.length < count) {
    // Mantissa in [0, 1) scaled across the whole finite exponent range, so the
    // sample spans denormals, everyday money values and the top of the range.
    const value = next() * 10 ** Math.round(next() * 620 - 310);
    if (Number.isFinite(value) && value >= 0) values.push(value);
  }
  return values;
}

const PREFILL_SAMPLE = sampleFiniteNonNegativeDoubles(2000);
const PREFILL_DOMAIN = [...PREFILL_DOMAIN_CORE, ...PREFILL_DOMAIN_EDGES, ...PREFILL_SAMPLE];

describe('formatStoredAllocationText invariants over the prefill domain', () => {
  it('round-trips every finite non-negative double through Number()', () => {
    for (const value of PREFILL_DOMAIN) {
      expect(Number(formatStoredAllocationText(value))).toBe(value);
    }
  });

  // Row 25. The mask runs on onChangeText, never on a programmatic prefill, so
  // a prefill the mask would refuse makes the field backspace-uneditable: the
  // keystroke is a silent no-op and nothing appears on screen.
  it('always produces text the keystroke mask accepts, null included', () => {
    expect(isTypeableMoneyText(formatStoredAllocationText(null))).toBe(true);
    for (const value of PREFILL_DOMAIN) {
      expect(isTypeableMoneyText(formatStoredAllocationText(value))).toBe(true);
    }
  });

  // Row 25b -- the backspace chain. "The field goes dead" means exactly one
  // refused intermediate prefix, so the property has to be over every prefix,
  // not over the one chain a walk would type.
  //
  // What this actually pins is a property of the MASK, not of the formatter:
  // the language `/^\d*\.?\d*$/` accepts is closed under prefix, so every
  // prefix of an accepted string is accepted (checked exhaustively over all
  // 1024 mask-accepted strings up to length 7 over `{0, 9, .}`, and it follows
  // from the shape of the language). Prefix-closure is what makes the invariant
  // above sufficient for backspacing, which is why this test cannot fail at any
  // sample size -- it is implied by `always produces text the keystroke mask
  // accepts`. It is kept because prefix-closure is a real thing to pin: a mask
  // that grew a length bound, a leading-zero rule, or a "must not end in `.`"
  // clause would break it while leaving the invariant above green.
  it('accepts every prefix of a prefilled value, so backspacing never goes dead', () => {
    // Over the core table and the named edges in full, plus a slice of the
    // sample: `Number.MIN_VALUE` expands to 325 characters, so the prefix walk
    // is quadratic in the formatted length and the whole 2000-value sample
    // costs seconds for coverage the two invariants above already carry.
    for (const value of [
      ...PREFILL_DOMAIN_CORE,
      ...PREFILL_DOMAIN_EDGES,
      ...PREFILL_SAMPLE.slice(0, 200),
    ]) {
      const text = formatStoredAllocationText(value);
      for (let end = 0; end <= text.length; end += 1) {
        expect(isTypeableMoneyText(text.slice(0, end))).toBe(true);
      }
    }
  });
});
