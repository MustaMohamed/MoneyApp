import { Strings } from '@/constants/strings';
import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';
import {
  ACCOUNT_PALETTE,
  contrastRatio,
  DEFAULT_ACCOUNT_COLOR,
  findAccountColor,
} from '@/modules/accounts/constants/account_palette';

describe('contrastRatio', () => {
  // Two known answers pin the WCAG formula so later assertions test the palette, not the helper.
  it('is 21 for black on white and 1 for a colour on itself', () => {
    expect(contrastRatio('#FFFFFF', '#000000')).toBeCloseTo(21, 5);
    expect(contrastRatio('#2D7D6E', '#2D7D6E')).toBeCloseTo(1, 5);
  });
});

describe('ACCOUNT_PALETTE', () => {
  it('has 32 entries — 16 families in each tone', () => {
    expect(ACCOUNT_PALETTE).toHaveLength(32);
    expect(ACCOUNT_PALETTE.filter((e) => e.tone === 'rich')).toHaveLength(16);
    expect(ACCOUNT_PALETTE.filter((e) => e.tone === 'soft')).toHaveLength(16);
  });

  it('every hex is distinct', () => {
    const hexes = ACCOUNT_PALETTE.map((e) => e.hex.toUpperCase());
    expect(new Set(hexes).size).toBe(32);
  });

  it('every entry is the AcctTokens value for its own family and tone', () => {
    // A hand-edited hex here would make the sheet paint one colour and the app store another.
    for (const entry of ACCOUNT_PALETTE) {
      expect(entry.hex).toBe(AcctTokens[entry.family][entry.tone]);
    }
  });

  it('every entry carries a non-empty display name from Strings', () => {
    // `toContain` takes `unknown`; `Set<T>.has(string)` fails tsc on Strings' narrower types.
    const values = Object.values(Strings);
    for (const entry of ACCOUNT_PALETTE) {
      expect(entry.familyLabel.length).toBeGreaterThan(0);
      expect(values).toContain(entry.familyLabel);
    }
  });

  it('the two tone blocks list families in AcctTokens declaration order', () => {
    // Comparing the whole key list proves the type-predicate filter drops and reorders nothing.
    const rich = ACCOUNT_PALETTE.filter((e) => e.tone === 'rich').map((e) => e.family);
    const soft = ACCOUNT_PALETTE.filter((e) => e.tone === 'soft').map((e) => e.family);
    expect(rich).toEqual(Object.keys(AcctTokens));
    expect(soft).toEqual(rich);
    expect(rich[0]).toBe('midnight');
    expect(rich[15]).toBe('graphite');
  });
});

describe('tick colours', () => {
  it('every tick is one of the two candidates and clears 3:1 on its swatch', () => {
    // 3:1 is WCAG 2.2 SC 1.4.11 for non-text contrast; six rich tones do not clear 4.5:1.
    for (const entry of ACCOUNT_PALETTE) {
      expect([CoreTokens.text1, CoreTokens.bg]).toContain(entry.tickColor);
      expect(contrastRatio(entry.hex, entry.tickColor)).toBeGreaterThanOrEqual(3);
    }
  });

  it('matches the two swatches the mockup draws selected', () => {
    expect(findAccountColor(AcctTokens.nile.rich)?.tickColor).toBe(CoreTokens.text1);
    expect(findAccountColor(AcctTokens.sand.soft)?.tickColor).toBe(CoreTokens.bg);
  });
});

describe('findAccountColor', () => {
  it('round-trips every palette hex back to its family and tone', () => {
    for (const entry of ACCOUNT_PALETTE) {
      expect(findAccountColor(entry.hex)).toEqual(entry);
    }
  });

  it('is case-insensitive', () => {
    expect(findAccountColor('#2d7d6e')?.family).toBe('nile');
    expect(findAccountColor('#2d7d6e')?.tone).toBe('rich');
  });

  it('returns undefined for a hex outside the palette', () => {
    // `#3D7A5F` is an `AccountColors` value that no `AcctTokens` family carries.
    expect(findAccountColor('#3D7A5F')).toBeUndefined();
    expect(findAccountColor('')).toBeUndefined();
  });
});

describe('DEFAULT_ACCOUNT_COLOR', () => {
  it('is the first palette entry and resolves through findAccountColor', () => {
    expect(DEFAULT_ACCOUNT_COLOR).toBe(ACCOUNT_PALETTE[0]?.hex);
    expect(findAccountColor(DEFAULT_ACCOUNT_COLOR)).toBeDefined();
  });
});

describe('tone labels', () => {
  it('every entry carries the tone label for its own tone', () => {
    for (const entry of ACCOUNT_PALETTE) {
      expect(entry.toneLabel).toBe(
        entry.tone === 'rich' ? Strings.accountColorToneRich : Strings.accountColorToneSoft,
      );
    }
  });
});
