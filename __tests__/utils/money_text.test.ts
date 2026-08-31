import {
  formatStoredMoneyText,
  isTypeableMoneyText,
  maskFieldText,
  maskMoneyFieldText,
  MoneyTextMappingError,
  parseRequiredMoneyText,
} from '@/utils/money_text';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

describe('isTypeableMoneyText', () => {
  it.each([[''], ['0'], ['1.'], ['.5'], ['.'], ['0.005'], ['1234.56'], ['0.0000001']])(
    'accepts %p',
    (text) => {
      expect(isTypeableMoneyText(text)).toBe(true);
    },
  );

  // `DECIMAL_PATTERN` reads '1,500' as 1500, so the paste branch keeps it away.
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

// `undefined` is refusal: write nothing, leave the field on `previous`.
const CLASSIFIER_ROWS: Array<[string, string, string | undefined]> = [
  // Step 3 delivers '1.5', not '1,5': native resync corrected the buffer to '1.' at step 2.
  ['', '1', '1'],
  ['1', '1,', '1.'],
  ['1.', '1.5', '1.5'],
  ['1.5', '1.50', '1.50'],
  ['1.5', '1.5,', undefined],
  ['1.5', '1.5.', undefined],
  // Paste: '1,500' routed to the keystroke branch normalises to '1.500', a silent 1000x error.
  ['', '1,500', undefined],
  ['', '1,234.56', undefined],
  ['', '1234.56', '1234.56'],
  ['', '1,5', undefined],
  ['', '15', '15'],
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

  // Intended, not a defect: '.5' fails `DECIMAL_PATTERN` loudly rather than parsing wrong.
  it('accepts a separator typed into an empty field', () => {
    expect(maskMoneyFieldText('', ',')).toBe('.');
    expect(maskMoneyFieldText('.', '.5')).toBe('.5');
  });

  it('never accepts text containing a comma', () => {
    for (const [previous, next] of CLASSIFIER_ROWS) {
      expect(maskMoneyFieldText(previous, next) ?? '').not.toContain(',');
    }
  });
});

describe('maskFieldText', () => {
  // '1,' is the only row that catches a mask rewriting before it consults the field variant.
  it.each([
    ['', 'Alexandria Trip'],
    ['1', '1,500'],
    ['1', '1,'],
  ])('returns a name field its text unchanged: %p + %p', (previous, next) => {
    expect(maskFieldText('name', previous, next)).toBe(next);
  });

  it.each(CLASSIFIER_ROWS)('defers to the classifier for an amount: %p + %p', (previous, next) => {
    expect(maskFieldText('amount', previous, next)).toBe(maskMoneyFieldText(previous, next));
  });
});

// `String(1e-7)` is '1e-7', which `DECIMAL_PATTERN` rejects, so the prefill expands it.
describe('formatStoredMoneyText', () => {
  it.each([
    [1.5, '1.5'],
    [0.01, '0.01'],
    [0, '0'],
    [0.005, '0.005'],
    [1e-7, '0.0000001'],
    [1234.56, '1234.56'],
    // `String(1e21)` is '1e+21', also rejected; 1e21 is reachable by typing 22 digits.
    [1e21, '1000000000000000000000'],
    [0.30000000000000004, '0.30000000000000004'],
  ])('renders %p as %p', (value, expected) => {
    expect(formatStoredMoneyText(value)).toBe(expected);
  });

  it.each([[null], [undefined]])('renders %p as the empty string, never "0"', (value) => {
    expect(formatStoredMoneyText(value)).toBe('');
  });

  // Renders '' rather than '5': stripping the sign would manufacture a value nobody stored.
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

// `Number('')` is 0, so a value the formatter declines can never round-trip; hence two domains.
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
    // Mantissa scaled across the finite exponent range: spans denormals to the top of the range.
    const value = next() * 10 ** Math.round(next() * 620 - 310);
    if (Number.isFinite(value) && value >= 0) values.push(value);
  }
  return values;
}

const PREFILL_SAMPLE = sampleFiniteNonNegativeDoubles(2000);
const PREFILL_DOMAIN = [...PREFILL_DOMAIN_CORE, ...PREFILL_DOMAIN_EDGES, ...PREFILL_SAMPLE];

/** Values `number` admits that no prefill should carry and nothing upstream stops. */
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
  it('round-trips every finite non-negative double through Number()', () => {
    for (const value of PREFILL_DOMAIN) {
      expect(Number(formatStoredMoneyText(value))).toBe(value);
    }
  });

  it('always produces plain positional notation, null included', () => {
    const isPositional = (text: string) => !/e/i.test(text) && text.split('.').length <= 2;
    expect(isPositional(formatStoredMoneyText(null))).toBe(true);
    for (const value of FORMATTER_DOMAIN) {
      expect(isPositional(formatStoredMoneyText(value))).toBe(true);
    }
  });

  // The mask runs on `onChangeText` only, so a prefill it refuses makes every keystroke a no-op.
  it('always produces text the keystroke mask accepts, null included', () => {
    expect(isTypeableMoneyText(formatStoredMoneyText(null))).toBe(true);
    for (const value of FORMATTER_DOMAIN) {
      expect(isTypeableMoneyText(formatStoredMoneyText(value))).toBe(true);
    }
  });

  // Implied by the invariant above, but a mask growing a length or leading-zero rule breaks it.
  it('accepts every prefix of a prefilled value, so backspacing never goes dead', () => {
    // Sliced: `Number.MIN_VALUE` expands to 325 characters and the walk is quadratic in it.
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

// Schema and submit disagreeing must report, never fabricate a value the store persists.
describe('parseRequiredMoneyText', () => {
  it.each([
    ['0.01', 0.01],
    ['50', 50],
    ['1234.56', 1234.56],
  ])('parses %p as %p', (text, expected) => {
    expect(parseRequiredMoneyText(text, 'amountText')).toBe(expected);
  });

  it.each([[''], ['0'], ['0.005'], ['abc'], ['-5'], ['1e3']])(
    'throws MoneyTextMappingError on %p, naming the field',
    (text) => {
      expect(() => parseRequiredMoneyText(text, 'amountText')).toThrow(MoneyTextMappingError);
      expect(() => parseRequiredMoneyText(text, 'amountText')).toThrow(
        expect.objectContaining({ name: MoneyTextMappingError.name, field: 'amountText' }),
      );
    },
  );
});
