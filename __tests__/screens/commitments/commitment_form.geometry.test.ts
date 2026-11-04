import {
  COMMITMENT_CHOICE_SHEET_SCROLL_SIZE,
  resolveCommitmentChoiceSheetSizing,
} from '@/modules/commitments/screens/commitments/components/commitment_form.geometry';

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
