import { Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import {
  ACCOUNTS_LIST_ARCHIVED_CARD_STYLE,
  ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE,
  ACCOUNTS_LIST_ARCHIVED_ROW_STYLE,
  ACCOUNTS_LIST_CARD_STYLE,
  ACCOUNTS_LIST_RAIL_STYLE,
  ACCOUNTS_LIST_ROW_CAPTION_STYLE,
  ACCOUNTS_LIST_ROW_STYLE,
} from '@/modules/accounts/screens/accounts/list/accounts_list.geometry';
import { ms, msFont } from '@/utils/responsive';

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

describe('accounts list row caption geometry (B1)', () => {
  it('is 11 over 14, the same size as the currency code under the balance', () => {
    expect(Type.micro).toBe(msFont(11));
    expect(ACCOUNTS_LIST_ROW_CAPTION_STYLE.fontSize).toBe(Type.micro);
    expect(ACCOUNTS_LIST_ROW_CAPTION_STYLE.lineHeight).toBe(lineHeightFor(Type.micro));
  });

  it('keeps the 2dp gap under the name', () => {
    expect(ACCOUNTS_LIST_ROW_CAPTION_STYLE.marginTop).toBe(Spacing.xxxs);
  });

  it('carries exactly these keys — a bare fontSize would keep the className line-height', () => {
    expect(Object.keys(ACCOUNTS_LIST_ROW_CAPTION_STYLE).sort()).toEqual([
      'fontSize',
      'lineHeight',
      'marginTop',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ROW_CAPTION_STYLE)).toBe(true);
  });
});

describe('accounts list card geometry (B1)', () => {
  it('sits 16 from both screen edges, the gutter SectionHeader already takes', () => {
    expect(ACCOUNTS_LIST_CARD_STYLE.marginHorizontal).toBe(Spacing.md);
  });

  it('carries exactly one key — the shared wrapper owns everything else', () => {
    expect(Object.keys(ACCOUNTS_LIST_CARD_STYLE)).toEqual(['marginHorizontal']);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_CARD_STYLE)).toBe(true);
  });
});

describe('accounts list archived card geometry (B4)', () => {
  it('takes the card gutter and sits 12 under the active card', () => {
    expect(ACCOUNTS_LIST_ARCHIVED_CARD_STYLE.marginHorizontal).toBe(Spacing.md);
    expect(ACCOUNTS_LIST_ARCHIVED_CARD_STYLE.marginTop).toBe(Spacing.sm);
  });

  it('carries exactly these keys', () => {
    expect(Object.keys(ACCOUNTS_LIST_ARCHIVED_CARD_STYLE).sort()).toEqual([
      'marginHorizontal',
      'marginTop',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ARCHIVED_CARD_STYLE)).toBe(true);
  });
});

describe('accounts list archived header geometry (B4)', () => {
  it('is 52 high with the row gutter and an 8 gap', () => {
    expect(Size.archivedCardHeaderHeight).toBe(ms(52));
    expect(ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE).toEqual({
      height: Size.archivedCardHeaderHeight,
      paddingHorizontal: Spacing.md,
      gap: Spacing.xs,
      flexDirection: 'row',
      alignItems: 'center',
    });
  });

  it('carries exactly these keys', () => {
    expect(Object.keys(ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'height',
      'paddingHorizontal',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE)).toBe(true);
  });
});

describe('accounts list archived row geometry (B5)', () => {
  it('is 56dp as a minimum, 16 left, 12 right, 8 vertical', () => {
    expect(Size.archivedRowMinHeight).toBe(ms(56));
    expect(ACCOUNTS_LIST_ARCHIVED_ROW_STYLE).toEqual({
      minHeight: Size.archivedRowMinHeight,
      paddingLeft: Spacing.md,
      paddingRight: Spacing.sm,
      paddingVertical: Spacing.xs,
      gap: Spacing.sm,
      flexDirection: 'row',
      alignItems: 'center',
    });
  });

  it('carries exactly these keys', () => {
    expect(Object.keys(ACCOUNTS_LIST_ARCHIVED_ROW_STYLE).sort()).toEqual([
      'alignItems',
      'flexDirection',
      'gap',
      'minHeight',
      'paddingLeft',
      'paddingRight',
      'paddingVertical',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_ARCHIVED_ROW_STYLE)).toBe(true);
  });
});

describe('accounts list type rail geometry (B7)', () => {
  it('takes the card gutter and the canvas 4px above and below', () => {
    expect(ACCOUNTS_LIST_RAIL_STYLE.marginHorizontal).toBe(Spacing.md);
    expect(ACCOUNTS_LIST_RAIL_STYLE.marginTop).toBe(Spacing.xxs);
    expect(ACCOUNTS_LIST_RAIL_STYLE.marginBottom).toBe(Spacing.xxs);
  });

  it('carries exactly these keys', () => {
    expect(Object.keys(ACCOUNTS_LIST_RAIL_STYLE).sort()).toEqual([
      'marginBottom',
      'marginHorizontal',
      'marginTop',
    ]);
  });

  it('is frozen', () => {
    expect(Object.isFrozen(ACCOUNTS_LIST_RAIL_STYLE)).toBe(true);
  });
});
