import { resolveSegmentFilterWidth } from '@/components/ui/segment_filter.geometry';
import { Size } from '@/constants/theme';

describe('resolveSegmentFilterWidth', () => {
  it('at font scale 1 keeps the compact segment width', () => {
    expect(resolveSegmentFilterWidth(1)).toBe(Size.filterSegmentCompactWidth);
  });

  it('below font scale 1 never narrows the segment', () => {
    expect(resolveSegmentFilterWidth(0.85)).toBe(Size.filterSegmentCompactWidth);
  });

  it('at font scale 2 doubles the compact segment width', () => {
    expect(resolveSegmentFilterWidth(2)).toBe(2 * Size.filterSegmentCompactWidth);
  });
});
