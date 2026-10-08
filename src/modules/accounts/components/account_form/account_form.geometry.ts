import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import {
  FITTED_LINE_SLACK,
  type ScaledTextStyle,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { TypeOption } from '../account_type_pill';

/** `minHeight`, never `height`: at large font sizes long copy grows instead of clipping. */
export const FIELD_MESSAGE_RAIL_STYLE = {
  minHeight: Size.fieldMessageTrack,
  paddingTop: Size.fieldRailTextInset,
} as const;

/** Unscaled, matching HeroUI `FieldError`'s own 20pt line-height so the rail cannot shift. */
export const FIELD_MESSAGE_TEXT_LINE_HEIGHT = 20;

/** A helperless rail reserves its error's lines, so the rows below stay put when one lands. */
export function fieldMessageRailStyle(reserveErrorLines?: 1 | 2): {
  minHeight: number;
  paddingTop: number;
} {
  if (reserveErrorLines === undefined) return FIELD_MESSAGE_RAIL_STYLE;
  return {
    ...FIELD_MESSAGE_RAIL_STYLE,
    minHeight: Math.max(
      Size.fieldMessageTrack,
      Size.fieldRailTextInset + reserveErrorLines * FIELD_MESSAGE_TEXT_LINE_HEIGHT,
    ),
  };
}

/** Error-state alert glyph — mockup `.msg svg`: 13px box, 2px top inset, 5px gap (mockup.html:559-560). */
export const FIELD_MESSAGE_GLYPH = {
  size: ms(13),
  topInset: ms(2),
  gap: ms(5),
} as const;

/** 3-column, 5-tile, left-aligned account-type grid at 114 x 76 pt (spec.md:73,124). */
export const ACCOUNT_TYPE_TILE_HEIGHT = ms(76);
export const ACCOUNT_TYPE_GRID_COLUMNS = 3;
export const ACCOUNT_TYPE_TILE_BORDER_WIDTH = 1;

export interface AccountTypeTileGeometry {
  height: number;
  caption: ScaledTextStyle;
}

/** `ACCOUNT_TYPE_TILE_HEIGHT` is the floor; above it the tile holds its icon, its gap and one caption line inside its padding and border. */
export function resolveAccountTypeTileGeometry(fontScale: number): AccountTypeTileGeometry {
  const caption = scaledTextStyle(Type.caption, fontScale);
  return {
    height: Math.max(
      ACCOUNT_TYPE_TILE_HEIGHT,
      Size.compactChipHeight +
        Spacing.xs +
        caption.lineHeight +
        2 * (Spacing.xs + ACCOUNT_TYPE_TILE_BORDER_WIDTH),
    ),
    caption,
  };
}

/** HeroUI `Input` is 48dp unscaled at every scale; do not `ms()`-wrap `Size.fieldHeight` here. */
export const CREDIT_SLOT_MIN_HEIGHT = Size.fieldHeight + Spacing.md;

/** `Tabs.List` chrome: gap 4 + padding 3+3 (`tabs.css`), unscaled CSS px, so not `ms()`-scaled. */
export const CURRENCY_TABS_LIST_CHROME = 10;

export const CURRENCY_SEGMENT_WIDTH = ms(65);
export const CURRENCY_CELL_WIDTH = 2 * CURRENCY_SEGMENT_WIDTH + CURRENCY_TABS_LIST_CHROME;

/** The currency codes stop growing at the display headline's stop, so `EGP` and `USD` stay whole in their segments. */
export const CURRENCY_TABS_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

/** The box around the currency tabs: the field height, or the tab row at the stop plus the fit's slack where that is taller. */
export function resolveCurrencyTabsBoxHeight(fontScale: number): number {
  const { defaultListHeight } = resolveSegmentedTabsGeometry(
    fontScale,
    CURRENCY_TABS_MAX_FONT_SCALE,
  );
  return Math.max(Size.fieldHeight, (defaultListHeight ?? 0) + FITTED_LINE_SLACK);
}

/** Above scale 1 both labels of the balance row keep two lines on every type, so no field moves when the type relabels one. */
export function resolveBalanceRowLabelLines(fontScale: number): 1 | 2 {
  return fontScale <= 1 ? 1 : 2;
}

export function chunkTypeOptions(
  options: readonly TypeOption[],
  columns: number,
): (TypeOption | null)[][] {
  const rows: (TypeOption | null)[][] = [];
  for (let i = 0; i < options.length; i += columns) {
    const row: (TypeOption | null)[] = options.slice(i, i + columns);
    while (row.length < columns) row.push(null);
    rows.push(row);
  }
  return rows;
}

export interface BalanceFieldModel {
  label: string;
  helper: string;
}

/** Credit Card relabels the balance field; it is never replaced, so nothing above it shifts. */
export function resolveBalanceField(type: AccountType): BalanceFieldModel {
  if (type === AccountType.CreditCard) {
    return { label: Strings.accountOwedLabel, helper: Strings.accountOwedHelper };
  }
  return { label: Strings.accountBalanceLabel, helper: Strings.accountBalanceHelper };
}
