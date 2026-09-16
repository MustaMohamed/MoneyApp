import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { Colors } from '@/constants/theme';
import { AcctTokens, CoreTokens } from '@/constants/theme_tokens';
import { mixHex } from '@/modules/accounts/constants/account_badge_color';
import {
  ACCOUNT_PALETTE,
  DEFAULT_ACCOUNT_COLOR,
  contrastRatio,
} from '@/modules/accounts/constants/account_palette';
import {
  ARCHIVED_HERO_OPACITY,
  resolveAccountTileColors,
} from '@/modules/accounts/constants/account_tile_color';

const OPAQUE_UPPER_HEX = /^#[0-9A-F]{6}$/;
const paintOnArchivedHero = (hex: string): string =>
  mixHex(hex, CoreTokens.bg, ARCHIVED_HERO_OPACITY);
const HOLLOW_HERO_BACKDROP = paintOnArchivedHero(HERO_GRADIENT_COLORS[1]);
const HOLLOW_MIN_RATIO = 3;

describe('resolveAccountTileColors', () => {
  // Literal hexes, not `ACCOUNT_PALETTE` lookups, which would assert `f(x)` equals `f(x)`.
  it('saffron takes the dark glyph, as B1 draws it', () => {
    expect(resolveAccountTileColors('#D4830A')).toEqual({
      background: '#D4830A',
      glyph: CoreTokens.bg,
    });
  });

  it('a dark palette hex takes the light glyph', () => {
    expect(resolveAccountTileColors('#2D7D6E')).toEqual({
      background: '#2D7D6E',
      glyph: CoreTokens.text1,
    });
  });

  it('matches the stored hex case-insensitively', () => {
    expect(resolveAccountTileColors('#d4830a').background).toBe('#D4830A');
  });

  // Keeps the assertions above from collapsing into `x === x` if the default is re-pointed.
  it('and neither hex is the fallback', () => {
    expect(DEFAULT_ACCOUNT_COLOR).not.toBe('#D4830A');
    expect(DEFAULT_ACCOUNT_COLOR).not.toBe('#2D7D6E');
  });

  it('falls back for a hex outside the 32, glyph included', () => {
    expect(resolveAccountTileColors('#ABCDEF')).toEqual(resolveAccountTileColors(null));
    expect(resolveAccountTileColors('#ABCDEF').background).toBe(DEFAULT_ACCOUNT_COLOR);
  });

  it('falls back for a null colour, and the glyph the fallback entry picked', () => {
    expect(resolveAccountTileColors(null)).toEqual({
      background: DEFAULT_ACCOUNT_COLOR,
      glyph: CoreTokens.text1,
    });
  });

  it('the omitted variant is the filled one', () => {
    expect(resolveAccountTileColors('#D4830A')).toEqual(
      resolveAccountTileColors('#D4830A', 'filled'),
    );
  });
});

describe('resolveAccountTileColors — the hollow variant C4 draws on an archived account', () => {
  it('drops the fill and rings the tile in the account colour', () => {
    expect(resolveAccountTileColors('#D4830A', 'hollow')).toEqual({
      background: 'transparent',
      glyph: '#D4830A',
      border: '#D4830A',
    });
  });

  it.each([...ACCOUNT_PALETTE.map((entry) => entry.hex), DEFAULT_ACCOUNT_COLOR, '#ABCDEF', null])(
    'rings %s at 3:1 or better on the archived hero as painted and on the list card',
    (hex) => {
      const { background, glyph, border } = resolveAccountTileColors(hex, 'hollow');
      expect(background).toBe(Colors.shared.transparent);
      expect(border).toBe(glyph);
      expect(glyph).toMatch(OPAQUE_UPPER_HEX);
      expect(
        contrastRatio(paintOnArchivedHero(glyph), HOLLOW_HERO_BACKDROP),
      ).toBeGreaterThanOrEqual(HOLLOW_MIN_RATIO);
      expect(contrastRatio(glyph, CoreTokens.surface)).toBeGreaterThanOrEqual(HOLLOW_MIN_RATIO);
    },
  );

  it.each([
    AcctTokens.gold.rich,
    AcctTokens.gold.soft,
    AcctTokens.saffron.rich,
    AcctTokens.saffron.soft,
    AcctTokens.sand.rich,
    AcctTokens.sand.soft,
    AcctTokens.emerald.rich,
    AcctTokens.emerald.soft,
  ])('keeps %s as it is, since it already clears', (hex) => {
    const { glyph, border } = resolveAccountTileColors(hex, 'hollow');
    expect(glyph).toBe(hex);
    expect(border).toBe(hex);
  });

  it('steps midnight rich to the first mix that clears, since it does not clear', () => {
    const hex = AcctTokens.midnight.rich;
    const { glyph } = resolveAccountTileColors(hex, 'hollow');
    expect(contrastRatio(paintOnArchivedHero(hex), HOLLOW_HERO_BACKDROP)).toBeLessThan(
      HOLLOW_MIN_RATIO,
    );
    expect(glyph).toBe(mixHex(hex, CoreTokens.text1, 0.5));
    expect(
      contrastRatio(paintOnArchivedHero(mixHex(hex, CoreTokens.text1, 0.55)), HOLLOW_HERO_BACKDROP),
    ).toBeLessThan(HOLLOW_MIN_RATIO);
  });

  it.each(['#ABCDEF', null])('rings %s in the stepped fallback colour', (hex) => {
    const fallback = resolveAccountTileColors(DEFAULT_ACCOUNT_COLOR, 'hollow');
    expect(resolveAccountTileColors(hex, 'hollow')).toEqual(fallback);
    expect(fallback.glyph).not.toBe(DEFAULT_ACCOUNT_COLOR);
  });

  // The filled variant draws no ring, so `border` is what decides which treatment renders.
  it('the filled variant carries no border', () => {
    expect(resolveAccountTileColors('#D4830A').border).toBeUndefined();
  });
});
