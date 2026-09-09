import { CoreTokens } from '@/constants/theme_tokens';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import { resolveAccountTileColors } from '@/modules/accounts/constants/account_tile_color';

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

  it('rings a hex outside the 32 in the fallback colour', () => {
    expect(resolveAccountTileColors('#ABCDEF', 'hollow')).toEqual({
      background: 'transparent',
      glyph: DEFAULT_ACCOUNT_COLOR,
      border: DEFAULT_ACCOUNT_COLOR,
    });
  });

  it('rings a null colour in the fallback colour too', () => {
    expect(resolveAccountTileColors(null, 'hollow')).toEqual({
      background: 'transparent',
      glyph: DEFAULT_ACCOUNT_COLOR,
      border: DEFAULT_ACCOUNT_COLOR,
    });
  });

  // The filled variant draws no ring, so `border` is what decides which treatment renders.
  it('the filled variant carries no border', () => {
    expect(resolveAccountTileColors('#D4830A').border).toBeUndefined();
  });
});
