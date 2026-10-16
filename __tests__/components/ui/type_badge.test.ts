import { scaledFontSize } from '@/components/ui/text_scale.geometry';
import { resolveTypeBadgeMinWidth } from '@/components/ui/type_badge';
import { Type } from '@/constants/theme';

// The row's badge: a 1 dp border and 8 of padding on each side, a 4 gap, a 10 icon, a `…` of its label.
function rowBadgeMinWidth(fontScale: number): number {
  return 2 * (1 + 8) + 4 + 10 + scaledFontSize(Type.compactBadge, fontScale);
}

describe('resolveTypeBadgeMinWidth (MA-192)', () => {
  it.each([1, 2])('has one size, the list row draws, at font scale %s', (fontScale) => {
    expect(resolveTypeBadgeMinWidth(fontScale)).toBe(rowBadgeMinWidth(fontScale));
  });
});
