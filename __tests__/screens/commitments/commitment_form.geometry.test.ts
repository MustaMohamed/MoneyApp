import {
  PILL_BORDER_WIDTH,
  SELECTABLE_PILL_BARE_HEIGHT,
  SELECTABLE_PILL_LABEL_FONT_SIZE,
  SELECTABLE_PILL_PADDING_BLOCK,
} from '@/components/ui/chip.geometry';
import {
  TABS_TRIGGER_PADDING_BLOCK,
  resolveDefaultTriggerHeight,
} from '@/components/ui/tabs.geometry';
import { HEROUI_TEXT_TYPE } from '@/components/ui/text_scale.geometry';
import { lineHeightFor, touchFloorHitSlop } from '@/constants/theme';
import {
  COMMITMENT_FORM_PILL_SLOP,
  COMMITMENT_FORM_TABS_SLOP,
} from '@/modules/commitments/screens/commitments/components/commitment_form.geometry';

describe('COMMITMENT_FORM_PILL_SLOP', () => {
  it('MA-236: lifts the bare pill height from chip.geometry to the floor, at the value the form ships today', () => {
    expect(COMMITMENT_FORM_PILL_SLOP).toEqual(touchFloorHitSlop(SELECTABLE_PILL_BARE_HEIGHT));
    expect(COMMITMENT_FORM_PILL_SLOP).toEqual(
      touchFloorHitSlop(
        lineHeightFor(SELECTABLE_PILL_LABEL_FONT_SIZE) +
          2 * SELECTABLE_PILL_PADDING_BLOCK +
          2 * PILL_BORDER_WIDTH,
      ),
    );
  });
});

describe('COMMITMENT_FORM_TABS_SLOP', () => {
  it('MA-236: lifts the default trigger height from tabs.geometry at scale 1 to the floor, at the value the form ships today', () => {
    expect(COMMITMENT_FORM_TABS_SLOP).toEqual(touchFloorHitSlop(resolveDefaultTriggerHeight(1)));
    expect(COMMITMENT_FORM_TABS_SLOP).toEqual(
      touchFloorHitSlop(lineHeightFor(HEROUI_TEXT_TYPE.base) + 2 * TABS_TRIGGER_PADDING_BLOCK),
    );
  });
});
