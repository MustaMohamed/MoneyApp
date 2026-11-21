import { PILL_BORDER_WIDTH, SELECTABLE_PILL_PADDING_BLOCK } from '@/components/ui/chip.geometry';
import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import {
  AMOUNT_SUGGESTION_GAP,
  AMOUNT_SUGGESTION_ROW_PADDING_TOP,
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
  resolveAmountSuggestionChipGeometry,
  resolveFormSupportLineTextProps,
  resolveNoteInputGeometry,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';

describe('resolveAmountSuggestionChipGeometry', () => {
  it.each([1, 2])(
    'MA-288: at font scale %d a suggestion chip and its slop reach the touch floor',
    (fontScale) => {
      const { height, hitSlop } = resolveAmountSuggestionChipGeometry(fontScale);
      expect(height + hitSlop.top + hitSlop.bottom).toBeGreaterThanOrEqual(TouchSize.min);
    },
  );

  it.each([1, 2])(
    'MA-288: at font scale %d the label fits its chip and wrapped rows clear the amount and each other',
    (fontScale) => {
      const { height, label } = resolveAmountSuggestionChipGeometry(fontScale);
      expect(
        label.lineHeight + 2 * SELECTABLE_PILL_PADDING_BLOCK + 2 * PILL_BORDER_WIDTH,
      ).toBeLessThanOrEqual(height);
      const heroBottom = 0;
      const firstRow = { top: heroBottom + AMOUNT_SUGGESTION_ROW_PADDING_TOP, bottom: 0 };
      firstRow.bottom = firstRow.top + height;
      const secondRow = { top: firstRow.bottom + AMOUNT_SUGGESTION_GAP, bottom: 0 };
      secondRow.bottom = secondRow.top + height;
      expect(heroBottom - firstRow.top).toBeLessThanOrEqual(1);
      expect(firstRow.bottom - secondRow.top).toBeLessThanOrEqual(1);
    },
  );

  it('MA-288: at font scale 2, where the row wraps, no chip hit rect reaches a neighbouring chip', () => {
    const { height, hitSlop } = resolveAmountSuggestionChipGeometry(2);
    const firstRowBottom = AMOUNT_SUGGESTION_ROW_PADDING_TOP + height;
    const secondRowTop = firstRowBottom + AMOUNT_SUGGESTION_GAP;
    expect(firstRowBottom + hitSlop.bottom - secondRowTop).toBeLessThanOrEqual(1);
    expect(firstRowBottom - (secondRowTop - hitSlop.top)).toBeLessThanOrEqual(1);
    expect(hitSlop.top).toBeLessThanOrEqual(AMOUNT_SUGGESTION_ROW_PADDING_TOP);
  });
});

describe('resolveTypeTabsGeometry', () => {
  it('at font scale 1 keeps the 36 tab row and returns only the list height and the slop', () => {
    const g = resolveTypeTabsGeometry(1);
    expect(g.listHeight).toBe(36);
    expect(Object.keys(g).sort()).toEqual(['listHeight', 'triggerHitSlop']);
  });

  it.each([1.5, 2])('at font scale %d the tab row holds its triggers', (fontScale) => {
    const { compact } = resolveSegmentedTabsGeometry(fontScale);
    expect(resolveTypeTabsGeometry(fontScale).listHeight).toBeGreaterThanOrEqual(
      compact.triggerHeight + 2 * TABS_LIST_PADDING,
    );
  });

  it.each([1, 2])(
    'MA-109: at font scale %d the trigger slop lifts a tab to the touch floor with a margin on each side, the same above and below',
    (fontScale) => {
      const { triggerHitSlop } = resolveTypeTabsGeometry(fontScale);
      const { compact } = resolveSegmentedTabsGeometry(fontScale);
      expect(
        compact.triggerHeight + triggerHitSlop.top + triggerHitSlop.bottom,
      ).toBeGreaterThanOrEqual(TouchSize.min + 2 * Spacing.xxxxs);
      expect(triggerHitSlop.top).toBe(triggerHitSlop.bottom);
    },
  );
});

describe('resolveFormSupportLineTextProps', () => {
  it.each([0.85, 1])(
    "MA-254: at font scale %s gives 'one' one line, the OS scaling and the Type.micro pair with a shrink",
    (fontScale) => {
      expect(resolveFormSupportLineTextProps('one', fontScale)).toEqual({
        numberOfLines: 1,
        allowFontScaling: true,
        style: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro), flexShrink: 1 },
      });
    },
  );

  it.each([0.85, 1])(
    "MA-254: at font scale %s gives 'wrap' no line cap, the OS scaling and the Type.micro pair with no shrink",
    (fontScale) => {
      const props = resolveFormSupportLineTextProps('wrap', fontScale);
      expect(props.numberOfLines).toBeUndefined();
      expect(props.allowFontScaling).toBe(true);
      expect(props.style).toEqual({
        fontSize: Type.micro,
        lineHeight: lineHeightFor(Type.micro),
      });
    },
  );

  it("MA-254: at font scale 2 gives 'one' one line and the app-scaled Type.micro pair with a shrink, the OS scaling off", () => {
    expect(resolveFormSupportLineTextProps('one', 2)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      style: { ...scaledTextStyle(Type.micro, 2), flexShrink: 1 },
    });
  });

  it("MA-254: at font scale 2 gives 'wrap' no line cap and the app-scaled Type.micro pair with no shrink, the OS scaling off", () => {
    const props = resolveFormSupportLineTextProps('wrap', 2);
    expect(props.numberOfLines).toBeUndefined();
    expect(props.allowFontScaling).toBe(false);
    expect(props.style).toEqual(scaledTextStyle(Type.micro, 2));
  });
});

describe('form sheet content inset', () => {
  it('MA-123: pads the fact group and the skeleton by Spacing.md on every side, with no footer clearance', () => {
    expect(FORM_SHEET_CONTENT_CONTAINER_STYLE).toEqual({
      padding: Spacing.md,
      gap: Spacing.xs,
    });
  });
});

describe('resolveNoteInputGeometry', () => {
  it.each([1, 2, 3, 4])(
    'MA-197: stands the Note at the shared fact row height at font scale %s',
    (fontScale) => {
      expect(resolveNoteInputGeometry(fontScale).minHeight).toBe(resolveFactRowHeight(fontScale));
    },
  );

  it('MA-163: leaves the Note text to the OS at scale 1 and scales it in the app above it', () => {
    expect(resolveNoteInputGeometry(1).text).toBeUndefined();
    expect(resolveNoteInputGeometry(2).text).toEqual(scaledTextStyle(Type.body, 2));
    expect(resolveNoteInputGeometry(4).text).toEqual(scaledTextStyle(Type.body, 4));
  });

  it('MA-197: gives the Note at 4 its padded line, past the bare line box the floor held before', () => {
    expect(resolveNoteInputGeometry(4).minHeight).toBeGreaterThan(lineHeightFor(4 * Type.body));
  });
});
