import {
  Colors,
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
  lineHeightFor,
  withAlpha,
} from '@/constants/theme';
import {
  ACCOUNTS_LIST_ARCHIVED_CARD_STYLE,
  ACCOUNTS_LIST_ARCHIVED_HEADER_STYLE,
  ACCOUNTS_LIST_ARCHIVED_ROW_STYLE,
  ACCOUNTS_LIST_CARD_STYLE,
  ACCOUNTS_LIST_DROP_SLOT_STYLE,
  ACCOUNTS_LIST_EDGE_SCROLL,
  ACCOUNTS_LIST_FLOATING_STYLE,
  ACCOUNTS_LIST_GRIP_HIT_SLOP,
  ACCOUNTS_LIST_GRIP_SLOT_STYLE,
  ACCOUNTS_LIST_LIFTED_ROW_STYLE,
  ACCOUNTS_LIST_RAIL_STYLE,
  ACCOUNTS_LIST_REORDER_NOTE_STYLE,
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
      flex: 1,
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
      'flex',
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

describe('accounts list reorder note geometry (B7)', () => {
  it('is the 12 caption over its paired line height', () => {
    expect(ACCOUNTS_LIST_REORDER_NOTE_STYLE.fontSize).toBe(Type.caption);
    expect(ACCOUNTS_LIST_REORDER_NOTE_STYLE.lineHeight).toBe(lineHeightFor(Type.caption));
  });

  it('sits 12 under the active card in the card gutter, centred', () => {
    expect(ACCOUNTS_LIST_REORDER_NOTE_STYLE.marginTop).toBe(Spacing.sm);
    expect(ACCOUNTS_LIST_REORDER_NOTE_STYLE.marginHorizontal).toBe(Spacing.md);
    expect(ACCOUNTS_LIST_REORDER_NOTE_STYLE.textAlign).toBe('center');
  });

  it('carries exactly these keys', () => {
    expect(Object.keys(ACCOUNTS_LIST_REORDER_NOTE_STYLE).sort()).toEqual([
      'fontSize',
      'lineHeight',
      'marginHorizontal',
      'marginTop',
      'textAlign',
    ]);
  });

  it('is frozen', () => {
    // `Object.isFrozen` is true for a missing export too, so the object is asserted first.
    expect(ACCOUNTS_LIST_REORDER_NOTE_STYLE).toEqual(expect.any(Object));
    expect(Object.isFrozen(ACCOUNTS_LIST_REORDER_NOTE_STYLE)).toBe(true);
  });
});

describe('accounts list grip hit slop (B6)', () => {
  it('adds nothing on the left, so a tap on the balance edge still opens the account', () => {
    expect(ACCOUNTS_LIST_GRIP_HIT_SLOP.left).toBe(0);
  });

  it('lifts the 16 slot to the touch floor vertically and to the right', () => {
    const { top, bottom, right } = ACCOUNTS_LIST_GRIP_HIT_SLOP;
    expect(Size.reorderGripSlot + Number(top) + Number(bottom)).toBeGreaterThanOrEqual(
      TouchSize.min,
    );
    expect(Size.reorderGripSlot + Number(right)).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('is frozen', () => {
    expect(ACCOUNTS_LIST_GRIP_HIT_SLOP).toEqual(expect.any(Object));
    expect(Object.isFrozen(ACCOUNTS_LIST_GRIP_HIT_SLOP)).toBe(true);
  });
});

function rgbaOf(hex: string) {
  const [r, g, b, a] = [1, 3, 5, 7].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return { r, g, b, a: a / 255 };
}

const noShadowKeys = (style: object) =>
  Object.keys(style).filter((key) => key.startsWith('shadow') || key === 'elevation');

describe('accounts list lifted row geometry (B6)', () => {
  it('is a 1px accent/50 border at radius 12, inset 4 vertically and 6 horizontally', () => {
    expect(Radius.md).toBe(ms(12));
    expect(Size.liftedRowInset).toBe(ms(6));
    expect(ACCOUNTS_LIST_LIFTED_ROW_STYLE).toEqual({
      borderWidth: Size.hairline,
      borderColor: withAlpha(Colors.dark.gold, '80'),
      borderRadius: Radius.md,
      marginVertical: Spacing.xxs,
      marginHorizontal: Size.liftedRowInset,
      overflow: 'hidden',
    });
  });

  it('borders in the canvas accent, rgba(212,164,76,.5)', () => {
    const { r, g, b, a } = rgbaOf(String(ACCOUNTS_LIST_LIFTED_ROW_STYLE.borderColor));
    expect([r, g, b]).toEqual([212, 164, 76]);
    expect(a).toBeCloseTo(0.5, 2);
  });

  it('carries exactly these keys, and no shadow or elevation', () => {
    expect(Object.keys(ACCOUNTS_LIST_LIFTED_ROW_STYLE).sort()).toEqual([
      'borderColor',
      'borderRadius',
      'borderWidth',
      'marginHorizontal',
      'marginVertical',
      'overflow',
    ]);
    expect(noShadowKeys(ACCOUNTS_LIST_LIFTED_ROW_STYLE)).toEqual([]);
  });

  it('is frozen', () => {
    expect(ACCOUNTS_LIST_LIFTED_ROW_STYLE).toEqual(expect.any(Object));
    expect(Object.isFrozen(ACCOUNTS_LIST_LIFTED_ROW_STYLE)).toBe(true);
  });
});

describe('accounts list drop slot geometry (B6)', () => {
  it('is a transparent dashed 1px accent/45 slot at radius 12, as tall as a row', () => {
    expect(ACCOUNTS_LIST_DROP_SLOT_STYLE).toEqual({
      minHeight: Size.accountListRowMinHeight,
      borderWidth: Size.hairline,
      borderStyle: 'dashed',
      borderColor: withAlpha(Colors.dark.gold, '73'),
      borderRadius: Radius.md,
      backgroundColor: 'transparent',
    });
    expect(ACCOUNTS_LIST_DROP_SLOT_STYLE.minHeight).toBe(ACCOUNTS_LIST_ROW_STYLE.minHeight);
  });

  it('borders in the canvas accent, rgba(212,164,76,.45)', () => {
    const { r, g, b, a } = rgbaOf(String(ACCOUNTS_LIST_DROP_SLOT_STYLE.borderColor));
    expect([r, g, b]).toEqual([212, 164, 76]);
    expect(a).toBeCloseTo(0.45, 2);
  });

  it('carries exactly these keys, and no shadow or elevation', () => {
    expect(Object.keys(ACCOUNTS_LIST_DROP_SLOT_STYLE).sort()).toEqual([
      'backgroundColor',
      'borderColor',
      'borderRadius',
      'borderStyle',
      'borderWidth',
      'minHeight',
    ]);
    expect(noShadowKeys(ACCOUNTS_LIST_DROP_SLOT_STYLE)).toEqual([]);
  });

  it('is frozen', () => {
    expect(ACCOUNTS_LIST_DROP_SLOT_STYLE).toEqual(expect.any(Object));
    expect(Object.isFrozen(ACCOUNTS_LIST_DROP_SLOT_STYLE)).toBe(true);
  });
});

describe('accounts list grip slot and floating layer geometry (B6)', () => {
  it('centres the grip glyph in the reserved 16 slot, for the row and the lifted copy', () => {
    expect(ACCOUNTS_LIST_GRIP_SLOT_STYLE).toEqual({
      width: Size.reorderGripSlot,
      alignItems: 'center',
    });
    expect(Size.reorderGripSlot).toBe(ms(16));
    expect(Object.keys(ACCOUNTS_LIST_GRIP_SLOT_STYLE).sort()).toEqual(['alignItems', 'width']);
    expect(Object.isFrozen(ACCOUNTS_LIST_GRIP_SLOT_STYLE)).toBe(true);
  });

  it('floats the slot and the copy from the card top, edge to edge', () => {
    expect(ACCOUNTS_LIST_FLOATING_STYLE).toEqual({
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
    });
    expect(Object.keys(ACCOUNTS_LIST_FLOATING_STYLE).sort()).toEqual([
      'left',
      'position',
      'right',
      'top',
    ]);
    expect(Object.isFrozen(ACCOUNTS_LIST_FLOATING_STYLE)).toBe(true);
  });
});

describe('accounts list edge scroll geometry (B6)', () => {
  it('is a zone one row tall at each end of the viewport', () => {
    expect(Size.accountListRowMinHeight).toBe(ms(64));
    expect(ACCOUNTS_LIST_EDGE_SCROLL.zoneHeight).toBe(Size.accountListRowMinHeight);
    expect(ACCOUNTS_LIST_EDGE_SCROLL.zoneHeight).toBe(ms(64));
  });

  it('scrolls at most four rows a second', () => {
    expect(ACCOUNTS_LIST_EDGE_SCROLL.maxRatePerSecond).toBe(4 * Size.accountListRowMinHeight);
  });

  it('carries exactly these keys', () => {
    expect(Object.keys(ACCOUNTS_LIST_EDGE_SCROLL).sort()).toEqual([
      'maxRatePerSecond',
      'zoneHeight',
    ]);
  });

  it('is frozen', () => {
    expect(ACCOUNTS_LIST_EDGE_SCROLL).toEqual(expect.any(Object));
    expect(Object.isFrozen(ACCOUNTS_LIST_EDGE_SCROLL)).toBe(true);
  });
});
