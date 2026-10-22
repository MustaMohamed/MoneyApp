import { SELECTABLE_PILL_BARE_HEIGHT } from '@/components/ui/chip.geometry';
import { resolveDefaultTriggerHeight } from '@/components/ui/tabs.geometry';
import {
  Spacing,
  type TouchFloorHitSlop,
  type TouchFloorRoom,
  touchFloorHitSlop,
} from '@/constants/theme';

/** Sized from the bare pill's height at scale 1, its shortest, so the touch area reaches the floor at every scale. */
export const COMMITMENT_FORM_PILL_SLOP: TouchFloorHitSlop = touchFloorHitSlop(
  SELECTABLE_PILL_BARE_HEIGHT,
);

/** Sized from the default `SegmentedTabs` trigger's height at scale 1, its shortest. */
export const COMMITMENT_FORM_TABS_SLOP: TouchFloorHitSlop = touchFloorHitSlop(
  resolveDefaultTriggerHeight(1),
);

// The recurrence and duration pickers' `gap-2`, between their rows and between the pills in a row, unscaled CSS px.
export const COMMITMENT_FORM_PICKER_GAP = 8;

/** A picker's first pill row: the whole gap to its caption label above, nothing bounding it below. */
export const COMMITMENT_PICKER_CAPTION_ROW_EDGE: TouchFloorRoom = {
  top: COMMITMENT_FORM_PICKER_GAP,
};

/** The same row over a second row of controls: half the gap below. */
export const COMMITMENT_PICKER_CAPTION_ROW_OVER_ROW_EDGE: TouchFloorRoom = {
  top: COMMITMENT_FORM_PICKER_GAP,
  bottom: COMMITMENT_FORM_PICKER_GAP / 2,
};

/** The period row's room above: half the drawn distance to the presets while it shares the `Every` input's line, half the gap to that input once it wraps at or below the line's bottom. */
export function resolvePeriodRowTopRoom(
  presetsRowBottom: number | undefined,
  customRowTop: number | undefined,
  inputLineBottom: number | undefined,
  periodRowTop: number | undefined,
): number {
  if (
    presetsRowBottom === undefined ||
    customRowTop === undefined ||
    inputLineBottom === undefined ||
    periodRowTop === undefined
  ) {
    return COMMITMENT_FORM_PICKER_GAP / 2;
  }
  if (periodRowTop >= inputLineBottom) return COMMITMENT_FORM_PICKER_GAP / 2;
  return (customRowTop + periodRowTop - presetsRowBottom) / 2;
}

export const COMMITMENT_FORM_CONTENT_CONTAINER_STYLE = {
  gap: Spacing.xs,
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.xs,
  paddingBottom: Spacing.md,
};
