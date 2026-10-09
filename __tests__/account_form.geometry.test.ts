import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { FITTED_LINE_SLACK, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';
import {
  ACCOUNT_TYPE_TILE_HEIGHT,
  chunkTypeOptions,
  CREDIT_SLOT_MIN_HEIGHT,
  CURRENCY_CELL_WIDTH,
  CURRENCY_SEGMENT_WIDTH,
  CURRENCY_TABS_MAX_FONT_SCALE,
  FIELD_MESSAGE_RAIL_STYLE,
  FIELD_MESSAGE_TEXT_LINE_HEIGHT,
  fieldMessageRailStyle,
  resolveAccountTypeTileGeometry,
  resolveBalanceField,
  resolveBalanceRowLabelLines,
  resolveCurrencyTabsBoxHeight,
} from '@/modules/accounts/components/account_form/account_form.geometry';
import { TYPE_OPTIONS } from '@/modules/accounts/components/account_type_pill';

// Under jest-expo, `Dimensions` is mocked at 750pt, so `responsiveScale` clamps to 1.15.
describe('FIELD_MESSAGE_RAIL_STYLE', () => {
  it('minHeight is bound to Size.fieldMessageTrack, never to a literal', () => {
    expect(FIELD_MESSAGE_RAIL_STYLE.minHeight).toBe(Size.fieldMessageTrack);
  });

  it('never sets height — the rail is a floor, not a ceiling', () => {
    // Pinning a height reintroduces clipping at accessibility font sizes.
    expect('height' in FIELD_MESSAGE_RAIL_STYLE).toBe(false);
  });

  it('is never smaller than one --text-sm line at base font scale', () => {
    expect(FIELD_MESSAGE_RAIL_STYLE.minHeight).toBeGreaterThanOrEqual(20);
  });
});

describe('fieldMessageRailStyle', () => {
  it('returns the shared rail style itself when no error lines are reserved', () => {
    expect(fieldMessageRailStyle()).toBe(FIELD_MESSAGE_RAIL_STYLE);
  });

  it('reserves one error line as a floor, never a height', () => {
    const style = fieldMessageRailStyle(1);

    expect(style.minHeight).toBe(
      Math.max(Size.fieldMessageTrack, Size.fieldRailTextInset + FIELD_MESSAGE_TEXT_LINE_HEIGHT),
    );
    expect(style.paddingTop).toBe(Size.fieldRailTextInset);
    expect('height' in style).toBe(false);
  });

  it('reserves two error lines above the one-line floor, never a height', () => {
    const style = fieldMessageRailStyle(2);

    expect(style.minHeight).toBe(Size.fieldRailTextInset + 2 * FIELD_MESSAGE_TEXT_LINE_HEIGHT);
    expect(style.minHeight).toBeGreaterThan(fieldMessageRailStyle(1).minHeight);
    expect('height' in style).toBe(false);
  });
});

describe('chunkTypeOptions', () => {
  it('chunks the five type options into rows of three, last row padded with null', () => {
    const rows = chunkTypeOptions(TYPE_OPTIONS, 3);
    expect(rows).toEqual([
      [TYPE_OPTIONS[0], TYPE_OPTIONS[1], TYPE_OPTIONS[2]],
      [TYPE_OPTIONS[3], TYPE_OPTIONS[4], null],
    ]);
  });

  it('every row has the same length', () => {
    const rows = chunkTypeOptions(TYPE_OPTIONS, 3);
    for (const row of rows) expect(row).toHaveLength(3);
  });

  it('pads a full final row, not just the 5-into-3 remainder the grid ships', () => {
    expect(chunkTypeOptions(TYPE_OPTIONS.slice(0, 4), 3)).toEqual([
      [TYPE_OPTIONS[0], TYPE_OPTIONS[1], TYPE_OPTIONS[2]],
      [TYPE_OPTIONS[3], null, null],
    ]);
    expect(chunkTypeOptions(TYPE_OPTIONS.slice(0, 3), 3)).toEqual([
      [TYPE_OPTIONS[0], TYPE_OPTIONS[1], TYPE_OPTIONS[2]],
    ]);
  });
});

describe('resolveBalanceField', () => {
  it('Credit Card gets the "amount owed" relabel', () => {
    expect(resolveBalanceField(AccountType.CreditCard)).toEqual({
      label: Strings.accountOwedLabel,
      helper: Strings.accountOwedHelper,
    });
  });

  it.each(Object.values(AccountType).filter((t) => t !== AccountType.CreditCard))(
    '%s gets the plain opening-balance label',
    (type) => {
      expect(resolveBalanceField(type)).toEqual({
        label: Strings.accountBalanceLabel,
        helper: Strings.accountBalanceHelper,
      });
    },
  );
});

describe('geometry relationships', () => {
  it('a currency segment stays tappable at the compact width', () => {
    expect(CURRENCY_SEGMENT_WIDTH).toBeGreaterThanOrEqual(TouchSize.min);
    expect(CURRENCY_CELL_WIDTH).toBeGreaterThan(2 * CURRENCY_SEGMENT_WIDTH);
  });

  it('ACCOUNT_TYPE_TILE_HEIGHT never breaches the touch-target floor', () => {
    expect(ACCOUNT_TYPE_TILE_HEIGHT).toBeGreaterThanOrEqual(TouchSize.min);
  });

  it('CREDIT_SLOT_MIN_HEIGHT is taller than a single field row', () => {
    expect(CREDIT_SLOT_MIN_HEIGHT).toBeGreaterThan(Size.fieldHeight);
  });
});

describe('resolveAccountTypeTileGeometry', () => {
  it('MA-162: at font scale 1 the tile is ACCOUNT_TYPE_TILE_HEIGHT with the Type.caption pair', () => {
    expect(resolveAccountTypeTileGeometry(1)).toEqual({
      height: ACCOUNT_TYPE_TILE_HEIGHT,
      caption: { fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) },
    });
  });

  it('MA-162: at font scale 0.85 the tile keeps ACCOUNT_TYPE_TILE_HEIGHT as its floor', () => {
    expect(resolveAccountTypeTileGeometry(0.85).height).toBe(ACCOUNT_TYPE_TILE_HEIGHT);
  });

  it('MA-162: at font scale 2 the tile grows to hold its icon, its gap and its caption line', () => {
    const g = resolveAccountTypeTileGeometry(2);
    const caption = scaledTextStyle(Type.caption, 2);

    expect(g.caption).toEqual(caption);
    expect(g.height).toBeGreaterThan(ACCOUNT_TYPE_TILE_HEIGHT);
    expect(g.height).toBeGreaterThanOrEqual(
      Size.compactChipHeight + Spacing.xs + caption.lineHeight + 2 * Spacing.xs,
    );
  });
});

