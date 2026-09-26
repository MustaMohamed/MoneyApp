import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { mixHex } from '@/modules/accounts/constants/account_badge_color';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import {
  ACCOUNT_PALETTE,
  contrastRatio,
  findAccountColor,
} from '@/modules/accounts/constants/account_palette';

const BACKDROPS: readonly [string, string][] = [
  ['the sheet surface', CoreTokens.surface],
  ['bg-default', CoreTokens.surfaceEl],
  ['an unselected filter chip', mixHex(CoreTokens.surfaceEl, CoreTokens.surface, 0.4)],
  ['a selected filter chip', mixHex(GoldTokens[500], CoreTokens.surface, 0.15)],
];

describe('resolveAccountGlyphColor', () => {
  it.each(ACCOUNT_PALETTE.map((entry) => [`${entry.familyLabel} ${entry.toneLabel}`, entry.hex]))(
    'draws %s (%s) at 3:1 or more on every backdrop',
    (_label, hex) => {
      const glyph = resolveAccountGlyphColor(hex);
      for (const [, backdrop] of BACKDROPS) {
        expect(contrastRatio(glyph, backdrop)).toBeGreaterThanOrEqual(3);
      }
    },
  );

  it('steps Midnight rich away from its stored colour', () => {
    const midnightRich = ACCOUNT_PALETTE.find(
      (entry) => entry.family === 'midnight' && entry.tone === 'rich',
    );
    expect(midnightRich?.hex).toBe('#1B2B4B');
    expect(resolveAccountGlyphColor('#1B2B4B')).not.toBe('#1B2B4B');
  });

  it('returns a colour that already clears unchanged', () => {
    expect(findAccountColor('#C9973A')).toBeDefined();
    expect(resolveAccountGlyphColor('#C9973A')).toBe('#C9973A');
  });

  it.each([undefined, null])('falls back to the secondary text colour for %s', (hex) => {
    expect(resolveAccountGlyphColor(hex)).toBe(CoreTokens.text2);
  });
});
