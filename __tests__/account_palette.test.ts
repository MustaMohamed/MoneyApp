import { Strings } from '@/constants/strings';
import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';
import {
  ACCOUNT_PALETTE,
  contrastRatio,
  DEFAULT_ACCOUNT_COLOR,
  findAccountColor,
} from '@/modules/accounts/constants/account_palette';

describe('contrastRatio', () => {
  // Two known answers pin the WCAG formula, so the assertions below that use it
  // are testing the palette rather than testing the helper against itself.
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
    // Binds the palette to the token source. A hand-edited hex here would make
    // the sheet paint one colour and the rest of the app store another.
    for (const entry of ACCOUNT_PALETTE) {
      expect(entry.hex).toBe(AcctTokens[entry.family][entry.tone]);
    }
  });

  it('every entry carries a non-empty display name from Strings', () => {
    // Strings also holds function-typed copy builders (e.g. dashboardBreakdownAssetsHeader),
    // whose literal-union value type makes Set<T>.has(string) fail strict tsc (T is narrower
    // than string). toContain's `unknown` parameter sidesteps that without weakening the check
    // — a function value can never equal a familyLabel string either way.
    const values = Object.values(Strings);
    for (const entry of ACCOUNT_PALETTE) {
      expect(entry.familyLabel.length).toBeGreaterThan(0);
      expect(values).toContain(entry.familyLabel);
    }
  });

  it('the two tone blocks list families in AcctTokens declaration order', () => {
    // mockup D1 caption: "Column order is identical in both blocks."
    // Comparing against Object.keys(AcctTokens) rather than spot-checking [0] and
    // [15] is what proves the type-predicate filter in account_palette.ts drops
    // no family and reorders none — a `.filter()` that silently returned 15 keys
    // would still satisfy a first/last check.
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
    // 3:1 is WCAG 2.2 SC 1.4.11 (non-text contrast) — the tick is a graphical
    // object inside the swatch, not body text. All 32 clear it; the floor is
    // Rose rich at 3.96. Six rich tones do NOT clear 4.5:1 (see "Underspecified"
    // note 2); using 4.5 here would fail on an approved design rather than on a
    // defect.
    //
    // THIS 3 IS NOT A DIAL. Raising it to 4.5 turns six approved swatches red;
    // lowering it below 3 abandons the only floor the sheet has. Either move is
    // a re-tint of the palette and belongs to @marcus, not to whoever is looking
    // at a red test.
    for (const entry of ACCOUNT_PALETTE) {
      expect([CoreTokens.text1, CoreTokens.bg]).toContain(entry.tickColor);
      expect(contrastRatio(entry.hex, entry.tickColor)).toBeGreaterThanOrEqual(3);
    }
  });

  it('matches the two swatches the mockup draws selected', () => {
    // mockup D1 (nile rich, bone-white tick) and D2 (sand soft, near-black
    // tick). These two anchor the rule to the approved design; without them the
    // rule would only be consistent with itself.
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
    // #3D7A5F is one of the four values in AccountColors (constants/theme.ts:205-218)
    // that appear in no AcctTokens family. No account row can hold it today —
    // both creation paths write AcctTokens rich values — but the trigger row and
    // the N3 dots must not crash if one ever does.
    expect(findAccountColor('#3D7A5F')).toBeUndefined();
    expect(findAccountColor('')).toBeUndefined();
  });
});

describe('DEFAULT_ACCOUNT_COLOR', () => {
  it('is the first palette entry and resolves through findAccountColor', () => {
    // MA-006: the detail screen used to fall back to AccountColors[0] in
    // constants/theme.ts (also #1B2B4B) while drawing swatches from a list it
    // was not part of. They agreed on that one entry, which is why nobody
    // noticed. Binding the default to the palette is what stops them diverging
    // if either list is ever re-ordered.
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