describe('resolveCurrencyTabsBoxHeight', () => {
  it('MA-162: the currency tabs stop growing at the display headline stop', () => {
    expect(CURRENCY_TABS_MAX_FONT_SCALE).toBe(DISPLAY_HEADLINE_MAX_FONT_SCALE);
  });

  it('MA-162: at font scale 1 the box is Size.fieldHeight', () => {
    expect(resolveCurrencyTabsBoxHeight(1)).toBe(Size.fieldHeight);
  });

  it('MA-162: at font scale 2 the box is the tab row of the 1.3 stop plus one device pixel', () => {
    const listHeight =
      resolveSegmentedTabsGeometry(2, CURRENCY_TABS_MAX_FONT_SCALE).defaultListHeight ?? NaN;
    const height = resolveCurrencyTabsBoxHeight(2);

    expect(height).toBe(resolveCurrencyTabsBoxHeight(1.3));
    expect(height).toBe(Math.max(Size.fieldHeight, listHeight + FITTED_LINE_SLACK));
    expect(height).toBeGreaterThan(listHeight);
  });
});

describe('resolveBalanceRowLabelLines', () => {
  it.each([
    [0.85, 1],
    [1, 1],
    [1.01, 2],
    [2, 2],
  ])('MA-162: at font scale %s the balance row labels keep %i', (fontScale, lines) => {
    expect(resolveBalanceRowLabelLines(fontScale)).toBe(lines);
  });
});
