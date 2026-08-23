import { formatStoredMoneyText } from '@/utils/money_text';

// @layla Q7: the prefill renders what is stored, digit for digit. Two rows are
// red against the two implementations someone would otherwise reach for --
// `0.005` against `formatAmount(x, 2)` (which yields '0.01' and manufactures a
// value nobody entered) and `1e-7` against a bare `String(x)` (which yields
// '1e-7', a string DECIMAL_PATTERN rejects outright).
describe('formatStoredMoneyText', () => {
  it.each([
    [1.5, '1.5'],
    [0.01, '0.01'],
    [0, '0'],
    [0.005, '0.005'],
    [1e-7, '0.0000001'],
    [1234.56, '1234.56'],
    // The positive-exponent half. `String(1e21)` is '1e+21', which
    // DECIMAL_PATTERN rejects, and 1e21 is reachable by typing 22 digits -- so
    // an expander written for negative exponents only passes every row of
    // @layla's table and still ships a field that cannot re-render its own
    // stored value.
    [1e21, '1000000000000000000000'],
    [0.30000000000000004, '0.30000000000000004'],
  ])('renders %p as %p', (value, expected) => {
    expect(formatStoredMoneyText(value)).toBe(expected);
  });

  it.each([[null], [undefined]])('renders %p as the empty string, never "0"', (value) => {
    expect(formatStoredMoneyText(value)).toBe('');
  });
});

// The prefill domain, stated once (spec §5.5): `null`, plus every finite double
// >= 0. `±Infinity`, `NaN` and negatives are out of domain and must not appear
// here -- `String(Infinity)` is 'Infinity', which no money validator accepts,
// so generating it would red invariant 2 on a value no prefill can carry.
// parse_decimal.ts:17's Number.isFinite guard and budget.schema.ts's z.number()
// exclude non-finite values on the write path. Negatives are excluded per
// caller, and not uniformly by SQL -- see money_text.ts's note above
// expandExponentialNotation: three of the four prefill sources carry a CHECK
// that forbids them (allocated_amount >= 0, total_amount > 0, expected_income
// > 0), budgets.limit_amount carries no CHECK at all, and there the exclusion
// is parsePositiveDecimal at the form. All four are subsets of the domain
// below, so none of them needs rows of its own here; what a negative would
// break is the FORMATTER's contract, and that is money_text.ts's problem, not
// this sample's.
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

describe('formatStoredMoneyText invariants over the prefill domain', () => {
  it('round-trips every finite non-negative double through Number()', () => {
    for (const value of PREFILL_DOMAIN) {
      expect(Number(formatStoredMoneyText(value))).toBe(value);
    }
  });

  // Row 25, restated on the formatter alone. This pinned the keystroke mask's
  // verdict until the mask was withdrawn; the property it was really carrying
  // is the formatter's, and it survives the predicate that used to express it.
  // What it says is that the prefill is plain positional notation -- no
  // exponent marker and at most one decimal point -- which is the shape
  // `DECIMAL_PATTERN` parses. A prefill outside it opens the field holding text
  // its own validator rejects, on every keyboard there is.
  it('always produces plain positional notation, null included', () => {
    const isPositional = (text: string) => !/e/i.test(text) && text.split('.').length <= 2;
    expect(isPositional(formatStoredMoneyText(null))).toBe(true);
    for (const value of PREFILL_DOMAIN) {
      expect(isPositional(formatStoredMoneyText(value))).toBe(true);
    }
  });
});
