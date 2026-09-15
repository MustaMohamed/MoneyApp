import { isBlankName, stripFormatChars } from '@/utils/strip_format_chars';

const RLM = '\u200F';
const LRM = '\u200E';
const ZWSP = '\u200B';
const ZWNJ = '\u200C';
const ZWJ = '\u200D';
const WORD_JOINER = '\u2060';
const ALM = '\u061C';
const SOFT_HYPHEN = '\u00AD';
const NBSP = '\u00A0';

describe('stripFormatChars', () => {
  it.each([
    ['U+200F', RLM],
    ['U+200E', LRM],
    ['U+200B', ZWSP],
    ['U+200C', ZWNJ],
    ['U+200D', ZWJ],
    ['U+2060', WORD_JOINER],
    ['U+061C', ALM],
    ['U+00AD', SOFT_HYPHEN],
  ])('removes %s wherever it sits', (_label, char) => {
    expect(stripFormatChars(`${char}Ca${char}sh${char}`)).toBe('Cash');
  });

  it('keeps visible characters, NBSP and inner spaces', () => {
    expect(stripFormatChars(`${NBSP}My Cash${NBSP}`)).toBe(`${NBSP}My Cash${NBSP}`);
    expect(stripFormatChars('نقدي 2')).toBe('نقدي 2');
  });
});

describe('isBlankName', () => {
  it.each([
    ['empty', ''],
    ['spaces', '   '],
    ['an RLM', RLM],
    ['a ZWSP', ZWSP],
    ['an RLM and a ZWSP among spaces', ` ${RLM} ${ZWSP} `],
    ['an NBSP', NBSP],
  ])('is true for %s', (_label, name) => {
    expect(isBlankName(name)).toBe(true);
  });

  it.each([
    ['a letter', 'a'],
    ['a name led by an RLM', `${RLM}Cash`],
    ['a name with a ZWJ inside', `Ca${ZWJ}sh`],
  ])('is false for %s', (_label, name) => {
    expect(isBlankName(name)).toBe(false);
  });
});
