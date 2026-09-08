import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';
import {
  mixHex,
  resolveAccountBadgeColors,
} from '@/modules/accounts/constants/account_badge_color';
import {
  ACCOUNT_PALETTE,
  DEFAULT_ACCOUNT_COLOR,
  contrastRatio,
} from '@/modules/accounts/constants/account_palette';

const OPAQUE_HEX = /^#[0-9A-Fa-f]{6}$/;
const MIN_RATIO = 4.5;
// The frames' 55/45 mix for midnight rich, from the tokens themselves: a mirrored hex goes stale when either moves.
const MIDNIGHT_RICH_MIX_55 = mixHex(AcctTokens.midnight.rich, CoreTokens.text1, 0.55);

describe('resolveAccountBadgeColors', () => {
  it.each([...ACCOUNT_PALETTE.map((entry) => entry.hex), DEFAULT_ACCOUNT_COLOR])(
    'clears 4.5:1 with an opaque fill on %s',
    (hex) => {
      const { fill, foreground } = resolveAccountBadgeColors(hex);
      expect(fill).toMatch(OPAQUE_HEX);
      expect(contrastRatio(fill, foreground)).toBeGreaterThanOrEqual(MIN_RATIO);
    },
  );

  it('keeps the frames 55/45 mix where it already clears', () => {
    expect(resolveAccountBadgeColors(AcctTokens.gold.rich)).toEqual({
      fill: '#383E5B',
      foreground: '#DBBD86',
    });
  });

  it('escalates the foreground where the 55/45 mix does not clear', () => {
    const { fill, foreground } = resolveAccountBadgeColors(AcctTokens.midnight.rich);
    expect(contrastRatio(fill, MIDNIGHT_RICH_MIX_55)).toBeLessThan(MIN_RATIO);
    expect(foreground).not.toBe(MIDNIGHT_RICH_MIX_55);
    expect(contrastRatio(fill, foreground)).toBeGreaterThan(
      contrastRatio(fill, MIDNIGHT_RICH_MIX_55),
    );
  });
});
