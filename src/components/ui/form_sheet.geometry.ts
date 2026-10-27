import type { Insets } from 'react-native';

import { SELECTABLE_PILL_LABEL_FONT_SIZE } from '@/components/ui/chip.geometry';
import { DISPLAY_HEADLINE_MAX_FONT_SCALE } from '@/components/ui/display_headline.geometry';
import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import { getVisibleScrollOffset } from '@/components/ui/scroll_reveal.geometry';
import {
  type TabsTriggerHitSlop,
  resolveSegmentedTabsGeometry,
} from '@/components/ui/tabs.geometry';
import {
  type ScaledTextStyle,
  resolveOneLineTextProps,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import {
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
  lineHeightFor,
  touchFloorHitSlop,
} from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** The amount's error line is as thick as the stroke of the ring the fact rows and the strip keep. */
export const AMOUNT_ERROR_LINE_HEIGHT = Size.hairline;

/** The line lies along the input's bottom edge and outside its layout, so nothing moves between valid and invalid. */
export const AMOUNT_ERROR_LINE_STYLE = {
  position: 'absolute',
  left: 0,
  right: 0,
  bottom: 0,
} as const;

/** The amount's message slot draws its error and its converted amount in this one line box, which the OS scales, so a swap moves nothing. */
export const AMOUNT_MESSAGE_TEXT_STYLE = {
  fontSize: Type.micro,
  lineHeight: lineHeightFor(Type.micro),
  textAlign: 'center',
} as const;

/** The rate card's and the rate editor's message slots: a floor and no fixed height, so a message wrapped at a large font scale stays whole. */
export const RATE_MESSAGE_SLOT_STYLE = {
  minHeight: ms(16),
  justifyContent: 'center',
} as const;

/** The rate editor's Reset slot: the touch floor whether or not the link shows, so typing a rate moves nothing. */
export const RATE_RESET_SLOT_STYLE = {
  minHeight: TouchSize.min,
  alignItems: 'flex-end',
  justifyContent: 'center',
} as const;

/** The sheet frames' 118 by 40 row, ruled 2026-09-27 (MA-122) over the canvas base rule's 64-wide column. */
export const ACCOUNT_STRIP_CHIP_WIDTH = ms(118);
export const ACCOUNT_STRIP_CHIP_HEIGHT = ms(40);
export const ACCOUNT_STRIP_GAP = Spacing.xs;
export const ACCOUNT_STRIP_CHIP_RADIUS = Radius.md;
export const ACCOUNT_STRIP_TILE = Size.dualTile;
export const ACCOUNT_STRIP_CHIP_PADDING_X = ms(10);
export const ACCOUNT_STRIP_TILE_NAME_GAP = Spacing.xs;
export const ACCOUNT_STRIP_DIMMED_OPACITY = 0.6;
/** Lifts the 40-high chip past the touch floor. */
export const ACCOUNT_STRIP_CHIP_SLOP_Y = touchFloorHitSlop(ACCOUNT_STRIP_CHIP_HEIGHT).top;
/** Horizontally the slop stops at half the gap, so a neighbour keeps its side. */
export const ACCOUNT_STRIP_HIT_SLOP: Readonly<Insets> = Object.freeze({
  top: ACCOUNT_STRIP_CHIP_SLOP_Y,
  bottom: ACCOUNT_STRIP_CHIP_SLOP_Y,
  left: ACCOUNT_STRIP_GAP / 2,
  right: ACCOUNT_STRIP_GAP / 2,
});
export const ACCOUNT_STRIP_INSET_X = Spacing.md;
/** The strip row's padding above and below its chips; the scroll holds the slop, since Android drops a touch outside the ScrollView. */
export const ACCOUNT_STRIP_PADDING_Y = Math.max(Spacing.xxs, ACCOUNT_STRIP_CHIP_SLOP_Y);
export const ACCOUNT_STRIP_WRAPPER_PADDING_Y = ACCOUNT_STRIP_PADDING_Y - ACCOUNT_STRIP_CHIP_SLOP_Y;

/** The amount input's floor, so an empty or one-digit amount keeps its centred box. */
export const AMOUNT_INPUT_MIN_WIDTH = ms(80);

/** Auto basis and no shrink: a flank of the amount row is never narrower than the code it holds, and the two grow by equal shares. */
export const AMOUNT_FLANK_STYLE = { flexGrow: 1, flexShrink: 0, flexBasis: 'auto' } as const;
export const AMOUNT_CODE_STYLE = {
  fontSize: Type.bodyStrong,
  lineHeight: lineHeightFor(Type.bodyStrong),
};

/** A money figure at entry size stops growing at the top of the gated text scale range. */
export const AMOUNT_ENTRY_MAX_FONT_SCALE = DISPLAY_HEADLINE_MAX_FONT_SCALE;

/** The gap between the status track and the flat button. */
export const FORM_SHEET_STATUS_GAP = Spacing.xs;

export const FORM_SHEET_CONTENT_CONTAINER_STYLE = {
  padding: Spacing.md,
  gap: Spacing.xs,
};

/** Canvas `.fact`: 16 inset, a hairline under every fact but the last (Note). */
export const FORM_FACT_CELL_CLASS = 'border-separator border-b px-4';

/** Above scale 1 the app scales the Note's text: Android draws the hint without the line box, and an OS-scaled line box is shorter than the hint's own lines; the floor is the shared fact row's height. */
export function resolveNoteInputGeometry(fontScale: number): {
  minHeight: number;
  text: ScaledTextStyle | undefined;
} {
  const text = scaledTextStyleAboveOne(Type.body, fontScale);
  return { minHeight: resolveFactRowHeight(fontScale), text };
}

/** The chip's 1.0 height is its floor; `label` is `undefined` at or below scale 1, where the OS scales the name. */
export function resolveAccountStripChipGeometry(fontScale: number): {
  height: number;
  label: ScaledTextStyle | undefined;
} {
  const label = scaledTextStyleAboveOne(SELECTABLE_PILL_LABEL_FONT_SIZE, fontScale);
  return { height: Math.max(ACCOUNT_STRIP_CHIP_HEIGHT, label?.lineHeight ?? 0), label };
}

/** `triggerHitSlop` lifts a tab past the touch floor. */
export function resolveTypeTabsGeometry(fontScale: number): {
  listHeight: number;
  triggerHitSlop: TabsTriggerHitSlop;
} {
  const { compact } = resolveSegmentedTabsGeometry(fontScale);
  return {
    listHeight: Math.max(Size.typeTabsTrack, compact.listHeight),
    triggerHitSlop: touchFloorHitSlop(compact.triggerHeight),
  };
}

export type FormSupportLines = 'one' | 'wrap';

export interface FormSupportLineTextProps {
  numberOfLines: 1 | undefined;
  allowFontScaling: boolean;
  style: { fontSize: number; lineHeight: number; flexShrink?: 1 };
}

/** The type tabs' support line: `'one'` ends in a tail ellipsis, `'wrap'` runs onto as many lines as it needs; above scale 1 the app scales it. */
export function resolveFormSupportLineTextProps(
  lines: FormSupportLines,
  fontScale: number,
): FormSupportLineTextProps {
  const scaled = scaledTextStyleAboveOne(Type.micro, fontScale);
  const text = scaled ?? { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) };
  if (lines === 'one') {
    const oneLine = resolveOneLineTextProps(scaled);
    return { ...oneLine, style: { ...text, ...oneLine.style } };
  }
  return { numberOfLines: undefined, allowFontScaling: scaled === undefined, style: text };
}

interface AccountStripRevealInput {
  /** The chip's position in the strip, from 0. */
  index: number;
  /** The strip scroll's laid-out width; 0 before its first layout. */
  viewportWidth: number;
  scrollX: number;
}

/** The scroll offset that shows a chip whole: `scrollX` itself when the chip already lies whole in view. The content has no side padding, so no margin. */
export function resolveAccountStripRevealX({
  index,
  viewportWidth,
  scrollX,
}: AccountStripRevealInput): number {
  const revealX = getVisibleScrollOffset({
    currentOffset: scrollX,
    viewportWidth,
    itemX: index * (ACCOUNT_STRIP_CHIP_WIDTH + ACCOUNT_STRIP_GAP),
    itemWidth: ACCOUNT_STRIP_CHIP_WIDTH,
  });
  return revealX ?? scrollX;
}
