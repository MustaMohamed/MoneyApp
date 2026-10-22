import { SELECTABLE_PILL_BARE_HEIGHT } from '@/components/ui/chip.geometry';
import { resolveDefaultTriggerHeight } from '@/components/ui/tabs.geometry';
import { Spacing, type TouchFloorHitSlop, touchFloorHitSlop } from '@/constants/theme';

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

export const COMMITMENT_FORM_CONTENT_CONTAINER_STYLE = {
  gap: Spacing.xs,
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.xs,
  paddingBottom: Spacing.md,
};
