import {
  PILL_BORDER_WIDTH,
  SELECTABLE_PILL_LABEL_FONT_SIZE,
  SELECTABLE_PILL_PADDING_BLOCK,
} from '@/components/ui/chip.geometry';
import { TABS_TRIGGER_PADDING_BLOCK } from '@/components/ui/tabs.geometry';
import { HEROUI_TEXT_TYPE } from '@/components/ui/text_scale.geometry';
import {
  Spacing,
  type TouchFloorHitSlop,
  lineHeightFor,
  touchFloorHitSlop,
} from '@/constants/theme';

/** Sized from the bare pill's height at scale 1, its shortest, so the touch area reaches the floor at every scale. */
export const COMMITMENT_FORM_PILL_SLOP: TouchFloorHitSlop = touchFloorHitSlop(
  lineHeightFor(SELECTABLE_PILL_LABEL_FONT_SIZE) +
    2 * SELECTABLE_PILL_PADDING_BLOCK +
    2 * PILL_BORDER_WIDTH,
);

/** Sized from the default `SegmentedTabs` trigger's height at scale 1, its shortest. */
export const COMMITMENT_FORM_TABS_SLOP: TouchFloorHitSlop = touchFloorHitSlop(
  lineHeightFor(HEROUI_TEXT_TYPE.base) + 2 * TABS_TRIGGER_PADDING_BLOCK,
);

export const COMMITMENT_FORM_CONTENT_CONTAINER_STYLE = {
  gap: Spacing.xs,
  paddingHorizontal: Spacing.md,
  paddingTop: Spacing.xs,
  paddingBottom: Spacing.md,
};
