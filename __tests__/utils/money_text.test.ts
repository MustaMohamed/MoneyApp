import {
  formatStoredMoneyText,
  isTypeableMoneyText,
  maskFieldText,
  maskMoneyFieldText,
} from '@/utils/money_text';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

describe('isTypeableMoneyText', () => {
  it.each([[''], ['0'], ['1.'], ['.5'], ['.'], ['0.005'], ['1234.56'], ['0.0000001']])(
    'accepts %p',
    (text) => {
      expect(isTypeableMoneyText(text)).toBe(true);
    },
  );

  // '1,500' stays in this table even though the mask no longer asks this
  // predicate about a whole delivery: it is what makes step C refuse a
  // rewritten '1.5.', and it is the string the paste branch exists to keep
  // away from DECIMAL_PATTERN, which reads it as 1500.
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

// @layla's three pin tables (spec §8.3) plus @tariq's table 4, as one list.
// `undefined` is refusal -- write nothing, leave the field on `previous`.
//
// They are one list because the second assertion below needs them to be:
// `maskFieldText('amount', …)` has to equal `maskMoneyFieldText(…)` on every
// row, and asserting that over a shared table is what makes the amount half a
// property rather than a spot check. Splitting the tables into their own
// `describe`s would leave that agreement asserted on whichever rows someone
// remembered to copy.
const CLASSIFIER_ROWS: Array<[string, string, string | undefined]> = [
  // Table 1 -- the typed sequence, step by step. Step 3 delivers '1.5', not
  // '1,5': under a working native resync the buffer was corrected to '1.' at
  // step 2, so that is what the OS sends. Q9's un-resynced literals test a
  // mechanism that is not being built.
  ['', '1', '1'],
  ['1', '1,', '1.'],
  ['1.', '1.5', '1.5'],
  ['1.5', '1.50', '1.50'],
  // Table 2 -- the second separator, and the invariant that survives the
  // premise failing. Neither row may be made to pass by inspecting the glyph:
  // they pass because the rewritten candidate carries two separators and the
  // unchanged single-'.' pattern refuses it.
  ['1.5', '1.5,', undefined],
  ['1.5', '1.5.', undefined],
  // Table 3 -- paste. This is the branch where a misclassification is a silent
  // 1000x: '1,500' routed to the keystroke branch normalises to '1.500', which
  // is 1.5.
  ['', '1,500', undefined],
  ['', '1,234.56', undefined],
  ['', '1234.56', '1234.56'],
  ['', '1,5', undefined],
  ['', '15', '15'],
  // Table 4 -- the shapes the tables above do not reach. Red against any
  // implementation that classifies by appending rather than by diffing.
  ['150', '1,50', '1.50'],
  ['1.50', '1.5', '1.5'],
  ['1.', '1', '1'],
  ['1234', '5', '5'],
  ['1', '1a', undefined],
  ['1', '1', '1'],
];

describe('maskMoneyFieldText', () => {
  it.each(CLASSIFIER_ROWS)('%p + %p', (previous, next, expected) => {
    expect(maskMoneyFieldText(previous, next)).toBe(expected);
  });

  // The mechanism's own bar, as @layla restated it for normalisation: the field
  // ends at the value the user was visibly typing, at the correct magnitude.
  // Not frozen at '1' (what the reverted mask did with these keystrokes), and
  // not 150.
  it('carries the four keystrokes of a comma-decimal user to 1.50', () => {
    let held = '';
    for (const delivered of ['1', '1,', '1.5', '1.50']) {
      const masked = maskMoneyFieldText(held, delivered);
      expect(masked).toBeDefined();
      held = masked ?? held;
    }

    expect(held).toBe('1.50');
    expect(parseNonNegativeDecimal(held)).toBe(1.5);
  });

  // Stated so it is not read as a defect and "fixed" into a leading-digit rule,
  // which would rewrite the accept table above and kill part of the schema's
  // refine split. A separator typed into an empty field is loud and stays loud
  // -- '.5' fails DECIMAL_PATTERN and raises a message -- never silently wrong.
  it('accepts a separator typed into an empty field', () => {
    expect(maskMoneyFieldText('', ',')).toBe('.');
    expect(maskMoneyFieldText('.', '.5')).toBe('.5');
  });

  // The invariant the untouched parser rests on, asserted over every accepted
  // row rather than argued: accepted text never contains a comma, so no
  // comma-bearing string reaches DECIMAL_PATTERN from these four fields.
  it('never accepts text containing a comma', () => {
    for (const [previous, next] of CLASSIFIER_ROWS) {
      expect(maskMoneyFieldText(previous, next) ?? '').not.toContain(',');
    }
  });
});

describe('maskFieldText', () => {
  // Row 26 -- a name field is never masked, whatever the text and whatever the
  // delta shape. Each row kills a different way of getting the order wrong:
  //
  // - 'Alexandria Trip' fails an implementation that masks unconditionally;
  // - '1,500' fails one that classifies first and refuses before consulting the
  //   variant;
  // - '1,' is the third shape and the only one that catches a classifier whose
  //   REWRITE is applied before the variant is consulted -- the other two are
  //   refusals, and a refusal handed back to `next` is indistinguishable from
  //   never having masked. A plan name mid-typed as 'Trip, ' must keep its
  //   comma, not have it turned into a decimal point.
  it.each([
    ['', 'Alexandria Trip'],
    ['1', '1,500'],
    ['1', '1,'],
  ])('returns a name field its text unchanged: %p + %p', (previous, next) => {
    expect(maskFieldText('name', previous, next)).toBe(next);
  });

  // The amount half adds nothing -- no truncation, no second normalisation.
  it.each(CLASSIFIER_ROWS)('defers to the classifier for an amount: %p + %p', (previous, next) => {
    expect(maskFieldText('amount', previous, next)).toBe(maskMoneyFieldText(previous, next));
  });
});

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

  // A stored value the field cannot hold renders as '' rather than as text no
  // keystroke can repair. '-5' is the string that froze the budget limit: the
  // mask refuses it, refuses the '-' one backspace leaves, and refuses every
  // digit appended to either, so the field was editable only by
  // select-all-and-retype. `budgets.limit_amount` is what makes it reachable --
  // a bare REAL NOT NULL with no CHECK (migrations/013:8).
  //
  // Never '5'. Stripping the sign would manufacture a number nobody stored
  // that then clears the floor and saves silently (@layla Q7), which is worse
  // than the freeze it fixes. Red against `expandExponentialNotation(String(x))`
  // returned unguarded: '-5' stays '-5'.
  it.each([
    [-5],
    [-0.01],
    [-1e-7],
    [-1e21],
    [Number.POSITIVE_INFINITY],
    [Number.NEGATIVE_INFINITY],
    [Number.NaN],
  ])('renders %p as the empty string rather than text no keystroke repairs', (value) => {
    expect(formatStoredMoneyText(value)).toBe('');
  });
});

