import { CoreTokens } from '@/constants/theme_tokens';
import { DEFAULT_ACCOUNT_COLOR } from '@/modules/accounts/constants/account_palette';
import {
  ACCOUNTS_LIST_ROW_STYLE,
  resolveAccountTileColors,
} from '@/modules/accounts/screens/accounts/list/accounts_list.geometry';
import { ms } from '@/utils/responsive';

describe('accounts list row geometry (B1)', () => {
  it('is 64dp, the B1 row with its caption, as a minimum', () => {
    expect(ACCOUNTS_LIST_ROW_STYLE.minHeight).toBe(ms(64));
  });

  it('carries exactly these keys — nothing added, nothing dropped', () => {
    // `style` beats `className` in RN, so a dropped key half-overrides `.list-group__item`.
    expect(Object.keys(ACCOUNTS_LIST_ROW_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'minHeight',
      'paddingLeft',
      'paddingRight',
      'paddingVertical',
    ]);
  });

  it('is frozen, so one stray assignment cannot move every row at once', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ROW_STYLE)).toBe(true);
  });
});

describe('accounts list tile colours', () => {
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
});
