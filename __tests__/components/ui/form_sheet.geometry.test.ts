import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import {
  FORM_SHEET_CONTENT_CONTAINER_STYLE,
  resolveFormSupportLineProps,
  resolveNoteInputGeometry,
  resolveTypeTabsGeometry,
} from '@/components/ui/form_sheet.geometry';
import { TABS_LIST_PADDING, resolveSegmentedTabsGeometry } from '@/components/ui/tabs.geometry';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Spacing, TouchSize, Type, lineHeightFor } from '@/constants/theme';

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

describe('resolveFormSupportLineProps', () => {
  it('one-line at scale 1 leaves the size to the OS and shrinks', () => {
    expect(resolveFormSupportLineProps(1, false)).toEqual({
      numberOfLines: 1,
      allowFontScaling: true,
      style: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro), flexShrink: 1 },
    });
  });

  it('one-line at scale 2 scales the size in the app', () => {
    expect(resolveFormSupportLineProps(2, false)).toEqual({
      numberOfLines: 1,
      allowFontScaling: false,
      style: { ...scaledTextStyle(Type.micro, 2), flexShrink: 1 },
    });
  });

  it('wrapping at scale 1 has no line cap', () => {
    const props = resolveFormSupportLineProps(1, true);
    expect(props.numberOfLines).toBeUndefined();
    expect(props).toEqual({
      allowFontScaling: true,
      style: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) },
    });
  });

  it('wrapping at scale 2 scales the size in the app with no cap', () => {
    const props = resolveFormSupportLineProps(2, true);
    expect(props.numberOfLines).toBeUndefined();
    expect(props).toEqual({
      allowFontScaling: false,
      style: scaledTextStyle(Type.micro, 2),
    });
  });
});
