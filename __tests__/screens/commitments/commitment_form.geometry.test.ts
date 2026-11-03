import {
  PILL_BORDER_WIDTH,
  SELECTABLE_PILL_BARE_HEIGHT,
  SELECTABLE_PILL_LABEL_FONT_SIZE,
  SELECTABLE_PILL_PADDING_BLOCK,
} from '@/components/ui/chip.geometry';
import { lineHeightFor, touchFloorHitSlop } from '@/constants/theme';
import {
  COMMITMENT_CHOICE_SHEET_SCROLL_SIZE,
  COMMITMENT_FORM_PILL_SLOP,
  resolveCommitmentChoiceSheetSizing,
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

describe('resolveCommitmentChoiceSheetSizing (MA-276)', () => {
  const fits = { fitContent: true, scrollable: false, size: undefined };
  const scrolls = {
    fitContent: false,
    scrollable: true,
    size: COMMITMENT_CHOICE_SHEET_SCROLL_SIZE,
  };

  it('fits its content with a footer at font scale 1', () => {
    expect(resolveCommitmentChoiceSheetSizing(1, true)).toEqual(fits);
  });

  it.each([1.01, 2])('scrolls at xxl with a footer at font scale %p', (fontScale) => {
    expect(resolveCommitmentChoiceSheetSizing(fontScale, true)).toEqual(scrolls);
  });

  it('fits its content without a footer at font scale 2', () => {
    expect(resolveCommitmentChoiceSheetSizing(2, false)).toEqual(fits);
  });
});