// Two domains, because the two invariants below are two different claims.
//
// FIDELITY -- `Number(format(x)) === x` -- is claimed only where the field can
// carry the value at all, so it keeps spec §5.5's domain: `null`, plus every
// finite double >= 0. It cannot be widened. `Number('')` is 0, so a value the
// formatter declines to render can never round-trip, and making one round-trip
// would mean re-signing it -- the substitution @layla Q7 forbids.
//
// TYPEABILITY -- the prefill is text the keystroke mask accepts -- is claimed
// over everything the formatter's own signature admits, and that widening is
// the fix for how the budget limit froze. This property was quantified over
// finite doubles >= 0, a bound cited to migration 014's
// `CHECK(allocated_amount IS NULL OR allocated_amount >= 0)`. That CHECK
// governs the two spending-plan columns; `budgets.limit_amount` is a bare REAL
// NOT NULL with no CHECK at all (migrations/013:8) and `transactions.egp_amount`
// behind the income suggestion is another (004:9). A property whose domain was
// drawn from three of the four sources could not see the fourth, which is the
// only one that can break it -- so the domain is the function's parameter type
// now, and the formatter carries a postcondition that makes it hold.
//
// `±Infinity` and `NaN` join it for the same structural reason rather than
// because a write path admits them: parse_decimal.ts:17's Number.isFinite guard
// and budget.schema.ts's z.number() still exclude them, but that is again an
// application guard on one path, and the formatter no longer needs the argument.
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

/** Everything `number` admits that no prefill should carry -- and that nothing
 * upstream of `budgets.limit_amount` actually stops. */
const OUT_OF_PREFILL_DOMAIN = [
  -5,
  -0.01,
  -1e-7,
  -1e21,
  -Number.MIN_VALUE,
  -Number.MAX_VALUE,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  Number.NaN,
  ...PREFILL_SAMPLE.slice(0, 200).map((value) => -value),
];
const FORMATTER_DOMAIN = [...PREFILL_DOMAIN, ...OUT_OF_PREFILL_DOMAIN];

describe('formatStoredMoneyText invariants', () => {
  // Fidelity, over the prefill domain only -- see the note above the domains.
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
    for (const value of FORMATTER_DOMAIN) {
      expect(isPositional(formatStoredMoneyText(value))).toBe(true);
    }
  });

  // Row 25, and it returns beside the assertion above rather than replacing it.
  // The positional one is independent of whether a mask exists; this one is the
  // mask's own verdict on the prefill, and what it stops is a future prefill
  // change making a field backspace-uneditable. The mask runs on onChangeText
  // and never on a programmatic write, so a prefill outside its accept set is a
  // field where the keystroke is a silent no-op.
  it('always produces text the keystroke mask accepts, null included', () => {
    expect(isTypeableMoneyText(formatStoredMoneyText(null))).toBe(true);
    for (const value of FORMATTER_DOMAIN) {
      expect(isTypeableMoneyText(formatStoredMoneyText(value))).toBe(true);
    }
  });

  // Row 25b -- the backspace chain. "The field goes dead" means exactly one
  // refused intermediate prefix, so the property has to be over every prefix,
  // not over the one chain a walk would type. 1e-7 formats to nine characters,
  // so that row alone is ten prefixes.
  //
  // What this pins is a property of the MASK, not of the formatter: the
  // language `/^\d*\.?\d*$/` accepts is closed under prefix, so it cannot
  // fail at any sample size -- it is implied by the invariant above. It is kept
  // because prefix-closure is a real thing to pin: a mask that grew a length
  // bound, a leading-zero rule, or a "must not end in `.`" clause would break
  // it while leaving the invariant above green.
  it('accepts every prefix of a prefilled value, so backspacing never goes dead', () => {
    // The core table and the named edges in full, plus a slice of the sample:
    // `Number.MIN_VALUE` expands to 325 characters, so the walk is quadratic in
    // the formatted length and the whole 2000-value sample costs seconds for
    // coverage the two invariants above already carry.
    for (const value of [
      ...PREFILL_DOMAIN_CORE,
      ...PREFILL_DOMAIN_EDGES,
      ...PREFILL_SAMPLE.slice(0, 200),
      ...OUT_OF_PREFILL_DOMAIN,
    ]) {
      const text = formatStoredMoneyText(value);
      for (let end = 0; end <= text.length; end += 1) {
        expect(isTypeableMoneyText(text.slice(0, end))).toBe(true);
      }
    }
  });
});
