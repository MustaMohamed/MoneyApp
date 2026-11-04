import type { SheetSize } from '@/components/ui/sheet.helpers';

// The choice sheets' top padding, above their option rows, unscaled CSS px.
export const COMMITMENT_FORM_PICKER_GAP = 8;

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
