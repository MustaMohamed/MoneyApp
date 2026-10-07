import {
  resolveEmptyStateLinkHitSlop,
  resolveEmptyStatePlacement,
} from '@/components/ui/empty_state';
import { Spacing, TouchSize } from '@/constants/theme';

describe('resolveEmptyStatePlacement', () => {
  it.each([
    [undefined, 'centered', 'centered'],
    ['inline', 'centered', 'inline'],
    ['inline', 'inline', 'inline'],
    [undefined, 'inline', 'inline'],
  ] as const)('(%s, %s) resolves to %s', (override, variantPlacement, expected) => {
    expect(resolveEmptyStatePlacement(override, variantPlacement)).toBe(expected);
  });
});

describe('resolveEmptyStateLinkHitSlop', () => {
  const LINK_PADDING = 2 * Spacing.xs;

  it('lifts a link box under the touch floor to a band 44 high, split over both sides', () => {
    const lineHeight = TouchSize.min - LINK_PADDING - 8;

    const { top, bottom } = resolveEmptyStateLinkHitSlop(lineHeight);

    expect(top).toBeGreaterThan(0);
    expect(bottom).toBe(top);
    expect(lineHeight + LINK_PADDING + top + bottom).toBeCloseTo(TouchSize.min);
  });

  it.each([
    ['at the floor', TouchSize.min - LINK_PADDING],
    ['past the floor', TouchSize.min],
  ])('adds nothing to a link box %s', (_name, lineHeight) => {
    expect(resolveEmptyStateLinkHitSlop(lineHeight)).toEqual({ top: 0, bottom: 0 });
  });
});
