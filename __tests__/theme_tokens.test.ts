import {
  CoreTokens,
  GoldTokens,
  SemanticTokens,
  AccentTokens,
  AcctTokens,
} from '@/constants/theme_tokens';

describe('theme_tokens', () => {
  it('CoreTokens has all required keys', () => {
    expect(CoreTokens).toMatchObject({
      bg: expect.any(String),
      surface: expect.any(String),
      surfaceEl: expect.any(String),
      border: expect.any(String),
      text1: expect.any(String),
      text2: expect.any(String),
      text3: expect.any(String),
      hint: expect.any(String),
    });
  });

  it('hint is the same value as text3', () => {
    expect(CoreTokens.hint).toBe(CoreTokens.text3);
  });

  it('GoldTokens has stops 400/500/600/700', () => {
    expect(Object.keys(GoldTokens)).toEqual(expect.arrayContaining(['400', '500', '600', '700']));
  });

  it('AccentTokens has exactly 4 standalone accents', () => {
    expect(Object.keys(AccentTokens)).toHaveLength(4);
    expect(AccentTokens).toMatchObject({
      nile: expect.any(String),
      spice: expect.any(String),
      lapis: expect.any(String),
      sand: expect.any(String),
    });
  });

  it('AccentTokens does not contain plum or rose', () => {
    expect(Object.keys(AccentTokens)).not.toContain('plum');
    expect(Object.keys(AccentTokens)).not.toContain('rose');
  });

  it('AcctTokens has 16 families each with rich and soft', () => {
    const families = Object.keys(AcctTokens);
    expect(families).toHaveLength(16);
    families.forEach((family) => {
      const swatch = AcctTokens[family as keyof typeof AcctTokens];
      expect(swatch).toHaveProperty('rich');
      expect(swatch).toHaveProperty('soft');
    });
  });

  it('all 32 AcctTokens swatches are distinct colours', () => {
    // A duplicated hex makes two families indistinguishable in the 32-swatch
    // sheet and makes the hex->family lookup in account_palette.ts ambiguous.
    // The length assertion above cannot catch a copy-paste; this one can.
    const swatches = Object.values(AcctTokens).flatMap((s) => [s.rich, s.soft]);
    expect(new Set(swatches.map((h) => h.toUpperCase())).size).toBe(swatches.length);
  });

  it('AcctTokens includes plum and rose swatches', () => {
    expect(AcctTokens).toHaveProperty('plum');
    expect(AcctTokens).toHaveProperty('rose');
  });

  it('all hex values match #RRGGBB format', () => {
    const hexPattern = /^#[0-9a-fA-F]{6}$/;
    const allValues = [
      ...Object.values(CoreTokens),
      ...Object.values(GoldTokens),
      ...Object.values(SemanticTokens),
      ...Object.values(AccentTokens),
      ...Object.values(AcctTokens).flatMap((s) => [s.rich, s.soft]),
    ];
    allValues.forEach((v) => {
      expect(v).toMatch(hexPattern);
    });
  });
});
