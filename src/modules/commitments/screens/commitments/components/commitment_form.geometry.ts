import { SELECTABLE_PILL_BARE_HEIGHT } from '@/components/ui/chip.geometry';
import type { SheetSize } from '@/components/ui/sheet.helpers';
import { type TouchFloorHitSlop, type TouchFloorRoom, touchFloorHitSlop } from '@/constants/theme';

/** Sized from the bare pill's height at scale 1, its shortest, so the touch area reaches the floor at every scale. */
export const COMMITMENT_FORM_PILL_SLOP: TouchFloorHitSlop = touchFloorHitSlop(
  SELECTABLE_PILL_BARE_HEIGHT,
);

// The recurrence and duration pickers' `gap-2`, between their rows and between the pills in a row, unscaled CSS px.
export const COMMITMENT_FORM_PICKER_GAP = 8;

/** A picker's first pill row: the whole gap of its choice sheet's top padding above, nothing bounding it below. */
export const COMMITMENT_PICKER_FIRST_ROW_EDGE: TouchFloorRoom = {
  top: COMMITMENT_FORM_PICKER_GAP,
};

/** The same row, under the choice sheet's top padding, over a second row of controls: half the gap below. */
export const COMMITMENT_PICKER_FIRST_ROW_OVER_ROW_EDGE: TouchFloorRoom = {
  top: COMMITMENT_FORM_PICKER_GAP,
  bottom: COMMITMENT_FORM_PICKER_GAP / 2,
};

/** A choice sheet with a footer scrolls above font scale 1, where its content can pass the screen. */
export const COMMITMENT_CHOICE_SHEET_SCROLL_SIZE: SheetSize = 'xxl';

/** The Repeats unit choice's narrowest width, F2's `.useg`; past it the choice wraps under the stepper. */
export const REPEATS_UNIT_MIN_WIDTH = 200;

export function resolveCommitmentChoiceSheetSizing(
  fontScale: number,
  hasFooter: boolean,
): { fitContent: boolean; scrollable: boolean; size: SheetSize | undefined } {
  if (hasFooter && fontScale > 1) {
    return { fitContent: false, scrollable: true, size: COMMITMENT_CHOICE_SHEET_SCROLL_SIZE };
  }
  return { fitContent: true, scrollable: false, size: undefined };
}
