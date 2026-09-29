import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

describe('resolveSkeletonBarHeight', () => {
  const textBar = lineHeightFor(Type.body);
  const pill = ms(20);

  it('keeps the bar at its 1.0 height at font scale 1', () => {
    expect(resolveSkeletonBarHeight(textBar, 1)).toBe(textBar);
    expect(resolveSkeletonBarHeight(pill, 1)).toBe(pill);
  });

  it('doubles the bar at font scale 2', () => {
    expect(resolveSkeletonBarHeight(textBar, 2)).toBe(textBar * 2);
    expect(resolveSkeletonBarHeight(pill, 2)).toBe(pill * 2);
  });

  it('shrinks the bar with its text below font scale 1', () => {
    expect(resolveSkeletonBarHeight(textBar, 0.85)).toBeCloseTo(textBar * 0.85, 10);
  });

  it('triples the bar at font scale 3', () => {
    expect(resolveSkeletonBarHeight(textBar, 3)).toBe(textBar * 3);
  });
});
