import { resolveSearchTallyGeometry } from '@/components/ui/search_tally.geometry';
import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

describe('resolveSearchTallyGeometry', () => {
  it("keeps today's slot at font scale 1.0", () => {
    expect(resolveSearchTallyGeometry(1)).toEqual({
      slotHeight: Spacing.xxs + lineHeightFor(Type.micro),
      lineHeight: lineHeightFor(Type.micro),
    });
  });

  it.each([1.3, 2])(
    "sizes the line and the slot from the text's own scaled size at font scale %s",
    (scale) => {
      const lineHeight = lineHeightFor(scaledFontSize(Type.micro, scale));
      expect(resolveSearchTallyGeometry(scale)).toEqual({
        slotHeight: Spacing.xxs + lineHeight,
        lineHeight,
      });
    },
  );
});
