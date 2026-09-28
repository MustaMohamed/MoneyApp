import { TouchSize, touchFloorSlop } from '@/constants/theme';

describe('touchFloorSlop', () => {
  it('returns half the distance to the touch floor for a height under it', () => {
    expect(touchFloorSlop(40)).toBe(2);
    expect(touchFloorSlop(28)).toBe(8);
  });

  it('returns zero for a height at the touch floor', () => {
    expect(touchFloorSlop(44)).toBe(0);
  });

  it('returns zero, never a negative inset, for a height over the touch floor', () => {
    expect(touchFloorSlop(56)).toBe(0);
  });

  it.each([16, 28, 34.5, 40])(
    'height %p plus the slop on both sides reaches the touch floor',
    (height) => {
      expect(height + 2 * touchFloorSlop(height)).toBe(TouchSize.min);
    },
  );
});
