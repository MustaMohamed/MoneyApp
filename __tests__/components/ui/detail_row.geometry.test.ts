import {
  DETAIL_ROW_HEIGHT,
  DETAIL_ROW_LABEL_FONT_SIZE,
  DETAIL_ROW_VALUE_FONT_SIZE,
  resolveDetailRowHeight,
} from '@/components/ui/detail_row.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { lineHeightFor } from '@/constants/theme';

function lineBox(fontSize: number, fontScale: number): number {
  return lineHeightFor(scaledFontSize(fontSize, fontScale));
}

function rowLinesAt(fontScale: number): number {
  return (
    lineBox(DETAIL_ROW_LABEL_FONT_SIZE, fontScale) + lineBox(DETAIL_ROW_VALUE_FONT_SIZE, fontScale)
  );
}

describe('resolveDetailRowHeight', () => {
  it.each([0.85, 1])('keeps the 1.0 row height at font scale %s', (fontScale) => {
    expect(resolveDetailRowHeight(fontScale)).toBe(DETAIL_ROW_HEIGHT);
  });

  it.each([2, 3])('adds the grown line boxes to the row at font scale %s', (fontScale) => {
    const row = resolveDetailRowHeight(fontScale);

    expect(row).toBe(DETAIL_ROW_HEIGHT + rowLinesAt(fontScale) - rowLinesAt(1));
    expect(row).toBeGreaterThan(DETAIL_ROW_HEIGHT);
  });
});
